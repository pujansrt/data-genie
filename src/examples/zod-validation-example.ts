import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { SchemaValidatingReader } from '@/transformers/schema-validating-reader';
import { Job } from '@/core/job';
import { z } from 'zod';

// 1. Define your Schema using Zod
const AccountSchema = z.object({
  Account: z.coerce.number(),
  Name: z.string().min(2),
  CreditLimit: z.coerce.number(),
  Balance: z.coerce.number(),
  Rating: z.enum(['A', 'B', 'C']),
}).refine(data => data.Balance <= data.CreditLimit, {
  message: "Balance cannot exceed Credit Limit",
  path: ["Balance"]
});

async function runValidationExample() {
  console.log('--- Zod Schema Validation with DLQ Example ---');

  const sourceReader = new CSVReader('src/examples/input/example.csv')
    .setFieldNamesInFirstRow(true);

  // 2. Setup the SchemaValidatingReader with a Dead Letter Queue (DLQ)
  const dlqWriter = new JsonWriter('src/examples/output/invalid-accounts.json');
  
  const validatedReader = new SchemaValidatingReader(sourceReader, AccountSchema)
    .setDLQ(dlqWriter);

  const mainWriter = new JsonWriter('src/examples/output/valid-accounts.json');

  // 3. Run the Job and get Metrics
  const metrics = await Job.run(validatedReader, mainWriter);

  console.log(`Success! Check 'src/examples/output/valid-accounts.json' for valid data`);
  console.log(`Check 'src/examples/output/invalid-accounts.json' for filtered errors`);
}

runValidationExample().catch(console.error);
