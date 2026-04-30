import { MemoryReader, Job } from '../index';

/**
 * This example demonstrates the "Holy Grail" feature: Automated Schema Inference.
 * It samples a data source and generates TypeScript, Zod, and SQL code automatically.
 */
async function runExample() {
  const sampleData = [
    {
      id: 101,
      username: 'pujansrt',
      is_active: true,
      last_login: new Date('2024-04-28T10:00:00Z'),
      metadata: { theme: 'dark', notifications: true },
      score: 95.5
    },
    {
      id: 102,
      username: 'jdoe',
      is_active: false,
      last_login: null, // Nullable field
      metadata: null,   // Nullable object
      score: 88.0
    },
    {
      id: 103,
      username: null,   // Nullable string
      is_active: true,
      last_login: new Date('2024-04-29T12:30:00Z'),
      metadata: { theme: 'light' },
      score: null       // Nullable number
    }
  ];

  const reader = new MemoryReader(sampleData);

  console.log('🔮 Inferring schema from data sample...\n');

  const schema = await Job.inferSchema(reader, {
    tableName: 'users_analytics',
    interfaceName: 'UserProfile'
  });

  console.log('--- 1. TypeScript Interface ---');
  console.log(schema.typescript);
  console.log('\n');

  console.log('--- 2. Zod Schema (Validation) ---');
  console.log(schema.zod);
  console.log('\n');

  console.log('--- 3. SQL Create Table (PostgreSQL/Standard) ---');
  console.log(schema.sql);
  console.log('\n');
}

runExample().catch(console.error);
