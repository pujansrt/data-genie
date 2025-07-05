import { DataReader, DataRecord } from '@/core/interfaces';
import { DataTransformer } from '@/transformers/transformers';

export type RecordFilterRule = (record: DataRecord) => boolean;

export class FilteringReader extends DataTransformer {
  private rules: RecordFilterRule[] = [];

  constructor(reader: DataReader) {
    super(reader);
  }

  public add(rule: RecordFilterRule): this {
    this.rules.push(rule);
    return this;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
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
