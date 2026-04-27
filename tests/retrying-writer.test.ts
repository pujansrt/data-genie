import { RetryingWriter } from '@/writers/retrying-writer';
import { DataWriter } from '@/core/interfaces';

describe('RetryingWriter', () => {
  let mockWriter: jest.Mocked<DataWriter>;

  beforeEach(() => {
    mockWriter = {
      write: jest.fn().mockResolvedValue(undefined),
      writeAll: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('should retry on failure and eventually succeed', async () => {
    mockWriter.write
      .mockRejectedValueOnce(new Error('Transient Error'))
      .mockResolvedValueOnce(undefined);

    const writer = new RetryingWriter(mockWriter, {
      maxRetries: 2,
      initialDelayMs: 1, // fast tests
    });

    await writer.write({ id: 1 });
    expect(mockWriter.write).toHaveBeenCalledTimes(2);
  });

  it('should open circuit after threshold is reached', async () => {
    mockWriter.write.mockRejectedValue(new Error('Permanent Error'));

    const writer = new RetryingWriter(mockWriter, {
      maxRetries: 0,
      circuitBreakerThreshold: 2,
    });

    // First failure
    await expect(writer.write({ id: 1 })).rejects.toThrow();
    // Second failure - trips circuit
    await expect(writer.write({ id: 2 })).rejects.toThrow();

    // Third call - should fail immediately without calling mockWriter
    await expect(writer.write({ id: 3 })).rejects.toThrow('Circuit Breaker is OPEN');
    expect(mockWriter.write).toHaveBeenCalledTimes(2);
  });
});
