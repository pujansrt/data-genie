import { Job } from '../src/core/job';
import { MemoryReader } from '../src/readers/memory-reader';

describe('Job.inferSchema', () => {
  it('should infer basic types from a memory reader', async () => {
    const data = [
      { id: 1, name: 'John', active: true, joined: new Date('2024-01-01'), meta: { role: 'admin' } },
      { id: 2, name: 'Jane', active: false, joined: new Date('2024-02-01'), meta: null },
      { id: 3, name: null, active: true, joined: null, meta: { role: 'user' } }
    ];
    
    const reader = new MemoryReader(data);
    const schema = await Job.inferSchema(reader);

    // Verify field types
    expect(schema.fields.id.type).toBe('number');
    expect(schema.fields.name.type).toBe('string');
    expect(schema.fields.active.type).toBe('boolean');
    expect(schema.fields.joined.type).toBe('date');
    expect(schema.fields.meta.type).toBe('object');

    // Verify nullability
    expect(schema.fields.id.nullable).toBe(false);
    expect(schema.fields.name.nullable).toBe(true);
    expect(schema.fields.joined.nullable).toBe(true);

    // Verify code generation strings
    expect(schema.typescript).toContain('interface InferredRecord');
    expect(schema.typescript).toContain('id: number;');
    expect(schema.typescript).toContain('name?: string | null;');

    expect(schema.zod).toContain('z.object({');
    expect(schema.zod).toContain('id: z.number()');
    expect(schema.zod).toContain('name: z.string().nullable().optional()');

    expect(schema.sql).toContain('CREATE TABLE inferred_table');
    expect(schema.sql).toContain('id DECIMAL(18, 2) NOT NULL');
    expect(schema.sql).toContain('joined TIMESTAMP');
    expect(schema.sql).toContain('meta JSONB');
  });

  it('should respect sampleSize option', async () => {
    const data = [
      { id: 1, type: 'string' },
      { id: 2, type: 123 }, // Type changes later
    ];
    
    const reader = new MemoryReader(data);
    // Only sample first record
    const schema = await Job.inferSchema(reader, { sampleSize: 1 });

    expect(schema.fields.type.type).toBe('string');
    expect(schema.fields.id.type).toBe('number');
  });
});
