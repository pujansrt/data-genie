# Transformers

Transformers act as middleware in the data pipeline.

## `TransformingReader<TIn, TOut>`
Apply arbitrary transformations to records.
- **Methods**:
  - `add(transformation)`: Chain a mapping function.
  - `setCondition(predicate)`: Only transform records that match.

## `FilteringReader<T>`
Filter out records from the pipeline.
- **Methods**:
  - `addRule(rule)`: Add a `FieldFilterRule`.

## `SchemaValidatingReader<TOut, TIn>`
Validate records against a Zod schema.
- **Methods**:
  - `setDLQ(writer)`: Set a destination for failed records.

## `GroupByReader`
Aggregates records based on a key.
- **Constructor**: `new GroupByReader(reader, groupByField, aggregateConfig)`

## `PIIMaskingTransformer`
Anonymize sensitive data (Emails, Credit Cards, etc.) during the stream.
- **Methods**:
  - `mask(fieldName, strategy)`: Register a field for masking.
- **Strategies**:
  - `redact`: Replaces with `[REDACTED]`.
  - `hash`: Replaces with a SHA256 hash.
  - `partial`: Intelligent masking (e.g., `p****@domain.com`).
  - `null`: Sets the field to `null`.
