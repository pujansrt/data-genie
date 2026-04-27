import { DataReader, DataRecord, DataWriter } from '@/core/interfaces';
import { DataTransformer } from '@/transformers/transformers';

export interface ValidationMessage {
  record: DataRecord;
  field?: string;
  message: string;
}

export type RecordValidationRule = (record: DataRecord, messages: ValidationMessage[]) => boolean;

export class ValidatingReader extends DataTransformer {
  private rules: RecordValidationRule[] = [];
  private messages: ValidationMessage[] = [];
  private throwExceptionOnFailure: boolean = false;
  private recordStackTraceInMessage: boolean = false;
  private dlqWriter?: DataWriter;

  constructor(reader: DataReader) {
    super(reader);
  }

  public add(rule: RecordValidationRule): this {
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
  public setDLQ(writer: DataWriter): this {
    this.dlqWriter = writer;
    return this;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    try {
      for await (const record of this.reader.read()) {
        let isValid = true;
        const recordMessages: ValidationMessage[] = [];

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
              ...record,
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

  public getMessages(): ValidationMessage[] {
    return this.messages;
  }
}

export class FieldValidator {
  private fieldName: string;
  private rules: ((value: any, messages: ValidationMessage[]) => boolean)[] = [];

  constructor(fieldName: string) {
    this.fieldName = fieldName;
  }

  public addRule(rule: (value: any) => boolean, errorMessage: string): this {
    this.rules.push((value: any, messages: ValidationMessage[]) => {
      if (!rule(value)) {
        messages.push({ record: {}, field: this.fieldName, message: errorMessage });
        return false;
      }
      return true;
    });
    return this;
  }

  public createRecordValidationRule(): RecordValidationRule {
    return (record: DataRecord, messages: ValidationMessage[]) => {
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
