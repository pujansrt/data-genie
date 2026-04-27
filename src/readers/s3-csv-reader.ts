import { DataReader, DataRecord } from '@/core/interfaces';
import { parse } from 'csv-parse';
import type { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export interface S3ReaderOptions {
  delimiter?: string;
  hasFieldNamesInFirstRow?: boolean;
}

/**
 * S3CSVReader streams CSV data directly from an AWS S3 bucket.
 */
export class S3CSVReader implements DataReader {
  private s3Client: S3Client;
  private bucket: string;
  private key: string;
  private options: S3ReaderOptions;

  constructor(s3Client: S3Client, bucket: string, key: string, options: S3ReaderOptions = {}) {
    try {
      require.resolve('@aws-sdk/client-s3');
    } catch (e) {
      throw new Error("The '@aws-sdk/client-s3' package is required to use S3Readers. Please install it with 'npm install @aws-sdk/client-s3'.");
    }
    this.s3Client = s3Client;
    this.bucket = bucket;
    this.key = key;
    this.options = {
      delimiter: ',',
      hasFieldNamesInFirstRow: true,
      ...options
    };
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.key,
    });

    const response = await this.s3Client.send(command);
    
    if (!(response.Body instanceof Readable)) {
      throw new Error('S3 response body is not a readable stream.');
    }

    const parser = response.Body.pipe(
      parse({
        columns: this.options.hasFieldNamesInFirstRow,
        delimiter: this.options.delimiter,
        skip_empty_lines: true
      })
    );

    for await (const record of parser) {
      yield record;
    }
  }
}
