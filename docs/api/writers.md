# Writers

Writers persist processed records to a destination.

## `CSVWriter<T>`
Writes data as CSV.
- **Constructor**: `new CSVWriter(sink)`

## `JsonWriter<T>`
Writes data as a JSON array.
- **Constructor**: `new JsonWriter(sink)`

## `SQLWriter<T>`
Bulk inserts records into a SQL database.
- **Constructor**: `new SQLWriter(dbClient, insertSql, mapper, options?)`

## `CallbackWriter<T>`
Executes a function for every record.
- **Constructor**: `new CallbackWriter(callback, options?)`

## `BatchCallbackWriter<T>`
Collects records into batches before executing a function.
- **Constructor**: `new BatchCallbackWriter(batchSize, callback, options?)`

## `MultiWriter<T>`
Broadcasts records to multiple writers in parallel.
- **Constructor**: `new MultiWriter(...writers)`
