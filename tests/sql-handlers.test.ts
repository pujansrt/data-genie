import { SQLReader } from '@/readers/sql-reader';
import { SQLWriter } from '@/writers/sql-writer';
import { SqlConnection } from '@/core/interfaces';

describe('SQL Handlers', () => {
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
      
      expect(mockDb.query).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT 2 OFFSET 0'), []);
      expect(mockDb.query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT 2 OFFSET 2'), []);
    });

    it('should throw error if chunkSize is set without orderBy', async () => {
      const mockDb = { query: jest.fn() } as any;
      const reader = new SQLReader(mockDb, 'SELECT * FROM users').setChunkSize(10);
      const iterator = reader.read();
      await expect(iterator.next()).rejects.toThrow('orderByColumn must be set');
    });

    it('should handle transaction rollback on read error', async () => {
      const mockDb: any = {
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockRejectedValue(new Error('Read error')),
        rollback: jest.fn().mockResolvedValue(undefined)
      };

      const reader = new SQLReader(mockDb, 'SELECT *').setUseTransaction(true);
      const iterator = reader.read();
      await expect(iterator.next()).rejects.toThrow('Read error');
      expect(mockDb.rollback).toHaveBeenCalled();
    });
  });

  describe('SQLWriter', () => {
    let mockDb: jest.Mocked<SqlConnection>;

    beforeEach(() => {
      mockDb = {
        query: jest.fn().mockResolvedValue({}),
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should buffer records and perform bulk insert when batch size is reached', async () => {
      const writer = new SQLWriter(mockDb, 'users').setBatchSize(2);
      
      await writer.write({ id: 1, name: 'Alice' });
      expect(mockDb.query).not.toHaveBeenCalled();

      await writer.write({ id: 2, name: 'Bob' });
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      
      // Verify bulk insert SQL structure
      const lastCall = mockDb.query.mock.calls[0];
      expect(lastCall[0]).toContain('INSERT INTO "users"');
      expect(lastCall[0]).toContain('VALUES ($1, $2), ($3, $4)');
      expect(lastCall[1]).toEqual([1, 'Alice', 2, 'Bob']);
    });

    it('should allow explicitly setting field names', async () => {
      const writer = new SQLWriter(mockDb, 'users').setFieldNames('id', 'name');
      await writer.write({ id: 1, name: 'Alice', extra: 'ignored' });
      await writer.close();
      
      expect(mockDb.query.mock.calls[0][1]).toEqual([1, 'Alice']);
    });

    it('should handle transactions correctly', async () => {
      const writer = new SQLWriter(mockDb, 'users')
        .setBatchSize(1)
        .setUseTransaction(true);

      await writer.write({ id: 1, name: 'Alice' });
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      
      await writer.close();
      expect(mockDb.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('DB Error'));
      const writer = new SQLWriter(mockDb, 'users')
        .setBatchSize(1)
        .setUseTransaction(true);

      try {
        await writer.write({ id: 1, name: 'Alice' });
      } catch (e) {
        // Expected
      }

      expect(mockDb.rollback).toHaveBeenCalled();
    });
  });
});
