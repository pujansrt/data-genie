import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { IsNotNull, IsType, PatternMatch, ValueMatch } from '@/filters/field-filters';
import { FilterExpression } from '@/filters/filter-expressions';
import { Job } from '@/core/job';
import { ValidatingReader } from '@/transformers/validating-reader';

async function runExample() {
  // --- Validate Incoming Data Example ---
  console.log('\n--- Validate Incoming Data Example ---');
  let readerValidate = new CSVReader('input/credit-balance-01.csv').setFieldNamesInFirstRow(true);

  const validatingReader = new ValidatingReader(readerValidate)
    .setExceptionOnFailure(false)
    // .setRecordStackTraceInMessage(false) // Not fully implemented in TS example for brevity
    .add((record, messages) => {
      let isValid = true;
      if (!IsNotNull()(record.Rating)) {
        messages.push({ record, field: 'Rating', message: 'Rating cannot be null.' });
        isValid = false;
      }
      if (!IsType('string')(record.Rating)) {
        messages.push({ record, field: 'Rating', message: 'Rating must be a string.' });
        isValid = false;
      }
      if (!ValueMatch('A', 'B', 'C')(record.Rating)) {
        // Note: 'Z' would fail here as in your Java example
        messages.push({ record, field: 'Rating', message: 'Rating must be A, B, or C.' });
        isValid = false;
      }
      return isValid;
    })
    .add((record, messages) => {
      let isValid = true;
      if (!IsNotNull()(record.Account)) {
        messages.push({ record, field: 'Account', message: 'Account cannot be null.' });
        isValid = false;
      }
      if (!IsType('string')(record.Account)) {
        messages.push({ record, field: 'Account', message: 'Account must be a string.' });
        isValid = false;
      }
      if (!PatternMatch('[0-9]*')(record.Account)) {
        messages.push({ record, field: 'Account', message: 'Account must contain only digits.' });
        isValid = false;
      }
      return isValid;
    })
    .add(
      new FilterExpression(
        'record.CreditLimit !== undefined && record.Balance !== undefined && parseFloat(record.CreditLimit) >= 0 && parseFloat(record.CreditLimit) <= 100000 && parseFloat(record.Balance) <= parseFloat(record.CreditLimit)'
      ).createRecordFilter()
    );

  await Job.run(validatingReader, new JsonWriter('output/validated-data.json'));
  console.log('Validation messages:', validatingReader.getMessages());
  console.log('Validated data output written to output/validated-data.json');
}
runExample().catch(console.error);
