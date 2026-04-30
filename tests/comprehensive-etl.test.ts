import {
  CSVReader,
  FieldFilter,
  FilterExpression,
  FilteringReader,
  Job,
  MemoryWriter,
  PatternMatch,
  RenameField,
  SelectFields,
  SetCalculatedField,
  SqlConnection,
  SQLWriter,
  TransformingReader
} from '../src';
import * as fs from 'fs';
import * as path from 'path';

describe('Comprehensive ETL Integration', () => {
  const TEST_DIR = path.join(__dirname, 'tmp-comprehensive');
  const INPUT_CSV = path.join(TEST_DIR, 'iot_sensors.csv');
  const OUTPUT_NDJSON = path.join(TEST_DIR, 'processed_data.ndjson');

  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should run a full real-time IoT pipeline with complex logic', async () => {
    // 1. Setup complex real-time like data
    const csvData = [
      'timestamp,device_id,reading,status,battery_level',
      '2026-04-30T10:00:00Z,SN-1001,65.5,OK,85', // Process
      '2026-04-30T10:01:00Z,SN-1002,22.1,ERROR,12', // Process (Priority)
      '2026-04-30T10:02:00Z,INVALID-ID,0,OK,100', // Filter (Pattern)
      '2026-04-30T10:03:00Z,SN-1003,null,OK,50', // Validate (Reading)
      '2026-04-30T10:04:00Z,SN-1001,70.2,OK,5', // Process (Low Battery)
      '2026-04-30T10:05:00Z,SN-1004,15.0,MAINT,90' // Filter (Status)
    ].join('\n');
    fs.writeFileSync(INPUT_CSV, csvData);

    const reader = new CSVReader(INPUT_CSV);

    // A. Pattern Filter: Device ID must start with SN-
    const patternFilter = new FieldFilter('device_id');
    patternFilter.addRule(PatternMatch('^SN-\\d+$'));
    const filteredReader = new FilteringReader(reader).add(patternFilter.createRecordFilter());

    // B. Complex Expression Filter: (status == 'OK' OR status == 'ERROR') AND reading != 'null'
    const exprFilter = new FilterExpression("(status == 'OK' || status == 'ERROR') && reading != 'null'");
    const exprFilteredReader = new FilteringReader(filteredReader).add(exprFilter.createRecordFilter());

    // C. Transformations
    const transformedReader = new TransformingReader(exprFilteredReader)
      // Rename device_id to sensor_id
      .add(new RenameField('device_id', 'sensor_id').transform())
      // Calculate alert_level
      .add(new SetCalculatedField('alert_level', "battery_level < 20 || status == 'ERROR' ? 'HIGH' : 'NORMAL'").transform())
      // Final Field Selection
      .add(new SelectFields('timestamp', 'sensor_id', 'reading', 'alert_level').transform());

    const outputWriter = new MemoryWriter();
    const job = new Job(transformedReader, outputWriter);
    await job.run();
    const results = outputWriter.getRecords();
    expect(results).toHaveLength(3);

    const sn1002 = results.find((r) => r.sensor_id === 'SN-1002');
    expect(sn1002!.alert_level).toBe('HIGH');

    const lowBattery = results.find((r) => r.sensor_id === 'SN-1001' && r.reading === '70.2');
    expect(lowBattery!.alert_level).toBe('HIGH');
  });

  it('should integrate with a SQL-like writer', async () => {
    const queries: string[] = [];
    const mockConn: SqlConnection = {
      query: async (sql: string, params: any[]) => {
        queries.push(sql);
        return { rows: [] };
      }
    };

    const reader = new CSVReader(Buffer.from('id,val\n1,A\n2,B'));
    const sqlWriter = new SQLWriter(mockConn, 'my_table');
    await Job.run(reader, sqlWriter);

    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain('INSERT INTO "my_table"');
    expect(queries[0]).toContain('"id"');
    expect(queries[0]).toContain('"val"');
  });
});
