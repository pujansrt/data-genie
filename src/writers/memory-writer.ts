import { DataWriter, DataRecord } from '@/core/interfaces';

/**
 * MemoryWriter stores all records in an internal array.
 * Useful for testing, debugging, or small datasets that fit in RAM.
 */
export class MemoryWriter implements DataWriter {
  private records: DataRecord[] = [];

  public async write(record: DataRecord): Promise<void> {
    this.records.push(record);
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    // No-op for memory writer
  }

  /**
   * Returns the collected records.
   */
  public getRecords(): DataRecord[] {
    return this.records;
  }

  /**
   * Clears the internal storage.
   */
  public clear(): void {
    this.records = [];
  }
}
