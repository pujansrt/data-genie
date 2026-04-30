import { parse } from 'csv-parse';
import { DataRecord, DataSource, DataWriter } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { SchemaValidator } from '@/transformers/schema-validating-reader';
import { BaseReader } from '@/core/base-reader';

export interface CSVReaderOptions<T> {
  schema?: SchemaValidator<T>;
  hasFieldNamesInFirstRow?: boolean;
  delimiter?: string;
  ignoreErrors?: boolean;
}

export class CSVReader<T = DataRecord> extends BaseReader<T> {
  private source: DataSource;
  private hasFieldNamesInFirstRow: boolean = true;
  private fieldSeparator: string = ',';
  private schema?: SchemaValidator<T>;
  private ignoreErrors: boolean = false;
  private dlqWriter?: DataWriter<any>;

  constructor(source: string | DataSource, options?: CSVReaderOptions<T>) {
    super();
    this.source = ensureDataSource(source);
    if (options) {
      this.schema = options.schema;
      if (options.hasFieldNamesInFirstRow !== undefined) this.hasFieldNamesInFirstRow = options.hasFieldNamesInFirstRow;
      if (options.delimiter !== undefined) this.fieldSeparator = options.delimiter;
      if (options.ignoreErrors !== undefined) this.ignoreErrors = options.ignoreErrors;
    }
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    this.hasFieldNamesInFirstRow = value;
    return this;
  }

  public setFieldSeparator(separator: string): this {
    this.fieldSeparator = separator;
    return this;
  }

  /**
   * Whether to ignore parsing errors (e.g., malformed rows).
   * If true, malformed rows will be skipped and optionally sent to DLQ.
   */
  public setIgnoreErrors(value: boolean): this {
    this.ignoreErrors = value;
    return this;
  }

  /**
   * Sets a DataWriter to act as a Dead Letter Queue (DLQ).
   * Malformed records will be written here if ignoreErrors is true.
   */
  public setDLQ(writer: DataWriter<any>): this {
    this.dlqWriter = writer;
    this.ignoreErrors = true; // Automatically enable ignoreErrors if DLQ is set
    return this;
  }

  public async *read(): AsyncIterableIterator<T> {
    const stream = await this.source.getStream();

    let expectedColumnCount = -1;
    const parser = stream.pipe(
      parse({
        columns: this.hasFieldNamesInFirstRow,
        delimiter: this.fieldSeparator,
        skip_empty_lines: true,
        relax_column_count: this.ignoreErrors,
      })
    );

    // Using on('record') might be more reliable for some versions
    parser.on('record', (record) => {
        if (expectedColumnCount === -1) {
            expectedColumnCount = Object.keys(record).length;
        }
    });

    try {
      for await (const record of parser) {
        // If on('record') didn't fire in time for the first for-await iteration
        if (expectedColumnCount === -1) {
           expectedColumnCount = Object.keys(record).length;
        }

        try {
          if (this.ignoreErrors && expectedColumnCount !== -1 && Object.keys(record).length !== expectedColumnCount) {
             if (this.dlqWriter) {
               await this.dlqWriter.write({
                 _raw: record,
                 _error: `Inconsistent column count: expected ${expectedColumnCount}, got ${Object.keys(record).length}`,
                 _type: 'parse_error'
               });
             }
             continue;
          }

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
                _type: 'fatal_parse_error',
                ...(error as any)
            });
        }
      } else {
        throw error;
      }
    } finally {
      if (this.dlqWriter) {
        await this.dlqWriter.close();
      }
    }
  }
}
