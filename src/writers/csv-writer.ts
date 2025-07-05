import { createWriteStream } from 'fs';
import { stringify } from 'csv-stringify';
import { DataWriter, DataRecord } from '@/core/interfaces';

export class CSVWriter implements DataWriter {
  private filePath: string;
  private outputStream: ReturnType<typeof createWriteStream>;
  private stringifier: ReturnType<typeof stringify>;
  private headerWritten: boolean = false;
  private fieldNames: string[] = []; // To store header names if needed

  constructor(filePath: string) {
    this.filePath = filePath;
    this.outputStream = createWriteStream(this.filePath);
    this.stringifier = stringify();
    this.stringifier.pipe(this.outputStream);
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    // Logic to handle writing header row
    return this;
  }

  public async write(record: DataRecord): Promise<void> {
    if (!this.headerWritten && this.fieldNames.length === 0) {
      // Infer field names from the first record if not explicitly set
      this.fieldNames = Object.keys(record);
      this.stringifier.write(this.fieldNames);
      this.headerWritten = true;
    } else if (!this.headerWritten && this.fieldNames.length > 0) {
      this.stringifier.write(this.fieldNames);
      this.headerWritten = true;
    }
    const recordArray = this.fieldNames.map((fieldName) => record[fieldName]);
    this.stringifier.write(recordArray);
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

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
