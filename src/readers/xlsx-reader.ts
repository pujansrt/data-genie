import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { FileSource } from '@/core/file-transport';

export interface XlsxReaderOptions {
  sheetName?: string;
  sheetIndex?: number;
  hasFieldNamesInFirstRow?: boolean;
}

export class XlsxReader implements DataReader {
  private source: DataSource;
  private options: XlsxReaderOptions;

  constructor(source: string | DataSource, options: XlsxReaderOptions = {}) {
    this.source = ensureDataSource(source);
    this.options = {
      sheetIndex: 1,
      hasFieldNamesInFirstRow: true,
      ...options
    };
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    let ExcelJS;
    try {
      ExcelJS = await import('exceljs');
    } catch (e) {
      throw new Error("The 'exceljs' package is required to use XlsxReader. Please install it with 'npm install exceljs'.");
    }

    const workbook = new ExcelJS.Workbook();
    let stream;
    
    if (this.source instanceof FileSource) {
        // exceljs readFile is actually very efficient if it's a file
        await workbook.xlsx.readFile((this.source as any).filePath);
    } else {
        stream = await this.source.getStream();
        await workbook.xlsx.read(stream);
    }

    const worksheet = this.options.sheetName 
        ? workbook.getWorksheet(this.options.sheetName)
        : workbook.getWorksheet(this.options.sheetIndex!);

    if (!worksheet) return;

    let fieldNames: string[] = [];
    worksheet.eachRow((row, rowNumber) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        
        if (rowNumber === 1 && this.options.hasFieldNamesInFirstRow) {
            fieldNames = values.map(v => String(v));
            return;
        }

        const record: DataRecord = {};
        if (fieldNames.length > 0) {
            fieldNames.forEach((name, index) => {
                record[name] = values[index];
            });
        } else {
            values.forEach((val, index) => {
                record[`col${index + 1}`] = val;
            });
        }
        // Since eachRow is not async-friendly for yielding in a generator,
        // we'll use a standard for loop if possible or collect.
    });

    // Actually, for a truly streaming reader in ExcelJS, we use the Worksheet events.
    // Given the complexity of ExcelJS's streaming reader, a simpler way is:
    for (let i = (this.options.hasFieldNamesInFirstRow ? 2 : 1); i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        const record: DataRecord = {};
        
        if (this.options.hasFieldNamesInFirstRow && fieldNames.length === 0) {
            const firstRow = worksheet.getRow(1);
            fieldNames = (Array.isArray(firstRow.values) ? firstRow.values.slice(1) : []).map(v => String(v));
        }

        if (fieldNames.length > 0) {
            fieldNames.forEach((name, index) => { record[name] = values[index]; });
        } else {
            values.forEach((val, index) => { record[`col${index + 1}`] = val; });
        }
        yield record;
    }
  }
}
