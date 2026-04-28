import { CallbackWriter, BatchCallbackWriter, Job, MemoryReader } from '../src';

describe('Callback Writers', () => {
    it('should execute callback for every record', async () => {
        const records = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const reader = new MemoryReader(records);
        const results: any[] = [];
        
        const writer = new CallbackWriter((record) => {
            results.push(record);
        });

        await Job.run(reader, writer);
        expect(results).toEqual(records);
    });

    it('should execute callback in batches', async () => {
        const records = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
        const reader = new MemoryReader(records);
        const batches: any[][] = [];
        
        const writer = new BatchCallbackWriter(2, (batch) => {
            batches.push(batch);
        });

        await Job.run(reader, writer);
        
        expect(batches).toHaveLength(3); // [1,2], [3,4], [5]
        expect(batches[0]).toEqual([{ id: 1 }, { id: 2 }]);
        expect(batches[1]).toEqual([{ id: 3 }, { id: 4 }]);
        expect(batches[2]).toEqual([{ id: 5 }]);
    });
});
