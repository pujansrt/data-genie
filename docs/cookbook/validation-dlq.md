# Validation & Dead Letter Queue (DLQ)

In production ETL, data is rarely perfect. `SchemaValidatingReader` allows you to validate records using Zod and automatically divert "bad" records to a separate destination (the Dead Letter Queue).

## The Strategy

1. Define a Zod schema.
2. Wrap your reader in a `SchemaValidatingReader`.
3. Set a `DLQ` writer to capture invalid records.

## Implementation

```typescript
import { CSVReader, JsonWriter, SchemaValidatingReader, Job } from '@pujansrt/data-genie';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.coerce.number(),
  email: z.string().email(),
  role: z.enum(['admin', 'user'])
});

async function run() {
  const sourceReader = new CSVReader('raw_data.csv');
  
  // Destination for valid records
  const mainWriter = new JsonWriter('clean_users.json');
  
  // Destination for invalid records + error messages
  const dlqWriter = new JsonWriter('errors.json');

  const validatedReader = new SchemaValidatingReader(sourceReader, UserSchema)
    .setDLQ(dlqWriter);

  const metrics = await Job.run(validatedReader, mainWriter);
  
  console.log(`Success: ${metrics.recordCount} records processed.`);
}

run().catch(console.error);
```

## How it works
- **Success Path**: Records that pass validation are yielded to `mainWriter`.
- **Error Path**: Records that fail validation are immediately written to `dlqWriter` with an added `_schema_error` field. These records are **skipped** from the main pipeline, ensuring only clean data reaches your primary database or file.
