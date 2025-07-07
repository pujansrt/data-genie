import { createWriteStream, WriteStream } from 'fs';
import { DataWriter, DataRecord } from '@/core/interfaces';

/**
 * FixedWidthWriter class for writing data records to a file in a fixed-width format.
 * Each field's width is predefined, and values are padded or truncated to fit.
 */
export class FixedWidthWriter implements DataWriter {
  private readonly filePath: string;
  private outputStream: WriteStream;
  private fieldWidths: number[] = [];
  private fieldNames: string[] = [];
  private hasFieldNamesInFirstRow: boolean = false;
  private headerWritten: boolean = false;
  private initializedFieldNames: boolean = false; // To track if field names have been determined

  /**
   * Constructs a new FixedWidthWriter.
   * @param filePath The path to the output file.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
    this.outputStream = createWriteStream(this.filePath, { encoding: 'utf-8' });
  }

  /**
   * Sets the fixed widths for each field. This is mandatory before writing.
   * @param widths A list of numbers, where each number represents the width of a field.
   * @returns The current FixedWidthWriter instance for chaining.
   */
  public setFieldWidths(...widths: number[]): this {
    if (widths.some((w) => w <= 0)) {
      throw new Error('Field widths must be positive numbers.');
    }
    this.fieldWidths = widths;
    return this;
  }

  /**
   * Sets the names of the fields. If `hasFieldNamesInFirstRow` is true, these names
   * will be used to write the header row. Otherwise, they define the order of data
   * extraction from `DataRecord` objects.
   * @param names A list of string names for the fields.
   * @returns The current FixedWidthWriter instance for chaining.
   */
  public setFieldNames(...names: string[]): this {
    this.fieldNames = names;
    this.initializedFieldNames = true; // Field names are explicitly set
    return this;
  }

  /**
   * Specifies whether the first row written should be a header row containing the field names.
   * If true, `setFieldNames` must be called before writing any records.
   * @param value True to write field names in the first row, false otherwise.
   * @returns The current FixedWidthWriter instance for chaining.
   */
  public setFieldNamesInFirstRow(value: boolean): this {
    this.hasFieldNamesInFirstRow = value;
    return this;
  }

  /**
   * Writes a single data record to the fixed-width file.
   * @param record The DataRecord object to write.
   * @returns A Promise that resolves when the record has been written.
   * @throws Error if field widths are not defined.
   * @throws Error if `hasFieldNamesInFirstRow` is true but field names are not set.
   * @throws Error if the number of field names does not match the number of field widths.
   */
  public async write(record: DataRecord): Promise<void> {
    if (this.fieldWidths.length === 0) {
      throw new Error('Field widths must be defined using setFieldWidths() before writing.');
    }

    // Ensure field names are determined if not explicitly set
    if (!this.initializedFieldNames) {
      this.fieldNames = Object.keys(record);
      this.initializedFieldNames = true;
    }

    // Validate that the number of field names matches the number of widths
    if (this.fieldNames.length !== this.fieldWidths.length) {
      throw new Error(`Number of field names (${this.fieldNames.length}) must match number of field widths (${this.fieldWidths.length}).`);
    }

    // Write header if enabled and not already written
    if (this.hasFieldNamesInFirstRow && !this.headerWritten) {
      // If header is expected, field names must have been set explicitly or inferred
      if (this.fieldNames.length === 0) {
        throw new Error('Field names must be set using setFieldNames() when hasFieldNamesInFirstRow is true.');
      }
      const headerLine = this.fieldNames.map((name, index) => this.formatField(name, this.fieldWidths[index])).join('');
      this.outputStream.write(headerLine + '\n');
      this.headerWritten = true;
    }

    // Format and write the data record
    const dataLine = this.fieldNames
      .map((fieldName, index) => {
        const value = record[fieldName] !== undefined ? record[fieldName] : ''; // Handle undefined values
        return this.formatField(value, this.fieldWidths[index]);
      })
      .join('');

    return new Promise((resolve, reject) => {
      this.outputStream.write(dataLine + '\n', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Writes all data records from an asynchronous iterable to the fixed-width file.
   * @param records An AsyncIterableIterator of DataRecord objects.
   * @returns A Promise that resolves when all records have been written.
   */
  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  /**
   * Closes the underlying write stream. This should be called when all data has been written.
   * @returns A Promise that resolves when the stream is closed.
   */
  public async close(): Promise<void> {
    return new Promise((resolve) => {
      this.outputStream.end(() => {
        resolve();
      });
    });
  }

  /**
   * Formats a single field value to fit the specified width.
   * It truncates if the value is too long and pads with spaces to the right if too short.
   * @param value The value to format.
   * @param width The target width for the field.
   * @returns The formatted string.
   */
  private formatField(value: any, width: number): string {
    let strValue = String(value);
    if (strValue.length > width) {
      return strValue.substring(0, width); // Truncate
    } else if (strValue.length < width) {
      return strValue.padEnd(width, ' '); // Pad with spaces
    }
    return strValue;
  }
}
