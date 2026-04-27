import { 
  IsEmpty, 
  GreaterThan, 
  LessThan, 
  Between,
  ValueMatch,
  PatternMatch,
  IsNotNull,
  IsType,
  FieldFilter
} from '@/filters/field-filters';

describe('Field Filters', () => {
  it('should test FieldFilter class', () => {
    const filter = new FieldFilter('age').addRule(GreaterThan(18));
    const recordFilter = filter.createRecordFilter();
    expect(recordFilter({ age: 25 })).toBe(true);
    expect(recordFilter({ age: 15 })).toBe(false);
  });

  it('should test various filter rules', () => {
    expect(IsEmpty()('')).toBe(true);
    expect(IsEmpty()('a')).toBe(false);

    expect(GreaterThan(10)(15)).toBe(true);
    expect(GreaterThan(10)(5)).toBe(false);

    expect(LessThan(10)(5)).toBe(true);
    expect(LessThan(10)(15)).toBe(false);

    expect(Between(5, 10)(7)).toBe(true);
    expect(Between(5, 10)(12)).toBe(false);

    expect(ValueMatch('A', 'B')('A')).toBe(true);
    expect(ValueMatch('A', 'B')('C')).toBe(false);

    expect(PatternMatch('^a')('apple')).toBe(true);
    expect(PatternMatch('^a')('banana')).toBe(false);

    expect(IsNotNull()(null)).toBe(false);
    expect(IsNotNull()(0)).toBe(true);

    expect(IsType('number')(10)).toBe(true);
    expect(IsType('number')('10')).toBe(false);
  });
});
