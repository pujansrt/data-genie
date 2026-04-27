import { GroupByReader } from '@/transformers/group-by-reader';
import { DataReader } from '@/core/interfaces';

describe('GroupByReader', () => {
  const mockReader: DataReader = {
    read: async function* () {
      yield { category: 'A', value: 10 };
      yield { category: 'A', value: 20 };
      yield { category: 'B', value: 50 };
    }
  };

  it('should aggregate data correctly', async () => {
    const reader = new GroupByReader(mockReader, 'category');
    reader.count('count').sum('value', 'total').avg('value', 'average').min('value', 'min').max('value', 'max');

    const results = [];
    for await (const r of reader.read()) {
      results.push(r);
    }

    const groupA = results.find(r => r.category === 'A')!;
    expect(groupA.count).toBe(2);
    expect(groupA.total).toBe(30);
    expect(groupA.average).toBe(15);
    expect(groupA.min).toBe(10);
    expect(groupA.max).toBe(20);
  });
});
