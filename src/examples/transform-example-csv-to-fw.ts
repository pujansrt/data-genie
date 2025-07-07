import { CSVReader } from '@/readers/csv-reader';
import { TransformingReader } from '@/transformers/transforming-reader';
import { RemoveFields, SetCalculatedField } from '@/transformers/field-transformers';
import { Job } from '@/core/job';
import { RemoveDuplicatesReader } from '@/transformers/remove-duplicates-reader';
import { FixedWidthWriter } from '@/writers/fixed-width-writer';

async function runExample() {
  let reader: any = new CSVReader('input/credit-balance-01.csv').setFieldNamesInFirstRow(true);
  reader = new RemoveDuplicatesReader(reader, 'Rating', 'CreditLimit');
  reader = new TransformingReader(reader)
    .add(new SetCalculatedField('AvailableCredit', 'parseFloat(record.CreditLimit) - parseFloat(record.Balance)').transform())
    .add(new RemoveFields('CreditLimit', 'Balance').transform());

  const fwWriter = new FixedWidthWriter('output/ex-simulated.fw').setFieldNamesInFirstRow(true).setFieldWidths(10, 15, 10, 15);

  await Job.run(reader, fwWriter);
}

runExample().catch(console.error);
