import { DataSource, DataSink } from './interfaces';
import { Readable, Writable } from 'stream';

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
  private writable: Writable;

  constructor(private identifier: string = 'memory-sink') {
    this.writable = this.createWritable();
  }

  private createWritable(): Writable {
    const self = this;
    return new Writable({
      write(chunk, encoding, callback) {
        self.chunks.push(chunk);
        callback();
      }
    });
  }

  public async getStream(): Promise<Writable> {
    return this.writable;
  }

  public async finalize(): Promise<void> {
    return new Promise((resolve) => {
        this.writable.end(() => resolve());
    });
  }

  public clear(): void {
    this.chunks = [];
    this.writable = this.createWritable();
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
