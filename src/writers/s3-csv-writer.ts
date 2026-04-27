import { DataWriter, DataRecord } from '@/core/interfaces';
import { stringify, Stringifier } from 'csv-stringify';
import type { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough } from 'stream';

export interface S3WriterOptions {
  delimiter?: string;
  header?: boolean;
}

/**
 * S3CSVWriter streams CSV data directly into an AWS S3 bucket.
 */
export class S3CSVWriter implements DataWriter {
  private passThrough: PassThrough;
  private stringifier: Stringifier;
  private upload: Upload;

  constructor(s3Client: S3Client, bucket: string, key: string, options: S3WriterOptions = {}) {
    this.passThrough = new PassThrough();
    this.stringifier = stringify({
      delimiter: options.delimiter || ',',
      header: options.header ?? true,
    });

    this.stringifier.pipe(this.passThrough);

    this.upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: this.passThrough,
        ContentType: 'text/csv'
      },
    });

    // Start the upload in the background (it will wait for data from the passThrough)
    this.upload.done().catch(err => {
        console.error('S3 Upload Error:', err);
    });
  }

  public async write(record: DataRecord): Promise<void> {
    const canWrite = this.stringifier.write(record);
    if (!canWrite) {
      await new Promise((resolve) => this.stringifier.once('drain', resolve));
    }
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stringifier.end(async () => {
        try {
          await this.upload.done();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
