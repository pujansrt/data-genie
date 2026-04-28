# Memory & Callbacks

Data-Genie isn't just for files and databases. You can use it to process in-memory arrays or integrate with custom logic via callbacks.

## In-Memory Sources
Perfect for unit tests or small datasets that you've already loaded.

```typescript
import { MemoryReader, JsonWriter, Job } from '@pujansrt/data-genie';

const data = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];

const reader = new MemoryReader(data);
await Job.run(reader, new JsonWriter('output.json'));
```

## Custom Callbacks (`CallbackWriter`)
Use this when you need to perform an action for every record that isn't covered by a built-in writer.

```typescript
import { CallbackWriter, Job } from '@pujansrt/data-genie';

const writer = new CallbackWriter(async (record) => {
  // Integrate with any 3rd party API, logger, or custom logic
  await myCustomApi.send(record);
});

await Job.run(reader, writer);
```

## High-Performance Batching (`BatchCallbackWriter`)
When dealing with external systems (APIs, Message Queues, Databases), sending records one-by-one is often slow due to network overhead. Batching solves this.

```typescript
import { BatchCallbackWriter, Job } from '@pujansrt/data-genie';

// Collect 100 records at a time
const writer = new BatchCallbackWriter(100, async (batch) => {
  // batch is an array of 100 records
  await myDatabase.bulkInsert(batch);
});

await Job.run(reader, writer);
```

## Mixing & Matching
You can use `MemoryReader` to test your `BatchCallbackWriter` locally before connecting to production data sources.
