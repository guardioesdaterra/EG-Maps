<template>
  <aside ref="panelRef" class="cluster-results-panel" :class="{ 'is-mobile-expanded': mobileExpanded }" role="dialog" :aria-modal="isMobile && mobileExpanded" aria-labelledby="cluster-results-title" aria-describedby="cluster-results-status" tabindex="-1">
    <button v-if="isMobile" type="button" class="cluster-results-handle" :aria-label="t(mobileExpanded ? 'mapControls.clusterPanel.collapse' : 'mapControls.clusterPanel.expand')" :aria-expanded="mobileExpanded" @pointerdown="startHandleGesture" @pointerup="endHandleGesture" @pointercancel="cancelHandleGesture" @click="toggleMobileExpanded">
      <span aria-hidden="true" />
    </button>
    <header class="cluster-results-header">
      <div>
        <p class="cluster-results-eyebrow">{{ datasetLabel }}</p>
        <h2 id="cluster-results-title">{{ t('mapControls.clusterPanel.count', { count }) }}</h2>
      </div>
      <div class="cluster-results-header-actions">
        <button type="button" class="cluster-results-copy" :aria-label="copied ? t('mapControls.clusterPanel.linkCopied') : t('mapControls.clusterPanel.copyLink')" @click="copyClusterLink"><span aria-hidden="true">{{ copied ? '✓' : '↗' }}</span></button>
        <button type="button" class="cluster-results-close" :aria-label="t('mapControls.clusterPanel.close')" @click="$emit('close')">×</button>
      </div>
    </header>

    <label class="cluster-results-search">
      <span class="sr-only">{{ t('mapControls.clusterPanel.searchLabel') }}</span>
      <input id="cluster-results-search" v-model="query" type="search" :placeholder="t('mapControls.clusterPanel.searchPlaceholder')" />
    </label>

    <p id="cluster-results-status" class="sr-only" aria-live="polite">{{ t('mapControls.clusterPanel.visibleResults', { count: filteredItems.length }) }}</p>
    <p v-if="!filteredItems.length" class="cluster-results-empty" role="status" aria-live="polite">{{ t('mapControls.clusterPanel.empty') }}</p>
    <ul v-else class="cluster-results-list">
      <li v-for="item in filteredItems" :key="item.id">
        <button type="button" class="cluster-results-item" @click="$emit('select', item)">
          <span class="cluster-results-dot" :style="{ backgroundColor: item.color || '#22d3ee' }" aria-hidden="true" />
          <span class="cluster-results-item-copy">
            <strong>{{ item.title }}</strong>
            <small>{{ item.subtitle }}</small>
          </span>
          <span class="cluster-results-arrow" aria-hidden="true">→</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useI18n } from '@/composables/useI18n'
import { useMediaQuery } from '@/composables/useMediaQuery'

export interface ClusterResultItem {
  id: string
  title: string
  subtitle: string
  color?: string
  coordinates: [number, number]
}

const props = defineProps<{
  items: ClusterResultItem[]
  datasetLabel: string
}>()

const emit = defineEmits<{
  close: []
  select: [item: ClusterResultItem]
}>()

const query = ref('')
const panelRef = ref<HTMLElement | null>(null)
const returnFocusTarget = ref<HTMLElement | null>(null)
const isMobile = useMediaQuery('(max-width: 768px)')
const mobileExpanded = ref(false)
let gestureStartY: number | null = null
let gestureHandled = false
const { t } = useI18n()
const { copy, copied } = useClipboard()
const count = computed(() => props.items.length)
const filteredItems = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(q))
})

watch(() => props.items, () => { query.value = '' })

onMounted(() => {
  returnFocusTarget.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
  panelRef.value?.focus()
})

onUnmounted(() => {
  nextTick(() => {
    if (returnFocusTarget.value?.isConnected) returnFocusTarget.value.focus()
  })
})

async function copyClusterLink() {
  if (typeof window !== 'undefined') await copy(window.location.href)
}

function startHandleGesture(event: PointerEvent) {
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  gestureStartY = event.clientY
  gestureHandled = false
}

function endHandleGesture(event: PointerEvent) {
  if (gestureStartY === null) return
  const deltaY = event.clientY - gestureStartY
  gestureStartY = null
  if (deltaY < -45) {
    mobileExpanded.value = true
    gestureHandled = true
  } else if (deltaY > 45) {
    gestureHandled = true
    emit('close')
  }
}

function cancelHandleGesture() {
  gestureStartY = null
}

function toggleMobileExpanded() {
  if (gestureHandled) {
    gestureHandled = false
    return
  }
  mobileExpanded.value = !mobileExpanded.value
}
</script>

<style scoped>
.cluster-results-panel { position: fixed; inset: 0 auto 0 0; z-index: var(--z-map-sheet, 2147482000); width: min(360px, 88vw); display: flex; flex-direction: column; background: var(--glass-bg); color: var(--text-primary); border-right: 1px solid var(--glass-border); box-shadow: 18px 0 48px rgba(0,0,0,.28); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.cluster-results-handle { display: none; }
.cluster-results-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.25rem 1rem 1rem; border-bottom: 1px solid rgba(148,163,184,.16); }
.cluster-results-header-actions { display: flex; align-items: center; gap: .4rem; }
.cluster-results-copy { min-width: 38px; min-height: 38px; border: 1px solid rgba(148,163,184,.22); border-radius: 999px; background: transparent; color: var(--primary); cursor: pointer; }
.cluster-results-eyebrow { margin: 0 0 .3rem; color: var(--primary); font: 600 .68rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; }
.cluster-results-header h2 { margin: 0; font-size: 1.1rem; letter-spacing: -.02em; }
.cluster-results-close { min-width: 44px; min-height: 44px; border: 1px solid rgba(148,163,184,.22); border-radius: 999px; background: transparent; color: inherit; font-size: 1.5rem; line-height: 1; cursor: pointer; }
.cluster-results-search { padding: .9rem 1rem .65rem; }
.cluster-results-search input { width: 100%; min-height: 42px; box-sizing: border-box; padding: 0 .8rem; border: 1px solid var(--input-border); border-radius: .65rem; background: var(--input-bg); color: var(--input-text); outline: none; }
.cluster-results-search input::placeholder { color: var(--input-placeholder); }
.cluster-results-search input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent); }
.cluster-results-list { flex: 1; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: .4rem .55rem 1rem; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.cluster-results-item { width: 100%; min-height: 58px; display: flex; align-items: center; gap: .7rem; padding: .7rem .55rem; border: 0; border-radius: .7rem; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.cluster-results-item:hover, .cluster-results-item:focus-visible { background: rgba(148,163,184,.12); }
.cluster-results-copy:focus-visible, .cluster-results-close:focus-visible, .cluster-results-search input:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.cluster-results-item:focus-visible, .cluster-results-panel:focus { outline: 3px solid var(--primary); outline-offset: 2px; }
.cluster-results-dot { width: 9px; height: 9px; flex: 0 0 auto; border-radius: 999px; box-shadow: 0 0 0 5px rgba(34,211,238,.1); }
.cluster-results-item-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: .22rem; }
.cluster-results-item-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .85rem; }
.cluster-results-item-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); font-size: .72rem; }
.cluster-results-arrow { color: var(--primary); font-size: 1rem; }
.cluster-results-empty { margin: 1rem; color: var(--text-secondary); font-size: .85rem; }
@media (max-width: 768px) {
  .cluster-results-panel {
    inset: auto max(0.5rem, env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 0.5rem) max(0.5rem, env(safe-area-inset-left));
    width: auto;
    height: min(42dvh, 24rem);
    border: 1px solid var(--glass-border);
    border-radius: 1.25rem;
    box-shadow: 0 -12px 42px rgba(0, 0, 0, .4);
    overflow: hidden;
    transition: inset .24s ease, height .24s ease, border-radius .24s ease;
  }
  .cluster-results-panel.is-mobile-expanded {
    inset: 0;
    width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    border-radius: 1.25rem 1.25rem 0 0;
  }
  .cluster-results-handle {
    position: absolute;
    z-index: 2;
    top: .2rem;
    left: 50%;
    display: flex;
    width: 4rem;
    height: 1.8rem;
    align-items: center;
    justify-content: center;
    padding: .4rem;
    transform: translateX(-50%);
    border: 0;
    background: transparent;
    cursor: grab;
    touch-action: none;
  }
  .cluster-results-handle span { width: 2.5rem; height: .25rem; border-radius: 999px; background: var(--text-muted); opacity: .7; }
  .cluster-results-header { padding-top: 2rem; }
}
</style>
