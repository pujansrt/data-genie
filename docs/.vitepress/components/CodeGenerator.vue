<script setup>
import { ref, computed } from 'vue'

const readerType = ref('CSVReader')
const readerSource = ref('file') // file, s3, http
const readerPath = ref('input.csv')
const readerBucket = ref('my-source-bucket')
const readerKey = ref('data/input.csv')
const readerUrl = ref('https://api.example.com/data')

// SQL Reader Specifics
const sqlReaderTable = ref('users')

const useMultiWriter = ref(false)
const writers = ref([
  { 
    type: 'JsonWriter', 
    sink: 'file', 
    path: 'output.json', 
    bucket: 'my-dest-bucket', 
    key: 'data/output.json',
    sqlTable: 'users',
    sqlDialect: 'postgres'
  }
])

const addWriter = () => {
  writers.value.push({ 
    type: 'CSVWriter', 
    sink: 'file', 
    path: `output_${writers.value.length + 1}.csv`, 
    bucket: 'my-dest-bucket', 
    key: `data/output_${writers.value.length + 1}.csv`,
    sqlTable: 'users',
    sqlDialect: 'postgres'
  })
}
const removeWriter = (index) => {
  if (writers.value.length > 1) writers.value.splice(index, 1)
}

const useValidation = ref(false)
const showEvents = ref(false)
const useEventEmitter = ref(false)
const useParallel = ref(false)

const transforms = ref([])

const addTransform = (type) => {
  if (type === 'rename') transforms.value.push({ type: 'rename', old: 'fname', new: 'firstName' })
  if (type === 'filter') transforms.value.push({ type: 'filter', expr: 'record.age > 18' })
  if (type === 'calculate') transforms.value.push({ type: 'calculate', field: 'total', expr: 'record.price * record.qty' })
  if (type === 'mask') transforms.value.push({ type: 'mask', field: 'email', strategy: 'redact' })
}

const removeTransform = (index) => transforms.value.splice(index, 1)

const isFileSink = (type) => !['MemoryWriter', 'ConsoleWriter', 'CallbackWriter', 'SqlWriter'].includes(type)

const generatedCode = computed(() => {
  const imports = new Set(['Job'])
  imports.add(readerType.value)
  
  if (useParallel.value) imports.add('ParallelWriter')
  
  const activeWriters = useMultiWriter.value ? writers.value : [writers.value[0]]
  if (useMultiWriter.value && activeWriters.length > 1) imports.add('MultiWriter')
  
  activeWriters.forEach(w => imports.add(w.type))
  
  if (readerSource.value === 's3' || activeWriters.some(w => w.sink === 's3' && isFileSink(w.type))) {
    imports.add('S3Source')
    if (activeWriters.some(w => w.sink === 's3' && isFileSink(w.type))) imports.add('S3Sink')
  }

  if (useValidation.value) imports.add('ValidatingReader')
  if (transforms.value.some(t => t.type === 'rename' || t.type === 'calculate')) {
    imports.add('TransformingReader')
    if (transforms.value.some(t => t.type === 'rename')) imports.add('RenameField')
    if (transforms.value.some(t => t.type === 'calculate')) imports.add('SetCalculatedField')
  }
  if (transforms.value.some(t => t.type === 'filter')) {
    imports.add('FilteringReader', 'FilterExpression')
  }
  if (transforms.value.some(t => t.type === 'mask')) {
    imports.add('PIIMaskingTransformer')
  }

  let code = `import { ${Array.from(imports).sort().join(', ')} } from '@pujansrt/data-genie';\n`
  if (useValidation.value) code += `import { z } from 'zod';\n`
  if (readerSource.value === 's3' || activeWriters.some(w => w.sink === 's3')) {
    code += `import { S3Client } from '@aws-sdk/client-s3';\n`
  }
  code += `\n`

  if (readerSource.value === 's3' || activeWriters.some(w => w.sink === 's3')) {
    code += `const s3Client = new S3Client({ region: 'us-east-1' });\n\n`
  }

  // Reader Setup
  if (readerSource.value === 's3') {
    code += `const reader = new ${readerType.value}(\n  new S3Source(s3Client, '${readerBucket.value}', '${readerKey.value}')\n);\n\n`
  } else if (readerSource.value === 'http' || readerType.value === 'HttpReader') {
    code += `const reader = new HttpReader('${readerUrl.value}', {\n  method: 'GET',\n  headers: { 'Authorization': 'Bearer ...' }\n});\n\n`
  } else if (readerType.value === 'MemoryReader') {
    code += `const reader = new MemoryReader([{ id: 1, name: 'Sample' }]);\n\n`
  } else if (readerType.value === 'SqlReader') {
    code += `const reader = new SqlReader(dbConnection, 'SELECT * FROM ${sqlReaderTable.value}');\n\n`
  } else {
    code += `const reader = new ${readerType.value}('${readerPath.value}');\n\n`
  }

  // Transformer Chain
  let currentVar = 'reader'
  
  if (useValidation.value) {
    code += `const schema = z.object({ id: z.number(), email: z.string().email() });\n`
    code += `const validatedReader = new ValidatingReader(${currentVar}, schema);\n`
    currentVar = 'validatedReader'
  }

  if (transforms.value.length > 0) {
    code += `const pipeline = new TransformingReader(${currentVar})\n`
    transforms.value.forEach(t => {
      if (t.type === 'rename') code += `  .add(new RenameField('${t.old}', '${t.new}').transform())\n`
      if (t.type === 'calculate') code += `  .add(new SetCalculatedField('${t.field}', '${t.expr}').transform())\n`
      if (t.type === 'mask') code += `  .add(new PIIMaskingTransformer().mask('${t.field}', '${t.strategy}').transform())\n`
      if (t.type === 'filter') code += `  .add(new FilterExpression('${t.expr}').createRecordFilter())\n`
    })
    code += `;\n`
    currentVar = 'pipeline'
  }

  // Writers Setup
  const writerCodes = activeWriters.map(w => {
    let wCode = ''
    if (w.sink === 's3' && isFileSink(w.type)) {
      wCode = `new ${w.type}(new S3Sink(s3Client, '${w.bucket}', '${w.key}'))`
    } else if (w.type === 'MemoryWriter' || w.type === 'ConsoleWriter') {
      wCode = `new ${w.type}()`
    } else if (w.type === 'CallbackWriter') {
      wCode = `new CallbackWriter(async (record) => { /* process record */ })`
    } else if (w.type === 'SqlWriter') {
      wCode = `new SqlWriter(dbConnection, '${w.sqlTable}', (r) => ({ ...r }))\n    .setDialect('${w.sqlDialect}')`
    } else {
      wCode = `new ${w.type}('${w.path}')`
    }
    return wCode
  })

  let finalWriterCode = ''
  if (useMultiWriter.value && writerCodes.length > 1) {
    finalWriterCode = `new MultiWriter(\n    ${writerCodes.join(',\n    ')}\n  )`
  } else {
    finalWriterCode = writerCodes[0]
  }

  if (useParallel.value) {
    code += `const writer = new ParallelWriter(${finalWriterCode}, { concurrency: 4 });\n\n`
  } else {
    code += `const writer = ${finalWriterCode};\n\n`
  }

  // Execution
  code += `async function run() {\n`
  if (showEvents.value || useEventEmitter.value) {
    code += `  const job = new Job(${currentVar}, writer);\n`
    if (showEvents.value) {
      code += `  job.on('progress', (m) => console.log(\`Processed \${m.recordCount} records...\`));\n`
    }
    if (useEventEmitter.value) {
      code += `  job.on('start', () => console.log('Job started'));\n`
      code += `  job.on('end', (metrics) => console.log('Job ended', metrics));\n`
      code += `  job.on('error', (err) => console.error('Job failed', err));\n`
    }
    code += `  const metrics = await job.run();\n`
  } else {
    code += `  const metrics = await Job.run(${currentVar}, writer);\n`
  }
  code += `  console.log('ETL Finished:', metrics);\n`
  code += `}\n\n`
  code += `run().catch(console.error);`

  return code
})

const copyToClipboard = () => {
  navigator.clipboard.writeText(generatedCode.value)
  alert('Code copied to clipboard!')
}
</script>

<template>
  <div class="code-builder">
    <div class="controls">
      <div class="control-grid">
        <section class="card">
          <div class="label">📥 Source Reader</div>
          
          <div class="sub-label">Format</div>
          <select v-model="readerType">
            <optgroup label="Standard">
              <option value="CSVReader">CSV Reader</option>
              <option value="JsonReader">JSON Reader</option>
              <option value="NDJsonReader">NDJSON Reader</option>
            </optgroup>
            <optgroup label="Advanced">
              <option value="ParquetReader">Parquet Reader</option>
              <option value="XMLReader">XML Reader</option>
              <option value="XlsxReader">Excel Reader</option>
            </optgroup>
            <optgroup label="Specialized">
              <option value="MemoryReader">Memory Reader</option>
              <option value="SqlReader">SQL Reader</option>
              <option value="HttpReader">HTTP Reader</option>
            </optgroup>
          </select>

          <div v-if="readerType !== 'MemoryReader' && readerType !== 'SqlReader' && readerType !== 'HttpReader'">
            <div class="sub-label">Transport</div>
            <div class="segmented-control">
              <label :class="{ active: readerSource === 'file' }">
                <input type="radio" v-model="readerSource" value="file" /> File
              </label>
              <label :class="{ active: readerSource === 's3' }">
                <input type="radio" v-model="readerSource" value="s3" /> S3
              </label>
            </div>
          </div>
          
          <!-- Path Inputs -->
          <div v-if="readerSource === 'file' && !['MemoryReader', 'SqlReader', 'HttpReader'].includes(readerType)" class="input-stack">
            <div class="sub-label">File Path</div>
            <input v-model="readerPath" />
          </div>
          
          <div v-if="readerSource === 's3' && !['MemoryReader', 'SqlReader', 'HttpReader'].includes(readerType)" class="input-stack">
            <div class="sub-label">Bucket</div>
            <input v-model="readerBucket" />
            <div class="sub-label">Key</div>
            <input v-model="readerKey" />
          </div>

          <div v-if="readerType === 'HttpReader'" class="input-stack">
            <div class="sub-label">URL</div>
            <input v-model="readerUrl" />
          </div>

          <div v-if="readerType === 'SqlReader'" class="input-stack">
            <div class="sub-label">Table Name</div>
            <input v-model="sqlReaderTable" />
          </div>
        </section>

        <section class="card">
          <div class="label-row">
            <div class="label">📤 Destination Writer</div>
            <div class="multi-toggle" v-if="useMultiWriter">
              <button class="small-add-btn" @click="addWriter">+ Add Writer</button>
            </div>
          </div>

          <div class="toggle-row">
             <label class="checkbox-label">
               <input type="checkbox" v-model="useMultiWriter" /> Use Multi-Writer
             </label>
          </div>

          <div class="writers-container">
            <div v-for="(w, idx) in (useMultiWriter ? writers : [writers[0]])" :key="idx" class="writer-item card-nested">
              <div class="writer-header">
                <span>Writer #{{ idx + 1 }}</span>
                <button v-if="useMultiWriter && writers.length > 1" @click="removeWriter(idx)" class="del-btn">×</button>
              </div>

              <div class="sub-label">Format</div>
              <select v-model="w.type">
                <option value="JsonWriter">JSON Writer</option>
                <option value="CSVWriter">CSV Writer</option>
                <option value="NDJsonWriter">NDJSON Writer</option>
                <option value="ParquetWriter">Parquet Writer</option>
                <option value="XMLWriter">XML Writer</option>
                <option value="SqlWriter">SQL Writer</option>
                <option value="ConsoleWriter">Console Writer</option>
                <option value="MemoryWriter">Memory Writer</option>
                <option value="CallbackWriter">Callback Writer</option>
              </select>
              
              <!-- Conditional Transport -->
              <div v-if="isFileSink(w.type)">
                <div class="sub-label">Transport</div>
                <div class="segmented-control small">
                  <label :class="{ active: w.sink === 'file' }">
                    <input type="radio" v-model="w.sink" value="file" /> File
                  </label>
                  <label :class="{ active: w.sink === 's3' }">
                    <input type="radio" v-model="w.sink" value="s3" /> S3
                  </label>
                </div>

                <div v-if="w.sink === 'file'" class="input-stack">
                  <input v-model="w.path" placeholder="Path" />
                </div>
                <div v-if="w.sink === 's3'" class="input-stack">
                  <input v-model="w.bucket" placeholder="Bucket" />
                  <input v-model="w.key" placeholder="Key" class="mt-1" />
                </div>
              </div>

              <!-- SQL Writer Specifics -->
              <div v-if="w.type === 'SqlWriter'" class="input-stack">
                <div class="sub-label">Dialect</div>
                <select v-model="w.sqlDialect">
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                  <option value="oracle">Oracle</option>
                </select>
                <div class="sub-label">Target Table</div>
                <input v-model="w.sqlTable" placeholder="Table Name" />
              </div>
            </div>
          </div>

          <div class="toggle-row mt-2">
            <label class="checkbox-label"><input type="checkbox" v-model="useParallel" /> Use ParallelWriter</label>
          </div>
        </section>
      </div>

      <section class="card">
        <div class="label">⚡ Transformations & Validation</div>
        <div class="toggle-row">
          <label class="checkbox-label"><input type="checkbox" v-model="useValidation" /> Enable Zod Schema Validation</label>
        </div>
        <div class="btn-row">
          <button class="add-btn" @click="addTransform('filter')">+ Filter</button>
          <button class="add-btn" @click="addTransform('rename')">+ Rename</button>
          <button class="add-btn" @click="addTransform('calculate')">+ Calc Field</button>
          <button class="add-btn" @click="addTransform('mask')">+ PII Mask</button>
        </div>
        <div class="list">
          <div v-for="(t, i) in transforms" :key="i" class="transform-pill">
            <span class="pill-type">{{ t.type }}</span>
            <div class="pill-content">
              <input v-if="t.type === 'filter'" v-model="t.expr" class="full-input" />
              <div v-if="t.type === 'rename'" class="inner-row">
                <input v-model="t.old" placeholder="Old" /> <span>→</span> <input v-model="t.new" placeholder="New" />
              </div>
              <div v-if="t.type === 'calculate'" class="inner-row">
                <input v-model="t.field" placeholder="Field" /> <span>=</span> <input v-model="t.expr" />
              </div>
              <div v-if="t.type === 'mask'" class="inner-row">
                <input v-model="t.field" placeholder="Field name" class="field-input" />
                <select v-model="t.strategy" class="strategy-select">
                  <option value="redact">redact</option>
                  <option value="hash">hash</option>
                  <option value="partial">partial</option>
                </select>
              </div>
            </div>
            <button class="del-btn" @click="removeTransform(i)">×</button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="label">⚙️ Job Options</div>
        <div class="toggle-col">
          <label class="checkbox-label"><input type="checkbox" v-model="showEvents" /> Show Progress Events</label>
          <label class="checkbox-label"><input type="checkbox" v-model="useEventEmitter" /> Show Lifecycle Events</label>
        </div>
      </section>
    </div>

    <div class="preview">
      <div class="preview-header">
        <span>TypeScript Code</span>
        <button class="copy-btn" @click="copyToClipboard">Copy Code</button>
      </div>
      <pre><code>{{ generatedCode }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.code-builder {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
  font-family: var(--vp-font-family-base);
}

.control-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .control-grid { grid-template-columns: 1fr 1fr; }
}

.card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
}

.card-nested {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  letter-spacing: 0.05em;
}

.sub-label {
  font-size: 0.65rem;
  font-weight: bold;
  color: var(--vp-c-text-3);
  margin: 0.5rem 0 0.25rem 0;
}

/* Segmented Control Styling */
.segmented-control {
  display: flex;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 2px;
  margin-bottom: 0.5rem;
}

.segmented-control label {
  flex: 1;
  text-align: center;
  font-size: 0.75rem;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  color: var(--vp-c-text-2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.segmented-control input {
  display: none;
}

.segmented-control label.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: bold;
}

.segmented-control.small label {
  padding: 2px;
  font-size: 0.7rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.input-stack {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

select, input:not([type="radio"]):not([type="checkbox"]) {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
  width: 100%;
}

.toggle-row { margin-bottom: 0.75rem; font-size: 0.85rem; }
.toggle-col { display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }

.btn-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.add-btn, .small-add-btn {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-soft);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.small-add-btn { padding: 1px 6px; font-size: 0.65rem; }

.list { display: flex; flex-direction: column; gap: 0.5rem; }
.transform-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  padding: 4px 8px;
  border-radius: 6px;
}

.pill-type {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  background: var(--vp-c-default-soft);
  padding: 2px 4px;
  border-radius: 3px;
  min-width: 50px;
  text-align: center;
}

.pill-content { flex: 1; }
.inner-row { display: flex; align-items: center; gap: 0.5rem; }
.inner-row input { flex: 1; min-width: 0; }

.writer-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
}

.del-btn {
  background: transparent;
  color: var(--vp-c-text-3);
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
}

.preview {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.preview-header {
  padding: 0.5rem 1rem;
  background: #2d2d2d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #aaa;
}

.copy-btn {
  background: #444;
  color: white;
  border: none;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
}

pre {
  margin: 0;
  padding: 1rem;
  color: #d4d4d4;
  font-size: 0.85rem;
  overflow-x: auto;
}

code { font-family: var(--vp-font-family-mono); }
</style>
