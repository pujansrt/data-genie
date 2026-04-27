import { JsonReader } from '@/readers/json-reader';
import { JsonWriter } from '@/writers/json-writer';
import { Job } from '@/core/job';
import * as fs from 'fs';
import * as path from 'path';

describe('JSON Handler', () => {
  const testInputFile = path.join(__dirname, 'test_input.json');
  const testOutputFile = path.join(__dirname, 'test_output.json');

  beforeAll(() => {
    fs.writeFileSync(testInputFile, JSON.stringify([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]));
  });

  afterAll(() => {
    if (fs.existsSync(testInputFile)) fs.unlinkSync(testInputFile);
    if (fs.existsSync(testOutputFile)) fs.unlinkSync(testOutputFile);
  });

  it('should read and write JSON files correctly', async () => {
    const reader = new JsonReader(testInputFile);
    const writer = new JsonWriter(testOutputFile);

    await Job.run(reader, writer);

    const outputContent = JSON.parse(fs.readFileSync(testOutputFile, 'utf8'));
    expect(outputContent).toHaveLength(2);
    expect(outputContent[0].name).toBe('Alice');
    expect(outputContent[1].name).toBe('Bob');
  });
});
