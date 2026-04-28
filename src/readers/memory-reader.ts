import { DataReader, DataRecord } from '@/core/interfaces';
import { SchemaValidator } from '@/transformers/schema-validating-reader';
import { BaseReader } from '@/core/base-reader';

/**
 * MemoryReader allows using a simple JavaScript array as a data source.
 * Great for unit tests or manual record creation.
 */
export class MemoryReader<T = DataRecord> extends BaseReader<T> {
  private records: any[];
  private schema?: SchemaValidator<T>;

  constructor(records: any[], options?: { schema?: SchemaValidator<T> }) {
    super();
    this.records = records;
    this.schema = options?.schema;
  }

  public async *read(): AsyncIterableIterator<T> {
    for (const record of this.records) {
      if (this.schema) {
        yield this.schema.parse(record);
      } else {
        yield record as T;
      }
    }
  }
}
