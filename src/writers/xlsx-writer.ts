import { DataWriter, DataRecord } from '@/core/interfaces';
import * as ExcelJS from 'exceljs';

export interface XlsxWriterOptions {
  sheetName?: string;
  useStyles?: boolean;
}

/**
 * XlsxWriter writes data records to an Excel file using a streaming approach.
 * Suitable for generating very large XLSX reports.
 */
export class XlsxWriter implements DataWriter {
  private workbookWriter: any;
  private worksheet: any;
  private options: XlsxWriterOptions;
  private headerWritten: boolean = false;
  private fieldNames: string[] = [];

  constructor(filePath: string, options: XlsxWriterOptions = {}) {
    try {
      require.resolve('exceljs');
    } catch (e) {
      throw new Error("The 'exceljs' package is required to use XlsxWriter. Please install it with 'npm install exceljs'.");
    }
    this.options = {
      sheetName: 'Sheet1',
      useStyles: false,
      ...options
    };

    this.workbookWriter = new (ExcelJS as any).stream.xlsx.WorkbookWriter({
      filename: filePath,
      useStyles: this.options.useStyles
    });

    this.worksheet = this.workbookWriter.addWorksheet(this.options.sheetName);
  }

  public async write(record: DataRecord): Promise<void> {
    if (!this.headerWritten) {
      this.fieldNames = Object.keys(record);
      this.worksheet.columns = this.fieldNames.map(name => ({ header: name, key: name }));
      this.headerWritten = true;
    }

    this.worksheet.addRow(record).commit();
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    await this.workbookWriter.commit();
  }
}
