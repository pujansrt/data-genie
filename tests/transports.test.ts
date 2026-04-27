import { MemorySource, MemorySink } from '@/core/memory-transport';
import { HttpSource } from '@/core/http-transport';
import { MultiWriter } from '@/writers/multi-writer';
import { MemoryWriter } from '@/writers/memory-writer';
import { MemoryReader } from '@/readers/memory-reader';
import { Job } from '@/core/job';
import { Readable } from 'stream';

describe('Transports and MultiWriter', () => {
  it('should support MemorySource and MemorySink', async () => {
    const source = new MemorySource(Buffer.from('hello world'));
    const stream = await source.getStream();
    
    let content = '';
    for await (const chunk of stream) {
      content += chunk.toString();
    }
    expect(content).toBe('hello world');

    const sink = new MemorySink();
    const writeStream = await sink.getStream();
    writeStream.write('foo');
    writeStream.write('bar');
    await sink.finalize();
    
    expect(sink.getData().toString()).toBe('foobar');
  });

  it('should support HttpSource', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: Readable.from(['{"a":1}'])
    });

    const source = new HttpSource('https://test.com');
    const stream = await source.getStream();
    
    let content = '';
    for await (const chunk of stream) {
      content += chunk.toString();
    }
    expect(content).toBe('{"a":1}');
  });

  it('should support MultiWriter (Fan-out)', async () => {
    const w1 = new MemoryWriter();
    const w2 = new MemoryWriter();
    const multi = new MultiWriter(w1, w2);

    await multi.write({ id: 1 });
    await multi.close();

    expect(w1.getRecords()).toHaveLength(1);
    expect(w2.getRecords()).toHaveLength(1);
    expect(w1.getRecords()[0].id).toBe(1);
  });

  it('should support MemoryReader and MemoryWriter via Job', async () => {
    const reader = new MemoryReader([{ a: 1 }, { a: 2 }]);
    const writer = new MemoryWriter();

    await Job.run(reader, writer);
    expect(writer.getRecords()).toHaveLength(2);
    expect(writer.getRecords()[0].a).toBe(1);
  });
});
