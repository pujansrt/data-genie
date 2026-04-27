import { DataWriter, DataRecord } from '@/core/interfaces';
import type { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough } from 'stream';

export interface S3JsonWriterOptions {
  format?: 'json' | 'ndjson';
}

/**
 * S3JsonWriter streams JSON or NDJSON data directly into an AWS S3 bucket.
 */
export class S3JsonWriter implements DataWriter {
  private passThrough: PassThrough;
  private upload: Upload;
  private format: 'json' | 'ndjson';
  private firstRecord: boolean = true;

  constructor(s3Client: S3Client, bucket: string, key: string, options: S3JsonWriterOptions = {}) {
    this.passThrough = new PassThrough();
    this.format = options.format || 'ndjson';

    this.upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: this.passThrough,
        ContentType: 'application/json'
      },
    });

    if (this.format === 'json') {
      this.passThrough.write('[\n');
    }

    this.upload.done().catch(err => {
      console.error('S3 JSON Upload Error:', err);
    });
  }

  public async write(record: DataRecord): Promise<void> {
    let content = '';
    
    if (this.format === 'json') {
      content = (this.firstRecord ? '' : ',\n') + JSON.stringify(record, null, 2);
    } else {
      content = JSON.stringify(record) + '\n';
    }

    this.firstRecord = false;
    
    const canWrite = this.passThrough.write(content);
    if (!canWrite) {
      await new Promise((resolve) => this.passThrough.once('drain', resolve));
    }
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    if (this.format === 'json') {
      this.passThrough.write('\n]');
    }
    
    this.passThrough.end();
    await this.upload.done();
  }
}
