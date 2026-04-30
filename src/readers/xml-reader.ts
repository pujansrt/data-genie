import { BaseReader } from '@/core/base-reader';
import { DataRecord, DataSource } from '@/core/interfaces';
import { ensureDataSource } from '@/core/transport-utils';

export interface XMLReaderOptions {
  /** The path to the record, e.g., 'library/book', 'records/record' or '//book' for any depth */
  recordPath: string;
  /** Whether to include attributes, prefixed with '@'. Defaults to true. */
  includeAttributes?: boolean;
  /** Whether to trim whitespace from text nodes. Defaults to true. */
  trimWhitespace?: boolean;
  /** Whether to strip namespace prefixes from tags. Defaults to false. */
  stripNamespaces?: boolean;
  /** Optional mapping to flatten/rename fields. Keys are target names, values are paths like 'title.#text' */
  fieldMapping?: Record<string, string>;
}

export class XMLReader<T = DataRecord> extends BaseReader<T> {
  private source: DataSource;
  private recordPath: string;
  private isDeepSearch: boolean;
  private includeAttributes: boolean;
  private trimWhitespace: boolean;
  private stripNamespaces: boolean;
  private fieldMapping?: Record<string, string>;
  private ignoreErrors: boolean = false;
  private dlqWriter?: DataWriter<any>;

  constructor(source: string | DataSource | Buffer, options: XMLReaderOptions) {
    super();
    this.source = ensureDataSource(source);
    this.isDeepSearch = options.recordPath.startsWith('//');
    this.recordPath = options.recordPath.replace(/^(\/\/|\/)/, '').replace(/\/$/, '');
    this.includeAttributes = options.includeAttributes ?? true;
    this.trimWhitespace = options.trimWhitespace ?? true;
    this.stripNamespaces = options.stripNamespaces ?? false;
    this.fieldMapping = options.fieldMapping;
    if (options.ignoreErrors !== undefined) this.ignoreErrors = options.ignoreErrors;
  }

  /**
   * Whether to ignore errors during processing (e.g., malformed XML).
   */
  public setIgnoreErrors(value: boolean): this {
    this.ignoreErrors = value;
    return this;
  }

  /**
   * Sets a DataWriter to act as a Dead Letter Queue (DLQ).
   */
  public setDLQ(writer: DataWriter<any>): this {
    this.dlqWriter = writer;
    this.ignoreErrors = true;
    return this;
  }

  private getTagName(name: string): string {
    return this.stripNamespaces ? name.split(':').pop()! : name;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev ? prev[curr] : undefined;
    }, obj);
  }

  public async *read(): AsyncIterableIterator<T> {
    let SaxesParser;
    try {
      const saxes = await import('saxes');
      SaxesParser = saxes.SaxesParser;
    } catch (e) {
      throw new Error("The 'saxes' package is required to use XMLReader. Please install it with 'npm install saxes'.");
    }

    const stream = await this.source.getStream();
    const parser = new SaxesParser();

    const tagStack: string[] = [];
    const objectStack: any[] = [];
    let currentRecord: any = null;
    let textBuffer: string = '';
    
    // Queue to hold records parsed during the current stream chunk
    const recordQueue: T[] = [];

    parser.on('opentag', (node: any) => {
      const tagName = this.getTagName(node.name);
      tagStack.push(tagName);
      const currentPath = tagStack.join('/');

      const isMatch = this.isDeepSearch 
        ? currentPath.endsWith(this.recordPath) 
        : currentPath === this.recordPath;

      // Check if we just entered the record boundary
      if (isMatch && !currentRecord) {
        currentRecord = {};
        objectStack.push(currentRecord);
        
        if (this.includeAttributes) {
          this.attachAttributes(currentRecord, node.attributes);
        }
      } 
      // If we are already inside a record, create a nested object
      else if (currentRecord) {
        const parent = objectStack[objectStack.length - 1];
        const newNode = {};
        
        if (this.includeAttributes) {
          this.attachAttributes(newNode, node.attributes);
        }

        // Handle multiple tags with same name as an array
        if (parent[tagName]) {
          if (!Array.isArray(parent[tagName])) {
            parent[tagName] = [parent[tagName]];
          }
          parent[tagName].push(newNode);
        } else {
          parent[tagName] = newNode;
        }
        
        objectStack.push(newNode);
      }
      
      textBuffer = ''; // Reset buffer for the new tag
    });

    parser.on('text', (text: string) => {
      if (currentRecord) {
        textBuffer += text;
      }
    });

    parser.on('closetag', (node: any) => {
      const tagName = this.getTagName(node.name);
      const currentPath = tagStack.join('/');
      const content = this.trimWhitespace ? textBuffer.trim() : textBuffer;

      if (currentRecord) {
        const currentObj = objectStack.pop();
        
        // If the tag had only text and no nested objects/attributes, 
        // flatten it from {} to a string
        if (content && Object.keys(currentObj).length === 0) {
          const parent = objectStack[objectStack.length - 1];
          if (parent) {
            if (Array.isArray(parent[tagName])) {
              parent[tagName][parent[tagName].length - 1] = content;
            } else {
              parent[tagName] = content;
            }
          }
        } else if (content) {
          // If it has attributes AND text, put text in a special property
          currentObj['#text'] = content;
        }

        const isMatch = this.isDeepSearch 
          ? currentPath.endsWith(this.recordPath) 
          : currentPath === this.recordPath;

        // If we finished the record, queue it for yielding
        if (isMatch) {
          if (this.fieldMapping) {
            const mappedRecord: any = {};
            for (const [target, path] of Object.entries(this.fieldMapping)) {
              mappedRecord[target] = this.getNestedValue(currentRecord, path);
            }
            recordQueue.push(mappedRecord as T);
          } else {
            recordQueue.push(currentRecord as T);
          }
          currentRecord = null;
        }
      }

      tagStack.pop();
      textBuffer = '';
    });

    parser.on('error', (err: any) => {
       if (this.ignoreErrors) {
          if (this.dlqWriter) {
             // We can't easily get the current chunk here, but we have the error
             this.dlqWriter.write({
                _error: err.message,
                _type: 'parse_error',
                _line: parser.line,
                _column: parser.column
             }).catch(() => {});
          }
       } else {
          throw err;
       }
    });

    try {
      for await (const chunk of stream) {
        try {
          parser.write(chunk.toString());
          while (recordQueue.length > 0) {
            yield recordQueue.shift()!;
          }
        } catch (error) {
          console.error('[XMLReader] caught error during write:', error.message);
          if (this.ignoreErrors) {
            if (this.dlqWriter) {
              await this.dlqWriter.write({
                _error: error instanceof Error ? error.message : String(error),
                _type: 'parse_error',
                _chunk: chunk.toString().substring(0, 1000)
              });
            }
            continue;
          }
          throw error;
        }
      }
      
      // Make sure we yield any remaining records at the end
      parser.close();
      while (recordQueue.length > 0) {
        yield recordQueue.shift()!;
      }
    } catch (error) {
      if (this.ignoreErrors) {
        if (this.dlqWriter) {
          await this.dlqWriter.write({
            _error: error instanceof Error ? error.message : String(error),
            _type: 'fatal_parse_error'
          });
        }
      } else {
        throw error;
      }
    } finally {
      // We do NOT close the dlqWriter here, because it might be shared
    }
  }

  private attachAttributes(obj: any, attributes: Record<string, string> | any) {
    if (!attributes) return;
    Object.entries(attributes).forEach(([key, value]) => {
      const name = this.stripNamespaces ? key.split(':').pop()! : key;
      obj[`@${name}`] = typeof value === 'object' && value !== null ? (value as any).value : value;
    });
  }
}
