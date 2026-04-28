import { DataReader, DataRecord, SqlConnection } from '@/core/interfaces';
import { SchemaValidator } from '@/transformers/schema-validating-reader';
import { BaseReader } from '@/core/base-reader';

/**
 * SQLReader class for reading data records from a SQL database.
 * Like SQLWriter, it uses the SqlConnection interface to remain driver-agnostic.
 */
export class SQLReader<T = DataRecord> extends BaseReader<T> {
  private dbClient: SqlConnection;
  private query: string;
  private params: any[];
  private useTransaction: boolean = false;
  private chunkSize: number = 0; // 0 means no pagination
  private orderByColumn?: string;
  private schema?: SchemaValidator<T>;

  constructor(dbClient: SqlConnection, query: string, params: any[] = [], options?: { schema?: SchemaValidator<T> }) {
    super();
    if (!dbClient || typeof dbClient.query !== 'function') {
      throw new Error('A valid database client with a "query" method must be provided.');
    }
    this.dbClient = dbClient;
    this.query = query;
    this.params = params;
    this.schema = options?.schema;
  }

  /**
   * Sets the chunk size for pagination. If set, the reader will use LIMIT/OFFSET.
   */
  public setChunkSize(size: number): this {
    this.chunkSize = size;
    return this;
  }

  /**
   * Sets the column to order by. Required for stable pagination.
   */
  public setOrderBy(column: string): this {
    this.orderByColumn = column;
    return this;
  }

  public setUseTransaction(value: boolean): this {
    this.useTransaction = value;
    return this;
  }

  public async *read(): AsyncIterableIterator<T> {
    if (this.chunkSize > 0 && !this.orderByColumn) {
      throw new Error('orderByColumn must be set when using chunkSize for pagination.');
    }

    let transactionStarted = false;
    try {
      if (this.useTransaction && typeof this.dbClient.beginTransaction === 'function') {
        await this.dbClient.beginTransaction();
        transactionStarted = true;
      }

      if (this.chunkSize > 0) {
        yield* this.readInChunks();
      } else {
        yield* this.readAll();
      }

      if (transactionStarted && typeof this.dbClient.commit === 'function') {
        await this.dbClient.commit();
      }
    } catch (error) {
      if (transactionStarted && typeof this.dbClient.rollback === 'function') {
        await this.dbClient.rollback();
      }
      throw error;
    }
  }

  private async *readAll(): AsyncIterableIterator<T> {
    const result = await this.dbClient.query(this.query, this.params);
    const rows = Array.isArray(result) ? result : (result?.rows || []);
    for (const row of rows) {
      if (this.schema) {
        yield this.schema.parse(row);
      } else {
        yield row as T;
      }
    }
  }

  private async *readInChunks(): AsyncIterableIterator<T> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const paginatedQuery = `${this.query} ORDER BY "${this.orderByColumn}" LIMIT ${this.chunkSize} OFFSET ${offset}`;
      const result = await this.dbClient.query(paginatedQuery, this.params);
      const rows = Array.isArray(result) ? result : (result?.rows || []);

      if (rows.length === 0) {
        hasMore = false;
      } else {
        for (const row of rows) {
          if (this.schema) {
            yield this.schema.parse(row);
          } else {
            yield row as T;
          }
        }
        offset += this.chunkSize;
        if (rows.length < this.chunkSize) hasMore = false;
      }
    }
  }
}
