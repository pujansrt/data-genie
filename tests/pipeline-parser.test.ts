import * as fs from 'fs';
import { PipelineParser } from '@/core/pipeline-parser';

describe('PipelineParser', () => {
  const configPath = 'tests/declarative-pipeline.yaml';
  const outputPath = 'tests/output/declarative-output.json';

  beforeEach(() => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

  it('should run a pipeline from a YAML config file', async () => {
    await PipelineParser.run(configPath);

    expect(fs.existsSync(outputPath)).toBe(true);

    const outputContent = fs.readFileSync(outputPath, 'utf8');
    const records = JSON.parse(outputContent);

    // Initial users: John (30), Jane (24), Peter (45), Alice (35), Bob (28)
    // Filter age > 30: Peter (45), Alice (35)
    expect(records.length).toBe(2);
    
    expect(records[0]).toEqual({
      firstName: 'Peter',
      lastName: 'Jones',
      email: 'peter.jones@domain.net',
      age: 45
    });

    expect(records[1]).toEqual({
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice.brown@sample.com',
      age: 35
    });
  });

  it('should throw error if config file does not exist', async () => {
    await expect(PipelineParser.run('non-existent.yaml')).rejects.toThrow('Config file not found');
  });

  it('should throw error if config is invalid', async () => {
    const invalidConfigPath = 'tests/invalid-pipeline.yaml';
    fs.writeFileSync(invalidConfigPath, 'version: 1.0\n# missing pipeline section');
    
    await expect(PipelineParser.run(invalidConfigPath)).rejects.toThrow('Invalid config: "pipeline" section is missing');
    
    fs.unlinkSync(invalidConfigPath);
  });

  it('should handle JSON reader and NDJSON writer', async () => {
    const jsonInput = 'tests/input-test.json';
    const ndjsonOutput = 'tests/output/test-output.ndjson';
    
    fs.writeFileSync(jsonInput, JSON.stringify([{ id: 1, name: 'Test' }]));

    const config = `
pipeline:
  read:
    type: json
    path: ${jsonInput}
  write:
    type: ndjson
    path: ${ndjsonOutput}
`;
    const configPath = 'tests/test-json-ndjson.yaml';
    fs.writeFileSync(configPath, config);

    await PipelineParser.run(configPath);

    expect(fs.existsSync(ndjsonOutput)).toBe(true);
    const output = fs.readFileSync(ndjsonOutput, 'utf8');
    expect(JSON.parse(output)).toEqual({ id: 1, name: 'Test' });

    fs.unlinkSync(jsonInput);
    fs.unlinkSync(ndjsonOutput);
    fs.unlinkSync(configPath);
  });

  it('should handle NDJSON reader and CSV writer', async () => {
    const ndjsonInput = 'tests/input-test.ndjson';
    const csvOutput = 'tests/output/test-output.csv';
    
    fs.writeFileSync(ndjsonInput, JSON.stringify({ id: 1, name: 'Test' }) + '\n');

    const config = `
pipeline:
  read:
    type: ndjson
    path: ${ndjsonInput}
  write:
    type: csv
    path: ${csvOutput}
`;
    const configPath = 'tests/test-ndjson-csv.yaml';
    fs.writeFileSync(configPath, config);

    await PipelineParser.run(configPath);

    expect(fs.existsSync(csvOutput)).toBe(true);

    fs.unlinkSync(ndjsonInput);
    fs.unlinkSync(csvOutput);
    fs.unlinkSync(configPath);
  });

  it('should handle PII masking and field removal', async () => {
    const csvInput = 'tests/input-pii.csv';
    const jsonOutput = 'tests/output/pii-output.json';
    
    fs.writeFileSync(csvInput, 'email,ssn,name\ntest@example.com,123-456,John');

    const config = `
pipeline:
  read:
    type: csv
    path: ${csvInput}
  transform:
    - type: pii-masking
      masks:
        email: partial
    - type: remove
      fields: [ssn]
  write:
    type: json
    path: ${jsonOutput}
`;
    const configPath = 'tests/test-pii.yaml';
    fs.writeFileSync(configPath, config);

    await PipelineParser.run(configPath);

    const records = JSON.parse(fs.readFileSync(jsonOutput, 'utf8'));
    expect(records[0].email).toContain('****@');
    expect(records[0].ssn).toBeUndefined();
    expect(records[0].name).toBe('John');

    fs.unlinkSync(csvInput);
    fs.unlinkSync(jsonOutput);
    fs.unlinkSync(configPath);
  });

  it('should handle ConsoleWriter', async () => {
    const csvInput = 'tests/input-console.csv';
    fs.writeFileSync(csvInput, 'id,name\n1,Test');

    const config = `
pipeline:
  read:
    type: csv
    path: ${csvInput}
  write:
    type: console
`;
    const configPath = 'tests/test-console.yaml';
    fs.writeFileSync(configPath, config);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await PipelineParser.run(configPath);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();

    fs.unlinkSync(csvInput);
    fs.unlinkSync(configPath);
  });

  it('should handle select transform', async () => {
    const csvInput = 'tests/input-select.csv';
    const jsonOutput = 'tests/output/select-output.json';
    fs.writeFileSync(csvInput, 'id,name,age\n1,John,30');

    const config = `
pipeline:
  read:
    type: csv
    path: ${csvInput}
  transform:
    - type: select
      fields: [name]
  write:
    type: json
    path: ${jsonOutput}
`;
    const configPath = 'tests/test-select.yaml';
    fs.writeFileSync(configPath, config);

    await PipelineParser.run(configPath);

    const records = JSON.parse(fs.readFileSync(jsonOutput, 'utf8'));
    expect(records[0]).toEqual({ name: 'John' });
    expect(records[0].id).toBeUndefined();
    expect(records[0].age).toBeUndefined();

    fs.unlinkSync(csvInput);
    fs.unlinkSync(jsonOutput);
    fs.unlinkSync(configPath);
  });

  it('should throw error for unsupported reader type', async () => {
    const configPath = 'tests/unsupported-reader.yaml';
    fs.writeFileSync(configPath, 'pipeline:\n  read:\n    type: xml\n    path: test.xml\n  write:\n    type: console');
    await expect(PipelineParser.run(configPath)).rejects.toThrow('Unsupported reader type: xml');
    fs.unlinkSync(configPath);
  });

  it('should throw error for unsupported writer type', async () => {
    const configPath = 'tests/unsupported-writer.yaml';
    fs.writeFileSync(configPath, 'pipeline:\n  read:\n    type: csv\n    path: test.csv\n  write:\n    type: parquet\n    path: test.parquet');
    await expect(PipelineParser.run(configPath)).rejects.toThrow('Unsupported writer type: parquet');
    fs.unlinkSync(configPath);
  });
});
