import { ValidatingReader, FieldValidator } from '@/transformers/validating-reader';
import { 
  RemoveFields, 
  RenameField, 
  SetCalculatedField, 
  SetField, 
  SelectFields,
  BasicFieldTransformer
} from '@/transformers/field-transformers';
import { DataReader } from '@/core/interfaces';

describe('Transformers and Validation', () => {
  const createMockReader = (data: any[]) => ({
    read: async function* () {
      for (const r of data) yield r;
    }
  });

  it('should test BasicFieldTransformer methods', () => {
    const transformer = new BasicFieldTransformer('age', 'price', 'dob');
    
    // stringToDouble
    const toDouble = transformer.stringToDouble();
    expect(toDouble({ price: '10.5' }).price).toBe(10.5);

    // stringToInt
    const toInt = transformer.stringToInt();
    expect(toInt({ age: '30' }).age).toBe(30);

    // nullToValue
    const toValue = transformer.nullToValue(0);
    expect(toValue({ age: null }).age).toBe(0);

    // dateParse
    const toDate = transformer.dateParse('YYYY-MM-DD');
    const record = toDate({ dob: '2020-01-01' });
    expect(record.dob).toBeInstanceOf(Date);
    
    // invalid date
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    toDate({ dob: 'invalid' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should validate fields correctly', async () => {
    const reader = createMockReader([{ age: 25 }, { age: 15 }]);
    const validator = new FieldValidator('age')
      .addRule((val) => val >= 18, 'Must be an adult');
    
    const validatingReader = new ValidatingReader(reader)
      .add(validator.createRecordValidationRule());

    const results = [];
    for await (const r of validatingReader.read()) {
      results.push(r);
    }
    
    expect(results).toHaveLength(2);
    expect(validatingReader.getMessages()).toHaveLength(1);
    expect(validatingReader.getMessages()[0].message).toBe('Must be an adult');
  });

  it('should apply field transformations', async () => {
    const data = [{ fname: 'John', lname: 'Doe', age: '30' }];
    let reader: DataReader = createMockReader(data);

    // Test SelectFields
    const select = new SelectFields('fname', 'age').transform();
    let record = select(data[0]);
    expect(record).toHaveProperty('fname');
    expect(record).not.toHaveProperty('lname');

    // Test RenameField
    const renameField = new RenameField('fname', 'firstName');
    expect(renameField.setAllowDuplicateFieldNames(true)).toBe(renameField);
    const rename = renameField.transform();
    record = rename(record);
    expect(record.firstName).toBe('John');

    // Test SetField
    const setF = new SetField('status', 'active').transform();
    record = setF(record);
    expect(record.status).toBe('active');

    // Test SetCalculatedField
    const calc = new SetCalculatedField('isSenior', 'record.age >= 65').transform();
    record = calc(record);
    expect(record.isSenior).toBe(false);

    // Test RemoveFields
    const remove = new RemoveFields('age').transform();
    record = remove(record);
    expect(record).not.toHaveProperty('age');
  });
});
