import { 
  CSVReader, 
  JsonWriter, 
  S3Source, 
  S3Sink 
} from '@/index';
import { Readable } from 'stream';

// Mock AWS SDK
const mockS3Client = {
  send: jest.fn()
};

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({})
  }))
}));

describe('S3 Handlers (Decoupled Transport)', () => {
  it('should read CSV from S3 source', async () => {
    const csvContent = 'id,name\n1,Alice';
    const stream = Readable.from([csvContent]);
    
    mockS3Client.send.mockResolvedValueOnce({
      Body: stream
    });

    const source = new S3Source(mockS3Client as any, 'bucket', 'key');
    const reader = new CSVReader(source).setFieldNamesInFirstRow(true);
    const results = [];
    for await (const r of reader.read()) {
      results.push(r);
    }

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Alice');
  });

  it('should write JSON to S3 sink', async () => {
    const sink = new S3Sink(mockS3Client as any, 'bucket', 'key');
    const writer = new JsonWriter(sink);
    
    await writer.write({ id: 1 });
    await writer.close();

    const { Upload } = require('@aws-sdk/lib-storage');
    expect(Upload).toHaveBeenCalled();
  });
});
