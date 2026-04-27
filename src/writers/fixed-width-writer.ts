import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { Writable } from 'stream';
import { ensureDataSink } from '@/core/transport-utils';

export interface FixedWidthWriterOptions {
  sheetName?: string; // Kept for compatibility if needed elsewhere
}

/**
 * FixedWidthWriter class for writing data records to a sink in a fixed-width format.
 */
export class FixedWidthWriter implements DataWriter {
  private sink: DataSink;
  private outputStream?: Writable;
  private fieldWidths: number[] = [];
  private fieldNames: string[] = [];
  private hasFieldNamesInFirstRow: boolean = false;
  private headerWritten: boolean = false;
  private initializedFieldNames: boolean = false;

  constructor(sink: string | DataSink) {
    this.sink = ensureDataSink(sink);
  }

  private async initializeStream(): Promise<void> {
    if (this.outputStream) return;
    this.outputStream = await this.sink.getStream();
  }

  public setFieldWidths(...widths: number[]): this {
    if (widths.some((w) => w <= 0)) {
      throw new Error('Field widths must be positive numbers.');
    }
    this.fieldWidths = widths;
    return this;
  }

  public setFieldNames(...names: string[]): this {
    this.fieldNames = names;
    this.initializedFieldNames = true;
    return this;
  }

  public setFieldNamesInFirstRow(value: boolean): this {
    this.hasFieldNamesInFirstRow = value;
    return this;
  }

  public async write(record: DataRecord): Promise<void> {
    await this.initializeStream();

    if (this.fieldWidths.length === 0) {
      throw new Error('Field widths must be defined using setFieldWidths() before writing.');
    }

    if (!this.initializedFieldNames) {
      this.fieldNames = Object.keys(record);
      this.initializedFieldNames = true;
    }

    if (this.fieldNames.length !== this.fieldWidths.length) {
      throw new Error(`Number of field names (${this.fieldNames.length}) must match number of field widths (${this.fieldWidths.length}).`);
    }

    if (this.hasFieldNamesInFirstRow && !this.headerWritten) {
      const headerLine = this.fieldNames.map((name, index) => this.formatField(name, this.fieldWidths[index])).join('');
      this.outputStream!.write(headerLine + '\n');
      this.headerWritten = true;
    }

    const dataLine = this.fieldNames
      .map((fieldName, index) => {
        const value = record[fieldName] !== undefined ? record[fieldName] : '';
        return this.formatField(value, this.fieldWidths[index]);
      })
      .join('');

    return new Promise((resolve, reject) => {
      this.outputStream!.write(dataLine + '\n', (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    if (!this.outputStream) return;
    return new Promise((resolve, reject) => {
      if ((this.sink as any).finalize) {
        (this.sink as any).finalize().then(resolve).catch(reject);
      } else {
        this.outputStream!.end(resolve);
      }
    });
  }

  private formatField(value: any, width: number): string {
    let strValue = String(value);
    if (strValue.length > width) {
      return strValue.substring(0, width);
    } else if (strValue.length < width) {
      return strValue.padEnd(width, ' ');
    }
    return strValue;
  }
}
