import { DataRecord, DataWriter } from '@/core/interfaces';

export class ConsoleWriter implements DataWriter {
  public async write(record: DataRecord): Promise<void> {
    console.log(JSON.stringify(record));
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      console.log(JSON.stringify(record));
    }
  }

  public async close(): Promise<void> {
    console.log('--- End of data stream ---');
  }
}
