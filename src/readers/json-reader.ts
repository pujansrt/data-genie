import { createReadStream } from 'fs';
import { DataReader, DataRecord } from '@/core/interfaces';

export class JsonReader implements DataReader {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    const data = await new Promise<string>((resolve, reject) => {
      const stream = createReadStream(this.filePath, { encoding: 'utf8' });
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
