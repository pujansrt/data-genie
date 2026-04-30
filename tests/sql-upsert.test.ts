import { SQLWriter } from '../src/writers/sql-writer';
import { SqlConnection } from '../src/core/interfaces';

describe('SQLWriter Upsert (Idempotency)', () => {
  let mockConn: jest.Mocked<SqlConnection>;

  beforeEach(() => {
    mockConn = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
  });

  it('should generate standard INSERT when upsert is not enabled', async () => {
    const writer = new SQLWriter(mockConn, 'users');
    await writer.write({ id: 1, name: 'John' });
    await writer.close();

    const [sql] = mockConn.query.mock.calls[0];
    expect(sql).toBe('INSERT INTO "users" ("id", "name") VALUES ($1, $2)');
  });

  it('should generate ON CONFLICT for Postgres/SQLite when upsert is enabled', async () => {
    const writer = new SQLWriter(mockConn, 'users');
    writer.setUpsert('id');
    
    await writer.write({ id: 1, name: 'John', age: 30 });
    await writer.close();

    const [sql] = mockConn.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO "users" ("id", "name", "age") VALUES ($1, $2, $3)');
    expect(sql).toContain('ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "age" = EXCLUDED."age"');
  });

  it('should generate ON DUPLICATE KEY UPDATE for MySQL when upsert is enabled', async () => {
    const writer = new SQLWriter(mockConn, 'users');
    writer.setDialect('mysql').setUpsert('email');
    
    await writer.write({ email: 'p@g.com', status: 'active' });
    await writer.close();

    const [sql] = mockConn.query.mock.calls[0];
    expect(sql).toContain('ON DUPLICATE KEY UPDATE "status" = VALUES("status")');
  });

  it('should handle batching with upsert correctly', async () => {
    const writer = new SQLWriter(mockConn, 'users');
    writer.setUpsert('id').setBatchSize(2);
    
    await writer.write({ id: 1, val: 'a' });
    await writer.write({ id: 2, val: 'b' }); // Flushes here
    
    expect(mockConn.query).toHaveBeenCalledTimes(1);
    const [sql, values] = mockConn.query.mock.calls[0];
    
    expect(sql).toContain('VALUES ($1, $2), ($3, $4)');
    expect(values).toEqual([1, 'a', 2, 'b']);
    expect(sql).toContain('ON CONFLICT ("id")');
  });
});
