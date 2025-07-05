import { DataRecord } from '@/core/interfaces';

export type FieldFilterRule = (value: any) => boolean;

export class FieldFilter {
  private fieldName: string;
  private rules: FieldFilterRule[] = [];

  constructor(fieldName: string) {
    this.fieldName = fieldName;
  }

  public addRule(rule: FieldFilterRule): this {
    this.rules.push(rule);
    return this;
  }

  public createRecordFilter(): (record: DataRecord) => boolean {
    return (record: DataRecord) => {
      const value = record[this.fieldName];
      for (const rule of this.rules) {
        if (!rule(value)) {
          return false;
        }
      }
      return true;
    };
  }
}

// Individual field rules
export const IsNotNull = (): FieldFilterRule => (value: any) => value !== null && value !== undefined;
export const IsType =
  (type: string): FieldFilterRule =>
  (value: any) =>
    typeof value === type;
export const ValueMatch =
  <T>(...allowedValues: T[]): FieldFilterRule =>
  (value: T) =>
    allowedValues.includes(value);
export const PatternMatch =
  (pattern: string): FieldFilterRule =>
  (value: string) =>
    new RegExp(pattern).test(value);
// Add other rules: GreaterThan, LessThan, Between, etc.
