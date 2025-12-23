<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { computed, ref, onUnmounted } from 'vue'
import { convertCompose } from '~/utils/converter'
import { GITHUB_URL } from '~/utils/constants'
import type { ConvertOptions, ConvertResult } from '~/utils/types'

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 12,
  lineNumbers: 'on' as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const,
  theme: 'vs-dark',
  padding: { top: 8, bottom: 8 },
  lineNumbersMinChars: 3,
  folding: true,
  renderLineHighlight: 'none' as const
}

const defaultCompose = `services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html
    labels:
      wompose.service.type: loadbalancer

  redis:
    image: redis:alpine
    ports:
      - "6379"
`

const composeInput = ref(defaultCompose)
const options = ref<ConvertOptions>({
  provider: 'kubernetes',
  controller: 'deployment',
  replicas: 1,
  volumeType: 'persistentVolumeClaim',
  generateJson: false,
  withKomposeAnnotations: true,
  generateNetworkPolicies: false
})

const result = ref<ConvertResult | null>(null)
const expandedFiles = ref<Set<number>>(new Set())
const isConverting = ref(false)
const error = ref<string | null>(null)

// Resizable panels
const leftPanelWidth = ref(50)
const isResizing = ref(false)
const editorLayoutRef = ref<HTMLElement | null>(null)

// Vertical resize for accordion items
const itemHeights = ref<Record<number, number>>({})
const resizingItem = ref<number | null>(null)
const accordionListRef = ref<HTMLElement | null>(null)

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value || !editorLayoutRef.value) return
  const rect = editorLayoutRef.value.getBoundingClientRect()
  const newWidth = ((e.clientX - rect.left) / rect.width) * 100
  leftPanelWidth.value = Math.min(Math.max(newWidth, 20), 80)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const startVerticalResize = (index: number, e: MouseEvent) => {
  resizingItem.value = index
  document.addEventListener('mousemove', onVerticalResize)
  document.addEventListener('mouseup', stopVerticalResize)
  e.preventDefault()
  e.stopPropagation()
}

const onVerticalResize = (e: MouseEvent) => {
  if (resizingItem.value === null) return
  const item = document.querySelector(`[data-accordion-index="${resizingItem.value}"]`) as HTMLElement
  if (!item) return
  const rect = item.getBoundingClientRect()
  const newHeight = e.clientY - rect.top
  itemHeights.value[resizingItem.value] = Math.max(newHeight, 60)
}

const stopVerticalResize = () => {
  resizingItem.value = null
  document.removeEventListener('mousemove', onVerticalResize)
  document.removeEventListener('mouseup', stopVerticalResize)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('mousemove', onVerticalResize)
  document.removeEventListener('mouseup', stopVerticalResize)
})

const expandedCount = computed(() => expandedFiles.value.size)

const toggleFile = (index: number) => {
  if (expandedFiles.value.has(index)) {
    expandedFiles.value.delete(index)
  } else {
    expandedFiles.value.add(index)
  }
  expandedFiles.value = new Set(expandedFiles.value)
}

const expandAll = () => {
  if (result.value) {
    expandedFiles.value = new Set(result.value.files.map((_, i) => i))
  }
}

const collapseAll = () => {
  expandedFiles.value = new Set()
}

const convert = async () => {
  isConverting.value = true
  error.value = null
  
  try {
    result.value = await convertCompose(composeInput.value, options.value)
    expandedFiles.value = new Set([0])
  } catch (e: any) {
    error.value = e.message || 'Conversion failed'
    result.value = null
  } finally {
    isConverting.value = false
  }
}

const downloadAll = () => {
  if (!result.value) return
  
  result.value.files.forEach(file => {
    const blob = new Blob([file.content], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  })
}

const downloadFile = (file: { name: string; content: string }) => {
  const blob = new Blob([file.content], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}

const copyFile = async (content: string) => {
  await navigator.clipboard.writeText(content)
}

const loadExample = () => {
  composeInput.value = defaultCompose
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="container header-content">
        <div class="logo">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="16" height="16" rx="2" fill="#0e639c"/>
            <text x="8" y="12" text-anchor="middle" fill="white" font-size="10" font-weight="bold">W</text>
          </svg>
          <span>Wompose</span>
        </div>
        <nav class="nav-links">
          <NuxtLink to="/docs">Labels</NuxtLink>
          <a :href="GITHUB_URL" target="_blank" title="GitHub">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <!-- Options Bar -->
        <div class="options-bar">
          <div class="options-grid">
            <div class="option-group">
              <label>Provider</label>
              <select v-model="options.provider">
                <option value="kubernetes">Kubernetes</option>
                <option value="openshift">OpenShift</option>
              </select>
            </div>

            <div class="option-group" v-if="options.provider === 'kubernetes'">
              <label>Controller</label>
              <select v-model="options.controller">
                <option value="deployment">Deployment</option>
                <option value="daemonset">DaemonSet</option>
                <option value="replicationcontroller">ReplicationController</option>
              </select>
            </div>

            <div class="option-group">
              <label>Replicas</label>
              <input type="number" v-model.number="options.replicas" min="1" max="100" />
            </div>

            <div class="option-group">
              <label>Volume Type</label>
              <select v-model="options.volumeType">
                <option value="persistentVolumeClaim">PersistentVolumeClaim</option>
                <option value="emptyDir">EmptyDir</option>
                <option value="hostPath">HostPath</option>
                <option value="configMap">ConfigMap</option>
              </select>
            </div>

            <div class="option-group">
              <label>Output</label>
              <select v-model="options.generateJson">
                <option :value="false">YAML</option>
                <option :value="true">JSON</option>
              </select>
            </div>

            <div class="option-group checkbox-group">
              <input type="checkbox" id="annotations" v-model="options.withKomposeAnnotations" />
              <label for="annotations">Annotations</label>
            </div>

            <div class="option-group checkbox-group">
              <input type="checkbox" id="networkPolicies" v-model="options.generateNetworkPolicies" />
              <label for="networkPolicies">NetworkPolicy</label>
            </div>

            <button class="btn btn-primary" @click="convert" :disabled="isConverting">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              {{ isConverting ? 'Converting...' : 'Convert' }}
            </button>

            <button class="btn btn-secondary" @click="loadExample">
              Example
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="status status-error">
          {{ error }}
        </div>

        <!-- Editor Layout -->
        <div class="editor-layout" ref="editorLayoutRef" :class="{ resizing: isResizing }">
          <!-- Input Panel -->
          <div class="panel" :style="{ width: leftPanelWidth + '%' }">
            <div class="panel-header">
              <span class="panel-title">Docker Compose</span>
            </div>
            <div class="panel-body editor-wrapper">
              <ClientOnly>
                <VueMonacoEditor
                  v-model:value="composeInput"
                  language="yaml"
                  theme="vs-dark"
                  :options="editorOptions"
                  style="height: 100%"
                />
                <template #fallback>
                  <textarea 
                    v-model="composeInput" 
                    placeholder="Paste your docker-compose.yaml here..."
                    spellcheck="false"
                  ></textarea>
                </template>
              </ClientOnly>
            </div>
          </div>

          <!-- Resize Handle -->
          <div class="resize-handle" @mousedown="startResize"></div>

          <!-- Output Panel -->
          <div class="panel" :style="{ width: (100 - leftPanelWidth) + '%' }">
            <div class="panel-header">
              <span class="panel-title">Kubernetes Resources</span>
              <div v-if="result && result.files.length > 0" style="display: flex; gap: 4px;">
                <button class="btn btn-secondary btn-sm" @click="expandAll">
                  Expand
                </button>
                <button class="btn btn-secondary btn-sm" @click="collapseAll">
                  Collapse
                </button>
                <button class="btn btn-primary btn-sm" @click="downloadAll">
                  Download All
                </button>
              </div>
            </div>

            <div class="panel-body output-content">
              <div v-if="!result" class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <p>Click "Convert" to generate Kubernetes manifests</p>
              </div>
              
              <div v-else class="accordion-list" ref="accordionListRef" :class="{ 'vertical-resizing': resizingItem !== null }">
                <div 
                  v-for="(file, index) in result.files" 
                  :key="file.name"
                  :data-accordion-index="index"
                  class="accordion-item"
                  :class="{ expanded: expandedFiles.has(index) }"
                  :style="expandedFiles.has(index) && itemHeights[index] ? { height: itemHeights[index] + 'px', flex: 'none' } : (expandedFiles.has(index) && expandedCount > 0 ? { flex: `1 1 ${100 / expandedCount}%` } : {})"
                >
                  <div 
                    class="accordion-header"
                    @click="toggleFile(index)"
                  >
                    <div class="accordion-title">
                      <svg 
                        class="accordion-arrow" 
                        :class="{ expanded: expandedFiles.has(index) }"
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        stroke-width="2"
                      >
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                      <span class="file-kind">{{ file.kind }}</span>
                      <span class="file-name">{{ file.name }}</span>
                    </div>
                    <div class="accordion-actions" @click.stop>
                      <button class="btn btn-secondary btn-sm" @click="copyFile(file.content)">
                        Copy
                      </button>
                      <button class="btn btn-secondary btn-sm" @click="downloadFile(file)">
                        Download
                      </button>
                    </div>
                  </div>
                  <div 
                    class="accordion-content"
                    :class="{ expanded: expandedFiles.has(index) }"
                  >
                    <ClientOnly>
                      <VueMonacoEditor
                        v-if="expandedFiles.has(index)"
                        :value="file.content"
                        :language="options.generateJson ? 'json' : 'yaml'"
                        theme="vs-dark"
                        :options="{ ...editorOptions, readOnly: true, lineNumbers: 'off' }"
                        style="height: 100%"
                      />
                      <template #fallback>
                        <pre>{{ file.content }}</pre>
                      </template>
                    </ClientOnly>
                  </div>
                  <div 
                    v-if="expandedFiles.has(index)"
                    class="vertical-resize-handle"
                    @mousedown="startVerticalResize(index, $event)"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      Wompose - Convert Docker Compose to Kubernetes
    </footer>
  </div>
</template>
