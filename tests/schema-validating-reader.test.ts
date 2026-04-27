import { SchemaValidatingReader } from '@/transformers/schema-validating-reader';
import { DataReader, DataWriter } from '@/core/interfaces';

describe('SchemaValidatingReader', () => {
  it('should yield valid records and divert invalid ones to DLQ', async () => {
    const mockRecords = [
      { id: 1, email: 'valid@test.com' },
      { id: 2, email: 'invalid' }
    ];

    const mockReader: DataReader = {
      read: async function* () {
        for (const r of mockRecords) yield r;
      }
    };

    const mockSchema = {
      parse: (data: any) => {
        if (data.email === 'invalid') throw new Error('Invalid email');
        return data;
      }
    };

    const mockDlqWriter: DataWriter = {
      write: jest.fn().mockResolvedValue(undefined),
      writeAll: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const validatingReader = new SchemaValidatingReader(mockReader, mockSchema)
      .setDLQ(mockDlqWriter);

    const results = [];
    for await (const record of validatingReader.read()) {
      results.push(record);
    }

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(1);
    expect(mockDlqWriter.write).toHaveBeenCalledTimes(1);
    expect(mockDlqWriter.close).toHaveBeenCalled();
  });
});
