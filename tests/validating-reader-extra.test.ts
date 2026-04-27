import { ValidatingReader } from '@/transformers/validating-reader';
import { DataReader } from '@/core/interfaces';

describe('ValidatingReader Extra', () => {
  const mockReader: DataReader = {
    read: async function* () {
      yield { a: 1 };
    }
  };

  it('should throw exception on failure if configured', async () => {
    const reader = new ValidatingReader(mockReader);
    reader.setExceptionOnFailure(true);
    reader.add(() => false);

    const iterator = reader.read();
    await expect(iterator.next()).rejects.toThrow();
  });

  it('should cover getMessages', () => {
    const reader = new ValidatingReader(mockReader);
    expect(reader.getMessages()).toEqual([]);
  });
});
