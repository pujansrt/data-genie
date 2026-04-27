import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { ensureDataSink } from '@/core/transport-utils';

export class JsonWriter implements DataWriter {
  private sink: DataSink;
  private records: DataRecord[] = [];

  constructor(sink: string | DataSink) {
    this.sink = ensureDataSink(sink);
  }

  public async write(record: DataRecord): Promise<void> {
    this.records.push(record);
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      this.records.push(record);
    }
  }

  public async close(): Promise<void> {
    const stream = await this.sink.getStream();
    return new Promise((resolve, reject) => {
      stream.write(JSON.stringify(this.records, null, 2), (err) => {
        if (err) return reject(err);
        
        if ((this.sink as any).finalize) {
          (this.sink as any).finalize().then(resolve).catch(reject);
        } else {
          stream.end(resolve);
        }
      });
    });
  }
}
