import { MemorySource, MemorySink } from '@/core/memory-transport';
import { HttpSource, HttpSink } from '@/core/http-transport';
import { MultiWriter } from '@/writers/multi-writer';
import { MemoryWriter } from '@/writers/memory-writer';
import { MemoryReader } from '@/readers/memory-reader';
import { Job } from '@/core/job';
import { Readable, Writable } from 'stream';

describe('Transports and MultiWriter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: Readable.from([''])
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

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

  describe('HttpSource', () => {
    it('should return the url as name', () => {
      const source = new HttpSource('https://example.com');
      expect(source.name()).toBe('https://example.com');
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

    it('should pass options to fetch', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        body: Readable.from(['data'])
      });

      const source = new HttpSource('https://example.com', {
        method: 'POST',
        headers: { 'X-Test': 'true' },
        body: { foo: 'bar' }
      });

      await source.getStream();

      expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
        method: 'POST',
        headers: { 'X-Test': 'true' },
        body: JSON.stringify({ foo: 'bar' })
      });
    });

    it('should throw error if response is not ok', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const source = new HttpSource('https://example.com');
      await expect(source.getStream()).rejects.toThrow('HttpSource: https://example.com returned 404 Not Found');
    });

    it('should throw HttpSource error if no body returned', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: null
      });

      const source = new HttpSource('url');
      await expect(source.getStream()).rejects.toThrow('returned no body');
    });

    it('should support HttpSource with standard Web ReadableStream', async () => {
      const mockWebStream = {
          getReader: jest.fn()
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: mockWebStream
      });

      // Mock Readable.fromWeb
      const spy = jest.spyOn(Readable, 'fromWeb').mockReturnValue(Readable.from(['web-stream']));

      const source = new HttpSource('url');
      const stream = await source.getStream();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should throw error if body is not a stream', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        body: {} // Not a stream and no getReader
      });

      const source = new HttpSource('https://example.com');
      await expect(source.getStream()).rejects.toThrow('HttpSource: Fetch response body is not a stream.');
    });
  });

  describe('HttpSink', () => {
    it('should return the url as name', () => {
      const sink = new HttpSink('https://example.com');
      expect(sink.name()).toBe('https://example.com');
    });

    it('should successfully upload data', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true
      });

      const sink = new HttpSink('https://example.com', {
        method: 'PUT',
        headers: { 'X-Test': 'true' }
      });

      const stream = await sink.getStream();
      expect(stream).toBeInstanceOf(Writable);
      
      stream.write('chunk1');
      stream.write('chunk2');
      
      await sink.finalize();

      expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/octet-stream',
          'X-Test': 'true'
        }),
        duplex: 'half'
      }));
    });

    it('should throw error if upload fails with non-ok response', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error details')
      });

      const sink = new HttpSink('https://example.com');
      
      const stream = await sink.getStream();
      stream.write('data');
      
      await expect(sink.finalize()).rejects.toThrow('HttpSink: https://example.com returned 500 Internal Server Error. Server error details');
    });

    it('should log and throw error if fetch throws', async () => {
      const mockFetch = global.fetch as jest.Mock;
      const error = new Error('Network failure');
      mockFetch.mockRejectedValue(error);

      const sink = new HttpSink('https://example.com');
      
      await expect(sink.finalize()).rejects.toThrow('Network failure');
      expect(console.error).toHaveBeenCalledWith('HttpSink upload error:', error);
    });
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
