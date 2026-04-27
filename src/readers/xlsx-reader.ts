import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import * as ExcelJS from 'exceljs';

export interface XlsxReaderOptions {
  sheetName?: string;
  sheetIndex?: number;
  hasFieldNamesInFirstRow?: boolean;
}

/**
 * XlsxReader reads data from Excel files using a streaming approach.
 * Highly memory efficient for large XLSX files.
 */
export class XlsxReader implements DataReader {
  private source: DataSource;
  private options: XlsxReaderOptions;

  constructor(source: string | DataSource, options: XlsxReaderOptions = {}) {
    try {
      require.resolve('exceljs');
    } catch (e) {
      throw new Error("The 'exceljs' package is required to use XlsxReader. Please install it with 'npm install exceljs'.");
    }
    this.source = ensureDataSource(source);
    this.options = {
      sheetIndex: 1,
      hasFieldNamesInFirstRow: true,
      ...options
    };
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    const stream = await this.source.getStream();
    const workbookReader = new (ExcelJS as any).stream.xlsx.WorkbookReader(stream, {
      worksheets: 'emit',
    });

    for await (const worksheetReader of workbookReader) {
      // Check if this is the worksheet we want
      const isTargetSheet = this.options.sheetName 
        ? worksheetReader.name === this.options.sheetName 
        : worksheetReader.id === this.options.sheetIndex;

      if (!isTargetSheet) {
        // Skip rows for other sheets
        for await (const _ of worksheetReader) { /* consume */ }
        continue;
      }

      let fieldNames: string[] = [];
      let rowCount = 0;

      for await (const row of worksheetReader) {
        rowCount++;
        
        // Extract values (ExcelJS row.values is 1-indexed)
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];

        if (rowCount === 1 && this.options.hasFieldNamesInFirstRow) {
          fieldNames = values.map(v => String(v));
          continue;
        }

        const record: DataRecord = {};
        if (fieldNames.length > 0) {
          fieldNames.forEach((name, index) => {
            record[name] = values[index];
          });
        } else {
          // If no headers, use col1, col2, etc.
          values.forEach((val, index) => {
            record[`col${index + 1}`] = val;
          });
        }

        yield record;
      }
    }
  }
}
