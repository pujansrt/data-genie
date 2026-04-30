# Contributing to Data-Genie
First off, thank you for considering contributing to Data-Genie! It's people like you that make Data-Genie such a great tool.

## How Can I Contribute?

### Reporting Bugs
* Check the [GitHub Issues](https://github.com/pujansrt/data-genie/issues) to see if the bug has already been reported.
* Use the **Bug Report** template to provide as much detail as possible.

### Suggesting Enhancements
* Open an issue using the **Feature Request** template.
* Explain why the feature would be useful to most users.

### Pull Requests
1. Fork the repo and create your branch from `production`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes (`npm test`).
4. Format your code with Prettier (`npm run format`).
5. Submit a Pull Request!

## Example Issues
Here are some great places to start:
* **Add a new Filter:** Implement a simple filter like `EndsWith` or `Contains` in `src/filters/field-filters.ts`.
* **Documentation:** Improve the examples in `src/examples` or clarify the README.
* **New Transformers:** Add a `LowerCase` or `UpperCase` field transformer.
* **More target support** - While we have S3 and HTTP, we can add more "sinks" and "sources" support:
  * Cloud Storage: Google Cloud Storage (GCS) and Azure Blob Storage.
  * Message Queues: Kafka, RabbitMQ, or AWS SQS (great for "Streaming" mode).
  * NoSQL: MongoDB or Redis writers.
* **Config-driven ETL/Declarative Pipelines** - Instead of writing TypeScript code for every pipeline, we could allow users to define a pipeline in a YAML file.
```yaml
pipeline:
  read: { type: 'csv', path: 'users.csv' }
  transform:
    - { type: 'rename', mapping: { fname: 'firstName' } }
    - { type: 'filter', expression: 'age > 18' }
  write: { type: 'postgres', table: 'active_users' }
```
Run via `data-genie run pipeline.yaml` command.
* **Multi-file Glob Support** - Currently, CSVReader usually points to a single file.
  * Feature: Allow the source to be a glob pattern (e.g., input/data/*.csv). A CompositeReader could then iterate through all matching files and stream them as one continuous data
    source.
* Join & Enrichment Reader - ETL often requires "joining" two streams.
  * Feature: A LookupTransformer that can perform an in-memory join against a smaller reference dataset (e.g., "Join these transactions with this currency_codes.json file to add a
    symbol field").


## Development Setup
```bash
npm install
npm test
npm run build
```

---
*By contributing to this project, you agree to abide by its terms.*
