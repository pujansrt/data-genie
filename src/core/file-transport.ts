import { DataSource, DataSink } from './interfaces';
import { Readable, Writable } from 'stream';
import { createReadStream, createWriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';

export class FileSource implements DataSource {
  constructor(private filePath: string) {}

  public async getStream(): Promise<Readable> {
    return createReadStream(this.filePath);
  }

  public name(): string {
    return this.filePath;
  }
}

export class FileSink implements DataSink {
  constructor(private filePath: string) {}

  public async getStream(): Promise<Writable> {
    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    return createWriteStream(this.filePath);
  }

  public name(): string {
    return this.filePath;
  }
}
