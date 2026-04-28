import { z } from 'zod';
import { CSVReader } from '../src/readers/csv-reader';
import { TransformingReader } from '../src/transformers/transforming-reader';
import { CallbackWriter } from '../src/writers/callback-writer';
import { Job } from '../src/core/job';
import { MemorySource } from '../src/core/memory-transport';

describe('Type Inference', () => {
  it('should infer types from Zod schema in CSVReader', async () => {
    const UserSchema = z.object({
      id: z.coerce.number(),
      email: z.string(),
    });

    const csvContent = 'id,email\n1,test@example.com\n2,user@domain.com';
    const source = new MemorySource(csvContent);
    const reader = new CSVReader(source, { schema: UserSchema });
    
    const transformer = new TransformingReader(reader);

    transformer.add((user) => {
      // user.email should be inferred as string
      return { ...user, active: true };
    });

    let processedCount = 0;
    const writer = new CallbackWriter(async (record) => {
        // record should be { id: number, email: string, active: boolean }
        expect(typeof record.id).toBe('number');
        expect(record.active).toBe(true);
        processedCount++;
    });

    await Job.run(transformer, writer);
    expect(processedCount).toBe(2);
  });
});
