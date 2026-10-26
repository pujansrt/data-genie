import { stringify, Stringifier } from 'csv-stringify';
import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { Writable } from 'stream';
import { ensureDataSink } from '@/core/transport-utils';

export interface CSVWriterOptions {
  delimiter?: string;
  hasFieldNamesInFirstRow?: boolean;
}

export class CSVWriter<T = DataRecord> implements DataWriter<T> {
  private sink: DataSink;
  private fieldNames: string[] = [];
  private headerWritten: boolean = false;
  private fieldSeparator: string = ',';
  private stringifier: Stringifier;
  private outputStream?: Writable;

  constructor(sink: string | DataSink, options?: string | CSVWriterOptions) {
    this.sink = ensureDataSink(sink);
    if (typeof options === 'string') {
      this.fieldSeparator = options;
    } else if (options) {
      if (options.delimiter !== undefined) this.fieldSeparator = options.delimiter;
      if (options.hasFieldNamesInFirstRow !== undefined) this.headerWritten = !options.hasFieldNamesInFirstRow;
    }
    this.stringifier = stringify({ delimiter: this.fieldSeparator });
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    this.headerWritten = !value;
    return this;
  }

  public setFieldSeparator(separator: string): this {
    this.fieldSeparator = separator;
    this.stringifier = stringify({ delimiter: this.fieldSeparator });
    return this;
  }

  private async initializeStream(): Promise<void> {
    if (this.outputStream) return;
    this.outputStream = await this.sink.getStream();
    this.stringifier.pipe(this.outputStream);
  }

  public async write(record: T): Promise<void> {
    await this.initializeStream();

    if (!this.headerWritten && this.fieldNames.length === 0) {
      this.fieldNames = Object.keys(record as any);
      this.stringifier.write(this.fieldNames);
      this.headerWritten = true;
    }

    const recordArray = this.fieldNames.map((fieldName) => (record as any)[fieldName]);
    this.stringifier.write(recordArray);

    // If the output stream is full, we must wait, regardless of what the stringifier says
    if (this.outputStream && (this.outputStream as any).writableLength > this.outputStream.writableHighWaterMark) {
        await new Promise((resolve) => this.outputStream!.once('drain', resolve));
    }
  }

  public async writeAll(records: AsyncIterableIterator<T>): Promise<void> {
    for await (const record of records) {
      if (record !== null && record !== undefined) {
        await this.write(record);
      }
    }
  }


  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stringifier.end(() => {
        if (!this.outputStream) {
            resolve();
            return;
        }

        this.outputStream.end(async () => {
            try {
                if ((this.sink as any).finalize) {
                    await (this.sink as any).finalize();
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
      });
    });
  }
}
