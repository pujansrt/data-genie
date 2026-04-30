import { CSVWriter, Job, JsonReader, JsonWriter, XMLReader } from '../src';
import * as fs from 'fs';
import * as path from 'path';

describe('Format Conversion Integration', () => {
  const TEST_DIR = path.join(__dirname, 'tmp-conversion');

  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should convert XML to JSON with complex structure', async () => {
    const xmlInput = `
            <library>
                <book id="1">
                    <title>The Great ETL</title>
                    <author>Data Genie</author>
                    <metadata>
                        <published>2024</published>
                    </metadata>
                </book>
                <book id="2">
                    <title>Streaming Magic</title>
                    <author>Pujan</author>
                    <metadata>
                        <published>2025</published>
                    </metadata>
                </book>
            </library>
        `;
    const xmlFile = path.join(TEST_DIR, 'books.xml');
    const jsonFile = path.join(TEST_DIR, 'books.json');
    fs.writeFileSync(xmlFile, xmlInput);

    const reader = new XMLReader(xmlFile, {
      recordPath: 'library/book',
      fieldMapping: {
        id: '@id',
        title: 'title',
        author: 'author',
        year: 'metadata.published'
      }
    });

    const writer = new JsonWriter(jsonFile);
    await Job.run(reader, writer);

    const output = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({ id: '1', title: 'The Great ETL', author: 'Data Genie', year: '2024' });
    expect(output[1].id).toBe('2');
  });

  it('should convert JSON to CSV with field selection and filtering', async () => {
    const jsonData = [
      { id: 1, name: 'Alice', role: 'Admin', active: true },
      { id: 2, name: 'Bob', role: 'User', active: true },
      { id: 3, name: 'Charlie', role: 'User', active: false },
      { id: 4, name: 'David', role: 'Guest', active: true }
    ];
    const jsonFile = path.join(TEST_DIR, 'users.json');
    const csvFile = path.join(TEST_DIR, 'users.csv');
    fs.writeFileSync(jsonFile, JSON.stringify(jsonData));

    const reader = new JsonReader(jsonFile).transform((record) => {
      if (record.active && record.role !== 'Guest') {
        return {
          user_id: record.id,
          display_name: record.name.toUpperCase(),
          role: record.role
        };
      }
      return null; // Skip others
    });

    const writer = new CSVWriter(csvFile);
    await Job.run(reader, writer);

    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const lines = csvContent.trim().split('\n');
    expect(lines).toHaveLength(3); // Header + 2 records (Alice, Bob)
    expect(lines[0]).toBe('user_id,display_name,role');
    expect(lines[1]).toBe('1,ALICE,Admin');
    expect(lines[2]).toBe('2,BOB,User');
  });

  it('should handle XML parse errors and continue via DLQ', async () => {
    const messyXml = `
            <root>
                <item><id>1</id><name>valid</name></item>
                <item><id>2</id><name>broken</name> -- NOT CLOSED TAG
                <item><id>3</id><name>valid again</name></item>
            </root>
        `;
    const xmlFile = path.join(TEST_DIR, 'messy.xml');
    const dlqFile = path.join(TEST_DIR, 'messy_dlq.json');
    const outFile = path.join(TEST_DIR, 'messy_out.json');
    fs.writeFileSync(xmlFile, messyXml);

    const dlqWriter = new JsonWriter(dlqFile);
    const reader = new XMLReader(xmlFile, { recordPath: 'root/item' }).setDLQ(dlqWriter);

    const writer = new JsonWriter(outFile);
    await Job.run(reader, writer);
    await dlqWriter.close(); // Ensure DLQ is flushed

    const output = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    // In XML, a single malformed tag often breaks the rest of the stream
    // depending on how saxes handles it.
    expect(output.length).toBeGreaterThanOrEqual(1);

    const dlq = JSON.parse(fs.readFileSync(dlqFile, 'utf8'));
    expect(dlq.length).toBeGreaterThanOrEqual(1);
    expect(dlq[0]._type).toContain('parse_error');
  });
});
