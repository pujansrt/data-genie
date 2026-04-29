# Building a Real-time Dashboard

Because the `Job` class is an `EventEmitter`, it's incredibly easy to build a real-time monitoring UI for your ETL pipelines.

## The Architecture

1.  **Backend (Node.js)**: Runs the `Job` and listens for `progress` events.
2.  **Communication**: Use **Server-Sent Events (SSE)** or **WebSockets** to push updates to the browser.
3.  **Frontend (React/Vue/Vanilla)**: Receives the events and updates a progress bar or dashboard.

## Backend Example (Express + SSE)

Server-Sent Events (SSE) are perfect for ETL progress because they are lightweight and built directly into the browser.

```typescript
import express from 'express';
import { Job, CSVReader, SQLWriter } from '@pujansrt/data-genie';

const app = express();

app.get('/stream-job', (req, res) => {
  // 1. Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = new CSVReader('massive_data.csv');
  const writer = new SQLWriter(db, 'users');
  const job = new Job(reader, writer);

  // 2. Listen for events and push to response
  job.on('progress', (metrics) => {
    res.write(`data: ${JSON.stringify({ type: 'PROGRESS', ...metrics })}\n\n`);
  });

  job.on('error', (err, record) => {
    res.write(`data: ${JSON.stringify({ type: 'ERROR', message: err.message, record })}\n\n`);
  });

  job.on('complete', (metrics) => {
    res.write(`data: ${JSON.stringify({ type: 'COMPLETE', ...metrics })}\n\n`);
    res.end();
  });

  // 3. Run the job
  job.run().catch(err => {
    res.write(`data: ${JSON.stringify({ type: 'FATAL', message: err.message })}\n\n`);
    res.end();
  });
});
```

## Frontend Example (React)

```tsx
import React, { useState, useEffect } from 'react';

export function EtlDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [status, setStatus] = useState('IDLE');

  const startJob = () => {
    setStatus('RUNNING');
    const eventSource = new EventSource('/stream-job');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'PROGRESS') {
        setMetrics(data);
      } else if (data.type === 'COMPLETE') {
        setStatus('FINISHED');
        eventSource.close();
      } else if (data.type === 'ERROR' || data.type === 'FATAL') {
        setStatus('FAILED');
        eventSource.close();
      }
    };
  };

  return (
    <div>
      <h1>ETL Monitor</h1>
      <button onClick={startJob} disabled={status === 'RUNNING'}>
        Start Massive Import
      </button>

      {metrics && (
        <div style={{ marginTop: 20 }}>
          <p>Status: <strong>{status}</strong></p>
          <p>Records Processed: {metrics.recordCount.toLocaleString()}</p>
          <p>Throughput: {metrics.recordsPerSecond.toFixed(0)} rec/sec</p>
          <div style={{ width: '100%', background: '#eee', height: 20 }}>
            {/* If you know total records, you can show a % bar */}
            <div style={{ 
              width: `${(metrics.recordCount / 1000000) * 100}%`, 
              background: '#4CAF50', 
              height: '100%' 
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
```

## Why this is powerful

- **No Polling**: Your frontend doesn't need to keep asking "Is it done yet?". The server pushes updates as soon as they happen.
- **Low Overload**: Emitting events is extremely cheap. You can process millions of records while the UI stays smooth.
- **Immediate Feedback**: Users can see if a job is stuck or failing immediately, rather than waiting an hour for a batch job to time out.
