import { 
  CSVReader, 
  JsonWriter, 
  TransformingReader, 
  MapFields, 
  Job 
} from '@/index';
import * as path from 'path';

async function runFullNameExample() {
  const inputPath = path.join(__dirname, 'input', 'users.csv');
  const outputPath = path.join(__dirname, 'output', 'users_transformed.json');

  const reader = new CSVReader(inputPath).setFieldNamesInFirstRow(true);

  const pipeline = new TransformingReader(reader)
    .add(new MapFields('fullName', ['fname', 'lname'], (fn, ln) => {
      return `${fn} ${ln}`;
    }).transform());

  const writer = new JsonWriter(outputPath);
  const metrics = await Job.run(pipeline, writer);
  console.log(`Success! Transformed ${metrics.recordCount} records.`);
}

runFullNameExample().catch(console.error);
