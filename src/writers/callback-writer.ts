import { DataWriter, DataRecord } from '@/core/interfaces';

/**
 * CallbackWriter allows executing a custom function for every record processed.
 * Ideal for pushing data to APIs, message queues (RabbitMQ/Kafka), or custom logs.
 */
export class CallbackWriter implements DataWriter {
  constructor(private callback: (record: DataRecord) => Promise<void> | void) {}

  public async write(record: DataRecord): Promise<void> {
    await this.callback(record);
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    // No-op for simple callbacks
  }
}
