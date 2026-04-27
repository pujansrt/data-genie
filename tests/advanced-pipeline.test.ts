import { 
  CSVReader, 
  TransformingReader, 
  RenameField, 
  SetCalculatedField, 
  MultiWriter, 
  ConsoleWriter, 
  S3JsonWriter,
  Job 
} from '@/index';
import * as fs from 'fs';
import * as path from 'path';

// Mock S3 and Fetch
jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({})
  }))
}));

describe('Advanced ETL Pipeline', () => {
  const inputPath = path.join(__dirname, 'raw_data.csv');

  beforeAll(() => {
    fs.writeFileSync(inputPath, 'id,full_name,price,qty\n1,john doe,10,2\n2,jane smith,20,1');
  });

  afterAll(() => {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
  });

  it('should run a complex pipeline with transformations and multiple outputs', async () => {
    // 1. Setup Reader
    const rawReader = new CSVReader(inputPath).setFieldNamesInFirstRow(true);

    // 2. Add Transformations
    const pipeline = new TransformingReader(rawReader)
      // Change name to uppercase
      .add((record) => ({
        ...record,
        full_name: String(record.full_name).toUpperCase()
      }))
      // Rename field
      .add(new RenameField('full_name', 'NAME').transform())
      // Calculate total
      .add(new SetCalculatedField('total', 'record.price * record.qty').transform());

    // 3. Setup Multi-Output (Fan-out)
    const mockS3Client = { send: jest.fn() } as any;
    const s3Writer = new S3JsonWriter(mockS3Client, 'my-bucket', 'processed.json');
    const consoleWriter = new ConsoleWriter();
    
    // Capture console output to verify
    const spy = jest.spyOn(console, 'log').mockImplementation();

    const multiWriter = new MultiWriter(s3Writer, consoleWriter);

    // 4. Run Job
    const metrics = await Job.run(pipeline, multiWriter);

    // 5. Verify Results
    expect(metrics.recordCount).toBe(2);
    expect(spy).toHaveBeenCalled();
    
    // Verify first record transformation
    const firstCallJson = JSON.parse(spy.mock.calls[0][0]);
    expect(firstCallJson.NAME).toBe('JOHN DOE');
    expect(firstCallJson.total).toBe(20);

    spy.mockRestore();
  });
});
