import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import * as ExcelJS from 'exceljs';
import { ensureDataSource } from '@/core/transport-utils';
import { FileSource } from '@/core/file-transport';

export interface XlsxReaderOptions {
  sheetName?: string;
  sheetIndex?: number;
  hasFieldNamesInFirstRow?: boolean;
}

/**
 * XlsxReader reads data from Excel files using a streaming approach.
 */
export class XlsxReader implements DataReader {
  private source: DataSource;
  private options: XlsxReaderOptions;

  constructor(source: string | DataSource, options: XlsxReaderOptions = {}) {
    try {
      require.resolve('exceljs');
    } catch (e) {
      throw new Error("The 'exceljs' package is required to use XlsxReader.");
    }
    this.source = ensureDataSource(source);
    this.options = {
      sheetIndex: 1,
      hasFieldNamesInFirstRow: true,
      ...options
    };
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    let workbookReader: any;

    if (this.source instanceof FileSource) {
      workbookReader = new (ExcelJS as any).stream.xlsx.WorkbookReader((this.source as any).filePath, {
        worksheets: 'emit',
      });
    } else {
      const stream = await this.source.getStream();
      workbookReader = new (ExcelJS as any).stream.xlsx.WorkbookReader(stream, {
        worksheets: 'emit',
      });
    }

    for await (const worksheetReader of workbookReader) {
      const isTargetSheet = this.options.sheetName 
        ? worksheetReader.name === this.options.sheetName 
        : worksheetReader.id === this.options.sheetIndex;

      if (!isTargetSheet) {
        for await (const _ of worksheetReader) { /* consume to skip */ }
        continue;
      }

      let fieldNames: string[] = [];
      let rowCount = 0;

      for await (const row of worksheetReader) {
        rowCount++;
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];

        if (rowCount === 1 && this.options.hasFieldNamesInFirstRow) {
          fieldNames = values.map((v: any) => String(v));
          continue;
        }

        const record: DataRecord = {};
        if (fieldNames.length > 0) {
          fieldNames.forEach((name, index) => {
            record[name] = values[index];
          });
        } else {
          values.forEach((val: any, index: number) => {
            record[`col${index + 1}`] = val;
          });
        }

        yield record;
      }
    }
  }
}
