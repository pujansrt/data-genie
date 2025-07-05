import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { TransformingReader } from '@/transformers/transforming-reader';
import { BasicFieldTransformer } from '@/transformers/field-transformers';
import { Job } from '@/core/job';
import { GroupByReader } from '../src';

// Mock the modules
jest.mock('@/readers/csv-reader');
jest.mock('@/writers/json-writer');

describe('Aggregation Example', () => {
  let output: any[];

  beforeEach(() => {
    output = [];
    (CSVReader as jest.Mock).mockClear();
    (JsonWriter as jest.Mock).mockClear();
  });

  it('should aggregate data and write output', async () => {
    const mockData = [
      { Rating: 'A', Balance: '100', CreditLimit: '200' },
      { Rating: 'A', Balance: '200', CreditLimit: '300' },
      { Rating: 'B', Balance: '150', CreditLimit: '250' }
    ];

    // Mock CSVReader implementation
    (CSVReader as jest.Mock).mockImplementation(() => {
      const instance = {
        setFieldNamesInFirstRow: jest.fn().mockReturnThis(), // Mock fluent API
        read: async function* () {
          for (const row of mockData) {
            yield row;
          }
        }
      };
      return instance;
    });

    // Mock JsonWriter implementation
    (JsonWriter as jest.Mock).mockImplementation(() => {
      const instance = {
        write: async (record: any) => {
          output.push(record);
        },
        close: async () => {}
      };
      return instance;
    });

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

    expect(output).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Rating: 'A',
          AccountCount: 2,
          MaxBalance: 200,
          MinBalance: 100,
          AvgBalance: 150,
          SumBalance: 300,
          AvgCreditLimit: 250
        }),
        expect.objectContaining({
          Rating: 'B',
          AccountCount: 1,
          MaxBalance: 150,
          MinBalance: 150,
          AvgBalance: 150,
          SumBalance: 150,
          AvgCreditLimit: 250
        })
      ])
    );
  });
});
