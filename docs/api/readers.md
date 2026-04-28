# Readers

Readers are responsible for parsing raw data into JavaScript objects.

## `CSVReader<T>`
Reads Comma-Separated Values.
- **Constructor**: `new CSVReader(source, options?)`
- **Methods**:
  - `setFieldNamesInFirstRow(boolean)`
  - `setFieldSeparator(string)`

## `JsonReader<T>`
Reads a JSON array of objects.
- **Constructor**: `new JsonReader(source, options?)`

## `ParquetReader<T>`
Reads Apache Parquet files. Requires `parquetjs-lite`.
- **Constructor**: `new ParquetReader(source, options?)`

## `SQLReader<T>`
Reads from a SQL database using a driver-agnostic connection.
- **Constructor**: `new SQLReader(dbClient, query, params?, options?)`
- **Methods**:
  - `setChunkSize(number)`: For paginated reading.
  - `setOrderBy(string)`: Required for stable pagination.

## `XlsxReader<T>`
Reads Excel files. Requires `exceljs`.
- **Constructor**: `new XlsxReader(source, options?)`
