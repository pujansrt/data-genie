import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  treeshake: true,
  clean: true,
  minify: true,
  target: 'es2022',
  external: [
    'csv-parse',
    'csv-stringify',
    'exceljs',
    'parquetjs-lite',
    '@aws-sdk/client-s3',
    '@aws-sdk/lib-storage',
    'zod'
  ],
});
