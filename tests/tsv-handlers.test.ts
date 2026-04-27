import { TSVReader } from '@/readers/tsv-reader';
import { TSVWriter } from '@/writers/tsv-writer';
import { Job } from '@/core/job';
import * as fs from 'fs';
import * as path from 'path';

describe('TSV Handlers', () => {
  const tsvInput = path.join(__dirname, 'test.tsv');
  const tsvOutput = path.join(__dirname, 'out.tsv');

  beforeAll(() => {
    fs.writeFileSync(tsvInput, 'id\tname\n1\tAlice\n2\tBob');
  });

  afterAll(() => {
    [tsvInput, tsvOutput].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  });

  it('should handle TSV files correctly', async () => {
    const reader = new TSVReader(tsvInput).setFieldNamesInFirstRow(true);
    const writer = new TSVWriter(tsvOutput).setFieldNamesInFirstRow(true);
    await Job.run(reader, writer);

    const content = fs.readFileSync(tsvOutput, 'utf8');
    expect(content).toContain('id\tname');
    expect(content).toContain('1\tAlice');
  });
});
