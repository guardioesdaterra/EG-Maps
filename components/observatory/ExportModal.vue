/**
 * components/observatory/ExportModal.vue
 * @why Modal for exporting observatory data in various formats
 * @component ExportModal
 * @props visible: boolean
  mapContainer
 * @emits close: []
 * @deps vue (ref, computed); @/lib/map-export (exportMapToImage); @/composables/useFocusTrap (useFocusTrap)
 */
<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 flex items-center justify-center p-4 export-modal-backdrop" role="dialog" :aria-modal="true" :aria-label="t('observatory.export.title')">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="$emit('close')" />
      <div class="export-modal-panel w-full max-w-sm" ref="modalRef">
        <div class="p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold text-zinc-100 uppercase tracking-wider">{{ t('observatory.export.title') }}</h2>
            <button type="button" class="text-zinc-500 hover:text-zinc-300 text-lg leading-none" :aria-label="t('observatory.export.close')" @click="$emit('close')">×</button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-[clamp(10px,1.5vw,13px)] text-zinc-500 uppercase tracking-wider font-bold mb-1.5">{{ t('observatory.export.format') }}</label>
              <div class="flex gap-2">
                <button
v-for="fmt in formats" :key="fmt.key" type="button"
                  class="flex-1 px-3 py-2 text-[clamp(10px,1.5vw,13px)] font-bold rounded-lg border transition-all text-center"
                  :class="selectedFormat === fmt.key
                    ? 'border-green-500/40 bg-green-500/15 text-green-400'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500'"
                  @click="selectedFormat = fmt.key">
                  {{ fmt.label }}
                </button>
              </div>
            </div>

            <div v-if="selectedFormat === 'png'">
              <label class="block text-[clamp(10px,1.5vw,13px)] text-zinc-500 uppercase tracking-wider font-bold mb-1.5">{{ t('observatory.export.resolution') }}</label>
              <div class="flex gap-2">
                <button
v-for="res in resolutions" :key="res.key" type="button"
                  class="flex-1 px-3 py-2 text-[clamp(10px,1.5vw,13px)] font-bold rounded-lg border transition-all text-center"
                  :class="selectedResolution === res.key
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500'"
                  @click="selectedResolution = res.key">
                  {{ res.label }}
                </button>
              </div>
            </div>

            <div v-if="selectedFormat === 'pdf'">
              <label class="block text-[clamp(10px,1.5vw,13px)] text-zinc-500 uppercase tracking-wider font-bold mb-1.5">{{ t('observatory.export.paperSize') }}</label>
              <div class="flex gap-2">
                <button
v-for="ps in paperSizes" :key="ps.key" type="button"
                  class="flex-1 px-3 py-2 text-[clamp(10px,1.5vw,13px)] font-bold rounded-lg border transition-all text-center"
                  :class="selectedPaperSize === ps.key
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500'"
                  @click="selectedPaperSize = ps.key">
                  {{ ps.label }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="includeLegend" class="rounded" />
                <span class="text-[clamp(10px,1.5vw,13px)] text-zinc-400">{{ t('observatory.export.includeLegend') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="includeTitle" class="rounded" />
                <span class="text-[clamp(10px,1.5vw,13px)] text-zinc-400">{{ t('observatory.export.includeTitle') }}</span>
              </label>
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button
type="button"
              class="flex-1 px-3 py-2 text-[clamp(10px,1.5vw,13px)] font-bold rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
              @click="$emit('close')">
              {{ t('observatory.export.cancel') }}
            </button>
            <button
type="button"
              class="flex-1 px-3 py-2 text-[clamp(10px,1.5vw,13px)] font-bold rounded-lg border border-green-500/40 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
              :disabled="isExporting"
              @click="doExport">
              {{ isExporting ? t('observatory.export.exporting') : t('observatory.export.download') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, computed } from 'vue'
import { exportMapToImage } from '@/lib/map-export'
import { useFocusTrap } from '@/composables/useFocusTrap'

const props = defineProps<{
  visible: boolean
  mapContainer: HTMLElement | null
  filterSummary?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const modalRef = ref<HTMLElement | null>(null)
const isActive = computed(() => props.visible)
useFocusTrap(modalRef, { active: isActive })

const selectedFormat = ref<'png' | 'pdf'>('png')
const selectedResolution = ref<'1x' | '2x'>('2x')
const selectedPaperSize = ref<'a4' | 'letter'>('a4')
const includeLegend = ref(true)
const includeTitle = ref(true)
const isExporting = ref(false)

const formats = [
  { key: 'png' as const, label: 'PNG Image' },
  { key: 'pdf' as const, label: 'PDF Document' },
]
const resolutions = [
  { key: '1x' as const, label: '1x (Standard)' },
  { key: '2x' as const, label: '2x (High DPI)' },
]
const paperSizes = [
  { key: 'a4' as const, label: 'A4' },
  { key: 'letter' as const, label: 'Letter' },
]

async function doExport() {
  if (!props.mapContainer) return
  isExporting.value = true
  try {
    await exportMapToImage(props.mapContainer, {
      format: selectedFormat.value,
      resolution: selectedResolution.value,
      paperSize: selectedPaperSize.value,
      includeLegend: includeLegend.value,
      includeTitle: includeTitle.value,
    }, {
      title: 'Observatory of Vulcan — Rare Earth Mining Claims',
      filterSummary: props.filterSummary,
    })
    emit('close')
  } catch { /* noop */
  } finally {
    isExporting.value = false
  }
}
</script>

<style scoped>
.export-modal-backdrop { z-index: var(--obs-z-modal-backdrop); }
.export-modal-panel {
  background: var(--obs-panel-bg-dark);
  backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid var(--obs-panel-border);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
</style>
