import { Writable } from 'stream';
import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { ensureDataSink } from '@/core/transport-utils';

export class JsonWriter<T = DataRecord> implements DataWriter<T> {
  private sink: DataSink;
  private outputStream?: Writable;
  private firstRecord: boolean = true;
  private isClosed: boolean = false;

  constructor(sink: string | DataSink) {
    this.sink = ensureDataSink(sink);
  }

  private async initializeStream(): Promise<void> {
    if (this.outputStream) return;
    this.outputStream = await this.sink.getStream();
    return new Promise((resolve, reject) => {
      this.outputStream!.write('[\n', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async write(record: T): Promise<void> {
    if (this.isClosed) throw new Error('Writer is already closed');
    await this.initializeStream();

    const prefix = this.firstRecord ? '  ' : ',\n  ';
    this.firstRecord = false;

    return new Promise((resolve, reject) => {
      this.outputStream!.write(prefix + JSON.stringify(record, null, 2).replace(/\n/g, '\n  '), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async writeAll(records: AsyncIterableIterator<T>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    if (this.isClosed) return;
    this.isClosed = true;

    // If no records were written, we still need to open the stream to write []
    if (!this.outputStream) {
        this.outputStream = await this.sink.getStream();
        return new Promise((resolve, reject) => {
            this.outputStream!.write('[]', (err) => {
                if (err) return reject(err);
                this.finalize(resolve, reject);
            });
        });
    }

    return new Promise((resolve, reject) => {
      this.outputStream!.write('\n]', (err) => {
        if (err) return reject(err);
        this.finalize(resolve, reject);
      });
    });
  }

  private finalize(resolve: () => void, reject: (err: any) => void): void {
    if ((this.sink as any).finalize) {
        (this.sink as any).finalize().then(resolve).catch(reject);
    } else {
        this.outputStream!.end(resolve);
    }
  }
}
