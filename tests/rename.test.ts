import { CSVReader } from '@/readers/csv-reader';
import { JsonWriter } from '@/writers/json-writer';
import { TransformingReader } from '@/transformers/transforming-reader';
import { RenameField } from '@/transformers/field-transformers';
import { Job } from '@/core/job';

jest.mock('@/readers/csv-reader');
jest.mock('@/writers/json-writer');

describe('Rename Duplicate Fields Example Pipeline', () => {
  let capturedOutput: any[];

  async function runRenameExamplePipeline() {
    let reader: any = new CSVReader('input/credit-balance-01.csv').setFieldNamesInFirstRow(true);

    reader = new TransformingReader(reader)
      .add(new RenameField('LastName', 'Name').transform())
      .add(new RenameField('FirstName', 'Name').setAllowDuplicateFieldNames(true).transform())
      .add(new RenameField('Balance', 'CreditLimit').setAllowDuplicateFieldNames(true).transform());

    await Job.run(reader, new JsonWriter('output/renamed-fields.json'));
  }

  beforeEach(() => {
    capturedOutput = [];

    (CSVReader as jest.Mock).mockImplementation(() => {

      return {
        setFieldNamesInFirstRow: jest.fn().mockReturnThis(),
        read: async function* () {
          const mockInputData = [
            {
              Account: '1001',
              Name: 'Existing John', // This will trigger the warning for 'LastName' rename
              FirstName: 'John',
              LastName: 'Doe',
              Balance: '1200.00',
              CreditLimit: '5000.00',
              Rating: 'A'
            },
            {
              Account: '1002',
              Name: 'Existing Jane',
              FirstName: 'Jane',
              LastName: 'Smith',
              Balance: '6000.00',
              CreditLimit: '7500.00',
              Rating: 'B'
            }
          ];
          for (const row of mockInputData) {
            yield row;
          }
        }
      };
    });

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

  it('should correctly rename fields including handling duplicates as specified', async () => {
    const expectedOutput = [
      {
        Account: '1001',
        Name: 'John',
        CreditLimit: '1200.00',
        Rating: 'A'
      },
      {
        Account: '1002',
        Name: 'Jane',
        CreditLimit: '6000.00',
        Rating: 'B'
      }
    ];

    await runRenameExamplePipeline();
    expect(capturedOutput).toEqual(expectedOutput);
    expect(capturedOutput.length).toBe(expectedOutput.length);
  });

  it('should log a warning when `allowDuplicateFieldNames` is false and target field exists', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await runRenameExamplePipeline();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Warning: Field "Name" already exists. Renaming "LastName" to "Name" will overwrite existing data. Set \'allowDuplicateFieldNames(true)\' to suppress this warning.'
      )
    );
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    consoleWarnSpy.mockRestore();
  });
});
