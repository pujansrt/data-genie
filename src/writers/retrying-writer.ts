import { DataWriter, DataRecord } from '@/core/interfaces';

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
  circuitBreakerThreshold: number; // How many consecutive failures to open the circuit
  circuitResetTimeoutMs: number;   // How long to wait before trying again after a circuit break
}

export class RetryingWriter implements DataWriter {
  private writer: DataWriter;
  private options: RetryOptions;
  
  private consecutiveFailures: number = 0;
  private circuitOpen: boolean = false;
  private circuitResetTime: number = 0;

  constructor(writer: DataWriter, options: Partial<RetryOptions> = {}) {
    this.writer = writer;
    this.options = {
      maxRetries: 3,
      initialDelayMs: 1000,
      backoffFactor: 2,
      circuitBreakerThreshold: 5,
      circuitResetTimeoutMs: 30000,
      ...options,
    };
  }

  public async write(record: DataRecord): Promise<void> {
    this.checkCircuit();

    let attempt = 0;
    let delay = this.options.initialDelayMs;

    while (attempt <= this.options.maxRetries) {
      try {
        await this.writer.write(record);
        this.onSuccess();
        return;
      } catch (error) {
        attempt++;
        if (attempt > this.options.maxRetries) {
          this.onFailure();
          throw new Error(`Failed to write record after ${this.options.maxRetries} retries: ${error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= this.options.backoffFactor;
      }
    }
  }

  public async writeAll(records: AsyncIterableIterator<DataRecord>): Promise<void> {
    for await (const record of records) {
      await this.write(record);
    }
  }

  public async close(): Promise<void> {
    return this.writer.close();
  }

  private checkCircuit(): void {
    if (this.circuitOpen) {
      if (Date.now() > this.circuitResetTime) {
        this.circuitOpen = false;
        this.consecutiveFailures = 0;
      } else {
        throw new Error('Circuit Breaker is OPEN. Target service is likely down.');
      }
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
  }

  private onFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.options.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.circuitResetTime = Date.now() + this.options.circuitResetTimeoutMs;
    }
  }
}
