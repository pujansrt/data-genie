# Pipelines

Pipelines allow you to chain multiple operations together to transform data as it moves from the Source to the Sink. Data-Genie supports both **Code-based** and **Config-based** pipelines.

## Declarative Pipelines (YAML)

Declarative pipelines allow you to define your ETL logic in a YAML configuration file. This is ideal for CI/CD environments, non-TS projects, or simple ETL tasks.

See the [Declarative Pipelines Guide](./declarative-pipelines.md) for full documentation on the YAML schema and CLI usage.

## Programmatic Pipelines (TypeScript)

Programmatic pipelines offer full control and are best for complex custom logic.

### Fluent Construction

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
