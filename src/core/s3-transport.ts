import { DataSource, DataSink } from './interfaces';
import { Readable, Writable, PassThrough } from 'stream';
import type { S3Client } from '@aws-sdk/client-s3';

export class S3Source implements DataSource {
  constructor(private client: S3Client, private bucket: string, private key: string) {}

  public async getStream(): Promise<Readable> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.key
    }));
    if (!(response.Body instanceof Readable)) {
      throw new Error('S3 Body is not a Readable stream');
    }
    return response.Body;
  }

  public name(): string {
    return `s3://${this.bucket}/${this.key}`;
  }
}

export class S3Sink implements DataSink {
  private passThrough = new PassThrough();
  private upload: any;
  private uploadPromise: Promise<any> | null = null;

  constructor(
    private client: S3Client, 
    private bucket: string, 
    private key: string, 
    private contentType = 'application/octet-stream'
  ) {}

  private async initialize(): Promise<void> {
    if (this.uploadPromise) return;

    let Upload;
    try {
      ({ Upload } = await import('@aws-sdk/lib-storage'));
    } catch (e) {
      throw new Error("The '@aws-sdk/lib-storage' package is required to use S3Sink. Please install it with 'npm install @aws-sdk/lib-storage'.");
    }

    this.upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: this.key,
        Body: this.passThrough,
        ContentType: this.contentType
      }
    });

    this.uploadPromise = this.upload.done();
    this.uploadPromise?.catch(console.error);
  }

  public async getStream(): Promise<Writable> {
    await this.initialize();
    return this.passThrough;
  }

  public async finalize(): Promise<void> {
    this.passThrough.end();
    if (this.uploadPromise) {
      await this.uploadPromise;
    }
  }

  public name(): string {
    return `s3://${this.bucket}/${this.key}`;
  }
}
