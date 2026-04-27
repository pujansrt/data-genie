import { DataReader, DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';

export class JsonReader implements DataReader {
  private source: DataSource;

  constructor(source: string | DataSource) {
    this.source = ensureDataSource(source);
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    const stream = await this.source.getStream();
    const data = await new Promise<string>((resolve, reject) => {
      let content = '';
      stream.on('data', (chunk) => (content += chunk));
      stream.on('end', () => resolve(content));
      stream.on('error', (err) => reject(err));
    });

    // Assuming the JSON file contains an array of objects
    const records: DataRecord[] = JSON.parse(data);
    for (const record of records) {
      yield record;
    }
  }
}
