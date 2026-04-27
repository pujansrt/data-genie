import { CSVReader } from '@/readers/csv-reader';
import { CSVWriter } from '@/writers/csv-writer';
import { Job } from '@/core/job';
import * as fs from 'fs';
import * as path from 'path';

describe('CSV Handler', () => {
  const testInputFile = path.join(__dirname, 'test_input.csv');
  const testOutputFile = path.join(__dirname, 'test_output.csv');

  beforeAll(() => {
    fs.writeFileSync(testInputFile, 'id,name\n1,Alice\n2,Bob');
  });

  afterAll(() => {
    if (fs.existsSync(testInputFile)) fs.unlinkSync(testInputFile);
    if (fs.existsSync(testOutputFile)) fs.unlinkSync(testOutputFile);
  });

  it('should read and write CSV files correctly', async () => {
    const reader = new CSVReader(testInputFile).setFieldNamesInFirstRow(true);
    const writer = new CSVWriter(testOutputFile);

    await Job.run(reader, writer);

    const outputContent = fs.readFileSync(testOutputFile, 'utf8');
    expect(outputContent).toContain('id,name');
    expect(outputContent).toContain('1,Alice');
    expect(outputContent).toContain('2,Bob');
  });
});
