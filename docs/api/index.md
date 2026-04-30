# API Reference

Data-Genie is organized into four main modules: Readers, Writers, Transformers, and Transports.

## Core Interfaces

### `DataRecord`
A simple object representing a single row of data.
```typescript
export interface DataRecord {
  [key: string]: any;
}
```

### `DataReader<T>`
Interface for all record sources. Must implement a `read()` method that returns an `AsyncIterableIterator<T>`.

### `DataWriter<T>`
Interface for all data sinks. Must implement `write(record)`, `writeAll(records)`, and `close()`.

### `Job<T>`
The orchestrator that runs the pipeline. It extends `EventEmitter`.
- **Static Methods**:
  - `Job.run(reader, writer, options)`: Runs a job and returns metrics.
  - `Job.preview(reader, options)`: Prints the first N records to the console.
  - `Job.inferSchema(reader, options)`: Samples records and generates TypeScript, Zod, and SQL schemas.
- **Instance Events**:
  - `start`: `{ startTime }`
  - `record`: `DataRecord`
  - `progress`: `JobMetrics`
  - `error`: `(Error, DataRecord)`
  - `complete`: `JobMetrics`

---

## Modules

- **[Readers](/api/readers)**: Extract data from CSV, JSON, SQL, etc.
- **[Writers](/api/writers)**: Load data into various formats and destinations.
- **[Transformers](/api/transformers)**: Middleware for mapping, filtering, and validating data.
- **[Transports](/api/index)**: Low-level abstractions for S3, HTTP, and File systems.
