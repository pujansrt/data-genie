# Idempotent Data Loading (SQL Upsert)

This recipe demonstrates how to prevent duplicate records when running (or re-running) an ETL job by using the "Upsert" (Update or Insert) pattern.

## The Problem
Standard ETLs use `INSERT`. If a job fails halfway and you restart it, you will likely get duplicate records in your database, leading to data corruption and incorrect analytics.

## The Solution: Smart Upserts
With Data-Genie's `setUpsert()` feature, the writer checks if a record already exists based on a "conflict key" (like an ID or Email). 
- If the record **does not exist**: It is inserted.
- If the record **exists**: It is updated with the latest values.

## The Code

```typescript
import { CSVReader, SQLWriter, Job } from '@pujansrt/data-genie';

// 1. Setup your DB client (e.g., pg, mysql2, etc.)
const db = {
  query: async (sql, params) => { /* your db driver logic */ }
};

const reader = new CSVReader('users.csv');

// 2. Configure the SQLWriter for Upserts
const writer = new SQLWriter(db, 'users')
  .setDialect('postgres')    // Supports 'postgres', 'mysql', 'sqlite', 'oracle'
  .setUpsert('email')        // Use 'email' as the unique conflict key
  .setBatchSize(100);        // Performance: Bulk upsert in batches of 100

(async () => {
  // This job is now "Idempotent" - you can run it 100 times 
  // and you will never get duplicate emails.
  await Job.run(reader, writer);
  console.log('Sync complete!');
})();
```

## How it works under the hood
Data-Genie generates dialect-specific SQL to ensure performance:

- **PostgreSQL / SQLite**: Uses `INSERT ... ON CONFLICT ("email") DO UPDATE SET ...`
- **MySQL**: Uses `INSERT ... ON DUPLICATE KEY UPDATE ...`
- **Oracle**: Uses the native `MERGE INTO ...` statement to handle atomic upserts.


## Why use this?
- **Restart-Safe**: If your server crashes, just start the job again.
- **Data Integrity**: Ensures your unique constraints are respected without throwing errors.
- **Performance**: High-speed bulk upserts using native database features rather than slow "select-then-insert" logic.
