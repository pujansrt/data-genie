import { Job } from '@/core/job';
import { FixedWidthReader } from '@/readers/fixed-width-reader';
import { ConsoleWriter } from '@/writers/console-writer';

async function runExample() {
  let reader: any = new FixedWidthReader('input/credit-balance-01.fw');
  reader.setFieldWidths(8, 16, 16, 12, 14, 16, 7);
  reader.setFieldNamesInFirstRow(true);

  await Job.run(reader, new ConsoleWriter());
}
runExample().catch(console.error);
