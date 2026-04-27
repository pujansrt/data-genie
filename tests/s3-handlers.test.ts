import { S3CSVReader } from '@/readers/s3-csv-reader';
import { S3JsonReader } from '@/readers/s3-json-reader';
import { S3CSVWriter } from '@/writers/s3-csv-writer';
import { S3JsonWriter } from '@/writers/s3-json-writer';
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

describe('S3 Handlers', () => {
  describe('S3 Readers', () => {
    it('should read CSV from S3', async () => {
      const csvContent = 'id,name\n1,Alice';
      const stream = Readable.from([csvContent]);
      
      mockS3Client.send.mockResolvedValueOnce({
        Body: stream
      });

      const reader = new S3CSVReader(mockS3Client as any, 'bucket', 'key');
      const results = [];
      for await (const r of reader.read()) {
        results.push(r);
      }

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice');
    });

    it('should read NDJSON from S3', async () => {
      const jsonContent = '{"id":1}\n{"id":2}';
      const stream = Readable.from([jsonContent]);
      
      mockS3Client.send.mockResolvedValueOnce({
        Body: stream
      });

      const reader = new S3JsonReader(mockS3Client as any, 'bucket', 'key', { format: 'ndjson' });
      const results = [];
      for await (const r of reader.read()) {
        results.push(r);
      }

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
    });
  });

  describe('S3 Writers', () => {
    it('should write CSV to S3', async () => {
      const writer = new S3CSVWriter(mockS3Client as any, 'bucket', 'key');
      await writer.write({ id: 1, name: 'Alice' });
      await writer.close();
      
      const { Upload } = require('@aws-sdk/lib-storage');
      expect(Upload).toHaveBeenCalled();
    });

    it('should write JSON array to S3', async () => {
      const writer = new S3JsonWriter(mockS3Client as any, 'bucket', 'key', { format: 'json' });
      await writer.write({ id: 1 });
      await writer.close();

      const { Upload } = require('@aws-sdk/lib-storage');
      expect(Upload).toHaveBeenCalled();
    });
  });
});
