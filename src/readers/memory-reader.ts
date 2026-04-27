import { DataReader, DataRecord } from '@/core/interfaces';

/**
 * MemoryReader allows using a simple JavaScript array as a data source.
 * Great for unit tests or manual record creation.
 */
export class MemoryReader implements DataReader {
  private records: DataRecord[];

  constructor(records: DataRecord[]) {
    this.records = records;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    for (const record of this.records) {
      yield record;
    }
  }
}
