import { SQLWriter } from '@/writers/sql-writer';
import { SqlConnection, DataRecord } from '@/core/interfaces';

describe('SQLWriter Upsert Integration (Mocked)', () => {
  let mockDb: jest.Mocked<SqlConnection>;
  
  beforeEach(() => {
    mockDb = {
      query: jest.fn().mockResolvedValue({ rows: [] })
    };
  });

  async function captureSql(writer: SQLWriter, record: DataRecord): Promise<string> {
    await writer.write(record);
    await writer.close();
    return (mockDb.query.mock.calls[0][0] as string).replace(/\s+/g, ' ').trim();
  }

  it('Postgres: generates correct ON CONFLICT clause', async () => {
    const writer = new SQLWriter(mockDb, 'users')
      .setDialect('postgres')
      .setUpsert('email');

    const sql = await captureSql(writer, { name: 'Pujan', email: 'p@g.com', age: 25 });
    
    expect(sql).toContain('INSERT INTO "users" ("name", "email", "age") VALUES ($1, $2, $3)');
    expect(sql).toContain('ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name", "age" = EXCLUDED."age"');
  });

  it('MySQL: generates correct ON DUPLICATE KEY UPDATE clause', async () => {
    const writer = new SQLWriter(mockDb, 'analytics')
      .setDialect('mysql')
      .setUpsert('id');

    const sql = await captureSql(writer, { id: 1, views: 100 });
    
    expect(sql).toContain('INSERT INTO "analytics" ("id", "views") VALUES ($1, $2)');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE "views" = VALUES("views")');
  });

  it('SQLite: generates correct ON CONFLICT clause', async () => {
    const writer = new SQLWriter(mockDb, 'local_cache')
      .setDialect('sqlite')
      .setUpsert('key');

    const sql = await captureSql(writer, { key: 'token', value: 'xyz' });
    
    expect(sql).toContain('ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"');
  });

  it('Batch Upsert: handles multiple records in a single query', async () => {
    const writer = new SQLWriter(mockDb, 'users')
      .setBatchSize(2)
      .setUpsert('id');

    await writer.write({ id: 1, name: 'A' });
    await writer.write({ id: 2, name: 'B' });
    await writer.close();

    const [sql, params] = mockDb.query.mock.calls[0];
    const cleanSql = (sql as string).replace(/\s+/g, ' ').trim();

    expect(cleanSql).toContain('VALUES ($1, $2), ($3, $4)');
    expect(cleanSql).toContain('ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name"');
    expect(params).toEqual([1, 'A', 2, 'B']);
  });

  it('Batch Upsert: handles records with missing fields gracefully', async () => {
    const writer = new SQLWriter(mockDb, 'users')
      .setBatchSize(2)
      .setUpsert('id');

    // First record defines the schema
    await writer.write({ id: 1, name: 'A', note: 'first' });
    await writer.write({ id: 2, name: 'B' }); // Missing 'note'
    await writer.close();

    const [sql, params] = mockDb.query.mock.calls[0];
    expect(params).toEqual([1, 'A', 'first', 2, 'B', undefined]);
  });

  it('Oracle: generates correct INSERT ALL for batching', async () => {
    const writer = new SQLWriter(mockDb, 'users')
      .setDialect('oracle')
      .setBatchSize(2);

    await writer.write({ id: 1, name: 'A' });
    await writer.write({ id: 2, name: 'B' });
    await writer.close();

    const [sql, params] = mockDb.query.mock.calls[0];
    expect(sql).toContain('INSERT ALL');
    expect(sql).toContain('INTO "users" ("id", "name") VALUES (:1, :2)');
    expect(sql).toContain('INTO "users" ("id", "name") VALUES (:3, :4)');
    expect(sql).toContain('SELECT * FROM DUAL');
    expect(params).toEqual([1, 'A', 2, 'B']);
  });

  it('Oracle: generates correct MERGE for single upsert', async () => {
    const writer = new SQLWriter(mockDb, 'users')
      .setDialect('oracle')
      .setUpsert('id');

    await writer.write({ id: 1, name: 'John' });
    await writer.close();

    const [sql] = mockDb.query.mock.calls[0];
    const cleanSql = (sql as string).replace(/\s+/g, ' ').trim();

    expect(cleanSql).toContain('MERGE INTO "users" target');
    expect(cleanSql).toContain('ON (target."id" = src."id")');
    expect(cleanSql).toContain('WHEN MATCHED THEN UPDATE SET target."name" = src."name"');
    expect(cleanSql).toContain('WHEN NOT MATCHED THEN INSERT ("id", "name") VALUES (src."id", src."name")');
  });
});
