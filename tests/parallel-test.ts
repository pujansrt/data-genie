import { ParallelWriter } from '@/writers/parallel-writer';
import path from 'path';

async function test() {
  console.log('Starting ParallelWriter Test...');

  const writer = new ParallelWriter({
    workerPath: path.resolve(__dirname, 'mock-worker-simple.js'),
    concurrency: 4,
    batchSize: 10
  });

  console.log('Writing 100 records...');
  for (let i = 0; i < 100; i++) {
    await writer.write({ id: i, data: `Record ${i}` });
  }

  console.log('Closing ParallelWriter (this waits for workers to finish)...');
  await writer.close();
  console.log('ParallelWriter closed successfully.');
}

test().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
