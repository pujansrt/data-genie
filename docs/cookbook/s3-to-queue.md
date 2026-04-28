# Pushing S3 Events to RabbitMQ

Cloud storage (AWS S3) often acts as a landing zone for raw data. You may want to notify other services via a message broker (RabbitMQ/Kafka) as soon as new data is processed.

## The Strategy

We combine `S3Source` with `ParquetReader` (or any other reader) and use `CallbackWriter` to push each record to the queue.

## Implementation

```typescript
import { S3Source, ParquetReader, CallbackWriter, Job } from '@pujansrt/data-genie';
import { S3Client } from '@aws-sdk/client-s3';
import amqp from 'amqplib';

const s3Client = new S3Client({ region: 'us-east-1' });

async function run() {
  const conn = await amqp.connect('amqp://localhost');
  const channel = await conn.createChannel();
  const queue = 'user-imports';

  await channel.assertQueue(queue);

  const source = new S3Source(s3Client, 'my-bucket', 'exports/users.parquet');
  const reader = new ParquetReader(source);

  const writer = new CallbackWriter(async (record) => {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(record)));
  });

  await Job.run(reader, writer);
  
  await channel.close();
  await conn.close();
}

run().catch(console.error);
```

## Batching Alternative
If you prefer to send messages in batches for better throughput, use `BatchCallbackWriter`:

```typescript
const writer = new BatchCallbackWriter(50, async (batch) => {
  // batch is an array of 50 records
  batch.forEach(record => {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(record)));
  });
});
```
