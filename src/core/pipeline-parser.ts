import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { 
  CSVReader, 
  JsonReader, 
  NDJsonReader, 
  CSVWriter, 
  JsonWriter, 
  NDJsonWriter, 
  ConsoleWriter,
  Job,
  DataReader,
  DataWriter,
  FilteringReader,
  FilterExpression,
  TransformingReader,
  RenameField,
  SelectFields,
  RemoveFields,
  BasicFieldTransformer,
  PIIMaskingTransformer
} from '../index';

export interface ReaderConfig {
  type: 'csv' | 'json' | 'ndjson';
  path: string;
  options?: any;
}

export interface WriterConfig {
  type: 'csv' | 'json' | 'ndjson' | 'console';
  path?: string;
  options?: any;
}

export interface TransformConfig {
  type: 'rename' | 'filter' | 'select' | 'remove' | 'type-convert' | 'pii-masking';
  mapping?: Record<string, string>;
  expression?: string;
  fields?: string[];
  to?: 'int' | 'float' | 'string' | 'date';
  masks?: Record<string, 'redact' | 'hash' | 'partial' | 'null'>;
}

export interface PipelineConfig {
  version?: string;
  job?: {
    name?: string;
    showProgress?: boolean;
  };
  pipeline: {
    read: ReaderConfig;
    transform?: TransformConfig[];
    write: WriterConfig;
  };
}

export class PipelineParser {
  public static async run(configPath: string): Promise<any> {
    const absolutePath = path.resolve(process.cwd(), configPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Config file not found: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    const config: PipelineConfig = parseYaml(content);

    if (!config.pipeline) {
      throw new Error('Invalid config: "pipeline" section is missing');
    }

    const reader = this.createReader(config.pipeline.read);
    const transformedReader = this.applyTransforms(reader, config.pipeline.transform || []);
    const writer = this.createWriter(config.pipeline.write);

    const job = new Job(transformedReader, writer, {
      showProgress: config.job?.showProgress ?? true,
    });

    if (config.job?.name) {
      console.log(`Running Job: ${config.job.name}`);
    }

    return job.run();
  }

  private static createReader(config: ReaderConfig): DataReader<any> {
    const readerPath = path.resolve(process.cwd(), config.path);
    switch (config.type) {
      case 'csv':
        return new CSVReader(readerPath, config.options);
      case 'json':
        return new JsonReader(readerPath);
      case 'ndjson':
        return new NDJsonReader(readerPath);
      default:
        throw new Error(`Unsupported reader type: ${config.type}`);
    }
  }

  private static applyTransforms(reader: DataReader<any>, transforms: TransformConfig[]): DataReader<any> {
    let currentReader = reader;

    for (const transform of transforms) {
      switch (transform.type) {
        case 'filter':
          if (!transform.expression) throw new Error('Filter transform requires an "expression"');
          const filterReader = new FilteringReader(currentReader);
          filterReader.add(new FilterExpression(transform.expression).createRecordFilter());
          currentReader = filterReader;
          break;
        
        case 'rename':
          if (!transform.mapping) throw new Error('Rename transform requires a "mapping"');
          const renameReader = new TransformingReader(currentReader);
          for (const [oldName, newName] of Object.entries(transform.mapping)) {
            renameReader.add(new RenameField(oldName, newName).transform());
          }
          currentReader = renameReader;
          break;

        case 'select':
          if (!transform.fields) throw new Error('Select transform requires "fields"');
          const selectReader = new TransformingReader(currentReader);
          selectReader.add(new SelectFields(...transform.fields).transform());
          currentReader = selectReader;
          break;

        case 'remove':
          if (!transform.fields) throw new Error('Remove transform requires "fields"');
          const removeReader = new TransformingReader(currentReader);
          removeReader.add(new RemoveFields(...transform.fields).transform());
          currentReader = removeReader;
          break;

        case 'type-convert':
          if (!transform.fields || !transform.to) throw new Error('Type-convert transform requires "fields" and "to"');
          const typeConvertReader = new TransformingReader(currentReader);
          const basicTransformer = new BasicFieldTransformer(...transform.fields);
          switch (transform.to) {
            case 'int':
              typeConvertReader.add(basicTransformer.stringToInt());
              break;
            case 'float':
              typeConvertReader.add(basicTransformer.stringToDouble());
              break;
            case 'date':
              typeConvertReader.add(basicTransformer.dateParse('')); // Empty string for default auto-parse
              break;
            default:
              throw new Error(`Unsupported type conversion: ${transform.to}`);
          }
          currentReader = typeConvertReader;
          break;

        case 'pii-masking':
          if (!transform.masks) throw new Error('PII-masking transform requires "masks"');
          const piiReader = new TransformingReader(currentReader);
          const piiTransformer = new PIIMaskingTransformer();
          for (const [field, strategy] of Object.entries(transform.masks)) {
            piiTransformer.mask(field, strategy as any);
          }
          piiReader.add(piiTransformer.transform());
          currentReader = piiReader;
          break;

        default:
          throw new Error(`Unsupported transform type: ${(transform as any).type}`);
      }
    }

    return currentReader;
  }

  private static createWriter(config: WriterConfig): DataWriter<any> {
    switch (config.type) {
      case 'console':
        return new ConsoleWriter();
      case 'csv':
        if (!config.path) throw new Error('CSV writer requires a "path"');
        return new CSVWriter(path.resolve(process.cwd(), config.path));
      case 'json':
        if (!config.path) throw new Error('JSON writer requires a "path"');
        return new JsonWriter(path.resolve(process.cwd(), config.path));
      case 'ndjson':
        if (!config.path) throw new Error('NDJSON writer requires a "path"');
        return new NDJsonWriter(path.resolve(process.cwd(), config.path));
      default:
        throw new Error(`Unsupported writer type: ${config.type}`);
    }
  }
}
