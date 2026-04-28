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

export class Job {
  private static defaultLogger = new ConsoleLogger();

  public static async run(
    reader: DataReader, 
    writer: DataWriter, 
    options: JobOptions = {}
  ): Promise<JobMetrics> {
    const logger = options.logger || this.defaultLogger;
    const showProgress = options.showProgress && process.stdout.isTTY;
    const startTime = new Date();
    let recordCount = 0;
    let lastUpdate = Date.now();

    try {
      for await (const record of reader.read()) {
        await writer.write(record);
        recordCount++;

        if (showProgress && (recordCount % 1000 === 0 || Date.now() - lastUpdate > 200)) {
          const now = Date.now();
          const elapsed = (now - startTime.getTime()) / 1000;
          const rps = elapsed > 0 ? recordCount / elapsed : 0;
          process.stdout.write(
            `\r⏳ Processing: ${recordCount.toLocaleString()} records | ${rps.toFixed(0)} rec/sec | ${elapsed.toFixed(1)}s elapsed`
          );
          lastUpdate = now;
        }
      }
    } finally {
      if (showProgress) {
        process.stdout.write('\r' + ' '.repeat(100) + '\r'); // Clear the progress line
      }
      await writer.close();
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const recordsPerSecond = durationMs > 0 ? (recordCount / durationMs) * 1000 : recordCount;

    const metrics: JobMetrics = {
      startTime,
      endTime,
      durationMs,
      recordCount,
      recordsPerSecond,
    };

    logger.info(`--- Job Completed ---`);
    logger.info(`Processed: ${recordCount} records`);
    logger.info(`Duration:  ${(durationMs / 1000).toFixed(2)}s`);
    logger.info(`Throughput: ${recordsPerSecond.toFixed(2)} rec/sec`);

    return metrics;
  }

  /**
   * Previews the first N records of a stream without writing them to a destination.
   * Useful for verifying transformations and filters before running a full job.
   */
  public static async preview(
    reader: DataReader,
    options: { limit?: number; logger?: Logger } = {}
  ): Promise<void> {
    const logger = options.logger || this.defaultLogger;
    const limit = options.limit || 5;
    const previewRecords: DataRecord[] = [];
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
