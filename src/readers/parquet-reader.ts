import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { FileSource } from '@/core/file-transport';

/**
 * ParquetReader reads data from Parquet files.
 * Currently optimized for local FileSource.
 */
export class ParquetReader implements DataReader {
  private source: DataSource;

  constructor(source: string | DataSource) {
    this.source = ensureDataSource(source);
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    let parquet;
    try {
      parquet = await import('parquetjs-lite');
    } catch (e) {
      throw new Error("The 'parquetjs-lite' package is required to use ParquetReader. Please install it with 'npm install parquetjs-lite'.");
    }

    // Parquetjs-lite needs a filename or a specialized reader
    if (!(this.source instanceof FileSource)) {
        throw new Error('ParquetReader currently only supports FileSource. Stream-based Parquet reading is coming soon.');
    }

    const reader = await (parquet as any).ParquetReader.openFile((this.source as any).filePath);
    const cursor = reader.getCursor();

    let record = null;
    while (record = await cursor.next()) {
      yield record;
    }

    await reader.close();
  }
}
