# CSV to Parquet

Parquet is a highly optimized columnar storage format. Converting your CSVs to Parquet makes them faster to query and cheaper to store in cloud environments.

## The Strategy

Use `CSVReader` as the source and `ParquetWriter` as the sink. Note that Parquet requires a strict schema definition.

## Implementation

```typescript
import { CSVReader, ParquetWriter, Job } from '@pujansrt/data-genie';

async function run() {
  const reader = new CSVReader('users.csv');
  const writer = new ParquetWriter('users.parquet');

  // 1. Define the schema (required for Parquet)
  writer.setSchema({
    id: { type: 'INT64' },
    username: { type: 'UTF8' },
    email: { type: 'UTF8' },
    is_active: { type: 'BOOLEAN' },
    created_at: { type: 'TIMESTAMP_MILLIS' }
  });

  // 2. Run the conversion
  await Job.run(reader, writer);
}

run().catch(console.error);
```

## Supported Parquet Types
- `UTF8`: For strings.
- `INT64` / `INT32`: For integers.
- `DOUBLE` / `FLOAT`: For numbers with decimals.
- `BOOLEAN`: For true/false values.
- `TIMESTAMP_MILLIS`: For Date objects.
