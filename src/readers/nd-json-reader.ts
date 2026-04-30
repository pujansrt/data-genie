import { DataRecord, DataSource, DataWriter } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import * as readline from 'readline';
import { SchemaValidator } from '@/transformers/schema-validating-reader';
import { BaseReader } from '@/core/base-reader';

/**
 * NDJsonReader class for reading data records from a file in NDJSON (Newline Delimited JSON) format.
 * Each line in the file is expected to be a valid JSON object.
 * This class reads records incrementally, suitable for very large files.
 */
export class NDJsonReader<T = DataRecord> extends BaseReader<T> {
  private source: DataSource;
  private schema?: SchemaValidator<T>;
  private ignoreErrors: boolean = false;
  private dlqWriter?: DataWriter<any>;

  /**
   * Constructs a new NDJsonReader.
   * @param source The path to the NDJSON file, a DataSource, or a Buffer.
   */
  constructor(source: string | DataSource | Buffer, options?: { schema?: SchemaValidator<T>, ignoreErrors?: boolean }) {
    super();
    this.source = ensureDataSource(source);
    this.schema = options?.schema;
    if (options?.ignoreErrors !== undefined) this.ignoreErrors = options.ignoreErrors;
  }

  /**
   * Sets options for the NDJsonReader.
   * @param options Configuration options.
   * @returns The current NDJsonReader instance for chaining.
   */
  public setOptions(options: any): this {
    return this;
  }

  /**
   * Whether to ignore errors during processing (e.g., malformed lines).
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

  /**
   * Reads data records from the NDJSON file asynchronously, yielding each record as it's parsed.
   * @returns An AsyncIterableIterator of DataRecord objects.
   */
  public async *read(): AsyncIterableIterator<T> {
    const stream = await this.source.getStream();
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity // Recognizes both CRLF and LF as line endings
    });

    try {
      for await (const line of rl) {
        // Skip empty lines that might occur (e.g., at the end of the file or accidental blank lines)
        if (!line.trim()) {
          continue;
        }

        try {
          // Parse each non-empty line as a JSON object
          const record = JSON.parse(line);
          if (this.schema) {
            yield this.schema.parse(record);
          } else {
            yield record as T;
          }
        } catch (error) {
          if (this.ignoreErrors) {
            if (this.dlqWriter) {
              await this.dlqWriter.write({
                _raw_line: line,
                _error: error instanceof Error ? error.message : String(error),
                _type: 'parse_error'
              });
            }
            continue;
          }
          // Log an error or throw if a line cannot be parsed as valid JSON
          console.error(`NDJsonReader: Error parsing JSON line from ${this.source.name()}: "${line.substring(0, 100)}..."`, error);
          throw new Error(`Invalid JSON format in ${this.source.name()} on line: ${line.substring(0, 50)}...`);
        }
      }
    } finally {
      // We do NOT close the dlqWriter here, because it might be shared
    }
  }
}
