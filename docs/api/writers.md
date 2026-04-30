# Writers

Writers persist processed records to a destination.

## `CSVWriter<T>`
Writes data as CSV.
- **Constructor**: `new CSVWriter(sink)`

## `JsonWriter<T>`
Writes data as a JSON array.
- **Constructor**: `new JsonWriter(sink)`

## `ParquetWriter<T>`
Writes data to a Parquet file.
- **Constructor**: `new ParquetWriter(sink, schema?)`
- **Methods**:
    - `setSchema(schema)`: Sets the Parquet schema. Required if not provided in constructor.

## `SQLWriter<T>`
Bulk inserts or upserts records into a SQL database.
- **Constructor**: `new SQLWriter(dbClient, tableName)`
- **Methods**:
    - `setBatchSize(size)`: Number of records per bulk operation (default 1).
    - `setUpsert(conflictKey)`: Enables idempotent writing (Insert or Update).
    - `setDialect(dialect)`: Set to `'postgres'`, `'mysql'`, or `'sqlite'` (default `'postgres'`).
    - `setUseTransaction(boolean)`: Wraps the entire job in a transaction.

## `CallbackWriter<T>`
Executes a function for every record.
- **Constructor**: `new CallbackWriter(callback, options?)`

## `BatchCallbackWriter<T>`
Collects records into batches before executing a function.
- **Constructor**: `new BatchCallbackWriter(batchSize, callback, options?)`

## `MultiWriter<T>`
Broadcasts records to multiple writers in parallel.
- **Constructor**: `new MultiWriter(...writers)`

## `ParallelWriter<T>`
Offloads writing tasks to background worker threads using `node:worker_threads`.
- **Constructor**: `new ParallelWriter(options)`
- **Options**:
    - `workerPath`: Absolute path to the worker script.
    - `concurrency`: Number of threads (default: CPU cores / 2).
    - `batchSize`: Records to buffer before sending to a worker (default 100).
    - `execArgv`: Optional worker execution flags (e.g. `['--import', 'tsx']`).

### `setupWorker(writer)`
Helper function to be called inside the worker script to handle incoming record chunks.
