import { Writable } from 'stream';
import { DataReader, DataSink } from '../src/core/interfaces';
import { Job } from '../src/core/job';
import { CSVWriter } from '../src/writers/csv-writer';
import { JsonWriter } from '../src/writers/json-writer';
import { NDJsonWriter } from '../src/writers/nd-json-writer';
import { TSVWriter } from '../src/writers/tsv-writer';
import { XMLWriter } from '../src/writers/xml-writer';
import { FixedWidthWriter } from '../src/writers/fixed-width-writer';

/**
 * A mock sink that simulates a very slow destination.
 * It returns false on write() when its internal buffer is 'full'.
 */
class SlowSink implements DataSink {
  public writeCount = 0;
  public drainCount = 0;

  getStream(): Promise<Writable> {
    const self = this;
    const stream = new Writable({
      highWaterMark: 1, // Tiny buffer to trigger backpressure immediately
      write(chunk, encoding, callback) {
        self.writeCount++;
        // Simulate a slow write (e.g., slow database or network)
        setTimeout(() => {
          callback();
        }, 10); 
      }
    });

    stream.on('drain', () => {
      self.drainCount++;
    });

    return Promise.resolve(stream);
  }

  name(): string { return 'slow-sink'; }
}

describe('Backpressure System', () => {
  it('should pause the reader when CSVWriter is clogged', async () => {
    const recordCount = 50;
    const reader: DataReader = {
      read: async function* () {
        for (let i = 0; i < recordCount; i++) {
          yield { id: i, data: 'large_payload' };
        }
      }
    };

    const sink = new SlowSink();
    const writer = new CSVWriter(sink);

    const start = Date.now();
    await Job.run(reader, writer);
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThan(500);
    expect(sink.drainCount).toBeGreaterThan(0);
  });

  it('should pause the reader when JsonWriter is clogged', async () => {
    const recordCount = 50;
    const reader: DataReader = {
      read: async function* () {
        for (let i = 0; i < recordCount; i++) {
          yield { id: i };
        }
      }
    };

    const sink = new SlowSink();
    const writer = new JsonWriter(sink);

    const start = Date.now();
    await Job.run(reader, writer);
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThan(500);
    expect(sink.drainCount).toBeGreaterThan(0);
  });

  it('should pause the reader when NDJsonWriter is clogged', async () => {
    const recordCount = 50;
    const reader: DataReader = {
      read: async function* () {
        for (let i = 0; i < recordCount; i++) {
          yield { id: i };
        }
      }
    };

    const sink = new SlowSink();
    const writer = new NDJsonWriter(sink);

    const start = Date.now();
    await Job.run(reader, writer);
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThan(500);
    expect(sink.drainCount).toBeGreaterThan(0);
  });

  it('should pause the reader when TSVWriter is clogged', async () => {
    const recordCount = 50;
    const reader: DataReader = {
      read: async function* () {
        for (let i = 0; i < recordCount; i++) {
          yield { id: i };
        }
      }
    };

    const sink = new SlowSink();
    const writer = new TSVWriter(sink);

    const start = Date.now();
    await Job.run(reader, writer);
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThan(500);
    expect(sink.drainCount).toBeGreaterThan(0);
  });

  it('should pause the reader when XMLWriter is clogged', async () => {
    const recordCount = 50;
    const reader: DataReader = {
      read: async function* () {
        for (let i = 0; i < recordCount; i++) {
          yield { id: i };
        }
      }
    };

    const sink = new SlowSink();
    const writer = new XMLWriter(sink);

    const start = Date.now();
    await Job.run(reader, writer);
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThan(500);
    expect(sink.drainCount).toBeGreaterThan(0);
  });

  it('should pause the reader when FixedWidthWriter is clogged', async () => {
    const recordCount = 50;
    const reader: DataReader = {
      read: async function* () {
        for (let i = 0; i < recordCount; i++) {
          yield { f1: i };
        }
      }
    };

    const sink = new SlowSink();
    const writer = new FixedWidthWriter(sink);
    writer.setFieldWidths(10);

    const start = Date.now();
    await Job.run(reader, writer);
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThan(500);
    expect(sink.drainCount).toBeGreaterThan(0);
  });
});
