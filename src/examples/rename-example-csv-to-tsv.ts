import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { TransformingReader } from '@/transformers/transforming-reader';
import { RenameField } from '@/transformers/field-transformers';
import { Job } from '@/core/job';
import { TSVWriter } from '@/writers/tsv-writer';

async function runExample() {
  let reader: any = new CSVReader('input/credit-balance-01.csv').setFieldNamesInFirstRow(true);

  await Job.run(reader, new TSVWriter('output/renamed-fields.tsv').setFieldNamesInFirstRow(true));
}
runExample().catch(console.error);
