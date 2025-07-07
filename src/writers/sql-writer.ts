import { DataWriter, DataRecord, SqlConnection } from '@/core/interfaces';

/**
 * SQLWriter class for writing data records to a SQL database.
 * It uses a provided SqlConnection interface, allowing the user to supply
 * their own database client (e.g., pg.Pool, mysql2.Connection) without
 * this library needing direct npm dependencies on specific database drivers.
 */
export class SQLWriter implements DataWriter {
  private readonly tableName: string;
  private dbClient: SqlConnection;
  private fieldNames: string[] = [];
  private initializedFieldNames: boolean = false;

  /**
   * Constructs a new SQLWriter.
   * @param dbClient An object implementing the SqlConnection interface, provided by the user.
   * This is typically a database client or connection pool from an npm package
   * (e.g., new Pool() from 'pg', createConnection() from 'mysql2').
   * @param tableName The name of the database table to write to.
   */
  constructor(dbClient: SqlConnection, tableName: string) {
    if (!dbClient || typeof dbClient.query !== 'function') {
      throw new Error('A valid database client with a "query" method must be provided.');
    }
    this.dbClient = dbClient;
    this.tableName = tableName;
  }

  /**
   * Sets the names of the fields. These names correspond to the column names in the database table
   * and define the order of data extraction from `DataRecord` objects.
   * @param names A list of string names for the fields (column names).
   * @returns The current SQLWriter instance for chaining.
   */
  public setFieldNames(...names: string[]): this {
    this.fieldNames = names;
    this.initializedFieldNames = true; // Field names are explicitly set
    return this;
  }

  /**
   * Writes a single data record to the SQL database.
   * It constructs an `INSERT` statement dynamically based on field names and record data.
   * @param record The DataRecord object to write.
   * @returns A Promise that resolves when the record has been inserted.
   * @throws Error if field names are not defined.
   */
  public async write(record: DataRecord): Promise<void> {
    // Determine field names if not explicitly set
    if (!this.initializedFieldNames) {
      this.fieldNames = Object.keys(record);
      this.initializedFieldNames = true;
    }

    if (this.fieldNames.length === 0) {
      throw new Error('Field names must be defined using setFieldNames() or inferred from the first record before writing.');
    }

    const columns = this.fieldNames.map((name) => `"${name}"`).join(', '); // Quote column names for safety
    const placeholders = this.fieldNames.map((_, i) => `$${i + 1}`).join(', '); // For PostgreSQL-style parameters
    const values = this.fieldNames.map((fieldName) => record[fieldName]);

    // Construct the INSERT statement
    const sql = `INSERT INTO "${this.tableName}" (${columns}) VALUES (${placeholders})`;

    try {
      await this.dbClient.query(sql, values);
    } catch (error) {
      console.error(`Error inserting record into ${this.tableName}:`, record, error);
      throw error; // Re-throw to allow calling code to handle
    }
  }

  /**
   * Writes all data records from an asynchronous iterable to the SQL database.
   * This method performs individual inserts. For batch inserts, consider a dedicated
   * batching mechanism or a transactional approach if the underlying dbClient supports it.
   *
   * @param records An AsyncIterableIterator of DataRecord objects.
   * @returns A Promise that resolves when all records have been written.
   */
  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  /**
   * In this design, the SQLWriter does not own the lifecycle of the dbClient.
   * The user who provides the dbClient is responsible for closing it.
   * This method is implemented to satisfy the DataWriter interface but does nothing.
   * If you want the SQLWriter to manage connection closing, the SqlConnection interface
   * would need an `end()` or `close()` method, and the user would pass a client
   * that can be closed.
   *
   * @returns A Promise that resolves immediately.
   */
  public async close(): Promise<void> {
    // The dbClient is managed by the caller, so we don't close it here.
    // If SqlConnection had a `.end()` or `.close()` method, you could call it here
    // if the writer were responsible for the connection's lifecycle.
    console.log('SQLWriter close() called. Database client lifecycle is managed by the caller.');
    return Promise.resolve();
  }
}
