import { DataReader, DataRecord } from '@/core/interfaces';

/**
 * Abstract base class for all data transformation readers.
 * It takes an existing DataReader and provides an interface for chaining transformations.
 */
export abstract class DataTransformer implements DataReader {
  protected reader: DataReader;

  constructor(reader: DataReader) {
    this.reader = reader;
  }

  /**
   * Reads data from the underlying reader, applies transformations,
   * and yields the transformed records.
   * This method must be implemented by concrete transformer classes.
   */
  public abstract read(): AsyncIterableIterator<DataRecord>;
}
