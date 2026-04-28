import { DataReader, DataRecord } from '@/core/interfaces';
import { DataTransformer } from './transformers';

export type RecordTransformation<TIn = any, TOut = any> = (record: TIn) => TOut;

export class TransformingReader<TIn = DataRecord, TOut = TIn> extends DataTransformer<TOut, TIn> {
  private transformations: RecordTransformation<any, any>[] = [];
  private condition: (record: TIn) => boolean = () => true; // Default to always true

  constructor(reader: DataReader<TIn>) {
    super(reader);
  }

  public add<TNewOut = TOut>(transformation: RecordTransformation<TOut, TNewOut>): TransformingReader<TIn, TNewOut> {
    this.transformations.push(transformation);
    return this as any;
  }

  public setCondition(condition: (record: TIn) => boolean): this {
    this.condition = condition;
    return this;
  }

  public async *read(): AsyncIterableIterator<TOut> {
    for await (let record of this.reader.read()) {
      if (this.condition(record)) {
        for (const transform of this.transformations) {
          record = transform(record);
        }
      }
      yield record as unknown as TOut;
    }
  }
}
