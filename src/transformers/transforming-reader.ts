import { DataReader, DataRecord } from '@/core/interfaces';
import { DataTransformer } from './transformers';

export type RecordTransformation = (record: DataRecord) => DataRecord;

export class TransformingReader extends DataTransformer {
  private transformations: RecordTransformation[] = [];
  private condition: (record: DataRecord) => boolean = () => true; // Default to always true

  constructor(reader: DataReader) {
    super(reader);
  }

  public add(transformation: RecordTransformation): this {
    this.transformations.push(transformation);
    return this;
  }

  public setCondition(condition: (record: DataRecord) => boolean): this {
    this.condition = condition;
    return this;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    for await (let record of this.reader.read()) {
      if (this.condition(record)) {
        for (const transform of this.transformations) {
          record = transform(record);
        }
      }
      yield record;
    }
  }
}
