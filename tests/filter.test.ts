import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { FilteringReader } from '@/filters/filtering-reader';
import { FieldFilter, IsNotNull, IsType, PatternMatch, ValueMatch } from '@/filters/field-filters';
import { FilterExpression } from '@/filters/filter-expressions';
import { Job } from '@/core/job';

// Mock the modules
jest.mock('@/readers/csv-reader');
jest.mock('@/writers/json-writer');

describe('Filter Records Example Pipeline', () => {
  let capturedOutput: any[];
  async function runFilterExamplePipeline() {
    let readerFilter = new CSVReader('input/example.csv').setFieldNamesInFirstRow(true);

    const filteringReader = new FilteringReader(readerFilter)
      .add(new FieldFilter('Rating').addRule(IsNotNull()).addRule(IsType('string')).addRule(ValueMatch('B', 'C')).createRecordFilter())
      .add(new FieldFilter('Account').addRule(IsNotNull()).addRule(IsType('string')).addRule(PatternMatch('^[0-9]*$')).createRecordFilter())
      .add(
        new FilterExpression(
          'record.CreditLimit !== undefined && record.Balance !== undefined && parseFloat(record.CreditLimit) >= 0 && parseFloat(record.CreditLimit) <= 5000 && parseFloat(record.Balance) <= parseFloat(record.CreditLimit)'
        ).createRecordFilter()
      );

    await Job.run(filteringReader, new JsonWriter('output/filtered-data.json'));
  }

  beforeEach(() => {
    capturedOutput = [];

    // Mock CSVReader: make it return a specific set of mock data
    (CSVReader as jest.Mock).mockImplementation(() => {
      const instance = {
        setFieldNamesInFirstRow: jest.fn().mockReturnThis(),
        read: async function* () {
          const mockInputData = [
            // --- Records that SHOULD PASS all filters ---
            { Account: '1002', Name: 'Jane Smith', CreditLimit: '4000', Balance: '3000', Rating: 'B' },
            { Account: '1003', Name: 'Peter Jones', CreditLimit: '3000', Balance: '1000', Rating: 'C' },
            { Account: '0050', Name: 'Bob White', CreditLimit: '2000', Balance: '1500', Rating: 'B' }, // Account starting with 0
            { Account: '', Name: 'Empty Account', CreditLimit: '1000', Balance: '500', Rating: 'C' }, // Empty account (matches [0-9]*)

            // --- Records that should FAIL due to 'Rating' filter ---
            { Account: '1001', Name: 'John Doe', CreditLimit: '5000', Balance: '1200', Rating: 'A' }, // Rating 'A'
            { Account: '1006', Name: 'Sarah Con.', CreditLimit: '1000', Balance: '500', Rating: 'D' }, // Rating 'D'
            { Account: '1007', Name: 'No Rating', CreditLimit: '1000', Balance: '500', Rating: null }, // Rating null
            { Account: '1007', Name: 'Undefined Rating', CreditLimit: '1000', Balance: '500', Rating: undefined }, // Rating undefined
            { Account: '1007', Name: 'Non-string Rating', CreditLimit: '1000', Balance: '500', Rating: 123 }, // Rating not string

            // --- Records that should FAIL due to 'Account' filter ---
            { Account: 'ABC', Name: 'Alpha Num', CreditLimit: '2000', Balance: '1000', Rating: 'B' }, // Account not digits
            { Account: '100-2', Name: 'Hyphen Account', CreditLimit: '2000', Balance: '1000', Rating: 'C' }, // Account not pure digits

            // --- Records that should FAIL due to 'FilterExpression' ---
            { Account: '1008', Name: 'High Credit', CreditLimit: '6000', Balance: '1000', Rating: 'B' }, // CreditLimit > 5000
            { Account: '1009', Name: 'Over Limit', CreditLimit: '2000', Balance: '2500', Rating: 'C' }, // Balance > CreditLimit
            { Account: '1010', Name: 'Negative Credit', CreditLimit: '-100', Balance: '50', Rating: 'B' }, // CreditLimit < 0
            { Account: '1011', Name: 'Missing Balance', CreditLimit: '2000', Rating: 'B' }, // Missing Balance
            { Account: '1012', Name: 'Missing Credit', Balance: '500', Rating: 'C' }, // Missing CreditLimit
            { Account: '1013', Name: 'Non-numeric Credit', CreditLimit: 'abc', Balance: '500', Rating: 'B' }, // Non-numeric CreditLimit (parseFloat will be NaN)
            { Account: '1014', Name: 'Non-numeric Balance', CreditLimit: '2000', Balance: 'xyz', Rating: 'C' } // Non-numeric Balance (parseFloat will be NaN)
          ];

          for (const row of mockInputData) {
            yield row;
          }
        }
      };
      return instance;
    });

    // Mock JsonWriter: capture all records written
    (JsonWriter as jest.Mock).mockImplementation(() => {
      const instance = {
        write: async (record: any) => {
          capturedOutput.push(record);
        },
        close: async () => {}
      };
      return instance;
    });
  });

  it('should correctly filter records based on multiple criteria', async () => {
    const expectedFilteredOutput = [
      { Account: '1002', Name: 'Jane Smith', CreditLimit: '4000', Balance: '3000', Rating: 'B' },
      { Account: '1003', Name: 'Peter Jones', CreditLimit: '3000', Balance: '1000', Rating: 'C' },
      { Account: '0050', Name: 'Bob White', CreditLimit: '2000', Balance: '1500', Rating: 'B' },
      { Account: '', Name: 'Empty Account', CreditLimit: '1000', Balance: '500', Rating: 'C' }
    ];
    await runFilterExamplePipeline();
    expect(capturedOutput).toEqual(expect.arrayContaining(expectedFilteredOutput));
    expect(capturedOutput.length).toBe(expectedFilteredOutput.length); // Ensure no extra records were included
  });
});
