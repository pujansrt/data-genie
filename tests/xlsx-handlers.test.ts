import { XlsxReader } from '@/readers/xlsx-reader';
import { XlsxWriter } from '@/writers/xlsx-writer';
import { Job } from '@/core/job';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

describe('Excel (XLSX) Handlers', () => {
  const testFile = path.join(__dirname, 'test.xlsx');
  const outFile = path.join(__dirname, 'out.xlsx');

  beforeAll(async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    sheet.columns = [
      { header: 'id', key: 'id' },
      { header: 'name', key: 'name' }
    ];
    sheet.addRow({ id: 1, name: 'Alice' });
    sheet.addRow({ id: 2, name: 'Bob' });
    await workbook.xlsx.writeFile(testFile);
  });

  afterAll(() => {
    [testFile, outFile].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  });

  it('should read XLSX using FileSource', async () => {
    const reader = new XlsxReader(testFile);
    const results = [];
    for await (const r of reader.read()) {
      results.push(r);
    }
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Alice');
  });

  it('should write XLSX to FileSink', async () => {
    const reader = new XlsxReader(testFile);
    const writer = new XlsxWriter(outFile);
    await Job.run(reader, writer);

    expect(fs.existsSync(outFile)).toBe(true);
    const outWorkbook = new ExcelJS.Workbook();
    await outWorkbook.xlsx.readFile(outFile);
    expect(outWorkbook.getWorksheet(1)!.rowCount).toBe(3);
  });
});
