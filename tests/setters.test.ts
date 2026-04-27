import { CSVReader } from '@/readers/csv-reader';
import { FixedWidthReader } from '@/readers/fixed-width-reader';
import { NDJsonReader } from '@/readers/nd-json-reader';
import { TSVReader } from '@/readers/tsv-reader';
import { CSVWriter } from '@/writers/csv-writer';
import { FixedWidthWriter } from '@/writers/fixed-width-writer';
import { TSVWriter } from '@/writers/tsv-writer';
import { NDJsonWriter } from '@/writers/nd-json-writer';

describe('Readers and Writers Setters', () => {
  it('should test CSVReader setters', () => {
    const reader = new CSVReader('tests/test.csv');
    expect(reader.setFieldNamesInFirstRow(true)).toBe(reader);
    expect(reader.setFieldSeparator(';')).toBe(reader);
  });

  it('should test FixedWidthReader setters', () => {
    const reader = new FixedWidthReader('tests/test.fw');
    expect(reader.setFieldWidths(10, 20)).toBe(reader);
    expect(reader.setFieldNamesInFirstRow(true)).toBe(reader);
  });

  it('should test NDJsonReader', () => {
    const reader = new NDJsonReader('tests/test.ndjson');
    expect(reader).toBeDefined();
  });

  it('should test TSVReader setters', () => {
    const reader = new TSVReader('tests/test.tsv');
    expect(reader.setFieldNamesInFirstRow(true)).toBe(reader);
  });

  it('should test CSVWriter setters', () => {
    const writer = new CSVWriter('tests/test.csv');
    expect(writer.setFieldNamesInFirstRow(true)).toBe(writer);
  });

  it('should test FixedWidthWriter setters', () => {
    const writer = new FixedWidthWriter('tests/test.fw');
    expect(writer.setFieldWidths(10, 20)).toBe(writer);
    expect(writer.setFieldNamesInFirstRow(true)).toBe(writer);
  });

  it('should test TSVWriter setters', () => {
    const writer = new TSVWriter('tests/test.tsv');
    expect(writer.setFieldNamesInFirstRow(true)).toBe(writer);
  });

  it('should test NDJsonWriter', () => {
    const writer = new NDJsonWriter('tests/test.ndjson');
    expect(writer).toBeDefined();
  });
});
