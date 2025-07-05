import { DataReader, DataRecord } from '@/core/interfaces';
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
  private recordStackTraceInMessage: boolean = false; // For more detailed error reporting

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

  public setRecordStackTraceInMessage(value: boolean): this {
    this.recordStackTraceInMessage = value;
    return this;
  }

  public getMessages(): ValidationMessage[] {
    return this.messages;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    for await (const record of this.reader.read()) {
      let isValid = true;
      const recordMessages: ValidationMessage[] = [];

      for (const rule of this.rules) {
        if (!rule(record, recordMessages)) {
          isValid = false;
        }
      }

      if (!isValid && this.throwExceptionOnFailure) {
        const errorMessage = `Validation failed for record: ${JSON.stringify(record)}. Messages: ${JSON.stringify(recordMessages)}`;
        if (this.recordStackTraceInMessage) {
          // You might want to capture a stack trace here if needed, but it's more complex
        }
        throw new Error(errorMessage);
      } else if (!isValid) {
        this.messages.push(...recordMessages);
      }
      yield record; // Yield all records, valid or not, or add a flag to filter them out
    }
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
