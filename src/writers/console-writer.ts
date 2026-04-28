import { DataRecord, DataWriter } from '@/core/interfaces';

export class ConsoleWriter<T = DataRecord> implements DataWriter<T> {
  public async write(record: T): Promise<void> {
    console.log(JSON.stringify(record));
  }

  public async writeAll(records: AsyncIterableIterator<T>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    console.log('--- End of data stream ---');
  }
}
