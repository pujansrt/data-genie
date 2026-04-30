import { DataSource, DataSink } from './interfaces';
import { FileSource, FileSink } from './file-transport';
import { MemorySource } from './memory-transport';

export function ensureDataSource(source: string | DataSource | Buffer): DataSource {
  if (typeof source === 'string') {
    return new FileSource(source);
  }
  if (Buffer.isBuffer(source)) {
    return new MemorySource(source);
  }
  return source;
}

export function ensureDataSink(sink: string | DataSink): DataSink {
  if (typeof sink === 'string') {
    return new FileSink(sink);
  }
  return sink;
}
