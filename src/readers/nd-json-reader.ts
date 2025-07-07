import { createReadStream } from 'fs';
import * as readline from 'readline';
import { DataReader, DataRecord } from '@/core/interfaces';

/**
 * NDJsonReader class for reading data records from a file in NDJSON (Newline Delimited JSON) format.
 * Each line in the file is expected to be a valid JSON object.
 * This class reads records incrementally, suitable for very large files.
 */
export class NDJsonReader implements DataReader {
  private filePath: string;

  /**
   * Constructs a new NDJsonReader.
   * @param filePath The path to the NDJSON file.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Reads data records from the NDJSON file asynchronously, yielding each record as it's parsed.
   * @returns An AsyncIterableIterator of DataRecord objects.
   */
  public async *read(): AsyncIterableIterator<DataRecord> {
    const stream = createReadStream(this.filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity // Recognizes both CRLF and LF as line endings
    });

    for await (const line of rl) {
      // Skip empty lines that might occur (e.g., at the end of the file or accidental blank lines)
      if (!line.trim()) {
        continue;
      }

      try {
        // Parse each non-empty line as a JSON object
        const record: DataRecord = JSON.parse(line);
        yield record;
      } catch (error) {
        // Log an error or throw if a line cannot be parsed as valid JSON
        console.error(`NDJsonReader: Error parsing JSON line from ${this.filePath}: "${line.substring(0, 100)}..."`, error);
        // Depending on your requirements, you might choose to:
        // 1. continue; // Skip the malformed line and proceed
        // 2. throw error; // Stop processing and propagate the error
        // For a reader, skipping might be preferred to allow reading remaining valid data.
        throw new Error(`Invalid JSON format in file ${this.filePath} on line: ${line.substring(0, 50)}...`);
      }
    }
  }
}
