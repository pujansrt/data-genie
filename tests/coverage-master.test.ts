import { CSVReader } from '@/readers/csv-reader';
import { JsonReader } from '@/readers/json-reader';
import { ParquetWriter } from '@/writers/parquet-writer';
import { FixedWidthReader } from '@/readers/fixed-width-reader';
import { NDJsonReader } from '@/readers/nd-json-reader';
import { ParquetReader } from '@/readers/parquet-reader';
import { TSVReader } from '@/readers/tsv-reader';
import { XlsxReader } from '@/readers/xlsx-reader';
import { XMLReader } from '@/readers/xml-reader';
import { CallbackWriter } from '@/writers/callback-writer';
import { BatchCallbackWriter } from '@/writers/batch-callback-writer';
import { MultiWriter } from '@/writers/multi-writer';
import { XMLWriter } from '@/writers/xml-writer';
import { MemoryWriter } from '@/writers/memory-writer';
import { ParallelWriter } from '@/writers/parallel-writer';
import { MemorySource, MemorySink } from '@/core/memory-transport';
import { FileSource } from '@/core/file-transport';
import { Job } from '@/core/job';
import { FilterExpression } from '@/filters/filter-expressions';
import * as fs from 'fs';
import { Worker } from 'node:worker_threads';

// Mock packages
jest.mock('parquetjs-lite', () => {
  const mock = {
    ParquetWriter: {
        openFile: jest.fn().mockImplementation((schema, filePath) => {
            const fs = require('fs');
            if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, 'mock parquet content');
            return Promise.resolve({ appendRow: jest.fn(), close: jest.fn() });
        })
    },
    ParquetReader: {
        openFile: jest.fn().mockResolvedValue({
            getCursor: () => ({
                next: jest.fn().mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null)
            }),
            close: jest.fn()
        })
    },
    ParquetSchema: jest.fn().mockImplementation((s) => s)
  };
  return { ...mock, default: mock };
}, { virtual: true });

jest.mock('exceljs', () => {
  const mock = {
    Workbook: jest.fn().mockImplementation(() => ({
        xlsx: {
            readFile: jest.fn().mockResolvedValue(undefined),
            read: jest.fn().mockResolvedValue(undefined)
        },
        getWorksheet: jest.fn().mockImplementation((id) => {
            if (id === 'missing') return null;
            return {
                rowCount: 2,
                getRow: (idx: number) => ({
                    values: idx === 1 ? [null, 'id', 'name'] : [null, 1, 'test']
                })
            };
        })
    }))
  };
  return { ...mock, default: mock };
}, { virtual: true });

jest.mock('saxes', () => {
  const mock = {
    SaxesParser: jest.fn().mockImplementation(() => {
        const events: any = {};
        return {
            on: (ev: string, cb: any) => { events[ev] = cb; },
            write: (chunk: string) => {
                const s = chunk.toString();
                if (s.includes('trigger-error')) events['error'](new Error('xml-fail'));
                if (s.includes('<item id="1">')) {
                    events['opentag']({ name: 'root', attributes: {} });
                    events['opentag']({ name: 'item', attributes: { id: '1' } });
                    events['opentag']({ name: 'sub', attributes: {} });
                    events['text']('val');
                    events['closetag']({ name: 'sub' });
                    events['closetag']({ name: 'item' });
                    events['closetag']({ name: 'root' });
                }
            },
            close: jest.fn(),
            line: 1, column: 1
        };
    })
  };
  return { ...mock, default: mock };
}, { virtual: true });

// Mock worker_threads
jest.mock('node:worker_threads', () => {
    const events = require('events');
    class MockWorker extends events.EventEmitter {
        postMessage = jest.fn();
        terminate = jest.fn().mockResolvedValue(0);
    }
    return {
        Worker: MockWorker,
        parentPort: new events.EventEmitter()
    };
});

describe('Master Coverage Boost', () => {
  describe('BaseReader & Fluent API', () => {
    it('should test transform, validate, and writeToCallback', async () => {
      const reader = new JsonReader(Buffer.from('[{"id": 1}]'));
      const results: any[] = [];
      await reader.transform(r => ({ ...r, ok: true })).writeToCallback(r => { results.push(r); });
      expect(results[0].ok).toBe(true);

      const mockSchema = { parse: jest.fn().mockImplementation(r => r) };
      await reader.validate(mockSchema as any).write(new MemoryWriter());
      expect(mockSchema.parse).toHaveBeenCalled();
    });

    it('should test base no-ops', () => {
        const { BaseReader } = require('@/core/base-reader');
        class T extends BaseReader { async *read() { yield {id:1}; } }
        const r = new T();
        expect(r.setIgnoreErrors(true)).toBe(r);
        expect(r.setDLQ(new MemoryWriter())).toBe(r);
    });
  });

  describe('Readers Branches', () => {
    it('JsonReader branches', async () => {
        const dlq = new MemoryWriter();
        const reader = new JsonReader(Buffer.from('invalid')).setDLQ(dlq);
        await Job.run(reader, new MemoryWriter());
        expect(dlq.getRecords()).toHaveLength(1);

        const mockSchema = { parse: jest.fn().mockImplementation(() => { throw new Error('fail'); }) };
        const reader2 = new JsonReader(Buffer.from('[{"a":1}]')).setIgnoreErrors(true);
        (reader2 as any).schema = mockSchema;
        await Job.run(reader2, new MemoryWriter());
    });

    it('CSVReader branches', async () => {
        const dlq = new MemoryWriter();
        const reader = new CSVReader(new MemorySource('1,a\n2,b,c\n3,d')).setFieldNamesInFirstRow(false).setDLQ(dlq);
        await Job.run(reader, new MemoryWriter());
        expect(dlq.getRecords()).toHaveLength(1);

        const mockSchema = { parse: jest.fn().mockImplementationOnce(r => r).mockImplementationOnce(() => { throw new Error('val'); }) };
        const reader2 = new CSVReader(new MemorySource('id\n1\n2'), { schema: mockSchema as any, ignoreErrors: true });
        await Job.run(reader2, new MemoryWriter());
    });

    it('FixedWidthReader branches', async () => {
        const reader = new FixedWidthReader(Buffer.from('id   \n12345\n\n     ')).setFieldWidths(5).setFieldNamesInFirstRow(true);
        const out = new MemoryWriter();
        await Job.run(reader, out);
        expect(out.getRecords()[0].id).toBe('12345');
    });

    it('XlsxReader branches', async () => {
        const reader = new XlsxReader(new FileSource('t.xlsx'), { sheetName: 'Sheet1' });
        await Job.run(reader, new MemoryWriter());
    });

    it('XMLReader branches', async () => {
        const dlq = new MemoryWriter();
        const reader = new XMLReader(Buffer.from('trigger-error'), { recordPath: '//item', ignoreErrors: true });
        reader.setDLQ(dlq);
        await Job.run(reader, new MemoryWriter());

        const reader2 = new XMLReader(Buffer.from('<root><item id="1"><sub>val</sub></item></root>'), { 
            recordPath: 'root/item',
            includeAttributes: true,
            stripNamespaces: true
        });
        const out = new MemoryWriter();
        await Job.run(reader2, out);
        expect(out.getRecords()).toHaveLength(1);
    });
  });

  describe('Writers Coverage', () => {
    it('CallbackWriter, MemoryWriter, MultiWriter', async () => {
        const cb = jest.fn();
        await new CallbackWriter(cb).writeAll((async function*(){ yield {a:1}; })());
        expect(cb).toHaveBeenCalled();

        const mw = new MemoryWriter();
        await mw.writeAll((async function*(){ yield {a:1}; })());
        expect(mw.getRecords()).toHaveLength(1);
        mw.clear();
        expect(mw.getRecords()).toHaveLength(0);

        const multi = new MultiWriter(mw);
        await multi.writeAll((async function*(){ yield {a:1}; })());
        expect(mw.getRecords()).toHaveLength(1);
        await multi.close();
    });

    it('BatchCallbackWriter', async () => {
        const cb = jest.fn();
        const writer = new BatchCallbackWriter(2, cb);
        await writer.write({a:1});
        await writer.close();
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('XMLWriter exhaustive coverage', async () => {
        // 1. All escape characters
        const sink1 = new MemorySink();
        const writer1 = new XMLWriter(sink1);
        await writer1.write({ msg: '< > & " \'' });
        await writer1.close();
        expect(sink1.getText()).toContain('&lt; &gt; &amp; &quot; &apos;');

        // 2. Close without any records
        const sink2 = new MemorySink();
        const writer2 = new XMLWriter(sink2, { addDeclaration: true });
        await writer2.close();
        expect(sink2.getText()).toContain('<?xml');
        expect(sink2.getText()).toContain('<root></root>');

        // 2b. Close without records and NO declaration
        const sink2b = new MemorySink();
        const writer2b = new XMLWriter(sink2b, { addDeclaration: false });
        await writer2b.close();
        expect(sink2b.getText()).not.toContain('<?xml');
        expect(sink2b.getText()).toBe('<root></root>\n');

        // 3. Close without ever calling write (already covered by 2/2b since we called close directly)
        
        // 4. Finalize error branch
        const sink5 = { 
            getStream: () => Promise.resolve(new (require('stream').PassThrough)()), 
            finalize: jest.fn().mockRejectedValue(new Error('final-fail')),
            name: () => 'mock' 
        };
        const writer5 = new XMLWriter(sink5 as any);
        await writer5.write({ a: 1 });
        await expect(writer5.close()).rejects.toThrow('final-fail');
    }, 10000);

    it('ParquetWriter', async () => {
        const sink = new MemorySink();
        const writer = new ParquetWriter(sink, { a: { type: 'INT64' } });
        await writer.write({a:1});
        await writer.close();
        expect(sink.getData().length).toBeGreaterThan(0);
    });

    it('ParallelWriter', async () => {
        const writer = new ParallelWriter({ workerPath: 't.js', concurrency: 1, batchSize: 1 });
        const mockWorker = (writer as any).workers[0];
        
        await writer.write({a:1});
        expect(mockWorker.postMessage).toHaveBeenCalled();
        
        // Manually decrement to avoid close() hang
        (writer as any).pendingTasks = 0;
        await writer.close();
        expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  describe('FilterExpression', () => {
    it('should catch eval errors', () => {
        const f = new FilterExpression('!@#');
        const spy = jest.spyOn(console, 'error').mockImplementation();
        expect(f.createRecordFilter()({})).toBe(false);
        spy.mockRestore();
    });
  });
});
