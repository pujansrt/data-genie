# Getting Started

## Installation

Install Data-Genie using your favorite package manager:

```bash
npm install @pujansrt/data-genie
```

### Optional Dependencies

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

## Previewing Data

Before running a full job, you can preview the first few records to ensure your readers and transformers are working correctly.

```typescript
import { CSVReader, Job } from '@pujansrt/data-genie';

const reader = new CSVReader('large_data.csv');

// Displays a beautiful table in the console
await Job.preview(reader, { limit: 5 });
```
