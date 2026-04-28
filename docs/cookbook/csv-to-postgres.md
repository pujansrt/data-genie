# Streaming CSV to PostgreSQL

One of the most common ETL tasks is moving data from flat files into a relational database. With Data-Genie, you can stream millions of rows into PostgreSQL without running out of memory.

## The Strategy

We use `CSVReader` to parse the file and `SQLWriter` to perform bulk inserts. `SQLWriter` is designed to be driver-agnostic, meaning it works with any database client that follows a simple `query` interface (like `pg`, `mysql2`, or `sqlite3`).

## Implementation

```typescript
import { CSVReader, SQLWriter, Job } from '@pujansrt/data-genie';
import { Client } from 'pg';

const pgClient = new Client({
  connectionString: 'postgresql://user:pass@localhost:5432/mydb'
});

async function run() {
  await pgClient.connect();

  const reader = new CSVReader('large_data.csv');
  
  // SQLWriter handles batching automatically for performance
  const writer = new SQLWriter(pgClient, 'INSERT INTO users (name, email) VALUES ($1, $2)', (record) => [
    record.name,
    record.email
  ]);

  await Job.run(reader, writer);
  
  await pgClient.end();
}

run().catch(console.error);
```

## Why this works
1. **Streaming**: Data-Genie doesn't read the whole CSV at once.
2. **Backpressure**: If the database is slow, the reader slows down automatically.
3. **Batching**: `SQLWriter` groups records into batches, reducing the number of round-trips to the database.
