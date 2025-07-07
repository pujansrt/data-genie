import { createWriteStream, WriteStream } from 'fs';
import { stringify } from 'csv-stringify';
import { DataWriter, DataRecord } from '@/core/interfaces';

/**
 * TSVWriter class for writing data records to a Tab-Separated Values (TSV) file.
 * It uses the 'csv-stringify' library, configured specifically for tab delimiters.
 * Records are written incrementally, and a header row can be included.
 */
export class TSVWriter implements DataWriter {
  private readonly filePath: string;
  private readonly outputStream: WriteStream;
  private stringifier: ReturnType<typeof stringify>;
  private headerWritten: boolean = false;
  private fieldNames: string[] = []; // To store header names if explicitly set or inferred
  private hasFieldNamesInFirstRow: boolean = false; // Controls if a header row is written

  /**
   * Constructs a new TSVWriter.
   * @param filePath The path to the output TSV file.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
    this.outputStream = createWriteStream(this.filePath, { encoding: 'utf-8' });

    // Configure stringify for TSV: use tab as delimiter
    this.stringifier = stringify({
      delimiter: '\t'
      // If you need to handle fields containing tabs or newlines,
      // the 'csv-stringify' library will automatically quote them.
      // For strict TSV (where tabs/newlines are disallowed in fields),
      // you might need pre-processing or validation before passing to the writer.
    });
    this.stringifier.pipe(this.outputStream);

    // Handle potential errors on the stringifier or output stream
    this.stringifier.on('error', (err) => {
      console.error(`TSVWriter: Error in stringifier for ${this.filePath}:`, err);
      this.outputStream.destroy(err); // Propagate error to the stream
    });
    this.outputStream.on('error', (err) => {
      console.error(`TSVWriter: Error writing to file ${this.filePath}:`, err);
    });
  }

  /**
   * Specifies whether the first row written should be a header row containing the field names.
   * If true, `setFieldNames` can be used to explicitly define names, or they will be inferred
   * from the first record.
   * @param value True to write field names in the first row, false otherwise.
   * @returns The current TSVWriter instance for chaining.
   */
  public setFieldNamesInFirstRow(value: boolean): this {
    this.hasFieldNamesInFirstRow = value;
    return this;
  }

  /**
   * Explicitly sets the names of the fields. These names will be used for the header row
   * (if `hasFieldNamesInFirstRow` is true) and to determine the order of values from `DataRecord`s.
   * If not called, field names will be inferred from the first record's keys.
   * @param names A list of string names for the fields (column headers).
   * @returns The current TSVWriter instance for chaining.
   */
  public setFieldNames(...names: string[]): this {
    this.fieldNames = names;
    return this;
  }

  /**
   * Writes a single data record to the TSV file.
   * Handles writing the header row if configured and not yet written.
   * @param record The DataRecord object to write.
   * @returns A Promise that resolves when the record has been written to the stream.
   */
  public async write(record: DataRecord): Promise<void> {
    // Determine field names if not explicitly set and not yet inferred
    if (!this.headerWritten && this.fieldNames.length === 0) {
      this.fieldNames = Object.keys(record);
    }

    // Write header if enabled and not already written
    if (this.hasFieldNamesInFirstRow && !this.headerWritten) {
      // Ensure field names are available before writing header
      if (this.fieldNames.length === 0) {
        throw new Error('Field names must be set or inferrable from the first record when hasFieldNamesInFirstRow is true.');
      }
      await new Promise<void>((resolve, reject) => {
        this.stringifier.write(this.fieldNames, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      this.headerWritten = true;
    }

    // Map the record object to an array of values based on the determined field names order
    const recordArray = this.fieldNames.map((fieldName) => record[fieldName]);

    return new Promise((resolve, reject) => {
      this.stringifier.write(recordArray, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Writes all data records from an asynchronous iterable to the TSV file.
   * @param records An AsyncIterableIterator of DataRecord objects.
   * @returns A Promise that resolves when all records have been written.
   */
  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  /**
   * Closes the underlying write stream. This should be called when all data has been written
   * to ensure all buffered data is flushed to the file and resources are released.
   * @returns A Promise that resolves when the stream is closed.
   */
  public async close(): Promise<void> {
    return new Promise((resolve) => {
      this.stringifier.end(() => {
        this.outputStream.end(() => {
          resolve();
        });
      });
    });
  }
}
