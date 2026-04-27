import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { ensureDataSink } from '@/core/transport-utils';
import { FileSink } from '@/core/file-transport';
import * as parquet from 'parquetjs-lite';

/**
 * ParquetWriter writes data records to a Parquet file.
 * Requires a schema definition.
 */
export class ParquetWriter implements DataWriter {
  private sink: DataSink;
  private writer: any;
  private schema: any;

  constructor(sink: string | DataSink, schema: any) {
    try {
      require.resolve('parquetjs-lite');
    } catch (e) {
      throw new Error("The 'parquetjs-lite' package is required to use ParquetWriter.");
    }
    this.sink = ensureDataSink(sink);
    this.schema = new (parquet as any).ParquetSchema(schema);
  }

  private async initialize(): Promise<void> {
    if (this.writer) return;

    if (!(this.sink instanceof FileSink)) {
        throw new Error('ParquetWriter currently only supports FileSink.');
    }

    this.writer = await (parquet as any).ParquetWriter.openFile(this.schema, (this.sink as any).filePath);
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
