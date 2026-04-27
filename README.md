# Data-Genie
A high-performant, streaming-first **ETL Engine** in **TypeScript**, designed for reliability, scalability, and ease of use in both **TypeScript** and **Node.js** environments.

[![NPM Version](https://img.shields.io/npm/v/@pujansrt/data-genie.svg?style=flat-square)](https://www.npmjs.com/package/@pujansrt/data-genie)
[![NPM Downloads](https://img.shields.io/npm/dm/@pujansrt/data-genie.svg?style=flat-square)](https://www.npmjs.com/package/@pujansrt/data-genie)
[![Build Status](https://img.shields.io/github/actions/workflow/status/pujansrt/data-genie/publish.yml?branch=production&style=flat-square&label=build)](https://github.com/pujansrt/data-genie/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js Support](https://img.shields.io/badge/Node.js-Next-green.svg?style=flat-square)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/@pujansrt/data-genie.svg?style=flat-square)](https://github.com/pujansrt/data-genie/blob/main/LICENSE)
![Coverage](./badges/badge-lines.svg) 

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#E8F4F8', 'actorBkg': '#D2E4F9', 'edgeLabelBackground':'#ffffff', 'noteBkgColor': '#FDF2D4', 'noteBorderColor': '#F1C40F'}}}%%

graph TD
    %% Data Sources
    subgraph Inputs [Data Sources]
        direction TB
        I1[CSV / TSV]
        I2[JSON / NDJSON]
        I3[Fixed Width]
        I4[SQL Database]
        I5[API / REST]
        I6[AWS S3]
        I7[Custom Reader]
    end

    %% The Engine Core
    subgraph Core [Data-Genie ETL Engine]
        direction TB
        
        subgraph Pipeline [The Pipeline]
            direction LR
            F[Filtering] --> T[Transform]
            T --> V[Validation]
            V -.-> DLQ((Dead Letter Queue))
        end

        subgraph Reliability [Reliability & Performance]
            direction LR
            R[Retries] --- C[Circuit Breaker]
            C --- B[SQL Batching]
        end

        Metrics([Performance Metrics])
        BP([Backpressure Awareness])
    end

    %% Data Sinks
    subgraph Outputs [Data Sinks]
        direction TB
        O1[(SQL Database)]
        O2[JSON / NDJSON]
        O3[CSV / TSV]
        O4[Fixed Width]
        O5[AWS S3]
        O6[Console / Logger]
    end

    %% Main Flow
    Inputs ==> Core
    Core ==> Outputs

    %% Color Theme & Styling
    style Core fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#4a148c
    style Pipeline fill:#ffffff,stroke:#7b1fa2,stroke-dasharray: 5 5
    style Reliability fill:#ffffff,stroke:#c62828,stroke-dasharray: 5 5
    
    classDef source fill:#e1f5fe,stroke:#01579b,color:#01579b
    classDef sink fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef feature fill:#fff3e0,stroke:#ef6c00,color:#e65100,font-style:italic
    
    class I1,I2,I3,I4,I5,I6,I7 source
    class O1,O2,O3,O4,O5,O6 sink
    class Metrics,BP feature
```

## Core Mandates & Best Practices

*   **Streaming-First Architecture:** Uses `AsyncIterableIterator` to ensure a constant memory footprint, regardless of data size.
*   **Backpressure Aware:** Writers respect stream drains, preventing memory spikes during slow disk/network I/O.
*   **Schema-Driven Validation:** Integration with libraries like **Zod** for robust, contract-based data integrity.
*   **Fault Tolerance:** Built-in support for **Dead Letter Queues (DLQ)** to divert invalid records without crashing jobs.
*   **Performance Optimized:** `SQLWriter` supports configurable batch/bulk inserts to minimize network round-trips.
*   **Interface-Driven:** Decoupled architecture allowing easy extension for new Readers, Transformers, and Writers.

---

## The Streaming Advantage

Most ETL tools fail when processing files larger than the available RAM because they try to load the entire dataset into memory. **Data-Genie** is built on Node.js **Async Generators**, ensuring a **Constant Memory Footprint (O(1))**.

### Memory Performance Comparison
| Data Size | Naive Approach (Array-based) | **Data-Genie (Streaming)** |
| :--- | :--- | :--- |
| 100 KB | ~10 MB RAM | **~10 MB RAM** |
| 100 MB | ~150 MB RAM | **~12 MB RAM** |
| 10 GB | **CRASH (OOM)** | **~15 MB RAM** |

### How it works:
1.  **Row-by-Row Processing:** Records are pulled from the source only when the pipeline is ready to process them.
2.  **Backpressure Handling:** If your database (sink) is slower than your CSV file (source), the engine automatically pauses the reader to prevent memory overflow.
3.  **Async Iteration:** The core loop uses `for await...of`, which keeps the event loop responsive.

### Technical Deep Dive
Data-Genie achieves this efficiency through several modern Node.js patterns:
- **Lazy Evaluation:** Records are only parsed and instantiated when the next step in the pipeline is ready. This is achieved using `AsyncIterableIterator`.
- **GC Optimization:** Once a record is written to the sink, it becomes immediately eligible for Garbage Collection. We never hold references to processed records.
- **Fixed-Size Input Buffers:** The underlying streams use small, fixed buffers (64KB by default), ensuring that RAM usage depends on the **width** of a single row, not the **length** of the file.

---

## Features

- **Multi-Format Support:** Read/Write CSV, TSV, JSON, NDJSON, FixedWidth, SQL, and more.
- **Advanced Transformations:** Chainable renames, field calculations, and complex groupings.
- **Fluent Builder API:** Human-readable pipeline definitions.
- **Deduplication:** Robust record deduplication with memory-safety limits.
- **Metrics & Monitoring:** Built-in tracking for throughput, record counts, and duration.

---

## Getting Started

### Installation

```bash
npm install @pujansrt/data-genie zod
```

> **Note:** `zod` and `@aws-sdk/client-s3` are optional peer dependencies. They are only required if you intend to use the `SchemaValidatingReader` or `S3Readers`.
---

## Advanced Examples

### 1. Schema Validation with Zod & DLQ
This example demonstrates how to enforce a data contract and divert "bad" records to a separate file.

```ts
import { CSVReader, JsonWriter, SchemaValidatingReader, Job } from '@pujansrt/data-genie';
import { z } from 'zod';

// Define a schema
const UserSchema = z.object({
  id: z.coerce.number(),
  email: z.string().email(),
  age: z.coerce.number().min(18)
});

async function run() {
  const reader = new CSVReader('users.csv').setFieldNamesInFirstRow(true);
  const dlqWriter = new JsonWriter('errors.json');
  
  // Wrap reader with validation
  const validatedReader = new SchemaValidatingReader(reader, UserSchema)
    .setDLQ(dlqWriter);

  const writer = new JsonWriter('clean_users.json');

  // Run job and get metrics
  const metrics = await Job.run(validatedReader, writer);
  console.log(`Throughput: ${metrics.recordsPerSecond} rec/sec`);
}
```

### 2. High-Performance SQL Batching & Pagination
Handle massive datasets by fetching in chunks and writing in bulk.

```ts
import { SQLReader, SQLWriter, Job } from '@pujansrt/data-genie';

const sqlReader = new SQLReader(dbClient, 'SELECT * FROM big_table')
  .setChunkSize(5000)       // Fetch 5000 rows at a time
  .setOrderBy('created_at') // Required for stable pagination
  .setUseTransaction(true); // Ensure a consistent snapshot

const sqlWriter = new SQLWriter(dbClient, 'target_table')
  .setBatchSize(1000)       // Buffer 1000 rows for bulk insert
  .setUseTransaction(true); // Wrap inserts in a transaction

await Job.run(sqlReader, sqlWriter);
```

### 3. API Ingestion with HttpReader
Stream data from REST APIs with automated pagination.

```ts
import { HttpReader, SQLWriter, Job } from '@pujansrt/data-genie';

const apiReader = new HttpReader('https://api.example.com/users', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
  // Map response to the correct field
  resultsPath: (res) => res.items,
  // Automatically follow 'next_page' URL in the response
  nextPageUrl: (res) => res.pagination.next_page
});

const sqlWriter = new SQLWriter(dbClient, 'users').setBatchSize(500);

await Job.run(apiReader, sqlWriter);
```

### 4. Cloud Ingestion & Sinks (AWS S3)
Stream large files directly between S3 buckets with constant memory.

#### Setup
Since the AWS SDK is large, it is marked as an **optional peer dependency**. You must install it manually in your project to use S3 features:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

#### Usage Example
You are responsible for creating the `S3Client`. This allows you to handle authentication via IAM Roles, Environment Variables, or explicit keys.

```ts
import { S3Client } from '@aws-sdk/client-s3';
import { S3CSVReader, S3JsonWriter, Job } from '@pujansrt/data-genie';

// Auth is handled by the client configuration
const s3Client = new S3Client({ region: 'us-east-1' });

async function runCloudPipeline() {
  // 1. Setup Reader (Stream from S3)
  const reader = new S3CSVReader(s3Client, 'my-source-bucket', 'raw/data.csv');

  // 2. Setup Writer (Stream to S3 as NDJSON)
  const writer = new S3JsonWriter(s3Client, 'my-target-bucket', 'clean/data.ndjson', {
    format: 'ndjson'
  });

  // 3. Execute
  await Job.run(reader, writer);
}
```

### 5. API Ingestion with HttpReader
Connect your own logger (e.g., Winston, Pino) to monitor jobs.

```ts
import { Job } from '@pujansrt/data-genie';

const myLogger = {
  info: (msg) => console.log(`[CUSTOM] ${msg}`),
  warn: (msg) => console.warn(msg),
  error: (msg) => console.error(msg)
};

await Job.run(reader, writer, { logger: myLogger });
```

### 4. Resilient Writing (Retry & Circuit Breaker)
Protect your pipeline from flaky networks or database downtime.

```ts
import { SQLWriter, RetryingWriter, Job } from '@pujansrt/data-genie';

const sqlWriter = new SQLWriter(dbClient, 'users');

// Wrap the writer with retry and circuit breaker logic
const resilientWriter = new RetryingWriter(sqlWriter, {
  maxRetries: 3,
  initialDelayMs: 1000,
  circuitBreakerThreshold: 5 // Stop trying if 5 records fail in a row
});

await Job.run(reader, resilientWriter);
```

### 5. Memory-Safe Deduplication
Prevent OOM errors when deduplicating massive datasets.

```ts
import { CSVReader, RemoveDuplicatesReader, Job, ConsoleWriter } from '@pujansrt/data-genie';

const reader = new CSVReader('data.csv');
const dedupeReader = new RemoveDuplicatesReader(reader, 'email')
  .setMaxKeys(500000); // Safety limit for memory usage

await Job.run(dedupeReader, new ConsoleWriter());
```

---

## Common Workflows

### Filtering with Field Rules
Use granular rules like `IsNotNull`, `ValueMatch`, or `PatternMatch`.

```ts
import { CSVReader, FilteringReader, FieldFilter, IsNotNull, ValueMatch, Job, ConsoleWriter } from '@pujansrt/data-genie';

const reader = new CSVReader('data.csv').setFieldNamesInFirstRow(true);

const filter = new FilteringReader(reader)
  .add(new FieldFilter('Rating')
    .addRule(IsNotNull())
    .addRule(ValueMatch('A', 'B'))
    .createRecordFilter());

await Job.run(filter, new ConsoleWriter());
```

### Writing to Fixed-Width Format
Useful for legacy system integrations.

```ts
import { CSVReader, FixedWidthWriter, Job } from '@pujansrt/data-genie';

const reader = new CSVReader('data.csv').setFieldNamesInFirstRow(true);

const fwWriter = new FixedWidthWriter('output.fw')
  .setFieldNamesInFirstRow(true)
  .setFieldWidths(10, 20, 15); // Define widths for each column

await Job.run(reader, fwWriter);
```

### CSV to JSON with Field Manipulation
```ts
import { CSVReader, TransformingReader, SetCalculatedField, RemoveFields, Job, JsonWriter } from '@pujansrt/data-genie';

let reader = new CSVReader('input.csv').setFieldNamesInFirstRow(true);

reader = new TransformingReader(reader)
  .add(new SetCalculatedField('total', 'record.price * record.qty').transform())
  .add(new RemoveFields('price', 'qty').transform());

await Job.run(reader, new JsonWriter('output.json'));
```

### Filtering with Expressions
```ts
import { CSVReader, FilteringReader, FilterExpression, Job, ConsoleWriter } from '@pujansrt/data-genie';

const reader = new CSVReader('data.csv').setFieldNamesInFirstRow(true);
const filter = new FilteringReader(reader)
  .add(new FilterExpression('record.age > 21 && record.status === "active"').createRecordFilter());

await Job.run(filter, new ConsoleWriter());
```

---

## Edge Cases Handled

*   **Slow Sinks:** Using backpressure awareness, the engine pauses reading if the writer is slow.
*   **Malformed Data:** Validating readers can be configured to throw or skip/divert bad records.
*   **Large Keys:** Deduplication uses NULL-byte separators for composite keys to prevent collision and JSON-based serialization for robustness.
*   **Database Timeouts:** Bulk inserts in SQLWriter reduce transaction overhead and connection idle time.

---

## Use Cases

- **Data Cleaning:** Removing duplicates and normalizing formats.
- **Migration:** Moving data between CSV/JSON and SQL databases.
- **Validation:** Enforcing strict schemas on incoming partner data.
- **ETL Pipelines:** Building modular, testable data workflows.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

---

## License
MIT License — free for personal and commercial use.

---

## Author
Developed and maintained by Pujan Srivastava
