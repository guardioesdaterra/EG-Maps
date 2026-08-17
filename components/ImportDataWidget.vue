/**
 * components/ImportDataWidget.vue
 * @why Composite import widget — manages ImportModal, CustomLayerPanel, and feature detail popup. Modal state is shared via useCustomData composable so the dock trigger can open it.
 */
<template>
  <div v-if="!isEmbed">
    <ImportModal :show="showImportModal" @close="showImportModal = false" @add="handleAdd" />
    <div class="absolute bottom-4 right-4 z-[900] min-w-[200px] max-w-[280px]" :style="{ bottom: '5rem' }">
      <CustomLayerPanel />
    </div>
    <div v-if="selectedCustomFeature" ref="popupOverlayRef" class="custom-popup-overlay-fixed" role="dialog" aria-modal="true" tabindex="0" @click.self="selectFeature(null)" @keydown.esc="selectFeature(null)">
      <div class="custom-popup-content">
        <button class="custom-popup-close-btn" @click="selectFeature(null)" aria-label="Close">
          <Icon name="lucide:x" class="h-5 w-5" />
        </button>
        <img v-if="featureImage" :src="featureImage" :alt="featureTitle" class="mb-3 w-full rounded-lg object-cover" style="max-height: 200px" @error="onImageError">
        <h3 class="text-lg font-semibold text-[var(--text-primary)]">{{ featureTitle }}</h3>
        <p v-if="featureDesc" class="mt-1 text-sm text-[var(--text-secondary)]">{{ featureDesc }}</p>
        <table v-if="featureProps.length > 0" class="mt-3 w-full text-sm">
          <tr v-for="[key, val] in featureProps" :key="key" class="border-t border-[var(--border)]">
            <td class="py-1 pr-2 font-medium text-[var(--text-secondary)]">{{ key }}</td>
            <td class="py-1 text-[var(--text-primary)]">{{ val }}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useCustomData } from '~/composables/useCustomData'
import type { ImportResult, ImportFormat } from '~/lib/parsers/index'

defineProps<{ isEmbed?: boolean }>()

const { addDataset, selectedCustomFeature, selectFeature, showImportModal } = useCustomData()
const popupOverlayRef = ref<HTMLElement | null>(null)

watch(selectedCustomFeature, (f) => {
  if (f) nextTick(() => popupOverlayRef.value?.focus())
})

function handleAdd(result: ImportResult, format: ImportFormat) {
  addDataset(result, format)
  showImportModal.value = false
}

const featureTitle = computed(() => {
  const p = selectedCustomFeature.value?.properties
  if (!p) return 'Unknown'
  return p.name || p.title || p.Nome || 'Feature'
})

const featureDesc = computed(() => {
  const p = selectedCustomFeature.value?.properties
  if (!p) return ''
  return p.description || p.Descricao || ''
})

const featureImage = ref<string | null>(null)

watch(selectedCustomFeature, (f) => {
  featureImage.value = null
  if (!f?.properties) return
  const url = f.properties.image_url || f.properties.image || f.properties.Imagem
  if (url && typeof url === 'string') featureImage.value = url
}, { immediate: true })

function onImageError() { featureImage.value = null }

const featureProps = computed(() => {
  const p = selectedCustomFeature.value?.properties
  if (!p) return []
  const skip = new Set(['name', 'title', 'Nome', 'description', 'Descricao', 'image_url', 'image', 'Imagem', 'lat', 'latitude', 'lon', 'lng', 'longitude'])
  return Object.entries(p).filter(([k]) => !skip.has(k))
})
</script>

<style scoped>
.custom-popup-overlay-fixed {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
}
.custom-popup-content {
  max-width: 32rem;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 0.75rem;
  background: var(--bg-primary);
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}
.custom-popup-close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  color: var(--text-secondary);
}
.custom-popup-close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
</style>
