# Memory and Callbacks

Data-Genie is optimized for streaming, but sometimes you need to collect results in memory or execute custom logic (like pushing to a message queue or a specialized API) for each record.

## Memory Source & Sink

If you are working with small datasets or writing tests, you can use the `MemorySource` and `MemorySink`.

```typescript
import { MemorySource, MemorySink, Job } from '@pujansrt/data-genie';

const source = new MemorySource('id,name\n1,John\n2,Jane');
const sink = new MemorySink();

await Job.run(new CSVReader(source), new JsonWriter(sink));

const output = sink.getData(); // Returns a Buffer of the generated JSON
console.log(output.toString());
```

## Callback Writer

The `CallbackWriter` is the "Swiss Army Knife" of sinks. It executes a function for every record.

```typescript
const writer = new CallbackWriter(async (record) => {
  await myApiService.send(record);
});

await Job.run(reader, writer);
```

## Batch Callback Writer

For high-performance scenarios where you want to perform bulk operations (e.g., batch database inserts), use the `BatchCallbackWriter`.

```typescript
const writer = new BatchCallbackWriter(100, async (batch) => {
  // batch is an array of 100 records
  await db.insert(batch);
});

await Job.run(reader, writer);
```

## Job Events & Observability

For building dashboards or monitoring tools, you can instantiate the `Job` class to listen for events.

```typescript
import { Job } from '@pujansrt/data-genie';

const job = new Job(reader, writer);

job.on('start', ({ startTime }) => {
  console.log('Job started at:', startTime);
});

job.on('progress', (metrics) => {
  console.log(`Current progress: ${metrics.recordCount} records...`);
});

job.on('record', (record) => {
  // Optional: peek at every record as it passes through
});

job.on('error', (error, record) => {
  console.error('Failed to process record:', record, error);
});

job.on('complete', (metrics) => {
  console.log('Job finished! Total records:', metrics.recordCount);
});

const metrics = await job.run();
```
