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
});
