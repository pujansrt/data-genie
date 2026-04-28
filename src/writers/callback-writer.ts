import { DataWriter, DataRecord } from '@/core/interfaces';
import { SchemaValidator } from '@/transformers/schema-validating-reader';

/**
 * CallbackWriter allows executing a custom function for every record processed.
 * Ideal for pushing data to APIs, message queues (RabbitMQ/Kafka), or custom logs.
 */
export class CallbackWriter<T = DataRecord> implements DataWriter<T> {
  constructor(
    private callback: (record: T) => Promise<void> | void,
    options?: { schema?: SchemaValidator<T> }
  ) {}

  public async write(record: T): Promise<void> {
    await this.callback(record);
  }

  public async writeAll(records: AsyncIterableIterator<T>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    // No-op for simple callbacks
  }
}
