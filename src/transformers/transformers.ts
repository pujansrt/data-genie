import { DataReader, DataRecord } from '@/core/interfaces';
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
   * Reads data from the underlying reader, applies transformations,
   * and yields the transformed records.
   * This method must be implemented by concrete transformer classes.
   */
  public abstract read(): AsyncIterableIterator<TOut>;
}
