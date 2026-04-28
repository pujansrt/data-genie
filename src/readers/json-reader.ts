import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';
import { SchemaValidator } from '@/transformers/schema-validating-reader';

export class JsonReader<T = DataRecord> implements DataReader<T> {
  private source: DataSource;
  private schema?: SchemaValidator<T>;

  constructor(source: string | DataSource, options?: { schema?: SchemaValidator<T> }) {
    this.source = ensureDataSource(source);
    this.schema = options?.schema;
  }

  public async *read(): AsyncIterableIterator<T> {
    const stream = await this.source.getStream();
    const data = await new Promise<string>((resolve, reject) => {
      let content = '';
      stream.on('data', (chunk) => (content += chunk));
      stream.on('end', () => resolve(content));
      stream.on('error', (err) => reject(err));
    });

    // Assuming the JSON file contains an array of objects
    const records: any[] = JSON.parse(data);
    for (const record of records) {
      if (this.schema) {
        yield this.schema.parse(record);
      } else {
        yield record as T;
      }
    }
  }
}
