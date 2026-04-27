import { SQLReader } from '@/readers/sql-reader';
import { SqlConnection } from '@/core/interfaces';

describe('SQLReader', () => {
  it('should yield records from an array result', async () => {
    const mockData = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const mockDb: jest.Mocked<SqlConnection> = {
      query: jest.fn().mockResolvedValue(mockData),
    };

    const reader = new SQLReader(mockDb, 'SELECT * FROM users');
    const results = [];
    for await (const record of reader.read()) {
      results.push(record);
    }

    expect(results).toEqual(mockData);
    expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users', []);
  });

  it('should handle result with rows property (e.g., pg driver)', async () => {
    const mockData = [{ id: 1, name: 'Alice' }];
    const mockDb: jest.Mocked<SqlConnection> = {
      query: jest.fn().mockResolvedValue({ rows: mockData }),
    };

    const reader = new SQLReader(mockDb, 'SELECT * FROM users');
    const results = [];
    for await (const record of reader.read()) {
      results.push(record);
    }

    expect(results).toEqual(mockData);
  });

  it('should paginate results using chunking', async () => {
    const mockDb: jest.Mocked<SqlConnection> = {
      query: jest.fn()
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // Page 1
        .mockResolvedValueOnce([{ id: 3 }])           // Page 2
        .mockResolvedValueOnce([]),                   // Page 3 (Empty)
    };

    const reader = new SQLReader(mockDb, 'SELECT * FROM users')
      .setChunkSize(2)
      .setOrderBy('id');

    const results = [];
    for await (const record of reader.read()) {
      results.push(record);
    }

    expect(results).toHaveLength(3);
    expect(mockDb.query).toHaveBeenCalledTimes(2); // Efficient stop: Page 2 was < chunkSize
    
    // Verify queries contains LIMIT and OFFSET
    expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT 2 OFFSET 0'), []);
    expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT 2 OFFSET 2'), []);
  });
});
