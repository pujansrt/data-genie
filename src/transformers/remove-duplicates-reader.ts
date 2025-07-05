import { DataReader, DataRecord } from '@/core/interfaces';
import { DataTransformer } from '@/transformers/transformers';

export class RemoveDuplicatesReader extends DataTransformer {
  private fieldNames: string[];
  private seenKeys: Set<string> = new Set();

  constructor(reader: DataReader, ...fieldNames: string[]) {
    super(reader);
    this.fieldNames = fieldNames;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    for await (const record of this.reader.read()) {
      const key = this.fieldNames.map((fieldName) => record[fieldName]).join('|'); // Create a composite key
      if (!this.seenKeys.has(key)) {
        this.seenKeys.add(key);
        yield record;
      }
    }
  }
}
