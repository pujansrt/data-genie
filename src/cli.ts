#!/usr/bin/env node
import { PipelineParser } from './core/pipeline-parser';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  switch (command) {
    case 'run':
      const configPath = args[1];
      if (!configPath) {
        console.error('Error: Please provide a path to a pipeline configuration file.');
        console.log('Usage: data-genie run <pipeline.yaml>');
        process.exit(1);
      }
      try {
        await PipelineParser.run(configPath);
      } catch (error) {
        console.error('Job Failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
data-genie - High-performance ETL Engine

Usage:
  data-genie <command> [arguments]

Commands:
  run <config.yaml>   Execute a declarative ETL pipeline defined in YAML.
  --help, -h          Show this help message.

Example:
  data-genie run my-pipeline.yaml
  `);
}

main().catch((err) => {
  console.error('Unexpected Error:', err);
  process.exit(1);
});
