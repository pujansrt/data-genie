import { Job } from '@/core/job';
import { DataReader, DataWriter, DataRecord, Logger } from '@/core/interfaces';

describe('Job', () => {
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
