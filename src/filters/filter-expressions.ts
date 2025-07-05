import { DataRecord } from '@/core/interfaces';

export class FilterExpression {
  private expression: string;

  constructor(expression: string) {
    this.expression = expression;
  }

  public createRecordFilter(): (record: DataRecord) => boolean {
    return (record: DataRecord) => {
      try {
        return new Function('record', `with(record) { return ${this.expression} }`)(record);
      } catch (e) {
        console.error(`Error evaluating filter expression: ${e}`, record);
        return false; // Fail-safe
      }
    };
  }
}
