import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import * as ExcelJS from 'exceljs';
import { ensureDataSink } from '@/core/transport-utils';
import { FileSink } from '@/core/file-transport';

export interface XlsxWriterOptions {
  sheetName?: string;
  useStyles?: boolean;
}

export class XlsxWriter implements DataWriter {
  private workbookWriter: any;
  private worksheet: any;
  private options: XlsxWriterOptions;
  private headerWritten: boolean = false;
  private fieldNames: string[] = [];
  private sink: DataSink;

  constructor(sink: string | DataSink, options: XlsxWriterOptions = {}) {
    try {
      require.resolve('exceljs');
    } catch (e) {
      throw new Error("The 'exceljs' package is required to use XlsxWriter.");
    }
    
    this.sink = ensureDataSink(sink);
    this.options = {
      sheetName: 'Sheet1',
      useStyles: false,
      ...options
    };

    // ExcelJS streaming writer needs a filename or a stream
    // For now, we assume FileSink or we could get the stream
    const config: any = { useStyles: this.options.useStyles };
    if (this.sink instanceof FileSink) {
        config.filename = (this.sink as any).filePath;
    } else {
        // Fallback or potentially get stream (ExcelJS supports stream)
    }

    this.workbookWriter = new (ExcelJS as any).stream.xlsx.WorkbookWriter(config);
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
