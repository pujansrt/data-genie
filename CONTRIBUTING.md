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
* Error Resilience & DLQ - In ETL, one bad record should usually not crash a 1-million-record job.
    * Error Policies: Allow users to set a policy: `STOP_ON_ERROR`, `LOG_AND_CONTINUE`, or `REDIRECT_TO_DLQ`.
    * DLQ Support: Automatically send records that fail validation or transformation to a separate DataSink (e.g., a failed_records.json file) so they can be fixed and re-processed
      later.
* **Multi-file Glob Support** - Currently, CSVReader usually points to a single file.
  * Feature: Allow the source to be a glob pattern (e.g., input/data/*.csv). A CompositeReader could then iterate through all matching files and stream them as one continuous data
    source.
* **Auto-Schema Inference & DDL Generator** - One of the most tedious parts of ETL is manually creating Zod schemas or SQL tables.
  * Feature: A utility function inferSchema(reader) that samples the first 100-1000 records and generates:
    * A suggested Zod schema.
    * A SQL `CREATE TABLE` script with the correct data types. 
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
