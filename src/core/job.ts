import { EventEmitter } from 'events';
import { DataReader, DataWriter, DataRecord, Logger } from './interfaces';

export interface JobMetrics {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  recordCount: number;
  recordsPerSecond: number;
}

export class ConsoleLogger implements Logger {
  info(message: string, ...args: any[]): void { console.log(message, ...args); }
  warn(message: string, ...args: any[]): void { console.warn(message, ...args); }
  error(message: string, ...args: any[]): void { console.error(message, ...args); }
  debug(message: string, ...args: any[]): void { console.debug(message, ...args); }
}

export interface JobOptions {
  logger?: Logger;
  showProgress?: boolean;
}

/**
 * Job class orchestrates the data pipeline by reading from a DataReader
 * and writing to a DataWriter. It extends EventEmitter to provide
 * observability into the job's progress and lifecycle.
 */
export class Job<T = DataRecord> extends EventEmitter {
  private static defaultLogger = new ConsoleLogger();
  private reader: DataReader<T>;
  private writer: DataWriter<T>;
  private options: JobOptions;

  constructor(reader: DataReader<T>, writer: DataWriter<T>, options: JobOptions = {}) {
    super();
    this.reader = reader;
    this.writer = writer;
    this.options = options;
  }

  /**
   * Executes the job, reading all records and writing them to the destination.
   * Emits 'start', 'record', 'progress', 'error', and 'complete' events.
   */
  public async run(): Promise<JobMetrics> {
    const logger = this.options.logger || Job.defaultLogger;
    const showProgress = this.options.showProgress && process.stdout.isTTY;
    const startTime = new Date();
    let recordCount = 0;
    let lastUpdate = Date.now();

    this.emit('start', { startTime });

    try {
      for await (const record of this.reader.read()) {
        try {
          await this.writer.write(record);
          recordCount++;
          
          this.emit('record', record);

          if (showProgress && (recordCount % 1000 === 0 || Date.now() - lastUpdate > 200)) {
            const now = Date.now();
            const currentMetrics = this.calculateMetrics(startTime, new Date(now), recordCount);
            
            this.emit('progress', currentMetrics);

            const rps = currentMetrics.recordsPerSecond;
            const elapsed = currentMetrics.durationMs / 1000;
            process.stdout.write(
              `\r⏳ Processing: ${recordCount.toLocaleString()} records | ${rps.toFixed(0)} rec/sec | ${elapsed.toFixed(1)}s elapsed`
            );
            lastUpdate = now;
          }
        } catch (error) {
          this.emit('error', error, record);
          throw error;
        }
      }
    } finally {
      if (showProgress) {
        process.stdout.write('\r' + ' '.repeat(100) + '\r'); // Clear the progress line
      }
      await this.writer.close();
    }

    const endTime = new Date();
    const metrics = this.calculateMetrics(startTime, endTime, recordCount);

    logger.info(`--- Job Completed ---`);
    logger.info(`Processed: ${recordCount} records`);
    logger.info(`Duration:  ${(metrics.durationMs / 1000).toFixed(2)}s`);
    logger.info(`Throughput: ${metrics.recordsPerSecond.toFixed(2)} rec/sec`);

    this.emit('complete', metrics);
    return metrics;
  }

  private calculateMetrics(startTime: Date, endTime: Date, recordCount: number): JobMetrics {
    const durationMs = endTime.getTime() - startTime.getTime();
    const recordsPerSecond = durationMs > 0 ? (recordCount / durationMs) * 1000 : recordCount;
    return {
      startTime,
      endTime,
      durationMs,
      recordCount,
      recordsPerSecond,
    };
  }

  /**
   * Static convenience method to run a job without manually creating an instance.
   */
  public static async run<T = DataRecord>(
    reader: DataReader<T>, 
    writer: DataWriter<T>, 
    options: JobOptions = {}
  ): Promise<JobMetrics> {
    const job = new Job(reader, writer, options);
    return job.run();
  }

  /**
   * Previews the first N records of a stream without writing them to a destination.
   * Useful for verifying transformations and filters before running a full job.
   */
  public static async preview<T = DataRecord>(
    reader: DataReader<T>,
    options: { limit?: number; logger?: Logger } = {}
  ): Promise<void> {
    const logger = options.logger || this.defaultLogger;
    const limit = options.limit || 5;
    const previewRecords: T[] = [];
    let count = 0;

    logger.info(`--- Previewing first ${limit} records ---`);

    for await (const record of reader.read()) {
      previewRecords.push(record);
      count++;
      if (count >= limit) break;
    }

    if (previewRecords.length === 0) {
      logger.warn('No records found to preview.');
    } else {
      console.table(previewRecords);
      logger.info(`--- Preview Complete (${previewRecords.length} records shown) ---`);
    }
  }
}
