import { PIIMaskingTransformer } from '@/transformers/field-transformers';

describe('PIIMaskingTransformer', () => {
  it('should redact fields correctly', () => {
    const transformer = new PIIMaskingTransformer();
    transformer.mask('email', 'redact');
    const transform = transformer.transform();

    const result = transform({ email: 'test@example.com', name: 'John' });
    expect(result.email).toBe('[REDACTED]');
    expect(result.name).toBe('John');
  });

  it('should hash fields using SHA256', () => {
    const transformer = new PIIMaskingTransformer();
    transformer.mask('ssn', 'hash');
    const transform = transformer.transform();

    const result = transform({ ssn: '123-456-789' });
    // SHA256 of '123-456-789'
    expect(result.ssn).toBe('5de748a0e887351e478cf367002c33768e2e83b30b93a4520befea496c120679');
  });

  it('should partially mask emails', () => {
    const transformer = new PIIMaskingTransformer();
    transformer.mask('email', 'partial');
    const transform = transformer.transform();

    const result = transform({ email: 'pujan@google.com' });
    expect(result.email).toBe('p****@google.com');
  });

  it('should partially mask credit cards', () => {
    const transformer = new PIIMaskingTransformer();
    transformer.mask('cc', 'partial');
    const transform = transformer.transform();

    const result = transform({ cc: '1234567812345678' });
    expect(result.cc).toBe('****5678');
  });

  it('should set fields to null', () => {
    const transformer = new PIIMaskingTransformer();
    transformer.mask('secret', 'null');
    const transform = transformer.transform();

    const result = transform({ secret: 'password123', other: 'data' });
    expect(result.secret).toBeNull();
    expect(result.other).toBe('data');
  });
});
