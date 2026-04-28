import { DataReader, DataRecord } from '@/core/interfaces';
import { SchemaValidator } from '@/transformers/schema-validating-reader';

export interface HttpReaderOptions<T = any> {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  /**
   * Function to extract the array of records from the API response.
   * Defaults to returning the response itself.
   */
  resultsPath?: (response: any) => any[];
  /**
   * Function to calculate the next URL for pagination. 
   * Receives the full response body and the current URL.
   * Return null to stop pagination.
   */
  nextPageUrl?: (response: any, currentUrl: string) => string | null;
  /**
   * Optional schema for validation and type inference.
   */
  schema?: SchemaValidator<T>;
}

/**
 * HttpReader class for streaming data from REST APIs.
 * Supports automated pagination and custom authentication headers.
 */
export class HttpReader<T = DataRecord> implements DataReader<T> {
  private url: string;
  private options: HttpReaderOptions<T>;
  private schema?: SchemaValidator<T>;

  constructor(url: string, options: HttpReaderOptions<T> = {}) {
    this.url = url;
    this.options = {
      method: 'GET',
      resultsPath: (res) => (Array.isArray(res) ? res : res.data || res.items || []),
      ...options,
    };
    this.schema = options.schema;
  }

  public async *read(): AsyncIterableIterator<T> {
    let currentUrl: string | null = this.url;

    while (currentUrl) {
      const response = await fetch(currentUrl, {
        method: this.options.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: this.options.body ? JSON.stringify(this.options.body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'No error body');
        throw new Error(`HttpReader: ${this.options.method} ${currentUrl} failed with ${response.status}. Body: ${errorBody}`);
      }

      const data = await response.json();
      const records = this.options.resultsPath!(data);

      if (!Array.isArray(records)) {
        throw new Error('HttpReader: Extracted records are not in an array format. Check resultsPath configuration.');
      }

      for (const record of records) {
        if (this.schema) {
          yield this.schema.parse(record);
        } else {
          yield record as T;
        }
      }

      // Pagination logic
      if (this.options.nextPageUrl) {
        currentUrl = this.options.nextPageUrl(data, currentUrl);
      } else {
        currentUrl = null;
      }
    }
  }
}
