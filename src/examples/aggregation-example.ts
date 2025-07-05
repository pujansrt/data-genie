import { BasicFieldTransformer, ConsoleWriter, CSVReader, GroupByReader, Job, TransformingReader } from '@/index';

async function runExample() {
  let reader: any = new CSVReader('input/example.csv').setFieldNamesInFirstRow(true);
  reader = new TransformingReader(reader).add(new BasicFieldTransformer('Balance', 'CreditLimit').stringToDouble());

  const groupByReader = new GroupByReader(reader, 'Rating')
    .count('AccountCount')
    .max('Balance', 'MaxBalance')
    .min('Balance', 'MinBalance')
    .avg('Balance', 'AvgBalance')
    .sum('Balance', 'SumBalance')
    .avg('CreditLimit', 'AvgCreditLimit');

  await Job.run(groupByReader, new ConsoleWriter());
  // await Job.run(groupByReader, new JsonWriter('output/aggregated-data.json'));
}
runExample().catch(console.error);
