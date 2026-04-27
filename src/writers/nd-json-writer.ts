import { createWriteStream, WriteStream } from 'fs';
import { DataWriter, DataRecord } from '@/core/interfaces';

/**
 * NDJsonWriter class for writing data records to a file in NDJSON (Newline Delimited JSON) format.
 * Each DataRecord is stringified into a JSON object and written on a new line.
 * This is efficient for large datasets as it writes records incrementally without
 * holding all of them in memory.
 */
export class NDJsonWriter implements DataWriter {
  private filePath: string;
  private outputStream: WriteStream;

  /**
   * Constructs a new NDJsonWriter.
   * @param filePath The path to the output file.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
    // Create a write stream immediately, so we can write records as they come in.
    this.outputStream = createWriteStream(this.filePath, { encoding: 'utf-8' });

    // Handle potential errors on the output stream
    this.outputStream.on('error', (err) => {
      console.error(`NDJsonWriter: Error writing to file ${this.filePath}:`, err);
      // Depending on the application, you might want to re-throw or handle this more gracefully.
    });
  }

  /**
   * Sets options for the NDJsonWriter.
   * @param options Configuration options.
   * @returns The current NDJsonWriter instance for chaining.
   */
  public setOptions(options: any): this {
    return this;
  }

  /**
   * Writes a single data record to the NDJSON file.
   * The record is stringified into a JSON object and appended with a newline.
   * @param record The DataRecord object to write.
   * @returns A Promise that resolves when the record has been written to the stream.
   */
  public async write(record: DataRecord): Promise<void> {
    const jsonLine = JSON.stringify(record);
    return new Promise((resolve, reject) => {
      // Write the JSON string followed by a newline character.
      // The callback ensures the write operation is complete before resolving the promise.
      this.outputStream.write(jsonLine + '\n', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Writes all data records from an asynchronous iterable to the NDJSON file.
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
      // End the stream. This will flush any remaining buffered data and then close the file.
      this.outputStream.end(() => {
        resolve();
      });
    });
  }
}
