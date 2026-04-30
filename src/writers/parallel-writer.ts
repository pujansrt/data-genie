import { Worker } from 'node:worker_threads';
import { DataWriter, DataRecord } from '@/core/interfaces';

export interface ParallelWriterOptions {
  /**
   * Path to the worker script file. 
   * This script must export a 'writer' or 'createWriter' function.
   */
  workerPath: string;
  /**
   * Number of worker threads to spawn. Default: number of CPUs / 2.
   */
  concurrency?: number;
  /**
   * Number of records to buffer before sending to a worker. Default: 100.
   */
  batchSize?: number;
  /**
   * Optional worker execution arguments (e.g. ['--import', 'tsx'])
   */
  execArgv?: string[];
}

/**
 * ParallelWriter offloads data writing to multiple worker threads.
 * It is ideal for CPU-intensive writers (JSON/Parquet formatting) or 
 * high-throughput requirements where the main thread is the bottleneck.
 */
export class ParallelWriter implements DataWriter {
  private workers: Worker[] = [];
  private currentWorkerIndex = 0;
  private buffer: DataRecord[] = [];
  private options: ParallelWriterOptions;
  private pendingTasks = 0;

  constructor(options: ParallelWriterOptions) {
    this.options = {
      concurrency: Math.max(1, require('os').cpus().length / 2),
      batchSize: 100,
      ...options
    };

    this.initWorkers();
  }

  private initWorkers() {
    for (let i = 0; i < this.options.concurrency!; i++) {
      const worker = new Worker(this.options.workerPath, {
        execArgv: this.options.execArgv
      });
      worker.on('error', (err) => console.error(`Worker ${i} error:`, err));
      worker.on('message', (msg) => {
        if (msg === 'done') this.pendingTasks--;
      });
      this.workers.push(worker);
    }
  }

  public async write(record: DataRecord): Promise<void> {
    this.buffer.push(record);

    if (this.buffer.length >= this.options.batchSize!) {
      await this.dispatch();
    }
  }

  private async dispatch(): Promise<void> {
    if (this.buffer.length === 0) return;

    const worker = this.workers[this.currentWorkerIndex];
    const chunk = [...this.buffer];
    this.buffer = [];
    this.pendingTasks++;

    worker.postMessage({ type: 'write', data: chunk });

    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;

    // Optional: Backpressure - if too many pending tasks, wait a bit
    if (this.pendingTasks > this.workers.length * 2) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    await this.dispatch(); // Final flush

    // Wait for all workers to finish their current tasks
    while (this.pendingTasks > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Terminate all workers
    for (const worker of this.workers) {
      worker.postMessage({ type: 'close' });
      await worker.terminate();
    }
  }
}

/**
 * Helper to bootstrap a worker script. 
 * Use this in your worker file:
 * 
 * @example
 * // worker.js
 * const { setupWorker } = require('@pujansrt/data-genie/parallel');
 * const { SQLWriter } = require('@pujansrt/data-genie');
 * 
 * setupWorker(new SQLWriter(db, 'table'));
 */
export function setupWorker(writer: DataWriter) {
  const { parentPort } = require('node:worker_threads');

  parentPort?.on('message', async (msg: any) => {
    try {
      if (msg.type === 'write') {
        for (const record of msg.data) {
          await writer.write(record);
        }
        parentPort?.postMessage('done');
      } else if (msg.type === 'close') {
        await writer.close();
        process.exit(0);
      }
    } catch (err) {
      console.error('Parallel Worker Error:', err);
      process.exit(1);
    }
  });
}
