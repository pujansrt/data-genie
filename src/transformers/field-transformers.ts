import { DataRecord } from '@/core/interfaces';
import { RecordTransformation } from '@/transformers/transforming-reader';

export class BasicFieldTransformer {
  private fieldNames: string[];

  constructor(...fieldNames: string[]) {
    this.fieldNames = fieldNames;
  }

  public stringToDouble(): RecordTransformation {
    return (record: DataRecord) => {
      this.fieldNames.forEach((fieldName) => {
        if (typeof record[fieldName] === 'string') {
          record[fieldName] = parseFloat(record[fieldName]);
        }
      });
      return record;
    };
  }

  public nullToValue(defaultValue: any): RecordTransformation {
    return (record: DataRecord) => {
      this.fieldNames.forEach((fieldName) => {
        if (record[fieldName] === null || record[fieldName] === undefined) {
          record[fieldName] = defaultValue;
        }
      });
      return record;
    };
  }

  public stringToInt(): RecordTransformation {
    return (record: DataRecord) => {
      this.fieldNames.forEach((fieldName) => {
        if (typeof record[fieldName] === 'string') {
          record[fieldName] = parseInt(record[fieldName], 10);
        }
      });
      return record;
    };
  }

  public dateParse(format: string): RecordTransformation {
    return (record: DataRecord) => {
      this.fieldNames.forEach((fieldName) => {
        if (typeof record[fieldName] === 'string') {
          // Use a library like date-fns or moment.js for robust date parsing
          const parsedDate = new Date(record[fieldName]); // Simplified; consider using a library for format handling
          if (!isNaN(parsedDate.getTime())) {
            record[fieldName] = parsedDate;
          } else {
            console.warn(`Invalid date format for field "${fieldName}": ${record[fieldName]}`);
          }
        }
      });
      return record;
    };
  }

  // Add other transformations ...
}

export class RenameField {
  private oldName: string;
  private newName: string;
  private allowDuplicateFieldNames: boolean; // Renamed from allowOverwrite for clarity

  constructor(oldName: string, newName: string) {
    this.oldName = oldName;
    this.newName = newName;
    this.allowDuplicateFieldNames = false; // Default to not allowing duplicates/overwrites
  }

  public setAllowDuplicateFieldNames(value: boolean): this {
    this.allowDuplicateFieldNames = value;
    return this;
  }

  public transform(): RecordTransformation {
    return (record: DataRecord) => {
      // Only proceed if the old field exists in the record
      if (record.hasOwnProperty(this.oldName)) {
        // Check if the new field name already exists
        if (record.hasOwnProperty(this.newName)) {
          // If duplicates are not allowed, log a warning
          if (!this.allowDuplicateFieldNames) {
            console.warn(
              `Warning: Field "${this.newName}" already exists. Renaming "${this.oldName}" to "${this.newName}" will overwrite existing data. Set 'allowDuplicateFieldNames(true)' to suppress this warning.`
            );
            // NOTE: The logic here depends on your desired behavior.
            // If you truly want to *prevent* the rename unless allowed, you'd 'return record;' here.
            // For this example, we'll proceed with the overwrite even with a warning,
            // as the subsequent setAllowDuplicateFieldNames(true) implies this intent.
          }
        }

        // Perform the rename (overwrite if newName exists, or create if it doesn't)
        record[this.newName] = record[this.oldName];
        delete record[this.oldName]; // Delete the old field
      }
      return record;
    };
  }
}

export class SetField {
  private fieldName: string;
  private value: any;

  constructor(fieldName: string, value: any) {
    this.fieldName = fieldName;
    this.value = value;
  }

  public transform(): RecordTransformation {
    return (record: DataRecord) => {
      record[this.fieldName] = this.value;
      return record;
    };
  }
}

// transformers/fieldTransformers.ts (continued)
export class SetCalculatedField {
  private fieldName: string;
  private expression: string;

  constructor(fieldName: string, expression: string) {
    this.fieldName = fieldName;
    this.expression = expression;
  }

  public transform(): RecordTransformation {
    return (record: DataRecord) => {
      // WARNING: Using eval is dangerous. Consider a dedicated expression parser.
      try {
        const evaluatedValue = new Function('record', `with(record) { return ${this.expression} }`)(record);
        record[this.fieldName] = evaluatedValue;
      } catch (e) {
        console.error(`Error evaluating expression for field ${this.fieldName}: ${e}`, record);
        // Handle error: e.g., set to null, skip record
      }
      return record;
    };
  }
}

// transformers/fieldTransformers.ts (continued)
export class RemoveFields {
  private fieldNames: string[];

  constructor(...fieldNames: string[]) {
    this.fieldNames = fieldNames;
  }

  public transform(): RecordTransformation {
    return (record: DataRecord) => {
      this.fieldNames.forEach((fieldName) => {
        delete record[fieldName];
      });
      return record;
    };
  }
}

// transformers/fieldTransformers.ts (continued)
export class SelectFields {
  private fieldNames: string[];

  constructor(...fieldNames: string[]) {
    this.fieldNames = fieldNames;
  }

  public transform(): RecordTransformation {
    return (record: DataRecord) => {
      const newRecord: DataRecord = {};
      this.fieldNames.forEach((fieldName) => {
        if (Object.prototype.hasOwnProperty.call(record, fieldName)) {
          newRecord[fieldName] = record[fieldName];
        }
      });
      return newRecord;
    };
  }
}

/**
 * MapFields allows creating a new field by applying a function to existing fields.
 */
export class MapFields {
  private outputField: string;
  private inputFields: string[];
  private mapper: (...args: any[]) => any;

  constructor(outputField: string, inputFields: string[], mapper: (...args: any[]) => any) {
    this.outputField = outputField;
    this.inputFields = inputFields;
    this.mapper = mapper;
  }

  public transform(): RecordTransformation {
    return (record: DataRecord) => {
      const args = this.inputFields.map(field => record[field]);
      record[this.outputField] = this.mapper(...args);
      return record;
    };
  }
}

/**
 * PIIMaskingTransformer provides various strategies to anonymize sensitive data 
 * such as Emails, Credit Cards, or Names during the streaming process.
 */
export class PIIMaskingTransformer {
  private fields: Map<string, 'redact' | 'hash' | 'partial' | 'null'> = new Map();

  /**
   * Register a field to be masked.
   * @param fieldName The field to mask
   * @param strategy 'redact' (default), 'hash' (SHA256), 'partial' (p****@x.com), or 'null'
   */
  public mask(fieldName: string, strategy: 'redact' | 'hash' | 'partial' | 'null' = 'redact'): this {
    this.fields.set(fieldName, strategy);
    return this;
  }

  public transform(): RecordTransformation {
    return (record: DataRecord) => {
      for (const [field, strategy] of this.fields) {
        if (record[field] !== undefined && record[field] !== null) {
          record[field] = this.applyStrategy(record[field], strategy);
        }
      }
      return record;
    };
  }

  private applyStrategy(value: any, strategy: 'redact' | 'hash' | 'partial' | 'null'): any {
    const val = String(value);
    switch (strategy) {
      case 'redact':
        return '[REDACTED]';
      case 'null':
        return null;
      case 'hash':
        // Using Node's native crypto module
        const { createHash } = require('node:crypto');
        return createHash('sha256').update(val).digest('hex');
      case 'partial':
        return this.applyPartialMask(val);
      default:
        return '[REDACTED]';
    }
  }

  private applyPartialMask(val: string): string {
    if (val.includes('@')) {
      // Email masking: p****@domain.com
      const [user, domain] = val.split('@');
      if (user.length <= 2) return `*${user.slice(-1)}@${domain}`;
      return `${user[0]}****@${domain}`;
    }
    
    // Credit Card or long numbers: **** **** **** 4444
    if (val.length > 10) {
      return `****${val.slice(-4)}`;
    }

    // Default partial: first 2 chars then ****
    return val.length > 2 ? `${val.slice(0, 2)}****` : '****';
  }
}
