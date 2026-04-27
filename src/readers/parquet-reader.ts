import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { FileSource } from '@/core/file-transport';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pipeline } from 'stream/promises';

/**
 * ParquetReader reads data from Parquet files.
 */
export class ParquetReader implements DataReader {
  private source: DataSource;

  constructor(source: string | DataSource) {
    this.source = ensureDataSource(source);
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    let parquet;
    try {
      const module = await import('parquetjs-lite');
      parquet = module.default || module;
    } catch (e) {
      throw new Error("The 'parquetjs-lite' package is required to use ParquetReader. Please install it with 'npm install parquetjs-lite'.");
    }

    let reader;
    let tempPath: string | null = null;

    try {
      if (this.source instanceof FileSource) {
        reader = await (parquet as any).ParquetReader.openFile((this.source as any).filePath);
      } else {
        // Download to temp file as parquet needs random access (seeking)
        tempPath = path.join(os.tmpdir(), `data-genie-parquet-${Date.now()}-${Math.random().toString(36).substring(7)}.parquet`);
        const stream = await this.source.getStream();
        await pipeline(stream, fs.createWriteStream(tempPath));
        reader = await (parquet as any).ParquetReader.openFile(tempPath);
      }

      const cursor = reader.getCursor();
      let record = null;
      while (record = await cursor.next()) {
        yield record;
      }

      await reader.close();
    } finally {
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }
}
