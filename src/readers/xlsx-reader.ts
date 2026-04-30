import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { FileSource } from '@/core/file-transport';
import { SchemaValidator } from '@/transformers/schema-validating-reader';
import { BaseReader } from '@/core/base-reader';

export interface XlsxReaderOptions<T = any> {
  sheetName?: string;
  sheetIndex?: number;
  hasFieldNamesInFirstRow?: boolean;
  schema?: SchemaValidator<T>;
}

export class XlsxReader<T = DataRecord> extends BaseReader<T> {
  private source: DataSource;
  private options: XlsxReaderOptions<T>;
  private schema?: SchemaValidator<T>;

  constructor(source: string | DataSource | Buffer, options: XlsxReaderOptions<T> = {}) {
    super();
    this.source = ensureDataSource(source);
    this.options = {
      sheetIndex: 1,
      hasFieldNamesInFirstRow: true,
      ...options
    };
    this.schema = options.schema;
  }

  public async *read(): AsyncIterableIterator<T> {
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
    if (this.options.hasFieldNamesInFirstRow) {
        const firstRow = worksheet.getRow(1);
        fieldNames = (Array.isArray(firstRow.values) ? firstRow.values.slice(1) : []).map(v => String(v));
    }

    for (let i = (this.options.hasFieldNamesInFirstRow ? 2 : 1); i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        const record: DataRecord = {};
        
        if (fieldNames.length > 0) {
            fieldNames.forEach((name, index) => { record[name] = values[index]; });
        } else {
            values.forEach((val, index) => { record[`col${index + 1}`] = val; });
        }

        if (this.schema) {
            yield this.schema.parse(record);
        } else {
            yield record as unknown as T;
        }
    }
  }
}
