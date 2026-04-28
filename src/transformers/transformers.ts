import { DataReader, DataRecord } from '@/core/interfaces';

/**
 * Abstract base class for all data transformation readers.
 * It takes an existing DataReader and provides an interface for chaining transformations.
 */
export abstract class DataTransformer<TOut = DataRecord, TIn = any> implements DataReader<TOut> {
  protected reader: DataReader<TIn>;

  constructor(reader: DataReader<TIn>) {
    this.reader = reader;
  }

  /**
   * Reads data from the underlying reader, applies transformations,
   * and yields the transformed records.
   * This method must be implemented by concrete transformer classes.
   */
  public abstract read(): AsyncIterableIterator<TOut>;
}
