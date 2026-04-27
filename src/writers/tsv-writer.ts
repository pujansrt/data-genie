import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { Writable } from 'stream';
import { ensureDataSink } from '@/core/transport-utils';

export class TSVWriter implements DataWriter {
  private sink: DataSink;
  private fieldNames: string[] = [];
  private headerWritten: boolean = false;
  private outputStream?: Writable;

  constructor(sink: string | DataSink) {
    this.sink = ensureDataSink(sink);
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    this.headerWritten = !value; // If false, we skip writing headers
    return this;
  }

  private async initializeStream(): Promise<void> {
    if (this.outputStream) return;
    this.outputStream = await this.sink.getStream();
  }

  public async write(record: DataRecord): Promise<void> {
    await this.initializeStream();

    if (!this.headerWritten) {
      this.fieldNames = Object.keys(record);
      await this.writeLine(this.fieldNames.join('\t'));
      this.headerWritten = true;
    }

    const row = this.fieldNames.map((name) => record[name]).join('\t');
    await this.writeLine(row);
  }

  private writeLine(line: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.outputStream!.write(line + '\n', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    if (!this.outputStream) return;
    return new Promise((resolve, reject) => {
      if ((this.sink as any).finalize) {
        (this.sink as any).finalize().then(resolve).catch(reject);
      } else {
        this.outputStream!.end(resolve);
      }
    });
  }
}
