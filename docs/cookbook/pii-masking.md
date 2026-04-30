# PII Masking & Data Anonymization

This recipe demonstrates how to protect sensitive user data (Emails, Credit Cards, SSNs) while streaming it from a source to a destination. This is essential for GDPR/CCPA compliance.

## The Scenario
You have a CSV file containing user data, and you want to move it to a JSON analytics file while ensuring that:
1. Emails are partially hidden.
2. Sensitive IDs are hashed.
3. Internal notes are redacted.

## The Code

```typescript
import { 
  CSVReader, 
  JsonWriter, 
  TransformingReader, 
  PIIMaskingTransformer, 
  Job 
} from '@pujansrt/data-genie';

const reader = new CSVReader('users_raw.csv');

// Initialize the Masking Transformer
const masker = new PIIMaskingTransformer()
  .mask('email', 'partial')    // Output: p****@example.com
  .mask('ssn', 'hash')         // Output: SHA256 Hash
  .mask('internal_notes', 'redact') // Output: [REDACTED]
  .mask('api_key', 'null');    // Output: null

const pipeline = new TransformingReader(reader)
  .add(masker.transform());

const writer = new JsonWriter('users_anonymized.json');

(async () => {
  await Job.run(pipeline, writer);
  console.log('Anonymization complete!');
})();
```

## Why use this?
- **Zero Raw Data Persistence**: Sensitive data is transformed in-memory during the stream. It never hits the destination disk in its raw form.
- **Constant Memory**: Like all Data-Genie tools, this works on O(1) memory, allowing you to anonymize multi-gigabyte files.
- **Native Performance**: Uses Node.js native \`crypto\` module for high-speed hashing.
