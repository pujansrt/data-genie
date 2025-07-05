import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { FilteringReader } from '@/filters/filtering-reader';
import { FieldFilter, IsNotNull, IsType, PatternMatch, ValueMatch } from '@/filters/field-filters';
import { FilterExpression } from '@/filters/filter-expressions';
import { Job } from '@/core/job';

async function runExample() {
  // --- Filter Records Example ---
  console.log('\n--- Filter Records Example ---');
  let readerFilter = new CSVReader('input/example.csv').setFieldNamesInFirstRow(true);

  const filteringReader = new FilteringReader(readerFilter)
    .add(new FieldFilter('Rating').addRule(IsNotNull()).addRule(IsType('string')).addRule(ValueMatch('B', 'C')).createRecordFilter())
    .add(new FieldFilter('Account').addRule(IsNotNull()).addRule(IsType('string')).addRule(PatternMatch('[0-9]*')).createRecordFilter())
    .add(
      new FilterExpression(
        'record.CreditLimit !== undefined && record.Balance !== undefined && parseFloat(record.CreditLimit) >= 0 && parseFloat(record.CreditLimit) <= 5000 && parseFloat(record.Balance) <= parseFloat(record.CreditLimit)'
      ).createRecordFilter()
    );

  await Job.run(filteringReader, new JsonWriter('output/filtered-data.json'));
  console.log('Filtered records written to output/filtered-data.json');
}

runExample().catch(console.error);
