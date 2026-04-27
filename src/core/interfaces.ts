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
  query(sql:string, params: any[]): Promise<any>;
  beginTransaction?(): Promise<void>;
  commit?(): Promise<void>;
  rollback?(): Promise<void>;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug?(message: string, ...args: any[]): void;
}
