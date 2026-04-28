import { DataWriter, DataRecord } from '@/core/interfaces';

/**
 * BatchCallbackWriter collects records into batches before executing a callback.
 * Ideal for bulk database inserts or batched API calls.
 */
export class BatchCallbackWriter implements DataWriter {
  private batch: DataRecord[] = [];

  constructor(
    private batchSize: number,
    private callback: (batch: DataRecord[]) => Promise<void> | void
  ) {}

  public async write(record: DataRecord): Promise<void> {
    this.batch.push(record);
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length > 0) {
      const currentBatch = [...this.batch];
      this.batch = []; // Clear immediately to prevent double-processing if callback throws
      await this.callback(currentBatch);
    }
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    await this.flush();
  }
}
