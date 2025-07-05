import { DataReader, DataRecord } from '@/core/interfaces';
import { DataTransformer } from '@/transformers/transformers';

interface AggregationOperation {
  type: 'count' | 'sum' | 'min' | 'max' | 'avg';
  sourceField?: string;
  outputField: string;
}

export class GroupByReader extends DataTransformer {
  private groupByField: string;
  private aggregations: AggregationOperation[] = [];

  constructor(reader: DataReader, groupByField: string) {
    super(reader);
    this.groupByField = groupByField;
  }

  public count(outputField: string): this {
    this.aggregations.push({ type: 'count', outputField });
    return this;
  }

  public sum(sourceField: string, outputField: string): this {
    this.aggregations.push({ type: 'sum', sourceField, outputField });
    return this;
  }

  public max(sourceField: string, outputField: string): this {
    this.aggregations.push({ type: 'max', sourceField, outputField });
    return this;
  }

  public min(sourceField: string, outputField: string): this {
    this.aggregations.push({ type: 'min', sourceField, outputField });
    return this;
  }

  public avg(sourceField: string, outputField: string): this {
    this.aggregations.push({ type: 'avg', sourceField, outputField });
    return this;
  }

  public async *read(): AsyncIterableIterator<DataRecord> {
    const groupedData: Map<any, { records: DataRecord[]; aggregates: DataRecord }> = new Map();

    for await (const record of this.reader.read()) {
      const keyValue = record[this.groupByField];
      if (!groupedData.has(keyValue)) {
        groupedData.set(keyValue, { records: [], aggregates: { [this.groupByField]: keyValue } });
      }
      groupedData.get(keyValue)!.records.push(record);
    }

    for (const [key, { records, aggregates }] of groupedData.entries()) {
      for (const agg of this.aggregations) {
        switch (agg.type) {
          case 'count':
            aggregates[agg.outputField] = records.length;
            break;
          case 'sum':
            aggregates[agg.outputField] = records.reduce((sum, r) => sum + (parseFloat(r[agg.sourceField!]) || 0), 0);
            break;
          case 'max':
            aggregates[agg.outputField] = Math.max(...records.map((r) => parseFloat(r[agg.sourceField!]) || 0));
            break;
          case 'min':
            aggregates[agg.outputField] = Math.min(...records.map((r) => parseFloat(r[agg.sourceField!]) || 0));
            break;
          case 'avg':
            const sum = records.reduce((s, r) => s + (parseFloat(r[agg.sourceField!]) || 0), 0);
            aggregates[agg.outputField] = records.length > 0 ? sum / records.length : 0;
            break;
        }
      }
      yield aggregates;
    }
  }
}
