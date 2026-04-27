import { TransformingReader } from '@/transformers/transforming-reader';
import { DataReader } from '@/core/interfaces';

describe('TransformingReader', () => {
  const mockReader: DataReader = {
    read: async function* () {
      yield { a: 1 };
      yield { a: 2 };
    }
  };

  it('should transform records based on condition', async () => {
    const reader = new TransformingReader(mockReader);
    reader.setCondition((r) => r.a === 1);
    reader.add((r) => ({ ...r, transformed: true }));

    const results = [];
    for await (const r of reader.read()) {
      results.push(r);
    }

    expect(results[0].transformed).toBe(true);
    expect(results[1].transformed).toBeUndefined();
  });
});
