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
  private batchSize: number = 1; // Default to 1 (current behavior)
  private buffer: DataRecord[] = [];
  private useTransaction: boolean = false;
  private transactionStarted: boolean = false;

  /**
   * Constructs a new SQLWriter.
   * @param dbClient An object implementing the SqlConnection interface.
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
   * Sets the batch size for inserts.
   * @param size Number of records to buffer before executing a bulk insert.
   */
  public setBatchSize(size: number): this {
    if (size < 1) throw new Error('Batch size must be at least 1');
    this.batchSize = size;
    return this;
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
   * Enables or disables the use of transactions for the entire job.
   * Only works if the provided dbClient implements beginTransaction, commit, and rollback.
   */
  public setUseTransaction(value: boolean): this {
    this.useTransaction = value;
    return this;
  }

  /**
   * Writes a single data record. It will be buffered until the batch size is reached.
   */
  public async write(record: DataRecord): Promise<void> {
    if (this.useTransaction && !this.transactionStarted) {
      if (typeof this.dbClient.beginTransaction === 'function') {
        await this.dbClient.beginTransaction();
        this.transactionStarted = true;
      }
    }

    if (!this.initializedFieldNames) {
      this.fieldNames = Object.keys(record);
      this.initializedFieldNames = true;
    }

    this.buffer.push(record);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Executes a bulk insert of all records currently in the buffer.
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const columns = this.fieldNames.map((name) => `"${name}"`).join(', ');
    
    // Create placeholders for bulk insert: ($1, $2), ($3, $4), ...
    const rows: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const record of this.buffer) {
      const rowPlaceholders = this.fieldNames.map(() => `$${paramIndex++}`).join(', ');
      rows.push(`(${rowPlaceholders})`);
      values.push(...this.fieldNames.map((name) => record[name]));
    }

    const sql = `INSERT INTO "${this.tableName}" (${columns}) VALUES ${rows.join(', ')}`;

    try {
      await this.dbClient.query(sql, values);
      this.buffer = []; // Clear buffer after successful write
    } catch (error) {
      if (this.useTransaction && this.transactionStarted && typeof this.dbClient.rollback === 'function') {
        console.error('Rolling back transaction due to error...');
        await this.dbClient.rollback();
        this.transactionStarted = false; 
      }
      console.error(`Error in bulk insert into ${this.tableName}:`, error);
      throw error;
    }
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    try {
      await this.flush(); // Ensure any remaining records are written
      
      if (this.useTransaction && this.transactionStarted && typeof this.dbClient.commit === 'function') {
        await this.dbClient.commit();
        console.log('SQL Transaction committed.');
        this.transactionStarted = false;
      }
    } catch (error) {
       if (this.useTransaction && this.transactionStarted && typeof this.dbClient.rollback === 'function') {
        await this.dbClient.rollback();
        this.transactionStarted = false;
      }
      throw error;
    } finally {
      console.log('SQLWriter closed.');
    }
  }
}
