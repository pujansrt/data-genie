import { DataSource, DataSink } from './interfaces';
import { Readable, Writable, PassThrough } from 'stream';

export interface HttpSourceOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export class HttpSource implements DataSource {
  constructor(private url: string, private options: HttpSourceOptions = {}) {}

  public async getStream(): Promise<Readable> {
    const response = await fetch(this.url, {
      method: this.options.method || 'GET',
      headers: this.options.headers,
      body: this.options.body ? JSON.stringify(this.options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HttpSource: ${this.url} returned ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error(`HttpSource: ${this.url} returned no body`);
    }

    // Handle both Node.js fetch (body is a stream) and standard Web fetch
    if (response.body && typeof (response.body as any)[Symbol.asyncIterator] === 'function') {
        return Readable.from(response.body as any);
    }

    if (response.body && (response.body as any).getReader) {
        return Readable.fromWeb(response.body as any);
    }
    
    throw new Error('HttpSource: Fetch response body is not a stream.');
  }

  public name(): string {
    return this.url;
  }
}

export interface HttpSinkOptions {
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
}

export class HttpSink implements DataSink {
  private passThrough = new PassThrough();
  private uploadPromise: Promise<void>;

  constructor(private url: string, private options: HttpSinkOptions = {}) {
    this.uploadPromise = this.startUpload();
  }

  private async startUpload(): Promise<void> {
    // This is a bit tricky with fetch as it doesn't support streaming request bodies easily in all environments
    // but in Node.js 18+ it should work if we pass a ReadableStream.
    // However, for simplicity and compatibility, we might want to collect and then send, 
    // but the goal is streaming.
    
    // Node fetch supports Readable stream as body.
    try {
      const response = await fetch(this.url, {
        method: this.options.method || 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...this.options.headers,
        },
        body: this.passThrough as any,
        // @ts-ignore - duplex is needed for streaming body in fetch
        duplex: 'half'
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HttpSink: ${this.url} returned ${response.status} ${response.statusText}. ${text}`);
      }
    } catch (error) {
      console.error('HttpSink upload error:', error);
      throw error;
    }
  }

  public async getStream(): Promise<Writable> {
    return this.passThrough;
  }

  public async finalize(): Promise<void> {
    this.passThrough.end();
    await this.uploadPromise;
  }

  public name(): string {
    return this.url;
  }
}
