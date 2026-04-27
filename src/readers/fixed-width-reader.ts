import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import * as readline from 'readline';

export class FixedWidthReader implements DataReader {
  private source: DataSource;
  private fieldWidths: number[] = [];
  private fieldNames: string[] = [];
  private hasFieldNamesInFirstRow = false;
  private initialized = false;

  constructor(source: string | DataSource) {
    this.source = ensureDataSource(source);
  }

  public setFieldWidths(...widths: number[]): this {
    this.fieldWidths = widths;
    return this;
  }

  public setFieldNames(...names: string[]): this {
    this.fieldNames = names;
    return this;
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    this.hasFieldNamesInFirstRow = value;
    return this;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    if (this.fieldWidths.length === 0) {
      throw new Error('Field widths must be defined before reading.');
    }

    const stream = await this.source.getStream();
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;

      // If field names come from first row
      if (!this.initialized && this.hasFieldNamesInFirstRow) {
        this.fieldNames = this.splitLine(line);
        this.initialized = true;
        continue; // skip header line
      }

      // Auto-generate field names if not set
      if (!this.initialized && this.fieldNames.length === 0) {
        this.fieldNames = this.fieldWidths.map((_, i) => `field${i}`);
        this.initialized = true;
      }

      const values = this.splitLine(line);
      const record: DataRecord = {};
      for (let i = 0; i < this.fieldNames.length; i++) {
        record[this.fieldNames[i]] = values[i];
      }

      yield record;
    }
  }

  private splitLine(line: string): string[] {
    const values: string[] = [];
    let pos = 0;
    for (const width of this.fieldWidths) {
      const field = line.substring(pos, pos + width).trim();
      values.push(field);
      pos += width;
    }
    return values;
  }
}
