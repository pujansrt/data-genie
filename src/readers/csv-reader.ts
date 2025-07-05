import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { DataReader, DataRecord } from '@/core/interfaces';

export class CSVReader implements DataReader {
  private filePath: string;
  private hasFieldNamesInFirstRow: boolean = false;
  private fieldSeparator: string = ',';

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    this.hasFieldNamesInFirstRow = value;
    return this;
  }

  public setFieldSeparator(separator: string): this {
    this.fieldSeparator = separator;
    return this;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    const parser = createReadStream(this.filePath).pipe(
      parse({
        columns: this.hasFieldNamesInFirstRow,
        delimiter: this.fieldSeparator,
        skip_empty_lines: true
      })
    );

    for await (const record of parser) {
      yield record;
    }
  }
}
