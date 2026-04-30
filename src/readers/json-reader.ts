import { DataReader, DataRecord, DataSource, DataWriter } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { SchemaValidator } from '@/transformers/schema-validating-reader';
import { BaseReader } from '@/core/base-reader';

export class JsonReader<T = DataRecord> extends BaseReader<T> {
  private source: DataSource;
  private schema?: SchemaValidator<T>;
  private ignoreErrors: boolean = false;
  private dlqWriter?: DataWriter<any>;

  constructor(source: string | DataSource | Buffer, options?: { schema?: SchemaValidator<T>, ignoreErrors?: boolean }) {
    super();
    this.source = ensureDataSource(source);
    this.schema = options?.schema;
    if (options?.ignoreErrors !== undefined) this.ignoreErrors = options.ignoreErrors;
  }

  /**
   * Whether to ignore errors during processing (e.g., validation failures).
   */
  public setIgnoreErrors(value: boolean): this {
    this.ignoreErrors = value;
    return this;
  }

  /**
   * Sets a DataWriter to act as a Dead Letter Queue (DLQ).
   */
  public setDLQ(writer: DataWriter<any>): this {
    this.dlqWriter = writer;
    this.ignoreErrors = true;
    return this;
  }

  public async *read(): AsyncIterableIterator<T> {
    const stream = await this.source.getStream();
    const data = await new Promise<string>((resolve, reject) => {
      let content = '';
      stream.on('data', (chunk) => (content += chunk));
      stream.on('end', () => resolve(content));
      stream.on('error', (err) => reject(err));
    });

    try {
      // Assuming the JSON file contains an array of objects
      const records: any[] = JSON.parse(data);
      for (const record of records) {
        try {
          if (this.schema) {
            yield this.schema.parse(record);
          } else {
            yield record as T;
          }
        } catch (error) {
          if (this.ignoreErrors) {
            if (this.dlqWriter) {
              await this.dlqWriter.write({
                _raw: record,
                _error: error instanceof Error ? error.message : String(error),
                _type: 'validation_error'
              });
            }
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
       if (this.ignoreErrors) {
          if (this.dlqWriter) {
            await this.dlqWriter.write({
              _error: error instanceof Error ? error.message : String(error),
              _type: 'parse_error'
            });
          }
       } else {
         throw error;
       }
    } finally {
      // We do NOT close the dlqWriter here, because it might be shared
    }
  }
}
