import { DataReader, DataRecord, DataWriter } from '@/core/interfaces';
import { DataTransformer } from '@/transformers/transformers';

/**
 * A generic interface for schema validators (can be Zod, Joi, etc.)
 */
export interface SchemaValidator {
  parse(data: unknown): any;
}

export class SchemaValidatingReader extends DataTransformer {
  private schema: SchemaValidator;
  private dlqWriter?: DataWriter;

  constructor(reader: DataReader, schema: SchemaValidator) {
    super(reader);
    this.schema = schema;
  }

  public setDLQ(writer: DataWriter): this {
    this.dlqWriter = writer;
    return this;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    for await (const record of this.reader.read()) {
      try {
        // Validate and transform (e.g., cast strings to numbers)
        const validatedRecord = this.schema.parse(record);
        yield validatedRecord;
      } catch (error: any) {
        if (this.dlqWriter) {
          // If invalid, send to Dead Letter Queue
          await this.dlqWriter.write({
            ...record,
            _schema_error: error.errors || error.message
          });
        } else {
          // If no DLQ, we have to stop the job or skip (log it)
          console.warn('Schema validation failed for record. Skipping.', record, error.message);
        }
      }
    }
    
    if (this.dlqWriter) {
        await this.dlqWriter.close();
    }
  }
}
