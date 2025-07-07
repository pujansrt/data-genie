import { Job } from '@/core/job';
import { NDJsonReader } from '@/readers/nd-json-reader';
import { ConsoleWriter } from '@/writers/console-writer';
import { JsonWriter } from '@/writers/json-writer';

async function runExample() {
  let reader: any = new NDJsonReader('input/simple-json-input.ndjson');

  await Job.run(reader, new JsonWriter('output/ndjson-to-json-output.json'));
}
runExample().catch(console.error);
