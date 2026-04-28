import { parse } from 'csv-parse';
import { DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { SchemaValidator } from '@/transformers/schema-validating-reader';
import { BaseReader } from '@/core/base-reader';

export interface CSVReaderOptions<T> {
  schema?: SchemaValidator<T>;
  hasFieldNamesInFirstRow?: boolean;
  delimiter?: string;
}

export class CSVReader<T = DataRecord> extends BaseReader<T> {
  private source: DataSource;
  private hasFieldNamesInFirstRow: boolean = true;
  private fieldSeparator: string = ',';
  private schema?: SchemaValidator<T>;

  constructor(source: string | DataSource, options?: CSVReaderOptions<T>) {
    super();
    this.source = ensureDataSource(source);
    if (options) {
      this.schema = options.schema;
      if (options.hasFieldNamesInFirstRow !== undefined) this.hasFieldNamesInFirstRow = options.hasFieldNamesInFirstRow;
      if (options.delimiter !== undefined) this.fieldSeparator = options.delimiter;
    }
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    this.hasFieldNamesInFirstRow = value;
    return this;
  }

  public setFieldSeparator(separator: string): this {
    this.fieldSeparator = separator;
    return this;
  }

  public async *read(): AsyncIterableIterator<T> {
    const stream = await this.source.getStream();

    const parser = stream.pipe(
      parse({
        columns: this.hasFieldNamesInFirstRow,
        delimiter: this.fieldSeparator,
        skip_empty_lines: true
      })
    );

    for await (const record of parser) {
      if (this.schema) {
        yield this.schema.parse(record);
      } else {
        yield record as T;
      }
    }
  }
}
