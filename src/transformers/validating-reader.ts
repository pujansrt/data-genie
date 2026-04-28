import { DataReader, DataRecord, DataWriter } from '@/core/interfaces';
import { DataTransformer } from '@/transformers/transformers';

export interface ValidationMessage<T = DataRecord> {
  record: T;
  field?: string;
  message: string;
}

export type RecordValidationRule<T = DataRecord> = (record: T, messages: ValidationMessage<T>[]) => boolean;

export class ValidatingReader<T = DataRecord> extends DataTransformer<T, T> {
  private rules: RecordValidationRule<T>[] = [];
  private messages: ValidationMessage<T>[] = [];
  private throwExceptionOnFailure: boolean = false;
  private recordStackTraceInMessage: boolean = false;
  private dlqWriter?: DataWriter<any>;

  constructor(reader: DataReader<T>) {
    super(reader);
  }

  public add(rule: RecordValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  public setExceptionOnFailure(value: boolean): this {
    this.throwExceptionOnFailure = value;
    return this;
  }

  /**
   * Sets a DataWriter to act as a Dead Letter Queue (DLQ).
   * Invalid records will be written here instead of being yielded.
   */
  public setDLQ(writer: DataWriter<any>): this {
    this.dlqWriter = writer;
    return this;
  }

  public async *read(): AsyncIterableIterator<T> {
    try {
      for await (const record of this.reader.read()) {
        let isValid = true;
        const recordMessages: ValidationMessage<T>[] = [];

        for (const rule of this.rules) {
          if (!rule(record, recordMessages)) {
            isValid = false;
          }
        }

        if (!isValid) {
          if (this.throwExceptionOnFailure) {
            throw new Error(`Validation failed for record: ${JSON.stringify(record)}`);
          }

          this.messages.push(...recordMessages);

          if (this.dlqWriter) {
            // Divert to DLQ and do NOT yield to the main pipeline
            await this.dlqWriter.write({
              ...(record as any),
              _errors: recordMessages.map((m) => m.message)
            });
            continue; 
          }
        }

        yield record;
      }
    } finally {
      if (this.dlqWriter) {
        await this.dlqWriter.close();
      }
    }
  }

  public getMessages(): ValidationMessage<T>[] {
    return this.messages;
  }
}

export class FieldValidator<T = DataRecord> {
  private fieldName: keyof T;
  private rules: ((value: any, messages: ValidationMessage<T>[]) => boolean)[] = [];

  constructor(fieldName: keyof T) {
    this.fieldName = fieldName;
  }

  public addRule(rule: (value: any) => boolean, errorMessage: string): this {
    this.rules.push((value: any, messages: ValidationMessage<T>[]) => {
      if (!rule(value)) {
        messages.push({ record: {} as T, field: this.fieldName as string, message: errorMessage });
        return false;
      }
      return true;
    });
    return this;
  }

  public createRecordValidationRule(): RecordValidationRule<T> {
    return (record: T, messages: ValidationMessage<T>[]) => {
      const value = record[this.fieldName];
      let isValid = true;
      for (const rule of this.rules) {
        if (!rule(value, messages)) {
          isValid = false;
        }
      }
      return isValid;
    };
  }
}
