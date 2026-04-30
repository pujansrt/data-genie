import { CSVReader, FilteringReader, Job, JsonWriter, TransformingReader, ValidatingReader } from '../src';
import * as fs from 'fs';
import * as path from 'path';

describe('Complex Pipeline Integration', () => {
  const TEST_DIR = path.join(__dirname, 'tmp-integration-complex');
  const INPUT_CSV = path.join(TEST_DIR, 'source.csv');
  const OUTPUT_JSON = path.join(TEST_DIR, 'destination.json');
  const DLQ_JSON = path.join(TEST_DIR, 'dlq.json');

  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should process a complex pipeline with filtering, transformation, and DLQ', async () => {
    // 1. Create a messy source file
    const rows = [
      'id,sku,price,stock,status',
      '101,PROD-A,25.50,10,ACTIVE', // Valid
      '102,PROD-B,,5,ACTIVE', // Validation fail (missing price)
      'POISON,ONLY,TWO,3,ACTIVE', // Parse error (too few columns, but ACTIVE)
      '103,PROD-C,invalid,0,DELETED', // Filter fail (DELETED)
      '104,PROD-D,100.00,2,ACTIVE', // Valid
      '105,PROD-E,50.00,-1,ACTIVE' // Validation fail (negative stock)
    ];
    fs.writeFileSync(INPUT_CSV, rows.join('\n'));

    // 2. Build Pipeline
    // CSV -> Filter (Status ACTIVE) -> Transform (Calculated Total Value) -> Validate -> JSON + DLQ

    const csvReader = new CSVReader(INPUT_CSV);

    // Filter: Only ACTIVE products
    const filteredReader = new FilteringReader(csvReader).add((record) => record.status === 'ACTIVE');

    // Transform: Calculate total_value = price * stock
    const transformedReader = new TransformingReader(filteredReader).add((record) => ({
      ...record,
      price: parseFloat(record.price),
      stock: parseInt(record.stock),
      total_value: parseFloat(record.price) * parseInt(record.stock)
    }));

    // Validate: Price must be > 0 and Stock must be >= 0
    const validatingReader = new ValidatingReader(transformedReader)
      .add((record, msgs) => {
        if (isNaN(record.price) || record.price <= 0) {
          msgs.push({ record, message: 'Invalid price' });
          return false;
        }
        if (isNaN(record.stock) || record.stock < 0) {
          msgs.push({ record, message: 'Invalid stock' });
          return false;
        }
        return true;
      })
      .setDLQ(new JsonWriter(DLQ_JSON));

    const mainWriter = new JsonWriter(OUTPUT_JSON);

    // 3. Execute
    await Job.run(validatingReader, mainWriter);

    // 4. Assert Success Output
    const successData = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
    expect(successData).toHaveLength(2);
    expect(successData[0].sku).toBe('PROD-A');
    expect(successData[1].sku).toBe('PROD-D');
    expect(successData[0].total_value).toBe(255);

    // 5. Assert DLQ Output
    const dlqData = JSON.parse(fs.readFileSync(DLQ_JSON, 'utf8'));

    // Should have:
    // - 1 parse_error (POISON row)
    // - 1 validation_error (PROD-B, missing price)
    // - 1 validation_error (PROD-E, negative stock)
    // Note: PROD-C (DELETED) should be MISSING from both because it was Filtered out before validation
    expect(dlqData).toHaveLength(3);

    const priceError = dlqData.find((r: any) => r.sku === 'PROD-B');
    const stockError = dlqData.find((r: any) => r.sku === 'PROD-E');
    const poisonError = dlqData.find((r: any) => r.id === 'POISON');

    expect(priceError._errors).toContain('Invalid price');
    expect(stockError._errors).toContain('Invalid stock');
    expect(poisonError._errors).toContain('Invalid price'); // because price is empty/NaN

    // Verify Filter actually worked
    const deletedRecord = dlqData.find((r: any) => r.sku === 'PROD-C');
    expect(deletedRecord).toBeUndefined();
  });
});
