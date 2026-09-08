<template>
  <aside class="cluster-results-panel" aria-label="Cluster results">
    <header class="cluster-results-header">
      <div>
        <p class="cluster-results-eyebrow">{{ datasetLabel }}</p>
        <h2>{{ count }} {{ count === 1 ? 'result' : 'results' }}</h2>
      </div>
      <div class="cluster-results-header-actions">
        <button type="button" class="cluster-results-copy" :aria-label="copied ? 'Cluster link copied' : 'Copy cluster link'" @click="copyClusterLink">{{ copied ? '✓' : '↗' }}</button>
        <button type="button" class="cluster-results-close" aria-label="Close cluster results" @click="$emit('close')">×</button>
      </div>
    </header>

    <label class="cluster-results-search">
      <span class="sr-only">Search cluster results</span>
      <input v-model="query" type="search" placeholder="Search this cluster…" />
    </label>

    <p class="sr-only" aria-live="polite">{{ filteredItems.length }} visible cluster results</p>
    <p v-if="!filteredItems.length" class="cluster-results-empty">No results match this search.</p>
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
import { computed, ref, watch } from 'vue'
import { useClipboard } from '@vueuse/core'

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

defineEmits<{
  close: []
  select: [item: ClusterResultItem]
}>()

const query = ref('')
const { copy, copied } = useClipboard()
const count = computed(() => props.items.length)
const filteredItems = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(q))
})

watch(() => props.items, () => { query.value = '' })

async function copyClusterLink() {
  if (typeof window !== 'undefined') await copy(window.location.href)
}
</script>

<style scoped>
.cluster-results-panel { position: absolute; inset: 0 auto 0 0; z-index: 120; width: min(360px, 88vw); display: flex; flex-direction: column; background: rgba(8, 12, 20, .94); color: #f8fafc; border-right: 1px solid rgba(148, 163, 184, .22); box-shadow: 18px 0 48px rgba(0,0,0,.28); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.cluster-results-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.25rem 1rem 1rem; border-bottom: 1px solid rgba(148,163,184,.16); }
.cluster-results-header-actions { display: flex; align-items: center; gap: .4rem; }
.cluster-results-copy { min-width: 38px; min-height: 38px; border: 1px solid rgba(148,163,184,.22); border-radius: 999px; background: transparent; color: #67e8f9; cursor: pointer; }
.cluster-results-eyebrow { margin: 0 0 .3rem; color: #67e8f9; font: 600 .68rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; }
.cluster-results-header h2 { margin: 0; font-size: 1.1rem; letter-spacing: -.02em; }
.cluster-results-close { min-width: 44px; min-height: 44px; border: 1px solid rgba(148,163,184,.22); border-radius: 999px; background: transparent; color: inherit; font-size: 1.5rem; line-height: 1; cursor: pointer; }
.cluster-results-search { padding: .9rem 1rem .65rem; }
.cluster-results-search input { width: 100%; min-height: 42px; box-sizing: border-box; padding: 0 .8rem; border: 1px solid rgba(148,163,184,.24); border-radius: .65rem; background: rgba(15,23,42,.74); color: inherit; outline: none; }
.cluster-results-search input:focus { border-color: #22d3ee; box-shadow: 0 0 0 3px rgba(34,211,238,.16); }
.cluster-results-list { flex: 1; overflow-y: auto; list-style: none; margin: 0; padding: .4rem .55rem 1rem; }
.cluster-results-item { width: 100%; min-height: 58px; display: flex; align-items: center; gap: .7rem; padding: .7rem .55rem; border: 0; border-radius: .7rem; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.cluster-results-item:hover, .cluster-results-item:focus-visible { background: rgba(148,163,184,.12); outline: none; }
.cluster-results-dot { width: 9px; height: 9px; flex: 0 0 auto; border-radius: 999px; box-shadow: 0 0 0 5px rgba(34,211,238,.1); }
.cluster-results-item-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: .22rem; }
.cluster-results-item-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .85rem; }
.cluster-results-item-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(226,232,240,.62); font-size: .72rem; }
.cluster-results-arrow { color: #67e8f9; font-size: 1rem; }
.cluster-results-empty { margin: 1rem; color: rgba(226,232,240,.62); font-size: .85rem; }
@media (max-width: 640px) { .cluster-results-panel { width: min(340px, 92vw); } }
</style>
