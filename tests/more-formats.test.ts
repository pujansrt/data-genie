import { TSVReader } from '@/readers/tsv-reader';
import { TSVWriter } from '@/writers/tsv-writer';
import { NDJsonReader } from '@/readers/nd-json-reader';
import { NDJsonWriter } from '@/writers/nd-json-writer';
import { Job } from '@/core/job';
import * as fs from 'fs';
import * as path from 'path';

describe('TSV and NDJSON Handlers', () => {
  const tsvInput = path.join(__dirname, 'test.tsv');
  const tsvOutput = path.join(__dirname, 'out.tsv');
  const ndjsonInput = path.join(__dirname, 'test.ndjson');
  const ndjsonOutput = path.join(__dirname, 'out.ndjson');

  beforeAll(() => {
    fs.writeFileSync(tsvInput, 'id\tname\n1\tAlice\n2\tBob');
    fs.writeFileSync(ndjsonInput, '{"id":1,"name":"Alice"}\n{"id":2,"name":"Bob"}');
  });

  afterAll(() => {
    [tsvInput, tsvOutput, ndjsonInput, ndjsonOutput].forEach(f => {
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

  it('should handle NDJSON files correctly', async () => {
    const reader = new NDJsonReader(ndjsonInput);
    const writer = new NDJsonWriter(ndjsonOutput);
    await Job.run(reader, writer);

    const content = fs.readFileSync(ndjsonOutput, 'utf8');
    expect(content).toContain('{"id":1,"name":"Alice"}');
    expect(content).toContain('{"id":2,"name":"Bob"}');
  });
});
