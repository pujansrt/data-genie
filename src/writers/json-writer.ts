import { writeFileSync } from 'fs';
import { DataWriter, DataRecord } from '@/core/interfaces';

export class JsonWriter implements DataWriter {
  private filePath: string;
  private records: DataRecord[] = [];

  constructor(filePath: string) {
    this.filePath = filePath;
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
    writeFileSync(this.filePath, JSON.stringify(this.records, null, 2));
  }
}
