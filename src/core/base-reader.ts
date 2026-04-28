import { DataReader, DataRecord } from './interfaces';
import { RecordTransformation } from '@/transformers/transforming-reader';
import { SchemaValidator } from '@/transformers/schema-validating-reader';

/**
 * BaseReader provides a common foundation for all readers, 
 * offering fluent methods for transformation and validation.
 */
export abstract class BaseReader<T = DataRecord> implements DataReader<T> {
  abstract read(): AsyncIterableIterator<T>;

  /**
   * Chains a transformation to this reader.
   */
  public transform<TOut>(fn: RecordTransformation<T, TOut>): DataReader<TOut> {
    // We import TransformingReader dynamically or here if we don't mind the dependency
    // To avoid circular dependencies at the top level, we can use a factory or dynamic import
    // But for now, let's see if we can just use the classes directly.
    const { TransformingReader } = require('@/transformers/transforming-reader');
    return new TransformingReader(this).add(fn);
  }

  /**
   * Chains a schema validation to this reader.
   */
  public validate<TOut>(schema: SchemaValidator<TOut>): DataReader<TOut> {
    const { SchemaValidatingReader } = require('@/transformers/schema-validating-reader');
    return new SchemaValidatingReader(this, schema);
  }
}
