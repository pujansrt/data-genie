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
