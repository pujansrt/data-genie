import { JsonWriter } from '@/writers/json-writer';
import { TransformingReader } from '@/transformers/transforming-reader';
import { SetCalculatedField } from '@/transformers/field-transformers';
import { Job } from '@/core/job';
import { JsonReader } from '@/readers/json-reader';

async function runExample() {
  let readerConditionalTransform: any = new JsonReader('input/simple-json-input.json');

  readerConditionalTransform = new TransformingReader(readerConditionalTransform)
    .setCondition((record) => record.balance < 0)
    .add(new SetCalculatedField('balance', '0.0').transform()); // Using SetCalculatedField for dynamic value

  await Job.run(readerConditionalTransform, new JsonWriter('output/conditional-transform.json'));
  console.log('Conditional transformation output written to output/conditional-transform.json');
}
runExample().catch(console.error);
