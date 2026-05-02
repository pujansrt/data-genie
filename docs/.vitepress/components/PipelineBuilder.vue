<script setup>
import { ref, computed } from 'vue'

const readerType = ref('csv')
const readerPath = ref('input.csv')
const writerType = ref('json')
const writerPath = ref('output.json')

const jobName = ref('Daily Sales Sync')
const showProgress = ref(true)

const transforms = ref([])

const addTransform = (type) => {
  if (type === 'filter') {
    transforms.value.push({ type: 'filter', expression: 'price > 100' })
  } else if (type === 'rename') {
    transforms.value.push({ type: 'rename', oldName: 'old_field', newName: 'new_field' })
  } else if (type === 'pii-masking') {
    transforms.value.push({ type: 'pii-masking', field: 'email', strategy: 'redact' })
  }
}

const removeTransform = (index) => {
  transforms.value.splice(index, 1)
}

const generatedYaml = computed(() => {
  let yaml = `job:\n`
  yaml += `  name: "${jobName.value}"\n`
  yaml += `  showProgress: ${showProgress.value}\n\n`
  yaml += `pipeline:\n`
  yaml += `  read:\n`
  yaml += `    type: ${readerType.value}\n`
  yaml += `    path: ${readerPath.value}\n`
  
  if (transforms.value.length > 0) {
    yaml += `  transform:\n`
    transforms.value.forEach(t => {
      yaml += `    - type: ${t.type}\n`
      if (t.type === 'filter') yaml += `      expression: "${t.expression}"\n`
      if (t.type === 'rename') {
        yaml += `      mapping:\n`
        yaml += `        ${t.oldName}: ${t.newName}\n`
      }
      if (t.type === 'pii-masking') {
        yaml += `      masks:\n`
        yaml += `        ${t.field}: ${t.strategy}\n`
      }
    })
  }

  yaml += `  write:\n`
  yaml += `    type: ${writerType.value}\n`
  if (writerType.value !== 'console') {
    yaml += `    path: ${writerPath.value}\n`
  }
  
  return yaml
})

const copyToClipboard = () => {
  navigator.clipboard.writeText(generatedYaml.value)
  alert('YAML copied to clipboard!')
}
</script>

<template>
  <div class="builder-wrapper">
    <div class="builder-grid">
      <!-- Controls Column -->
      <div class="controls-col">
        <section class="config-card">
          <div class="card-header">🚀 Job (Optional)</div>
          <div class="input-row">
            <div class="input-group">
              <label>Name</label>
              <input v-model="jobName" />
            </div>
            <div class="input-group shrink">
              <label>Progress</label>
              <div class="checkbox-wrapper">
                <input type="checkbox" v-model="showProgress" />
              </div>
            </div>
          </div>
        </section>

        <section class="config-card">
          <div class="card-header">📥 Source</div>
          <div class="input-row">
            <div class="input-group">
              <label>Format</label>
              <select v-model="readerType">
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="ndjson">NDJSON</option>
              </select>
            </div>
            <div class="input-group">
              <label>Path</label>
              <input v-model="readerPath" />
            </div>
          </div>
        </section>

        <section class="config-card">
          <div class="card-header">⚡ Transformations (Optional)</div>
          <div class="action-bar">
            <button class="add-btn" @click="addTransform('filter')">+ Filter</button>
            <button class="add-btn" @click="addTransform('rename')">+ Rename</button>
            <button class="add-btn" @click="addTransform('pii-masking')">+ Mask</button>
          </div>
          
          <div class="transform-list">
            <div v-for="(t, index) in transforms" :key="index" class="transform-pill">
              <div class="pill-type">{{ t.type }}</div>
              
              <div v-if="t.type === 'filter'" class="pill-content">
                <input v-model="t.expression" placeholder="price > 100" />
              </div>
              
              <div v-if="t.type === 'rename'" class="pill-content rename-box">
                <input v-model="t.oldName" />
                <span>→</span>
                <input v-model="t.newName" />
              </div>

              <div v-if="t.type === 'pii-masking'" class="pill-content mask-box">
                <input v-model="t.field" />
                <select v-model="t.strategy">
                  <option value="redact">redact</option>
                  <option value="hash">hash</option>
                  <option value="partial">partial</option>
                  <option value="null">null</option>
                </select>
              </div>

              <button class="del-btn" @click="removeTransform(index)">×</button>
            </div>
          </div>
        </section>

        <section class="config-card">
          <div class="card-header">📤 Destination</div>
          <div class="input-row">
            <div class="input-group">
              <label>Format</label>
              <select v-model="writerType">
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="ndjson">NDJSON</option>
                <option value="console">Console</option>
              </select>
            </div>
            <div class="input-group" v-if="writerType !== 'console'">
              <label>Path</label>
              <input v-model="writerPath" />
            </div>
          </div>
        </section>
      </div>

      <!-- Preview Column -->
      <div class="preview-col">
        <div class="preview-card">
          <div class="preview-header">
            <span>pipeline.yaml</span>
            <button class="copy-btn" @click="copyToClipboard">Copy</button>
          </div>
          <pre><code>{{ generatedYaml }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder-wrapper {
  margin: 1.5rem 0;
  font-family: var(--vp-font-family-base);
}

.builder-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 960px) {
  .builder-grid {
    grid-template-columns: 1.2fr 0.8fr;
  }
}

.config-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.card-header {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
  letter-spacing: 0.05em;
}

.input-row {
  display: flex;
  gap: 0.75rem;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group.shrink { flex: 0; min-width: 80px; }

label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

input, select {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
  width: 100%;
}

.checkbox-wrapper {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.add-btn {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-soft);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.add-btn:hover { background: var(--vp-c-brand-2); color: white; }

.transform-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

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
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  background: var(--vp-c-default-soft);
  padding: 2px 4px;
  border-radius: 3px;
  min-width: 50px;
  text-align: center;
}

.pill-content { flex: 1; }
.rename-box, .mask-box { display: flex; align-items: center; gap: 0.5rem; }
.rename-box input, .mask-box input, .mask-box select { flex: 1; }

.del-btn {
  background: transparent;
  color: var(--vp-c-text-3);
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0 4px;
}
.del-btn:hover { color: var(--vp-c-danger-1); }

/* Preview Card */
.preview-card {
  background: #1e1e1e;
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 100px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #2d2d2d;
  border-radius: 8px 8px 0 0;
  color: #aaa;
  font-size: 0.8rem;
  font-weight: 600;
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
.copy-btn:hover { background: #555; }

pre {
  margin: 0;
  padding: 1rem;
  color: #d4d4d4;
  font-size: 0.85rem;
  overflow: auto;
  flex: 1;
}

code { font-family: var(--vp-font-family-mono); }
</style>
