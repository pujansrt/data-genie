import * as fs from 'node:fs';
import * as path from 'node:path';
import { ParallelWriter } from '@/writers/parallel-writer';
import { MemoryReader } from '@/readers/memory-reader';
import { Job } from '@/core/job';
describe('ParallelWriter Integration', () => {
  const tempWorkerPath = path.resolve(__dirname, 'temp-integration-worker.js');
  const tempOutputPath = path.resolve(__dirname, 'parallel-output.json');
  const distPath = path.resolve(__dirname, '../dist/index.js');
  const srcPath = path.resolve(__dirname, '../src/index.ts');

  beforeAll(() => {
    const useDist = fs.existsSync(distPath);
    const indexPath = useDist ? distPath : srcPath;

    // Create a worker script
    const workerCode = `
      const { setupWorker } = require('${indexPath.replace(/\\/g, '/')}');
      const fs = require('fs');

      const fileWriter = {
        write: async (record) => {
          fs.appendFileSync('${tempOutputPath.replace(/\\/g, '/')}', JSON.stringify(record) + '\\n');
        },
        close: async () => {},
        writeAll: async () => {}
      };

      setupWorker(fileWriter);
    `;
    fs.writeFileSync(tempWorkerPath, workerCode);
  });

  afterAll(() => {
    if (fs.existsSync(tempWorkerPath)) fs.unlinkSync(tempWorkerPath);
    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
  });

  it('should process records across multiple worker threads', async () => {
    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    fs.writeFileSync(tempOutputPath, '');

    const recordCount = 50;
    const data = Array.from({ length: recordCount }, (_, i) => ({ id: i, val: `record-${i}` }));

    const useDist = fs.existsSync(distPath);
    const reader = new MemoryReader(data);
    const writer = new ParallelWriter({
      workerPath: tempWorkerPath,
      concurrency: 2,
      batchSize: 5,
      // If we are using source, we need tsx to handle the .ts require
      execArgv: useDist ? [] : ['--import', 'tsx']
    });

    await Job.run(reader, writer);

    const outputLines = fs.readFileSync(tempOutputPath, 'utf8').trim().split('\n');
    expect(outputLines.length).toBe(recordCount);

    const firstRecord = JSON.parse(outputLines[0]);
    expect(firstRecord).toHaveProperty('id');
    expect(firstRecord).toHaveProperty('val');
  }, 15000); // Increase timeout for worker overhead
});

