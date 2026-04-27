import { XlsxReader } from '@/readers/xlsx-reader';
import { XlsxWriter } from '@/writers/xlsx-writer';
import { Job } from '@/core/job';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

describe('Excel (XLSX) Handlers', () => {
  const testFile = path.join(__dirname, 'test.xlsx');
  const outFile = path.join(__dirname, 'out.xlsx');

  afterAll(() => {
    [testFile, outFile].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  });

  it('should read and write XLSX files correctly', async () => {
    // 1. Create a real XLSX file for the reader
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    sheet.columns = [
      { header: 'id', key: 'id' },
      { header: 'name', key: 'name' }
    ];
    sheet.addRow({ id: 1, name: 'Alice' });
    sheet.addRow({ id: 2, name: 'Bob' });
    await workbook.xlsx.writeFile(testFile);

    // 2. Use XlsxReader and XlsxWriter
    const reader = new XlsxReader(testFile);
    const writer = new XlsxWriter(outFile);

    await Job.run(reader, writer);

    // 3. Verify the output file exists and has correct data
    expect(fs.existsSync(outFile)).toBe(true);
    
    const outWorkbook = new ExcelJS.Workbook();
    await outWorkbook.xlsx.readFile(outFile);
    const outSheet = outWorkbook.getWorksheet(1)!;
    
    expect(outSheet.rowCount).toBe(3); // Header + 2 rows
    expect(outSheet.getRow(2).getCell(2).value).toBe('Alice');
  });
});
