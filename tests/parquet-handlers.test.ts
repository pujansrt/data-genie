import { ParquetReader } from '@/readers/parquet-reader';
import { ParquetWriter } from '@/writers/parquet-writer';
import { FileSource, FileSink } from '@/core/file-transport';

// Mock parquetjs-lite
jest.mock('parquetjs-lite', () => ({
  ParquetReader: {
    openFile: jest.fn().mockResolvedValue({
      getCursor: () => ({
        next: jest.fn()
          .mockResolvedValueOnce({ id: 1 })
          .mockResolvedValueOnce(null)
      }),
      close: jest.fn()
    })
  },
  ParquetWriter: {
    openFile: jest.fn().mockResolvedValue({
      appendRow: jest.fn(),
      close: jest.fn()
    })
  },
  ParquetSchema: jest.fn().mockImplementation((s) => s)
}));

describe('Parquet Handlers', () => {
  it('should read from Parquet FileSource', async () => {
    const reader = new ParquetReader(new FileSource('test.parquet'));
    const results = [];
    for await (const r of reader.read()) {
      results.push(r);
    }
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(1);
  });

  it('should write to Parquet FileSink', async () => {
    const schema = { id: { type: 'INT64' } };
    const writer = new ParquetWriter(new FileSink('out.parquet'), schema);
    await writer.write({ id: 1 });
    await writer.close();
    
    const parquet = require('parquetjs-lite');
    expect(parquet.ParquetWriter.openFile).toHaveBeenCalled();
  });

  it('should write using setSchema', async () => {
    const schema = { id: { type: 'INT64' } };
    const writer = new ParquetWriter(new FileSink('out2.parquet'));
    writer.setSchema(schema);
    await writer.write({ id: 1 });
    await writer.close();
    
    const parquet = require('parquetjs-lite');
    expect(parquet.ParquetWriter.openFile).toHaveBeenCalled();
  });

  it('should throw error if schema is missing', async () => {
    const writer = new ParquetWriter(new FileSink('out3.parquet'));
    await expect(writer.write({ id: 1 })).rejects.toThrow("Parquet schema must be provided");
  });
});
