import { CSVReader, JsonReader, NDJsonReader, ValidatingReader, MemoryWriter, Job, MemorySource } from '../src';

describe('DLQ (Dead Letter Queue) Functionality', () => {
  describe('CSVReader DLQ', () => {
    it('should divert inconsistent column records to DLQ', async () => {
      const csvContent = `id,name
1,foo
POISON
2,bar`;
      
      const dlq = new MemoryWriter();
      const output = new MemoryWriter();
      
      const reader = new CSVReader(new MemorySource(csvContent))
        .setDLQ(dlq);
        
      await Job.run(reader, output);
      
      expect(output.getRecords()).toHaveLength(2);
      expect(dlq.getRecords()).toHaveLength(1);
      expect(dlq.getRecords()[0]._type).toBe('parse_error');
      expect(dlq.getRecords()[0]._error).toContain('Inconsistent column count');
    });

    it('should propagate DLQ from ValidatingReader to CSVReader', async () => {
        const csvContent = `id,name
1,foo
POISON
2,bar`;
        
        const dlq = new MemoryWriter();
        const output = new MemoryWriter();
        
        // Setting DLQ on ValidatingReader should propagate to CSVReader
        const reader = new ValidatingReader(new CSVReader(new MemorySource(csvContent)))
          .setDLQ(dlq);
          
        await Job.run(reader, output);
        
        expect(output.getRecords()).toHaveLength(2);
        expect(dlq.getRecords()).toHaveLength(1);
        expect(dlq.getRecords()[0]._type).toBe('parse_error');
    });
  });

  describe('JsonReader DLQ', () => {
    it('should handle malformed JSON and send to DLQ', async () => {
      const jsonContent = `[{"id": 1}, {"id": 2}, malformed]`;
      
      const dlq = new MemoryWriter();
      const output = new MemoryWriter();
      
      const reader = new JsonReader(new MemorySource(jsonContent))
        .setDLQ(dlq);
        
      await Job.run(reader, output);
      
      expect(output.getRecords()).toHaveLength(0); // JSON.parse fails the whole block
      expect(dlq.getRecords()).toHaveLength(1);
      expect(dlq.getRecords()[0]._type).toBe('parse_error');
    });

    it('should DLQ validation errors for missing fields', async () => {
        const jsonContent = `[{"id": 1, "name": "foo"}, {"id": 2}]`;
        
        const dlq = new MemoryWriter();
        const output = new MemoryWriter();
        
        const reader = new ValidatingReader(new JsonReader(new MemorySource(jsonContent)))
          .add((record, msgs) => {
              if (!record.name) {
                  msgs.push({ record, message: 'Name is missing' });
                  return false;
              }
              return true;
          })
          .setDLQ(dlq);
          
        await Job.run(reader, output);
        
        expect(output.getRecords()).toHaveLength(1);
        expect(dlq.getRecords()).toHaveLength(1);
        expect(dlq.getRecords()[0].id).toBe(2);
        expect(dlq.getRecords()[0]._errors).toContain('Name is missing');
    });
  });

  describe('NDJsonReader DLQ', () => {
    it('should divert malformed lines to DLQ and continue', async () => {
      const ndjsonContent = `{"id": 1}\n{"id": 2, malformed}\n{"id": 3}`;
      
      const dlq = new MemoryWriter();
      const output = new MemoryWriter();
      
      const reader = new NDJsonReader(new MemorySource(ndjsonContent))
        .setDLQ(dlq);
        
      await Job.run(reader, output);
      
      expect(output.getRecords()).toHaveLength(2); // Records 1 and 3
      expect(dlq.getRecords()).toHaveLength(1); // Record 2
      expect(dlq.getRecords()[0]._type).toBe('parse_error');
    });
  });
});
