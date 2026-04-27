import { DataWriter, DataRecord } from '@/core/interfaces';

/**
 * MultiWriter allows writing the same data record to multiple sinks simultaneously.
 * Ideal for "Fan-out" patterns (e.g., write to DB and log to Console).
 */
export class MultiWriter implements DataWriter {
  private writers: DataWriter[];

  constructor(...writers: DataWriter[]) {
    this.writers = writers;
  }

  public async write(record: DataRecord): Promise<void> {
    // Write to all sinks in parallel
    await Promise.all(this.writers.map((writer) => writer.write(record)));
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    await Promise.all(this.writers.map((writer) => writer.close()));
  }
}
