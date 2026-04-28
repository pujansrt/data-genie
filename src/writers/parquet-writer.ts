import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { ensureDataSink } from '@/core/transport-utils';
import { FileSink } from '@/core/file-transport';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pipeline } from 'stream/promises';

/**
 * ParquetWriter writes data records to a Parquet file.
 * Requires a schema definition.
 */
export class ParquetWriter<T = DataRecord> implements DataWriter<T> {
  private sink: DataSink;
  private writer: any;
  private schemaConfig: any;
  private schema: any;
  private parquet: any;
  private tempPath: string | null = null;

  constructor(sink: string | DataSink, schema: any) {
    this.sink = ensureDataSink(sink);
    this.schemaConfig = schema;
  }

  private async initialize(): Promise<void> {
    if (this.writer) return;

    try {
      const module = await import('parquetjs-lite');
      this.parquet = module.default || module;
    } catch (e) {
      throw new Error("The 'parquetjs-lite' package is required to use ParquetWriter. Please install it with 'npm install parquetjs-lite'.");
    }

    if (!this.schema) {
      this.schema = new (this.parquet as any).ParquetSchema(this.schemaConfig);
    }

    if (this.sink instanceof FileSink) {
      this.writer = await (this.parquet as any).ParquetWriter.openFile(this.schema, (this.sink as any).filePath);
    } else {
      this.tempPath = path.join(os.tmpdir(), `data-genie-parquet-write-${Date.now()}-${Math.random().toString(36).substring(7)}.parquet`);
      this.writer = await (this.parquet as any).ParquetWriter.openFile(this.schema, this.tempPath);
    }
  }

  public async write(record: T): Promise<void> {
    await this.initialize();
    await this.writer.appendRow(record);
  }

  public async writeAll(records: AsyncIterableIterator<T>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    if (this.writer) {
      await this.writer.close();
      
      if (this.tempPath) {
        try {
          const stream = await this.sink.getStream();
          const readStream = fs.createReadStream(this.tempPath);
          await pipeline(readStream, stream);
          
          if ((this.sink as any).finalize) {
            await (this.sink as any).finalize();
          }
        } finally {
          if (fs.existsSync(this.tempPath)) {
            fs.unlinkSync(this.tempPath);
          }
        }
      }
    }
  }
}
