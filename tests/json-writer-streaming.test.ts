import * as fs from 'fs';
import * as path from 'path';
import { JsonWriter } from '@/writers/json-writer';
import { MemorySink } from '@/core/memory-transport';

describe('JsonWriter Streaming', () => {
    it('should write an empty array when no records are written', async () => {
        const sink = new MemorySink();
        const writer = new JsonWriter(sink);
        await writer.close();
        
        const output = sink.getText();
        expect(output).toBe('[]');
        expect(JSON.parse(output)).toEqual([]);
    });

    it('should write a single record correctly', async () => {
        const sink = new MemorySink();
        const writer = new JsonWriter(sink);
        await writer.write({ id: 1, name: 'Alice' });
        await writer.close();
        
        const output = sink.getText();
        // Check structure
        expect(output).toContain('[\n');
        expect(output).toContain(']');
        // Check validity
        const parsed = JSON.parse(output);
        expect(parsed).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('should write multiple records correctly with commas', async () => {
        const sink = new MemorySink();
        const writer = new JsonWriter(sink);
        await writer.write({ id: 1, name: 'Alice' });
        await writer.write({ id: 2, name: 'Bob' });
        await writer.close();
        
        const output = sink.getText();
        // Should have a comma and newline between records
        expect(output).toContain('},\n  {');
        
        const parsed = JSON.parse(output);
        expect(parsed).toEqual([
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
        ]);
    });

    it('should handle large number of records without RangeError', async () => {
        // This is more of a smoke test for the streaming logic
        const outputPath = path.join(__dirname, 'large_test.json');
        const writer = new JsonWriter(outputPath);
        
        const count = 1000; // 2M is too slow for a unit test, but 1000 verifies the loop
        for (let i = 0; i < count; i++) {
            await writer.write({ id: i, data: 'some repetitive data '.repeat(10) });
        }
        await writer.close();
        
        const stats = fs.statSync(outputPath);
        expect(stats.size).toBeGreaterThan(0);
        
        // Verify last few bytes to ensure it closed correctly
        const lastBytes = fs.readFileSync(outputPath, { encoding: 'utf8', flag: 'r' }).slice(-10);
        expect(lastBytes).toContain(']');
        
        fs.unlinkSync(outputPath);
    });
});
