# Multi-Sink Parallel Processing (Fan-out)

Sometimes you need to perform multiple actions for the same record. For example, you might want to archive data as JSON to S3 while simultaneously inserting it into a SQL database.

## The Strategy

Use the `MultiWriter`. It takes multiple writers and broadcasts every record to all of them in parallel.

## Implementation

```typescript
import { 
  CSVReader, 
  JsonWriter, 
  SQLWriter, 
  MultiWriter, 
  S3Sink, 
  Job 
} from '@pujansrt/data-genie';
import { S3Client } from '@aws-sdk/client-s3';

async function run() {
  const reader = new CSVReader('input.csv');

  // Writer 1: Archive to S3
  const s3Writer = new JsonWriter(new S3Sink(new S3Client({}), 'my-bucket', 'archives/today.json'));
  
  // Writer 2: Insert to DB
  const dbWriter = new SQLWriter(dbClient, 'INSERT INTO analytics ...', (r) => [...]);

  // Combine them
  const combinedWriter = new MultiWriter(s3Writer, dbWriter);

  // Job runs once, but data goes to both places!
  await Job.run(reader, combinedWriter);
}

run().catch(console.error);
```

## Performance Note
`MultiWriter` waits for **all** underlying writers to complete before pulling the next record from the reader. If one writer is significantly slower than the others, it will determine the overall throughput of the pipeline.

### High-Throughput Fan-out (ParallelWriter)
If you have a particularly "heavy" sink (e.g., generating complex Parquet files), you can wrap it in a `ParallelWriter` so it doesn't block the main thread and other faster writers:

```typescript
// Fast writers stay on main thread
const consoleWriter = new ConsoleWriter();

// Heavy writer is offloaded to background threads
const heavyWriter = new ParallelWriter({
  workerPath: './parquet-worker.js',
  concurrency: 4
});

const multi = new MultiWriter(consoleWriter, heavyWriter);
await Job.run(reader, multi);
```
