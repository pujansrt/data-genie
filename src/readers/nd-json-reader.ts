import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
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

  /**
   * Constructs a new NDJsonReader.
   * @param source The path to the NDJSON file or a DataSource.
   */
  constructor(source: string | DataSource, options?: { schema?: SchemaValidator<T> }) {
    super();
    this.source = ensureDataSource(source);
    this.schema = options?.schema;
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
   * Reads data records from the NDJSON file asynchronously, yielding each record as it's parsed.
   * @returns An AsyncIterableIterator of DataRecord objects.
   */
  public async *read(): AsyncIterableIterator<T> {
    const stream = await this.source.getStream();
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity // Recognizes both CRLF and LF as line endings
    });

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
        // Log an error or throw if a line cannot be parsed as valid JSON
        console.error(`NDJsonReader: Error parsing JSON line from ${this.source.name()}: "${line.substring(0, 100)}..."`, error);
        throw new Error(`Invalid JSON format in ${this.source.name()} on line: ${line.substring(0, 50)}...`);
      }
    }
  }
}
