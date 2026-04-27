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

export class Job {
  private static defaultLogger = new ConsoleLogger();

  public static async run(
    reader: DataReader, 
    writer: DataWriter, 
    options: { logger?: Logger } = {}
  ): Promise<JobMetrics> {
    const logger = options.logger || this.defaultLogger;
    const startTime = new Date();
    let recordCount = 0;

    try {
      for await (const record of reader.read()) {
        await writer.write(record);
        recordCount++;
      }
    } finally {
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
}
