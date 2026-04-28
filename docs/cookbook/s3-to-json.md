# S3 to JSON (Local or S3-to-S3)

Streaming data from S3 is as easy as reading from a local file. This is perfect for processing logs or data exports from other services.

## The Strategy

Use `S3Source` as the transport for your `JsonReader` (or `ParquetReader`, `CSVReader`, etc.).

## Implementation

```typescript
import { S3Source, JsonReader, JsonWriter, Job } from '@pujansrt/data-genie';
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

async function run() {
  // S3Source creates a readable stream from the S3 object
  const source = new S3Source(s3Client, 'raw-data-bucket', 'daily-export.json');
  
  const reader = new JsonReader(source);
  const writer = new JsonWriter('local-backup.json');

  await Job.run(reader, writer);
}

run().catch(console.error);
```

## S3 to S3 Transformation
You can also perform an S3-to-S3 transformation (e.g., from one bucket to another or changing formats) without ever storing the data locally:

```typescript
const source = new S3Source(s3Client, 'source-bucket', 'data.csv');
const reader = new CSVReader(source);

const sink = new S3Sink(s3Client, 'dest-bucket', 'data.json');
const writer = new JsonWriter(sink);

await Job.run(reader, writer);
```
