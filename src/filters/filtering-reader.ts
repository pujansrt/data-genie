import { DataReader, DataRecord } from '@/core/interfaces';
import { DataTransformer } from '@/transformers/transformers';

export type RecordFilterRule<T = any> = (record: T) => boolean;

export class FilteringReader<T = DataRecord> extends DataTransformer<T, T> {
  private rules: RecordFilterRule<T>[] = [];

  constructor(reader: DataReader<T>) {
    super(reader);
  }

  public add(rule: RecordFilterRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  public async *read(): AsyncIterableIterator<T> {
    for await (const record of this.reader.read()) {
      let passedAllRules = true;
      for (const rule of this.rules) {
        if (!rule(record)) {
          passedAllRules = false;
          break;
        }
      }
      if (passedAllRules) {
        yield record;
      }
    }
  }
}
