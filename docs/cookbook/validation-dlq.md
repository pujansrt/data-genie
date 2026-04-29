# Validation & Dead Letter Queue (DLQ)

`SchemaValidatingReader` allows you to validate records using Zod and automatically divert "bad" records to a separate destination (DLQ).

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
  
  const writer = new JsonWriter('clean_users.json');
  
  const validatedReader = new SchemaValidatingReader(sourceReader, UserSchema)
    .setDLQ(new JsonWriter('errors.json'));

  await Job.run(validatedReader, writer);
}

run().catch(console.error);
```

## How it works

The DLQ acts as a "safety valve" for your pipeline. Here is the internal flow:

1. **Validation Attempt**: Every record coming from the source is passed through the validator (e.g., `UserSchema.parse(record)`).
2. **Success**: If valid, the record is yielded to the next step in the pipeline.
3. **Failure**: If validation fails:
   - An `error` object is generated.
   - The original record is combined with the error details (usually in a `_schema_error` field).
   - This record is written **immediately** to the `dlqWriter`.
   - The record is **not yielded** to the main pipeline (it's "diverted").
4. **Finalization**: When the main job finishes, the `dlqWriter` is automatically closed.

## Why use a DLQ?

- **Auditability**: You have a perfect record of exactly which rows failed and why.
- **Resilience**: A single malformed row in a 10GB file won't crash your entire ETL job.
- **Separation of Concerns**: Your primary database or data warehouse remains clean, while the "dirty" data is quarantined for review.

## Advanced: Manual Validation DLQ
You can also use the `ValidatingReader` for custom logic that isn't schema-based:

```typescript
const reader = new ValidatingReader(sourceReader)
  .addRule((record) => {
    if (record.balance < 0 && record.type === 'SAVINGS') {
      return 'Savings accounts cannot have negative balance';
    }
    return true; // Valid
  })
  .setDLQ(new JsonWriter('business_rule_failures.json'));
```

