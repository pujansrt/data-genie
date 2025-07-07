export interface DataRecord {
  [key: string]: any;
}

export interface DataReader {
  read(): AsyncIterableIterator<DataRecord>; // Use async iterators for streaming
  // Potentially methods like close(), getFieldNames()
}

export interface DataWriter {
  write(record: DataRecord): Promise<void>;
  writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void>;
  close(): Promise<void>;
}

export interface SqlConnection {
  /**
   * Executes a SQL query with parameters.
   * The actual implementation will handle parameter binding to prevent SQL injection.
   * @param sql The SQL query string (e.g., "INSERT INTO users (name, age) VALUES ($1, $2)").
   * @param params An array of parameters to be bound to the query.
   * @returns A Promise that resolves when the query is executed.
   */
  query(sql: string, params: any[]): Promise<any>;

  /**
   * Optional: For transactional writes, though simple inserts might not always need it.
   * Implement if you want to support batching/transactions within the writer.
   */
  // beginTransaction?(): Promise<void>;
  // commit?(): Promise<void>;
  // rollback?(): Promise<void>;

  /**
   * Optional: To close the connection if the writer is responsible for its lifecycle.
   * More commonly, the client using the utility will manage the connection lifecycle.
   */
  // end?(): Promise<void>;
}
