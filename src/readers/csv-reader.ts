import { parse } from 'csv-parse';
import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';

export class CSVReader implements DataReader {
  private source: DataSource;
  private hasFieldNamesInFirstRow: boolean = false;
  private fieldSeparator: string = ',';

  constructor(source: string | DataSource) {
    this.source = ensureDataSource(source);
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
    const stream = await this.source.getStream();

    const parser = stream.pipe(
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
