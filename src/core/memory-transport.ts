import { DataSource, DataSink } from './interfaces';
import { Readable, Writable, PassThrough } from 'stream';

export class MemorySource implements DataSource {
  constructor(private data: Buffer | string, private identifier: string = 'memory-source') {}

  public async getStream(): Promise<Readable> {
    return Readable.from(this.data);
  }

  public name(): string {
    return this.identifier;
  }
}

export class MemorySink implements DataSink {
  private chunks: any[] = [];
  private passThrough = new PassThrough();

  constructor(private identifier: string = 'memory-sink') {
    this.passThrough.on('data', (chunk) => {
      this.chunks.push(chunk);
    });
  }

  public async getStream(): Promise<Writable> {
    return this.passThrough;
  }

  public async finalize(): Promise<void> {
    this.passThrough.end();
  }

  public getData(): Buffer {
    return Buffer.concat(this.chunks);
  }

  public getText(): string {
    return this.getData().toString('utf8');
  }

  public name(): string {
    return this.identifier;
  }
}
