# Filtering Data

Data-Genie provides several ways to filter records, from simple rule-based filters to complex logical expressions.

## Method 1: Rule-Based Filtering
Best for simple, reusable checks (e.g., checking for nulls or matching a pattern).

```typescript
import { CSVReader, FilteringReader, FieldFilter, IsNotNull, PatternMatch, Job } from '@pujansrt/data-genie';

const reader = new CSVReader('data.csv');

const filter = new FilteringReader(reader)
  .add(new FieldFilter('email')
    .addRule(IsNotNull())
    .addRule(PatternMatch('.*@.*\\.com'))
    .createRecordFilter()
  );

await Job.run(filter, writer);
```

## Method 2: Logical Expressions
Best for complex conditional logic involving multiple fields.

```typescript
import { FilteringReader, FilterExpression, Job } from '@pujansrt/data-genie';

const filter = new FilteringReader(reader)
  .add(new FilterExpression(
    'record.age >= 18 && record.status === "active" && record.balance > 0'
  ).createRecordFilter());

await Job.run(filter, writer);
```

## Method 3: Functional Filter
If you need pure JavaScript logic, you can use the `TransformingReader` as a filter by returning `null` or using a condition. However, for true filtering (discarding records), `FilteringReader` is the preferred tool.

```typescript
const filter = new FilteringReader(reader)
  .add((record) => record.score > 50); // Direct predicate function
```
