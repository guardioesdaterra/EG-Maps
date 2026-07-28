/**
 * components/ImportModal.vue
 * @why Import dialog with drag-and-drop zone and file picker — supports GeoJSON, CSV, KML, and KMZ files. Parses client-side and shows import results with an Add button for each dataset.
 */
<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" @click.self="$emit('close')">
      <div class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-[var(--bg-primary)] shadow-2xl">
        <div class="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">Import Data</h2>
          <button aria-label="Close" class="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" @click="$emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div
            class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] p-8 transition-colors hover:border-[var(--accent)]"
            @drop.prevent="onDrop"
            @dragover.prevent
            @click="inputRef?.click()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mb-3 text-[var(--text-secondary)]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p class="text-sm text-[var(--text-secondary)]">Drop a file here or click to browse</p>
            <p class="mt-1 text-xs text-[var(--text-secondary)]">GeoJSON, CSV, KML, KMZ</p>
          </div>

          <input ref="inputRef" type="file" accept=".geojson,.json,.csv,.tsv,.kml,.kmz" class="hidden" @change="onFileSelected">

          <div v-if="results.length > 0" class="space-y-3">
            <h3 class="text-sm font-medium text-[var(--text-primary)]">Import Results</h3>
            <div v-for="({ result, format }, idx) in results" :key="idx" class="rounded-lg border border-[var(--border)] p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-[var(--text-primary)]">{{ result.name }}</p>
                  <p class="text-sm text-[var(--text-secondary)]">{{ result.count }} features, {{ result.properties.length }} properties</p>
                </div>
                <button
                  v-if="result.count > 0"
                  class="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:opacity-90"
                  @click="$emit('add', result, format)"
                >
                  Add
                </button>
              </div>
              <div v-for="e in result.errors" :key="e" class="mt-2 text-sm text-red-500">{{ e }}</div>
            </div>
          </div>

          <div v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{{ error }}</div>
        </div>

        <div class="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-3">
          <button class="rounded-md px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]" @click="$emit('close')">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCustomData } from '~/composables/useCustomData'
import type { ImportResult, ImportFormat } from '~/lib/parsers/index'

defineProps<{ show: boolean }>()
const emit = defineEmits<{
  close: []
  add: [result: ImportResult, format: ImportFormat]
}>()

const { importFile, detectFormat } = useCustomData()
const inputRef = ref<HTMLInputElement | null>(null)
const results = ref<{ result: ImportResult; format: ImportFormat }[]>([])
const error = ref('')

async function processFile(file: File) {
  error.value = ''
  const format = detectFormat(file.name)
  if (!format) {
    error.value = `Unsupported file format: ${file.name}`
    return
  }
  const result = await importFile(file)
  if (result.count === 0 && result.errors.length === 0) {
    error.value = 'No valid geographic features found in file'
    return
  }
  results.value.push({ result, format })
}

async function onDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (files) {
    for (let i = 0; i < files.length; i++) await processFile(files[i])
  }
}

async function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files) {
    for (let i = 0; i < files.length; i++) await processFile(files[i])
  }
  target.value = ''
}
</script>
