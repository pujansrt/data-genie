# CSV to S3 (JSON or Parquet)

Uploading large datasets to AWS S3 can be memory-intensive if you load the whole file. Data-Genie streams data directly to S3 using the AWS SDK's multipart upload capability.

## The Strategy

1. Use `CSVReader` for the source.
2. Use `S3Sink` to manage the S3 connection.
3. Use `JsonWriter` or `ParquetWriter` for the format.

## Implementation (CSV to S3 JSON)

```typescript
import { CSVReader, JsonWriter, S3Sink, Job } from '@pujansrt/data-genie';
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

async function run() {
  const reader = new CSVReader('local_data.csv');
  
  // S3Sink streams data directly to the bucket
  const sink = new S3Sink(s3Client, 'my-bucket', 'exports/data.json');
  const writer = new JsonWriter(sink);

  await Job.run(reader, writer);
}

run().catch(console.error);
```

## Implementation (CSV to S3 Parquet)

Parquet is a columnar format, making it much more efficient for big data analysis (e.g., in AWS Athena).

```typescript
import { CSVReader, ParquetWriter, S3Sink, Job } from '@pujansrt/data-genie';

const writer = new ParquetWriter(new S3Sink(s3Client, 'my-bucket', 'exports/data.parquet'));

// You must define the schema for Parquet
writer.setSchema({
  name: { type: 'UTF8' },
  age: { type: 'INT64' },
  active: { type: 'BOOLEAN' }
});

await Job.run(reader, writer);
```

## Key Benefits
- **Direct Streaming**: No temporary files are created on your local disk.
- **Multipart Uploads**: `S3Sink` automatically handles splitting large streams into parts for reliability and performance.
