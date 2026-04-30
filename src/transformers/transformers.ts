import { DataReader, DataRecord, DataWriter } from '@/core/interfaces';
import { BaseReader } from '@/core/base-reader';

/**
 * Abstract base class for all data transformation readers.
 * It takes an existing DataReader and provides an interface for chaining transformations.
 */
export abstract class DataTransformer<TOut = DataRecord, TIn = any> extends BaseReader<TOut> {
  protected reader: DataReader<TIn>;

  constructor(reader: DataReader<TIn>) {
    super();
    this.reader = reader;
  }

  /**
   * Sets a DataWriter to act as a Dead Letter Queue (DLQ) and propagates it to the underlying reader.
   */
  public setDLQ(writer: DataWriter<any>): this {
    if (this.reader && (this.reader as any).setDLQ) {
      (this.reader as any).setDLQ(writer);
    }
    return this;
  }

  /**
   * Reads data from the underlying reader, applies transformations,
   * and yields the transformed records.
   */
  public abstract read(): AsyncIterableIterator<TOut>;
}
