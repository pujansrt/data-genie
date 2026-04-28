import { CSVReader, JsonWriter, Job } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const BENCHMARK_FILE = 'bench_data.csv';
const OUTPUT_FILE = 'bench_output.json';
const RECORD_COUNT = 500000; // Large enough to show memory difference

async function generateData() {
    console.log(`Generating ${RECORD_COUNT} records for benchmark...`);
    const writeStream = fs.createWriteStream(BENCHMARK_FILE);
    writeStream.write('id,name,email,city,score\n');
    for (let i = 0; i < RECORD_COUNT; i++) {
        const row = `${i},User_${i},user${i}@example.com,City_${i % 100},${(Math.random() * 100).toFixed(2)}\n`;
        if (!writeStream.write(row)) {
            await new Promise(resolve => writeStream.once('drain', resolve));
        }
    }
    await new Promise(resolve => writeStream.end(resolve));
    console.log('Data generation complete.\n');
}

async function runNaive() {
    console.log('Running Naive (Load-All) Approach...');
    const startMemory = process.memoryUsage().rss;
    const startTime = Date.now();

    try {
        const content = fs.readFileSync(BENCHMARK_FILE, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const obj: any = {};
            headers.forEach((h, i) => obj[h] = values[i]);
            return obj;
        });

        const json = JSON.stringify(data);
        fs.writeFileSync(OUTPUT_FILE, json);

        const endTime = Date.now();
        const endMemory = process.memoryUsage().rss;
        const peakMemory = (endMemory - startMemory) / (1024 * 1024);

        console.log(`Naive Time: ${(endTime - startTime) / 1000}s`);
        console.log(`Naive Peak RSS Increase: ${peakMemory.toFixed(2)} MB`);
    } catch (e: any) {
        console.log(`Naive Approach Failed: ${e.message}`);
    }
    console.log('-------------------\n');
}

async function runDataGenie() {
    console.log('Running Data-Genie (Streaming) Approach...');
    const startMemory = process.memoryUsage().rss;
    const startTime = Date.now();

    const reader = new CSVReader(BENCHMARK_FILE).setFieldNamesInFirstRow(true);
    const writer = new JsonWriter(OUTPUT_FILE);

    const metrics = await Job.run(reader, writer, { logger: { info: () => {}, warn: () => {}, error: () => {} } as any });

    const endTime = Date.now();
    const endMemory = process.memoryUsage().rss;
    const peakMemory = (endMemory - startMemory) / (1024 * 1024);

    console.log(`Data-Genie Time: ${(endTime - startTime) / 1000}s`);
    console.log(`Data-Genie Peak RSS Increase: ${peakMemory.toFixed(2)} MB`);
    console.log(`Records Processed: ${metrics.recordCount}`);
}

async function benchmark() {
    await generateData();
    
    // Clear output if exists
    if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);
    
    // Run Data-Genie first (it's cleaner)
    await runDataGenie();
    
    // Reset output
    if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);

    // Run Naive
    await runNaive();

    // Cleanup
    if (fs.existsSync(BENCHMARK_FILE)) fs.unlinkSync(BENCHMARK_FILE);
    if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);
}

benchmark().catch(console.error);
