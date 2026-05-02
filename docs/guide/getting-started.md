# Getting Started

## Installation

### As a Library
Install Data-Genie for use in your TypeScript/JavaScript project:
```bash
npm install @pujansrt/data-genie
```

### As a CLI Tool
Install Data-Genie globally to use the declarative pipeline runner:
```bash
npm install -g @pujansrt/data-genie
```

## Choose Your Path

Data-Genie supports two ways of building ETL pipelines:

1. **Declarative (CLI)**: Define pipelines in YAML. Fast to write, no code needed.
2. **Programmatic (API)**: Full control via TypeScript. Best for complex logic.

---

## 1. Declarative: YAML Pipelines

Create a `pipeline.yaml` file:

```yaml
pipeline:
  read:
    type: csv
    path: input.csv
  transform:
    - type: filter
      expression: "age > 18"
    - type: rename
      mapping: { fname: firstName }
  write:
    type: json
    path: output.json
```

Run it instantly:
```bash
data-genie run pipeline.yaml
```

See the [Declarative Pipelines Guide](./declarative-pipelines.md) for full documentation on the YAML schema and all supported options.

---

## 2. Programmatic: CSV to JSON

Some features require additional peer dependencies. Only install them if you need that specific functionality:

- **Zod**: `npm install zod` (for Schema Validation)
- **AWS S3**: `npm install @aws-sdk/client-s3 @aws-sdk/lib-storage` (for S3 transport)
- **Excel**: `npm install exceljs` (for XlsxReader/Writer)
- **Parquet**: `npm install parquetjs-lite` (for ParquetReader/Writer)

## Quick Start: CSV to JSON

Convert a CSV file to JSON in just a few lines of code.

```typescript
import { CSVReader, JsonWriter, Job } from '@pujansrt/data-genie';

const reader = new CSVReader('users.csv');
const writer = new JsonWriter('output.json');

async function main() {
  // This will process any file size with minimal RAM
  const metrics = await Job.run(reader, writer);
  
  console.log(`--- Job Completed ---`);
  console.log(`Processed: ${metrics.recordCount} records`);
  console.log(`Duration:  ${(metrics.durationMs / 1000).toFixed(2)}s`);
}

main().catch(console.error);
```

> **Pro Tip:** For large jobs, you can listen to real-time events by instantiating the job: `new Job(reader, writer).on('progress', (m) => ...)`. See the [Observability Guide](../cookbook/memory-and-callbacks#job-events--observability) for more.

## Previewing Data

Before running a full job, you can preview the first few records to ensure your readers and transformers are working correctly.

```typescript
import { CSVReader, Job } from '@pujansrt/data-genie';

const reader = new CSVReader('large_data.csv');

// Displays a beautiful table in the console
await Job.preview(reader, { limit: 5 });
```

## Generating Schemas Instantly

Don't waste time writing schemas for 100-column CSV files. Let Data-Genie infer them for you.

```typescript
import { CSVReader, Job } from '@pujansrt/data-genie';

const reader = new CSVReader('complex_data.csv');

// Sample first 1000 records and generate schemas
const schema = await Job.inferSchema(reader);

console.log(schema.typescript); // Ready-to-use Interface
console.log(schema.zod);        // Ready-to-use Validation
console.log(schema.sql);        // Ready-to-use CREATE TABLE
```
