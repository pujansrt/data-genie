import { NDJsonReader } from '@/readers/nd-json-reader';
import { NDJsonWriter } from '@/writers/nd-json-writer';
import { Job } from '@/core/job';
import * as fs from 'fs';
import * as path from 'path';

describe('NDJSON Handlers', () => {
  const ndjsonInput = path.join(__dirname, 'test.ndjson');
  const ndjsonOutput = path.join(__dirname, 'out.ndjson');

  beforeAll(() => {
    fs.writeFileSync(ndjsonInput, '{"id":1,"name":"Alice"}\n{"id":2,"name":"Bob"}');
  });

  afterAll(() => {
    [ndjsonInput, ndjsonOutput].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
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
