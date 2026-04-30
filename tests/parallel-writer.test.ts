import * as fs from 'node:fs';
import * as path from 'node:path';
import { ParallelWriter } from '@/writers/parallel-writer';
import { MemoryReader } from '@/readers/memory-reader';
import { Job } from '@/core/job';

describe('ParallelWriter Integration', () => {
  const tempWorkerPath = path.resolve(__dirname, 'temp-integration-worker.js');
  const tempOutputPath = path.resolve(__dirname, 'parallel-output.json');

  beforeAll(() => {
    // Create a simple worker script that writes to a file
    // We use commonjs and point to the compiled dist/index for stability in tests
    const workerCode = `
      const { setupWorker } = require('../dist/index');
      const fs = require('fs');
      
      const fileWriter = {
        write: async (record) => {
          // Append to a file (simplified shared resource for testing)
          fs.appendFileSync('${tempOutputPath}', JSON.stringify(record) + '\\n');
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
    
    const reader = new MemoryReader(data);
    const writer = new ParallelWriter({
      workerPath: tempWorkerPath,
      concurrency: 2,
      batchSize: 5
    });

    await Job.run(reader, writer);

    const outputLines = fs.readFileSync(tempOutputPath, 'utf8').trim().split('\n');
    expect(outputLines.length).toBe(recordCount);
    
    const firstRecord = JSON.parse(outputLines[0]);
    expect(firstRecord).toHaveProperty('id');
    expect(firstRecord).toHaveProperty('val');
  });
});
