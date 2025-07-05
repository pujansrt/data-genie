import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { TransformingReader } from '@/transformers/transforming-reader';
import { BasicFieldTransformer } from '@/transformers/field-transformers';
import { GroupByReader } from '@/aggregators/group-by-reader';
import { Job } from '@/core/job';

async function runExample() {
  let readerAgg: any = new CSVReader('input/example.csv').setFieldNamesInFirstRow(true);
  readerAgg = new TransformingReader(readerAgg).add(new BasicFieldTransformer('Balance', 'CreditLimit').stringToDouble());

  const groupByReader = new GroupByReader(readerAgg, 'Rating')
    .count('AccountCount')
    .max('Balance', 'MaxBalance')
    .min('Balance', 'MinBalance')
    .avg('Balance', 'AvgBalance')
    .sum('Balance', 'SumBalance')
    .avg('CreditLimit', 'AvgCreditLimit');

  await Job.run(groupByReader, new JsonWriter('output/aggregated-data.json'));
  console.log('Aggregation output written to output/aggregated-data.json');
}

runExample().catch(console.error);
