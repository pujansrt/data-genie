import { DataSource, DataSink } from './interfaces';
import { FileSource, FileSink } from './file-transport';

export function ensureDataSource(source: string | DataSource): DataSource {
  if (typeof source === 'string') {
    return new FileSource(source);
  }
  return source;
}

export function ensureDataSink(sink: string | DataSink): DataSink {
  if (typeof sink === 'string') {
    return new FileSink(sink);
  }
  return sink;
}
