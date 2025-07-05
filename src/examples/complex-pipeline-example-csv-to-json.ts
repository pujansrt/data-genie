import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { TransformingReader } from '@/transformers/transforming-reader';
import { RenameField, SelectFields } from '@/transformers/field-transformers';
import { FilteringReader } from '@/filters/filtering-reader';
import { FieldFilter, PatternMatch } from '@/filters/field-filters';
import { Job } from '@/core/job';

async function runExample() {
  console.log('\n--- Complex Pipeline Example (CSV to Fixed-Width - Conceptual) ---');
  let readerComplex: any = new CSVReader('input/users.csv').setFieldSeparator(',').setFieldNamesInFirstRow(true);

  readerComplex = new FilteringReader(readerComplex).add(new FieldFilter('email').addRule(PatternMatch('.*\\.com')).createRecordFilter());

  readerComplex = new TransformingReader(readerComplex).add(new SelectFields('email', 'fname', 'lname').transform());

  readerComplex = new TransformingReader(readerComplex)
    .add(new RenameField('fname', 'first_name').transform())
    .add(new RenameField('lname', 'last_name').transform());

  await Job.run(readerComplex, new JsonWriter('output/complex-pipeline.json'));
  console.log('Complex pipeline output written to output/complex-pipeline.json');
}

runExample().catch(console.error);
