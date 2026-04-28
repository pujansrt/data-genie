import { z } from 'zod';
import { MemorySource } from '@/core/memory-transport';
import { CSVReader } from '@/readers/csv-reader';

describe('The Holy Grail: Full Pipeline Type Inference', () => {
  it('should infer custom fields added during transformation in the final callback', async () => {
    const UserSchema = z.object({
      id: z.coerce.number(),
      name: z.string(),
    });

    const csvContent = 'id,name\n1,John\n2,Jane';
    const source = new MemorySource(csvContent);

    const reader = new CSVReader(source, { schema: UserSchema });

    const pipeline = reader.transform((user) => {
      // user.name is inferred here
      return {
        ...user,
        label: `User: ${user.name}`
      };
    });

    const finalPipeline = pipeline.transform((record) => {
      // record.label is inferred here!
      return {
        ...record,
        upperLabel: record.label.toUpperCase()
      };
    });

    let count = 0;
    
    // Verify inference in the final callback
    await finalPipeline.writeToCallback((record) => {
        // In a real TS environment, record.upperLabel and record.id autocomplete perfectly
        expect(record.id).toBeDefined();
        expect(record.upperLabel).toContain('USER:');
        count++;
    }, { logger: { info: () => {} } as any });

    expect(count).toBe(2);
  });
});
