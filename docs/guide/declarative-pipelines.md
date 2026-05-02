# Declarative Pipelines (YAML)

Declarative pipelines allow you to define your ETL logic in a simple YAML configuration file. This is the preferred way to use Data-Genie for non-developers, CI/CD pipelines, or when you want to keep your ETL logic separate from your application code.

## Quick Start (Minimal Example)

The simplest pipeline converts one format to another:

```yaml
# pipeline.yaml
pipeline:
  read: { type: csv, path: input.csv }
  write: { type: json, path: output.json }
```

Run it via the CLI:
```bash
data-genie run pipeline.yaml
```

*Note: Ensure you have installed the CLI globally via `npm i -g @pujansrt/data-genie`*

## Interactive Pipeline Builder

Use the tool below to visually build your pipeline and copy the generated YAML.

<script setup>
import PipelineBuilder from '../.vitepress/components/PipelineBuilder.vue'
</script>

<PipelineBuilder />

## Schema Overview

The following illustrates the full pipeline schema. Mandatory fields are marked with `# *`.

```yaml
version: "1.0"      # Optional

job:                # Optional
  name: "Daily Sales Sync"
  showProgress: true

pipeline:           # *
  read:             # *
    type: csv       # * (options: csv, json, ndjson)
    path: input.csv # *
    options:        # Optional
      delimiter: ","
      hasHeader: true

  transform:        # Optional (List of steps)
    - type: filter
      expression: "amount > 100"
    - type: rename
      mapping:
        old_name: new_name

  write:            # *
    type: json      # * (options: csv, json, ndjson, console)
    path: out.json  # * (except for console writer)
```

## Readers

The `read` section defines the source of your data.

### CSV Reader
Reads data from a CSV file.
```yaml
read:
  type: csv
  path: data.csv
  options:
    delimiter: ","
    hasHeader: true
```

### JSON / NDJSON Reader
Reads data from a JSON or NDJSON file.
```yaml
read:
  type: json
  path: data.json
```

## Transformers

The `transform` section is an optional list of steps.

### Filter
Filters records based on a logical expression.
```yaml
- type: filter
  expression: "age >= 18 && status == 'active'"
```

### Rename
Renames one or more fields.
```yaml
- type: rename
  mapping:
    firstName: first_name
    lastName: last_name
```

### Select / Remove
```yaml
- type: select
  fields: ["id", "email"]
```

### Type Convert
Converts field values to a specific type.
```yaml
- type: type-convert
  fields: ["age", "count"]
  to: int
```

### PII Masking
Masks sensitive information.
```yaml
- type: pii-masking
  masks:
    email: redact    # Options: redact, hash, partial, null
```

## Writers

The `write` section defines where the processed data should be saved.

### File Writers (CSV, JSON, NDJSON)
```yaml
write:
  type: csv
  path: output.csv
```

### Console Writer
Outputs the records directly to the terminal.
```yaml
write:
  type: console
```

## Current Limitations

While declarative pipelines are convenient, they currently have some limitations compared to the Programmatic API:

- **Unsupported Destinations**: You cannot yet write to **AWS S3** or **SQL Databases** via YAML. These require the TypeScript/Node.js API.
- **Custom Logic**: Complex transformations that require custom JavaScript functions (e.g., calling an external API mid-stream) are not supported in YAML.
- **Complex Sinks**: Advanced writer patterns like `MultiWriter` (fan-out) or `RetryingWriter` are not yet exposed via the declarative schema.

If you need these features, please refer to the [Programmatic Pipelines Guide](./pipelines.md).
