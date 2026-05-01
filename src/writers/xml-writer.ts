import { DataWriter, DataRecord, DataSink } from '@/core/interfaces';
import { ensureDataSink } from '@/core/transport-utils';
import { Writable } from 'stream';

export interface XMLWriterOptions {
  /** The root element tag. Defaults to 'root' */
  rootTag?: string;
  /** The element tag for each record. Defaults to 'record' */
  recordTag?: string;
  /** Whether to add XML declaration. Defaults to true */
  addDeclaration?: boolean;
}

export class XMLWriter<T = DataRecord> implements DataWriter<T> {
  private sink: DataSink;
  private rootTag: string;
  private recordTag: string;
  private addDeclaration: boolean;
  private isFirstRecord = true;
  private outputStream?: Writable;
  private isClosed = false;

  constructor(sink: string | DataSink, options?: XMLWriterOptions) {
    this.sink = ensureDataSink(sink);
    this.rootTag = options?.rootTag ?? 'root';
    this.recordTag = options?.recordTag ?? 'record';
    this.addDeclaration = options?.addDeclaration ?? true;
  }

  private async initializeStream(): Promise<void> {
    if (this.outputStream) return;
    this.outputStream = await this.sink.getStream();
  }

  public async write(record: T): Promise<void> {
    await this.initializeStream();
    
    if (this.isFirstRecord) {
      let header = '';
      if (this.addDeclaration) {
        header += `<?xml version="1.0" encoding="UTF-8"?>\n`;
      }
      header += `<${this.rootTag}>\n`;
      
      const canWrite = this.outputStream!.write(header);
      if (!canWrite) {
         await new Promise((resolve) => this.outputStream!.once('drain', resolve));
      }
      this.isFirstRecord = false;
    }

    let xml = `  <${this.recordTag}>\n`;
    for (const [key, value] of Object.entries(record as any)) {
      if (value !== null && value !== undefined) {
          xml += `    <${key}>${this.escapeXml(value)}</${key}>\n`;
      }
    }
    xml += `  </${this.recordTag}>\n`;
    
    const canWrite = this.outputStream!.write(xml);
    if (!canWrite) {
      await new Promise((resolve) => this.outputStream!.once('drain', resolve));
    }
  }

  public async writeAll(records: AsyncIterableIterator<T>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    if (this.isClosed) return;
    this.isClosed = true;

    await this.initializeStream();

    return new Promise(async (resolve, reject) => {
      const stream = this.outputStream!;
      
      stream.on('finish', async () => {
        try {
          if ((this.sink as any).finalize) {
            await (this.sink as any).finalize();
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isFirstRecord) {
        const canWrite = stream.write(`</${this.rootTag}>\n`);
        if (!canWrite) {
            await new Promise((r) => stream.once('drain', r));
        }
      } else {
        // Edge case: no records written but closed, output empty root tag
        let header = '';
        if (this.addDeclaration) {
          header += `<?xml version="1.0" encoding="UTF-8"?>\n`;
        }
        header += `<${this.rootTag}></${this.rootTag}>\n`;
        const canWrite = stream.write(header);
        if (!canWrite) {
            await new Promise((r) => stream.once('drain', r));
        }
      }

      stream.end();
    });
  }

  private escapeXml(unsafe: any): string {
    return String(unsafe).replace(/[<>&"']/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return c;
      }
    });
  }
}
