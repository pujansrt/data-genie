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
});
