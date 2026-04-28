import { stringify, Stringifier } from 'csv-stringify';
import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { Writable } from 'stream';
import { ensureDataSink } from '@/core/transport-utils';

export class CSVWriter<T = DataRecord> implements DataWriter<T> {
  private sink: DataSink;
  private fieldNames: string[] = [];
  private headerWritten: boolean = false;
  private stringifier: Stringifier;
  private outputStream?: Writable;

  constructor(sink: string | DataSink) {
    this.sink = ensureDataSink(sink);
    this.stringifier = stringify();
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    this.headerWritten = !value;
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
    const canWrite = this.stringifier.write(recordArray);

    if (!canWrite) {
      await new Promise((resolve) => this.stringifier.once('drain', resolve));
    }
  }

  public async writeAll(records: AsyncIterableIterator<T>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
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
