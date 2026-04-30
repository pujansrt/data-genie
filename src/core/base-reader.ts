import { DataReader, DataRecord, DataWriter } from './interfaces';
import { RecordTransformation } from '@/transformers/transforming-reader';
import { SchemaValidator } from '@/transformers/schema-validating-reader';
import { Job, JobMetrics, JobOptions } from './job';

/**
 * BaseReader provides a common foundation for all readers, 
 * offering fluent methods for transformation and validation.
 */
export abstract class BaseReader<T = DataRecord> implements DataReader<T> {
  abstract read(): AsyncIterableIterator<T>;

  /**
   * Chains a transformation to this reader.
   */
  public transform<TOut>(fn: RecordTransformation<T, TOut>): BaseReader<TOut> {
    const { TransformingReader } = require('@/transformers/transforming-reader');
    return new TransformingReader(this).add(fn);
  }

  /**
   * Chains a schema validation to this reader.
   */
  public validate<TOut>(schema: SchemaValidator<TOut>): BaseReader<TOut> {
    const { SchemaValidatingReader } = require('@/transformers/schema-validating-reader');
    return new SchemaValidatingReader(this, schema);
  }

  /**
   * Whether to ignore errors during processing.
   * Base implementation does nothing, should be overridden by readers that support it.
   */
  public setIgnoreErrors(value: boolean): this {
    return this;
  }

  /**
   * Sets a DataWriter to act as a Dead Letter Queue (DLQ).
   * Base implementation does nothing, should be overridden by readers that support it.
   */
  public setDLQ(writer: DataWriter<any>): this {
    return this;
  }

  /**
   * Runs a job by writing the contents of this reader to the provided writer.
   */
  public async write(writer: DataWriter<T>, options?: JobOptions): Promise<JobMetrics> {
    return Job.run(this, writer, options);
  }

  /**
   * Runs a job using a callback function for every record.
   * Provides full type inference for the record.
   */
  public async writeToCallback(callback: (record: T) => Promise<void> | void, options?: JobOptions): Promise<JobMetrics> {
    const { CallbackWriter } = require('@/writers/callback-writer');
    return Job.run(this, new CallbackWriter(callback), options);
  }
}
