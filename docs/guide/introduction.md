# What is Data-Genie?

Data-Genie is a high-performant, streaming-first **ETL (Extract, Transform, Load) Engine** written in **TypeScript**.

It is designed for modern developers who need to process massive datasets (gigabytes or terabytes) without worrying about "Out of Memory" (OOM) errors. By using Node.js streams and async iterators, Data-Genie ensures your application maintains a **constant memory footprint**, regardless of whether you are processing 100 rows or 100 million rows.

## Why Data-Genie?

Traditional JavaScript methods like `fs.readFileSync` or `array.map` load the entire dataset into memory. This works for small files but fails catastrophically as your data grows.

| Feature | Data-Genie | Traditional Approach |
| :--- | :--- | :--- |
| **Memory Usage** | Constant (e.g., ~15MB) | Linear (proportional to file size) |
| **Latency** | Starts writing immediately | Waits for full read/parse |
| **Scalability** | Unlimited | Limited by available RAM |

## Key Features

- **Streaming First**: O(1) memory complexity for all operations.
- **Multi-Format**: CSV, TSV, JSON, NDJSON, Parquet, Excel, SQL.
- **Transport Agnostic**: Local FS, S3, HTTP, Memory.
- **Type Safe**: Built with TypeScript and supports Zod for schema validation.
- **Fault Tolerant**: Built-in retries and Dead Letter Queue (DLQ) support.
