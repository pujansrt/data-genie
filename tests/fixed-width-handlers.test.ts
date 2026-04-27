import { FixedWidthReader } from '@/readers/fixed-width-reader';
import { FixedWidthWriter } from '@/writers/fixed-width-writer';
import { Job } from '@/core/job';
import { MemorySink } from '@/core/memory-transport';
import * as fs from 'fs';
import * as path from 'path';

describe('Fixed Width Handlers', () => {
  describe('Integration', () => {
    const fwFile = path.join(__dirname, 'test.fw');
    const outFile = path.join(__dirname, 'out.fw');

    afterAll(() => {
      [fwFile, outFile].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    });

    it('should read and write fixed-width files', async () => {
      // Write manually first to test reader
      // Widths: 5, 10
      fs.writeFileSync(fwFile, 'ID   NAME      \n1    Alice     \n2    Bob       ');

      const reader = new FixedWidthReader(fwFile)
        .setFieldWidths(5, 10)
        .setFieldNamesInFirstRow(true);

      const writer = new FixedWidthWriter(outFile)
        .setFieldWidths(5, 10)
        .setFieldNamesInFirstRow(true);

      await Job.run(reader, writer);

      const output = fs.readFileSync(outFile, 'utf8');
      expect(output).toContain('ID   NAME');
      expect(output).toContain('1    Alice');
    });
  });

  describe('FixedWidthWriter Branches', () => {
    it('should throw error if field widths are not set', async () => {
      const writer = new FixedWidthWriter(new MemorySink());
      await expect(writer.write({ a: 1 })).rejects.toThrow('Field widths must be defined');
    });

    it('should throw error if field names count mismatch widths count', async () => {
      const writer = new FixedWidthWriter(new MemorySink());
      writer.setFieldWidths(5, 5);
      // Setting 3 names for 2 widths
      writer.setFieldNames('a', 'b', 'c');
      await expect(writer.write({ a: 1, b: 2, c: 3 })).rejects.toThrow('Number of field names (3) must match');
    });

    it('should handle undefined values by writing empty string', async () => {
      const sink = new MemorySink();
      const writer = new FixedWidthWriter(sink);
      writer.setFieldWidths(5);
      writer.setFieldNames('a');
      
      await writer.write({ a: undefined });
      await writer.close();
      
      expect(sink.getText()).toBe('     \n');
    });
  });
});
