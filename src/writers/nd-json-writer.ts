import { Writable } from 'stream';
import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { ensureDataSink } from '@/core/transport-utils';

export class NDJsonWriter implements DataWriter {
  private sink: DataSink;
  private outputStream?: Writable;

  constructor(sink: string | DataSink) {
    this.sink = ensureDataSink(sink);
  }

  private async initializeStream(): Promise<void> {
    if (this.outputStream) return;
    this.outputStream = await this.sink.getStream();
  }

  public async write(record: DataRecord): Promise<void> {
    await this.initializeStream();
    const jsonLine = JSON.stringify(record) + '\n';
    const canWrite = this.outputStream!.write(jsonLine);
    
    if (!canWrite) {
      await new Promise((resolve) => this.outputStream!.once('drain', resolve));
    }
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
