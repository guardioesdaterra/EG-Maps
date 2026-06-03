<template>
  <Transition name="fade">
    <div v-if="visible" class="download-overlay" @click.self="close" @keydown.esc="close">
      <div ref="modalRef" class="download-panel" role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
        <div class="download-header">
          <div class="download-header-left">
            <span class="download-badge">DATA EXPORT</span>
            <h2 id="download-modal-title" class="download-title">Download All Data</h2>
            <p class="download-subtitle">JSON, GeoJSON & CSV formats — for research, analysis & verification</p>
          </div>
          <button class="download-close" @click="close" aria-label="Close"><Icon name="lucide:x" class="w-4 h-4" /></button>
        </div>

        <div class="download-body">
          <div class="download-all-row">
            <button class="download-all-btn" @click="downloadAll">
              <span class="download-all-icon">⬇</span>
              <span class="download-all-text">Download ALL Datasets ({{ datasets.length }} files)</span>
            </button>
          </div>

          <div class="download-divider">
            <span>or select individually</span>
          </div>

          <div class="download-list">
            <div v-for="ds in datasets" :key="ds.id" class="download-item" @click="downloadOne(ds)">
              <div class="download-item-left">
                <div class="download-item-format" :class="ds.format">
                  {{ ds.format.toUpperCase() }}
                </div>
                <div class="download-item-info">
                  <span class="download-item-title">{{ ds.label }}</span>
                  <span class="download-item-desc">{{ ds.description }}</span>
                </div>
              </div>
              <button class="download-item-btn" title="Download">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="download-footer">
          <p>All data is from public sources (ANM, company filings, press releases). Verify independently.</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DOWNLOADABLE_DATASETS, downloadData, downloadAllDatasets, type DownloadableDataset } from '@/composables/useDataDownload'
import { useFocusTrap } from '@/composables/useFocusTrap'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()
const close = () => emit('close')

const modalRef = ref<HTMLDivElement | null>(null)
const isActive = computed(() => props.visible)
useFocusTrap(modalRef, { active: isActive })

const datasets = DOWNLOADABLE_DATASETS
const toast = useToast()

async function downloadOne(ds: DownloadableDataset) {
  try {
    await downloadData(ds)
    toast.success(ds.label || ds.id)
  } catch {
    toast.error('Download failed')
  }
}

async function downloadAll() {
  try {
    await downloadAllDatasets()
    toast.success('All datasets downloaded')
  } catch {
    toast.error('Bulk download failed')
  }
}
</script>

<style scoped>
.download-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.download-panel {
  width: 520px;
  max-width: 100vw;
  max-height: 90vh;
  background: #0a0a0f;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.download-header {
  padding: 24px 20px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.download-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(39,174,96,0.15);
  color: #27ae60;
  margin-bottom: 8px;
}
.download-title {
  font-size: 20px;
  font-weight: 800;
  color: #f0f0f0;
  margin: 0 0 4px;
}
.download-subtitle {
  font-size: 11px;
  color: #777;
  margin: 0;
}
.download-close {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  background: transparent;
  color: #888;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.download-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.download-all-row {
  margin-bottom: 16px;
}
.download-all-btn {
  width: 100%;
  padding: 14px;
  border: 2px dashed rgba(39,174,96,0.3);
  border-radius: 10px;
  background: rgba(39,174,96,0.05);
  color: #27ae60;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background-color 0.2s, border-color 0.2s;
  font-family: inherit;
}
.download-all-btn:hover {
  background: rgba(39,174,96,0.1);
  border-color: #27ae60;
}
.download-all-icon {
  font-size: 20px;
}
.download-all-text {
  font-size: 14px;
  font-weight: 700;
}
.download-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 9px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.download-divider::before,
.download-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.06);
}
.download-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.download-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}
.download-item:hover {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.08);
}
.download-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.download-item-format {
  font-size: 8px;
  font-weight: 800;
  padding: 3px 6px;
  border-radius: 3px;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}
.download-item-format.json { background: rgba(52,152,219,0.15); color: #5dade2; }
.download-item-format.csv { background: rgba(46,204,113,0.15); color: #58d68d; }
.download-item-format.geojson { background: rgba(155,89,182,0.15); color: #af7ac5; }
.download-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.download-item-title {
  font-size: 12px;
  font-weight: 600;
  color: #ddd;
}
.download-item-desc {
  font-size: 10px;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.download-item-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.15s, color 0.15s;
}
.download-item-btn:hover {
  background: rgba(255,255,255,0.05);
  color: #27ae60;
}
.download-footer {
  padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 9px;
  color: #555;
  text-align: center;
}
.download-footer p { margin: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
