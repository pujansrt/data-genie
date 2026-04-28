# Streaming & Memory

The primary goal of Data-Genie is to provide a **constant memory footprint**, regardless of data size. This is achieved through the power of Node.js Streams and Async Iterators.

## The Memory Problem

Standard JavaScript approaches to data processing usually involve loading the entire dataset into an array:

```javascript
// ❌ Dangerous for large files
const data = JSON.parse(fs.readFileSync('huge_file.json'));
const transformed = data.map(item => ({ ...item, processed: true }));
```

If `huge_file.json` is 2GB and your server has 1GB of RAM, this will crash with an **"Out of Memory"** error.

## The Data-Genie Solution

Data-Genie uses a "pull-based" streaming approach. It only reads enough data to create a single object, processes it through the pipeline, writes it to the destination, and then moves to the next one.

```typescript
// Safe for any file size
const reader = new JsonReader('huge_file.json');
const writer = new JsonWriter('output.json');

// Memory usage stays at ~15MB even for 100GB files!
await Job.run(reader, writer);
```

### Async Iterators
Under the hood, every Reader in Data-Genie is an `AsyncIterableIterator`. This means you can even use them manually if you don't want to use the `Job` runner:

```typescript
for await (const record of reader.read()) {
  // Process one record at a time
  console.log(record);
}
```

## Backpressure
Streaming also handles **Backpressure** automatically. If your data source (e.g., a fast SSD) is providing data faster than your destination (e.g., a slow database) can accept it, Data-Genie will pause the reading process. This prevents data from piling up in memory and keeps your application stable.
