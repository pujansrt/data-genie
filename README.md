# Data-Genie 🧞‍♂️
A high-performant, streaming-first **ETL Engine** for **Node.js** and **TypeScript**, designed for processing massive datasets with a **constant memory footprint**.

[![NPM Version](https://img.shields.io/npm/v/@pujansrt/data-genie.svg?style=flat-square)](https://www.npmjs.com/package/@pujansrt/data-genie)
[![NPM Bundle Size](https://img.shields.io/bundlephobia/minzip/@pujansrt/data-genie?style=flat-square)](https://bundlephobia.com/package/@pujansrt/data-genie)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js Support](https://img.shields.io/badge/Node.js-Next-green.svg?style=flat-square)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/@pujansrt/data-genie.svg?style=flat-square)](https://github.com/pujansrt/data-genie/blob/main/LICENSE)
[![Coverage](https://img.shields.io/badge/coverage-91%25-brightgreen.svg?style=flat-square)](https://github.com/pujansrt/data-genie)

---

## Documentation & Examples

Visit our full documentation site for in-depth guides, API reference, and real-world recipes:

**[https://pujansrt.github.io/data-genie/](https://pujansrt.github.io/data-genie/)**

---
## Installation

```bash
npm install @pujansrt/data-genie
```

> **Note:** `zod`, `@aws-sdk/client-s3`, and `exceljs` are optional peer dependencies in case you need them.

## Quick Start (Convert CSV to JSON in 30s)

```typescript
import { CSVReader, JsonWriter, Job } from '@pujansrt/data-genie';

const reader = new CSVReader('users.csv');
const writer = new JsonWriter('output.json');

(async () => {
    // Process 10GB+ files with just 15MB RAM
    const metrics = await Job.run(reader, writer);
    console.log(`Processed ${metrics.recordCount} records!`);
})();
```

### Preview (Dry Run)
Verify your transformations and filters instantly without writing any data.

```typescript
// Inspect the first 5 records in a beautiful console table
await Job.preview(pipeline); 
```

---

## Why Data-Genie? (Performance Benchmark)

In our latest benchmarks (Processing 500k records), Data-Genie used **100x less memory** than standard array-based processing.

| Data Size | Naive Approach (Array-based) | **Data-Genie (Streaming)** |
| :--- | :--- | :--- |
| 100 KB | ~10 MB RAM | **~10 MB RAM** |
| 100 MB | ~150 MB RAM | **~12 MB RAM** |
| 10 GB | **CRASH (OOM)** | **~15 MB RAM** |

---

## Features

- **Streaming-First:** Constant memory footprint regardless of file size (O(1) memory complexity).
- **Multi-Format:** Support for CSV, TSV, JSON, NDJSON, Parquet, Excel, and SQL.
- **Transport Agnostic:** Read/Write from Local Disk, AWS S3, HTTP APIs, or Memory.
- **Fault Tolerant:** Retries, Circuit Breakers, and Dead Letter Queues (DLQ).

---

## Common Recipes

### 1. S3 Parquet to Local CSV
Stream massive datasets directly from the cloud to your local machine.

```typescript
const source = new S3Source(s3Client, 'mybucket', 'data/users.parquet');
const reader = new ParquetReader(source);
const writer = new CSVWriter('users.csv');

await Job.run(reader, writer);
```

### 2. Schema Validation (Zod) + DLQ
Validate data in real-time and divert "poison" records to a Dead Letter Queue.

```typescript
const validator = new SchemaValidatingReader(reader, z.object({
    email: z.string().email(),
    age: z.number().min(18)
})).setDLQ(new JsonWriter('invalid_records.json'));

await Job.run(validator, new SQLWriter(db, 'users'));
```

### 3. Parallel Fan-out (Multi-Sink)
Read once, transform, and write to **multiple** destinations in parallel.

```ts
const multiWriter = new MultiWriter(
  new ConsoleWriter(),
  new JsonWriter('processed.json'),
  new SQLWriter(db, 'audit_log')
);

await Job.run(pipeline, multiWriter);
```

**[See 15+ more recipes in our Cookbook](https://pujansrt.github.io/data-genie/cookbook/)**

---

## Contributing

Contributions are welcome! Whether it's adding a new DataReader, fixing a bug, or improving documentation.

1.  Check out our [Contributing Guide](CONTRIBUTING.md).
2.  Look for [Good First Issues](https://github.com/pujansrt/data-genie/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).
3.  Submit a PR!

## Running Benchmarks

Want to see the performance difference on your own machine? We provide a built-in benchmark script that compares Data-Genie with a standard `fs.readFileSync` approach.

```bash
# Clone the repo and install dependencies
git clone https://github.com/pujansrt/data-genie.git
npm install

# Run the benchmark
npx tsx benchmarks/run-benchmark.ts
```

## License
MIT © [Pujan Srivastava](https://github.com/pujansrt)
