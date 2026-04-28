# Pipelines

Pipelines allow you to chain multiple operations together to transform data as it moves from the Source to the Sink.

## Anatomy of a Pipeline

A typical pipeline consists of:
1. **Source**: Where the data starts (e.g., `CSVReader`).
2. **Middleware**: One or more Transformers or Filters.
3. **Sink**: Where the data ends (e.g., `SQLWriter`).

## Fluent Pipeline Construction

Data-Genie readers provide fluent methods to make building pipelines intuitive.

```typescript
const pipeline = new CSVReader('users.csv')
  .transform(user => ({ ...user, fullName: `${user.fname} ${user.lname}` }))
  .validate(UserSchema)
  .transform(user => {
    // Advanced custom logic
    return user;
  });

await Job.run(pipeline, new JsonWriter('output.json'));
```

## Built-in Transformers

### `TransformingReader`
The Swiss Army knife of pipelines. Use it to add fields, rename keys, or perform calculations.

```typescript
const transformer = new TransformingReader(reader)
  .add(new RenameField('oldName', 'newName').transform())
  .add(new SetCalculatedField('total', 'record.price * record.qty').transform());
```

### `FilteringReader`
Used to discard records that don't meet your criteria.

```typescript
const filter = new FilteringReader(reader)
  .add(new FieldFilter('age').addRule(GreaterThan(18)).createRecordFilter());
```

## Complex Pipelines (Fan-out)

You can broadcast a single stream to multiple destinations using the `MultiWriter`. This is useful for simultaneous archiving and database insertion.

```typescript
const multiWriter = new MultiWriter(
  new JsonWriter('archive.json'),
  new SQLWriter(db, 'INSERT INTO analytics ...', mapper)
);

await Job.run(pipeline, multiWriter);
```

### Sequential vs Parallel
While Data-Genie handles the records in a stream (sequentially per record), `MultiWriter` processes each individual record in parallel across all sinks, ensuring high throughput.
