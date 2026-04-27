import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { ensureDataSink } from '@/core/transport-utils';
import { FileSink } from '@/core/file-transport';

/**
 * ParquetWriter writes data records to a Parquet file.
 * Requires a schema definition.
 */
export class ParquetWriter implements DataWriter {
  private sink: DataSink;
  private writer: any;
  private schemaConfig: any;
  private schema: any;
  private parquet: any;

  constructor(sink: string | DataSink, schema: any) {
    this.sink = ensureDataSink(sink);
    this.schemaConfig = schema;
  }

  private async initialize(): Promise<void> {
    if (this.writer) return;

    try {
      this.parquet = await import('parquetjs-lite');
    } catch (e) {
      throw new Error("The 'parquetjs-lite' package is required to use ParquetWriter. Please install it with 'npm install parquetjs-lite'.");
    }

    if (!this.schema) {
      this.schema = new (this.parquet as any).ParquetSchema(this.schemaConfig);
    }

    if (!(this.sink instanceof FileSink)) {
        throw new Error('ParquetWriter currently only supports FileSink.');
    }

    this.writer = await (this.parquet as any).ParquetWriter.openFile(this.schema, (this.sink as any).filePath);
  }

  public async write(record: DataRecord): Promise<void> {
    await this.initialize();
    await this.writer.appendRow(record);
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    if (this.writer) {
      await this.writer.close();
    }
  }
}
