import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { parse } from 'csv-parse';

/**
 * TSVReader class for reading data records from a Tab-Separated Values (TSV) file.
 * It uses the 'csv-parse' library, configured specifically for tab delimiters.
 */
export class TSVReader implements DataReader {
  private source: DataSource;
  private hasFieldNamesInFirstRow: boolean = false;

  /**
   * Constructs a new TSVReader.
   * @param source The path to the TSV file or a DataSource.
   */
  constructor(source: string | DataSource) {
    this.source = ensureDataSource(source);
  }

  /**
   * Specifies whether the first row of the TSV file contains field names (headers).
   * If true, the yielded records will be objects with these field names as keys.
   * If false, records will be arrays or objects with numerical keys (e.g., {0: 'value1', 1: 'value2'}).
   * @param value True if the first row is a header, false otherwise.
   * @returns The current TSVReader instance for chaining.
   */
  public setFieldNamesInFirstRow(value: boolean): this {
    this.hasFieldNamesInFirstRow = value;
    return this;
  }

  /**
   * Reads data records from the TSV file asynchronously, yielding each record as it's parsed.
   * @returns An AsyncIterableIterator of DataRecord objects.
   */
  public async *read(): AsyncIterableIterator<DataRecord> {
    const stream = await this.source.getStream();
    const parser = stream.pipe(
      parse({
        columns: this.hasFieldNamesInFirstRow,
        delimiter: '\t', // Fixed delimiter for TSV
        skip_empty_lines: true
      })
    );

    for await (const record of parser) {
      yield record;
    }
  }
}
