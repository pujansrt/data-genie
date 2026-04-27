import { DataSource, DataSink } from './interfaces';
import { Readable, Writable, PassThrough } from 'stream';
import type { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export class S3Source implements DataSource {
  constructor(private client: S3Client, private bucket: string, private key: string) {}

  public async getStream(): Promise<Readable> {
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
  private upload: Upload;

  constructor(client: S3Client, bucket: string, key: string, contentType = 'application/octet-stream') {
    this.upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: this.passThrough,
        ContentType: contentType
      }
    });
  }

  public async getStream(): Promise<Writable> {
    // Start upload in background
    this.upload.done().catch(console.error);
    return this.passThrough;
  }

  public async finalize(): Promise<void> {
    this.passThrough.end();
    await this.upload.done();
  }

  public name(): string {
    return `s3://upload`;
  }
}
