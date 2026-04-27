import { RemoveDuplicatesReader } from '@/transformers/remove-duplicates-reader';
import { DataReader } from '@/core/interfaces';

describe('RemoveDuplicatesReader', () => {
  it('should remove duplicates based on field names', async () => {
    const mockRecords = [
      { id: 1, email: 'a@a.com' },
      { id: 2, email: 'a@a.com' },
      { id: 3, email: 'b@b.com' }
    ];

    const mockReader: DataReader = {
      read: async function* () {
        for (const r of mockRecords) yield r;
      }
    };

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
    const mockRecords = [
      { id: 1 },
      { id: 2 }
    ];

    const mockReader: DataReader = {
      read: async function* () {
        for (const r of mockRecords) yield r;
      }
    };

    const dedupeReader = new RemoveDuplicatesReader(mockReader, 'id').setMaxKeys(1);

    const iterator = dedupeReader.read();
    await iterator.next(); // First record ok
    await expect(iterator.next()).rejects.toThrow('Memory limit reached');
  });
});
