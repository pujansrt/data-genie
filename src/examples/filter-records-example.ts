import { CSVReader } from '@/readers/csv-reader';
import { ConsoleWriter } from '@/writers/console-writer';
import { FilteringReader } from '@/filters/filtering-reader';
import { FieldFilter, IsNotNull, IsType, PatternMatch, ValueMatch } from '@/filters/field-filters';
import { FilterExpression } from '@/filters/filter-expressions';
import { Job } from '@/core/job';

async function runExample() {
  // 1. Initialize Reader
  let reader = new CSVReader('input/credit-balance-02.csv').setFieldNamesInFirstRow(true);

  // 2. Create FilteringReader and Add Rules
  const filteringReader = new FilteringReader(reader);

  // FieldFilter for 'Rating'
  filteringReader.add(
    new FieldFilter('Rating')
      .addRule(IsNotNull())
      .addRule(IsType('string')) // Equivalent to IsJavaType(String.class)
      .addRule(ValueMatch('B', 'C')) // Matches 'B' or 'C'
      .createRecordFilter() // Don't forget to create the record filter function
  );

  // FieldFilter for 'Account'
  filteringReader.add(
    new FieldFilter('Account')
      .addRule(IsNotNull())
      .addRule(IsType('string')) // Equivalent to IsJavaType(String.class)
      .addRule(PatternMatch('^[0-9]*$')) // Equivalent to PatternMatch("[0-9]*") (using ^$ for strict matching)
      .createRecordFilter()
  );

  // FilterExpression
  // Note: parseFloat() for numeric conversion, 'record.' prefix for field access
  filteringReader.add(
    new FilterExpression(
      'record.CreditLimit !== undefined && record.Balance !== undefined && ' +
        'parseFloat(record.CreditLimit) >= 0 && parseFloat(record.CreditLimit) <= 5000 && ' +
        'parseFloat(record.Balance) <= parseFloat(record.CreditLimit)'
    ).createRecordFilter()
  );

  // 3. Initialize Writer (to console)
  const writer = new ConsoleWriter();

  // 4. Run the Job
  await Job.run(filteringReader, writer);

  console.log('--- Filter Records Example Finished ---');
}

// Execute the example
runExample().catch(console.error);
