import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { TransformingReader } from '@/transformers/transforming-reader';
import { RenameField } from '@/transformers/field-transformers';
import { Job } from '@/core/job';

async function runExample() {
  console.log('\n--- Rename Duplicate Fields Example ---');
  let readerRename: any = new CSVReader('input/credit-balance-01.csv').setFieldNamesInFirstRow(true);

  readerRename = new TransformingReader(readerRename)
    .add(new RenameField('LastName', 'Name').transform())
    .add(new RenameField('FirstName', 'Name').setAllowDuplicateFieldNames(true).transform())
    .add(new RenameField('Balance', 'CreditLimit').setAllowDuplicateFieldNames(true).transform());

  await Job.run(readerRename, new JsonWriter('output/renamed-fields.json'));
  console.log('Renamed fields output written to output/renamed-fields.json');
}
runExample().catch(console.error);
