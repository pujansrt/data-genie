import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { FileSource } from '@/core/file-transport';
import * as parquet from 'parquetjs-lite';

/**
 * ParquetReader reads data from Parquet files.
 * Currently optimized for local FileSource.
 */
export class ParquetReader implements DataReader {
  private source: DataSource;

  constructor(source: string | DataSource) {
    try {
      require.resolve('parquetjs-lite');
    } catch (e) {
      throw new Error("The 'parquetjs-lite' package is required to use ParquetReader.");
    }
    this.source = ensureDataSource(source);
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
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
