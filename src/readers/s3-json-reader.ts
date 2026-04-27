import { DataReader, DataRecord } from '@/core/interfaces';
import type { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as readline from 'readline';

export interface S3JsonOptions {
  format?: 'json' | 'ndjson';
}

/**
 * S3JsonReader reads JSON or NDJSON data from an AWS S3 bucket.
 */
export class S3JsonReader implements DataReader {
  private s3Client: S3Client;
  private bucket: string;
  private key: string;
  private options: S3JsonOptions;

  constructor(s3Client: S3Client, bucket: string, key: string, options: S3JsonOptions = {}) {
    this.s3Client = s3Client;
    this.bucket = bucket;
    this.key = key;
    this.options = {
      format: 'ndjson', // Default to NDJSON as it is more memory efficient
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

    if (this.options.format === 'ndjson') {
      const rl = readline.createInterface({
        input: response.Body,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        if (line.trim()) {
          yield JSON.parse(line);
        }
      }
    } else {
      // Standard JSON Array
      let jsonContent = '';
      for await (const chunk of response.Body) {
        jsonContent += chunk;
      }
      const data = JSON.parse(jsonContent);
      if (Array.isArray(data)) {
        for (const item of data) yield item;
      } else {
        yield data;
      }
    }
  }
}
