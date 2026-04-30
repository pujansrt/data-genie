# Parallel Processing (Multi-Threading)

Even though Data-Genie processes data with a constant memory footprint (O(1)), processing 50GB of data on a single CPU thread can still be slow. The `ParallelWriter` allows you to trade CPU cores for speed by offloading the writing process to background worker threads.

## The Problem
Node.js is single-threaded for JavaScript execution. If you are doing complex transformations or generating heavy formats (like Parquet or encrypted JSON), the CPU becomes a bottleneck, even if your RAM usage is low.

## The Solution: ParallelWriter
`ParallelWriter` splits the data stream into chunks and sends them to a pool of background workers.

### 1. Create a Worker Script
First, create a separate file (e.g., `my-worker.js`) that defines what the worker should do.

```javascript
// my-worker.js
const { setupWorker, SQLWriter } = require('@pujansrt/data-genie');

// This code runs in a background thread
const dbWriter = new SQLWriter(myDbClient, 'analytics_table');
setupWorker(dbWriter);
```

### 2. Run the Parallel Pipeline
In your main script, use the `ParallelWriter` to orchestrate these workers.

```typescript
import { CSVReader, ParallelWriter, Job } from '@pujansrt/data-genie';
import path from 'path';

const reader = new CSVReader('massive_data.csv');

// Spawn 4 background workers
const writer = new ParallelWriter({
  workerPath: path.resolve(__dirname, 'my-worker.js'),
  concurrency: 4,
  batchSize: 500 // Send 500 records at a time to workers
});

await Job.run(reader, writer);
```

## Performance: O(1) Memory + O(N/Cores) Time
By using 4 workers, you can potentially increase your throughput by **3-4x** compared to a single-threaded approach, while still maintaining the same low memory footprint (~15MB RAM).

## Use Cases
- **Heavy Formatting**: Converting raw data into complex Parquet or Excel files.
- **CPU-Intensive Encryption**: Encrypting fields in-flight.
- **Network Latency Hiding**: Writing to multiple slow HTTP APIs in parallel.

## MultiWriter vs. ParallelWriter

It is easy to confuse these two because they both mention "parallel" execution, but they solve different problems:

| Feature | **MultiWriter** | **ParallelWriter** |
| :--- | :--- | :--- |
| **Goal** | **Broadcast** data to multiple sinks. | **Speed up** data processing. |
| **Logic** | Data goes to Sink A **AND** Sink B. | Data goes to Worker 1 **OR** Worker 2. |
| **Threads** | Single-threaded (Event Loop). | Multi-threaded (Worker Threads). |
| **Best For** | Archiving + Database indexing. | Heavy Parquet/Excel formatting. |

**Pro Tip:** You can combine them! Use a `MultiWriter` to send data to a `ConsoleWriter` (main thread) and a `ParallelWriter` (background threads) for heavy persistence.
