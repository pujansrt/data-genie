import { Job, ConsoleLogger } from '@/core/job';
import { ConsoleWriter } from '@/writers/console-writer';
import { DataReader, DataWriter, Logger } from '@/core/interfaces';

describe('Job', () => {
  it('should cover ConsoleLogger methods', () => {
    const logger = new ConsoleLogger();
    const spyLog = jest.spyOn(console, 'log').mockImplementation();
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation();
    const spyError = jest.spyOn(console, 'error').mockImplementation();
    const spyDebug = jest.spyOn(console, 'debug').mockImplementation();

    logger.info('test');
    logger.warn('test');
    logger.error('test');
    logger.debug('test');

    expect(spyLog).toHaveBeenCalled();
    expect(spyWarn).toHaveBeenCalled();
    expect(spyError).toHaveBeenCalled();
    expect(spyDebug).toHaveBeenCalled();

    spyLog.mockRestore();
    spyWarn.mockRestore();
    spyError.mockRestore();
    spyDebug.mockRestore();
  });

  it('should cover ConsoleWriter', async () => {
    const writer = new ConsoleWriter();
    const spyLog = jest.spyOn(console, 'log').mockImplementation();

    await writer.write({ a: 1 });
    await writer.writeAll((async function*() { yield { b: 2 }; })());
    await writer.close();

    expect(spyLog).toHaveBeenCalledTimes(3);
    spyLog.mockRestore();
  });

  it('should return correct metrics and use custom logger', async () => {
    const mockRecords = [{ id: 1 }, { id: 2 }];
    
    const mockReader: DataReader = {
      read: async function* () {
        for (const r of mockRecords) yield r;
      }
    };

    const mockWriter: DataWriter = {
      write: jest.fn().mockResolvedValue(undefined),
      writeAll: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const mockLogger: Logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const metrics = await Job.run(mockReader, mockWriter, { logger: mockLogger });

    expect(metrics.recordCount).toBe(2);
    expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Job Completed'));
    expect(mockWriter.close).toHaveBeenCalled();
  });

  it('should handle showProgress', async () => {
    const mockReader: DataReader = {
      read: async function* () {
        for (let i = 0; i < 1500; i++) yield { id: i };
      }
    };

    const mockWriter: DataWriter = {
      write: jest.fn().mockResolvedValue(undefined),
      writeAll: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const spyStdout = jest.spyOn(process.stdout, 'write').mockImplementation();
    // Force isTTY to true for the test
    const oldIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = true;

    await Job.run(mockReader, mockWriter, { showProgress: true });

    expect(spyStdout).toHaveBeenCalledWith(expect.stringContaining('⏳ Processing'));
    expect(spyStdout).toHaveBeenCalledWith(expect.stringContaining('records'));

    spyStdout.mockRestore();
    process.stdout.isTTY = oldIsTTY;
  });

  it('should preview records without a writer', async () => {
    const mockRecords = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const mockReader: DataReader = {
      read: async function* () {
        for (const r of mockRecords) yield r;
      }
    };

    const mockLogger: Logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const spyTable = jest.spyOn(console, 'table').mockImplementation();

    await Job.preview(mockReader, { limit: 2, logger: mockLogger });

    expect(spyTable).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Previewing first 2 records'));
    
    spyTable.mockRestore();
  });

  it('should warn when no records are found in preview', async () => {
    const mockReader: DataReader = {
      read: async function* () { /* yield nothing */ }
    };

    const mockLogger: Logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    await Job.preview(mockReader, { logger: mockLogger });

    expect(mockLogger.warn).toHaveBeenCalledWith('No records found to preview.');
  });

  it('should emit events during execution', async () => {
    const mockRecords = [{ id: 1 }, { id: 2 }];
    const mockReader: DataReader = {
      read: async function* () {
        for (const r of mockRecords) yield r;
      }
    };
    const mockWriter: DataWriter = {
      write: jest.fn().mockResolvedValue(undefined),
      writeAll: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const job = new Job(mockReader, mockWriter);
    
    const events: string[] = [];
    const records: any[] = [];
    let completeMetrics: any = null;

    job.on('start', () => events.push('start'));
    job.on('record', (record) => {
      events.push('record');
      records.push(record);
    });
    job.on('complete', (metrics) => {
      events.push('complete');
      completeMetrics = metrics;
    });

    await job.run();

    expect(events).toEqual(['start', 'record', 'record', 'complete']);
    expect(records).toEqual(mockRecords);
    expect(completeMetrics.recordCount).toBe(2);
  });

  it('should emit error event when write fails', async () => {
    const mockReader: DataReader = {
      read: async function* () {
        yield { id: 1 };
      }
    };
    const error = new Error('Write failed');
    const mockWriter: DataWriter = {
      write: jest.fn().mockRejectedValue(error),
      writeAll: jest.fn().mockRejectedValue(error),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const job = new Job(mockReader, mockWriter);
    const errorHandler = jest.fn();
    job.on('error', errorHandler);

    await expect(job.run()).rejects.toThrow('Write failed');
    expect(errorHandler).toHaveBeenCalledWith(error, { id: 1 });
  });
});
