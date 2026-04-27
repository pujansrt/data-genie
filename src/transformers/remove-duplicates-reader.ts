import { DataReader, DataRecord } from '@/core/interfaces';
import { DataTransformer } from '@/transformers/transformers';

export interface DuplicateKeyStore {
  has(key: string): Promise<boolean> | boolean;
  add(key: string): Promise<void> | void;
}

class MemoryKeyStore implements DuplicateKeyStore {
  private seenKeys: Set<string> = new Set();
  public has(key: string) { return this.seenKeys.has(key); }
  public add(key: string) { this.seenKeys.add(key); }
}

export class RemoveDuplicatesReader extends DataTransformer {
  private fieldNames: string[];
  private store: DuplicateKeyStore;
  private maxKeys: number = 1000000; // 1M keys safety limit by default
  private currentKeyCount: number = 0;

  constructor(reader: DataReader, ...fieldNames: string[]) {
    super(reader);
    this.fieldNames = fieldNames;
    this.store = new MemoryKeyStore();
  }

  /**
   * Sets a custom key store (e.g., for Redis or Disk-backed deduplication).
   */
  public setKeyStore(store: DuplicateKeyStore): this {
    this.store = store;
    return this;
  }

  /**
   * Sets the maximum number of keys to keep in memory before throwing an error.
   */
  public setMaxKeys(limit: number): this {
    this.maxKeys = limit;
    return this;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    for await (const record of this.reader.read()) {
      // Robust key generation using JSON stringify to handle special characters
      const key = this.fieldNames.map((fieldName) => record[fieldName]).join('\0'); 
      
      if (!(await this.store.has(key))) {
        if (this.currentKeyCount >= this.maxKeys && this.store instanceof MemoryKeyStore) {
          throw new Error(`Memory limit reached: deduplication saw more than ${this.maxKeys} unique keys. Use a disk-backed KeyStore.`);
        }
        
        await this.store.add(key);
        this.currentKeyCount++;
        yield record;
      }
    }
  }
}
