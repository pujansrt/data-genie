import { RemoveDuplicatesReader } from '@/transformers/remove-duplicates-reader';
import { DataReader } from '@/core/interfaces';

describe('RemoveDuplicatesReader', () => {
  const mockReader: DataReader = {
    read: async function* () {
      yield { id: 1, email: 'a@a.com' };
      yield { id: 2, email: 'a@a.com' };
      yield { id: 3, email: 'b@b.com' };
    }
  };

  it('should remove duplicates based on field names', async () => {
    const dedupeReader = new RemoveDuplicatesReader(mockReader, 'email');
    
    const results = [];
    for await (const record of dedupeReader.read()) {
      results.push(record);
    }

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe(1);
    expect(results[1].id).toBe(3);
  });

  it('should throw error when maxKeys limit is reached', async () => {
    const simpleReader: DataReader = {
      read: async function* () {
        yield { id: 1 };
        yield { id: 2 };
      }
    };

    const dedupeReader = new RemoveDuplicatesReader(simpleReader, 'id').setMaxKeys(1);

    const iterator = dedupeReader.read();
    await iterator.next(); // First record ok
    await expect(iterator.next()).rejects.toThrow('Memory limit reached');
  });

  it('should allow setting custom key store', () => {
    const mockStore = { has: jest.fn(), add: jest.fn() };
    const dedupeReader = new RemoveDuplicatesReader(mockReader, 'id');
    expect(dedupeReader.setKeyStore(mockStore)).toBe(dedupeReader);
  });
});
