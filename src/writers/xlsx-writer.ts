import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { ensureDataSink } from '@/core/transport-utils';
import { FileSink } from '@/core/file-transport';

export interface XlsxWriterOptions {
  sheetName?: string;
  useStyles?: boolean;
}

/**
 * XlsxWriter writes data records to an Excel file using a streaming approach.
 */
export class XlsxWriter implements DataWriter {
  private workbookWriter: any;
  private worksheet: any;
  private options: XlsxWriterOptions;
  private headerWritten: boolean = false;
  private fieldNames: string[] = [];
  private sink: DataSink;

  constructor(sink: string | DataSink, options: XlsxWriterOptions = {}) {
    this.sink = ensureDataSink(sink);
    this.options = {
      sheetName: 'Sheet1',
      useStyles: false,
      ...options
    };
  }

  private async initialize(): Promise<void> {
    if (this.workbookWriter) return;

    let ExcelJS;
    try {
      ExcelJS = await import('exceljs');
    } catch (e) {
      throw new Error("The 'exceljs' package is required to use XlsxWriter. Please install it with 'npm install exceljs'.");
    }

    const config: any = { useStyles: this.options.useStyles };
    if (this.sink instanceof FileSink) {
        config.filename = (this.sink as any).filePath;
    } else {
        config.stream = await this.sink.getStream();
    }

    this.workbookWriter = new (ExcelJS as any).stream.xlsx.WorkbookWriter(config);
    this.worksheet = this.workbookWriter.addWorksheet(this.options.sheetName);
  }

  public async write(record: DataRecord): Promise<void> {
    await this.initialize();

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
    if (this.workbookWriter) {
      await this.workbookWriter.commit();
      if ((this.sink as any).finalize) {
        await (this.sink as any).finalize();
      }
    }
  }
}
