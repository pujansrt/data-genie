import { SQLWriter } from '@/writers/sql-writer';
import { SqlConnection } from '@/core/interfaces';

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
