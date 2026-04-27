import { 
  CSVReader, 
  TransformingReader, 
  RenameField, 
  SetCalculatedField, 
  MultiWriter, 
  ConsoleWriter, 
  JsonWriter,
  S3Sink,
  Job 
} from '@/index';
import * as fs from 'fs';
import * as path from 'path';

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
    const rawReader = new CSVReader(inputPath).setFieldNamesInFirstRow(true);
    const pipeline = new TransformingReader(rawReader)
      .add((record) => ({
        ...record,
        full_name: String(record.full_name).toUpperCase()
      }))
      .add(new RenameField('full_name', 'NAME').transform())
      .add(new SetCalculatedField('total', 'record.price * record.qty').transform());

    // Setup Multi-Output (Fan-out)
    const mockS3Client = { send: jest.fn() } as any;
    const s3Writer = new JsonWriter(new S3Sink(mockS3Client, 'my-bucket', 'processed.json'));
    const consoleWriter = new ConsoleWriter();
    
    // Capture console output to verify
    const spy = jest.spyOn(console, 'log').mockImplementation();

    const multiWriter = new MultiWriter(s3Writer, consoleWriter);
    const metrics = await Job.run(pipeline, multiWriter);

    expect(metrics.recordCount).toBe(2);
    expect(spy).toHaveBeenCalled();
    
    const firstCallJson = JSON.parse(spy.mock.calls[0][0]);
    expect(firstCallJson.NAME).toBe('JOHN DOE');
    expect(firstCallJson.total).toBe(20);

    spy.mockRestore();
  });
});
