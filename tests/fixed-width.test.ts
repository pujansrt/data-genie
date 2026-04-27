import { FixedWidthReader } from '@/readers/fixed-width-reader';
import { FixedWidthWriter } from '@/writers/fixed-width-writer';
import { Job } from '@/core/job';
import * as fs from 'fs';
import * as path from 'path';

describe('Fixed Width Handler', () => {
  const fwFile = path.join(__dirname, 'test.fw');
  const outFile = path.join(__dirname, 'out.fw');

  afterAll(() => {
    [fwFile, outFile].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  });

  it('should read and write fixed-width files', async () => {
    // Write manually first to test reader
    // Widths: 5, 10
    fs.writeFileSync(fwFile, 'ID   NAME      \n1    Alice     \n2    Bob       ');

    const reader = new FixedWidthReader(fwFile)
      .setFieldWidths(5, 10)
      .setFieldNamesInFirstRow(true);

    const writer = new FixedWidthWriter(outFile)
      .setFieldWidths(5, 10)
      .setFieldNamesInFirstRow(true);

    await Job.run(reader, writer);

    const output = fs.readFileSync(outFile, 'utf8');
    expect(output).toContain('ID   NAME');
    expect(output).toContain('1    Alice');
  });
});
