/**
 * components/observatory/ClaimsDataTable.vue
 * @why Tabular view of observatory claims with sort, filter, and pagination
 * @component ClaimsDataTable
 * @props visible: boolean
  data
 * @emits 'close': []
  'fly-to': [coords: [number, number]]
 * @deps vue (ref, computed, watch); @/lib/map-utils (RARE_EARTH_CATEGORIES)
 */
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="claims-dt-backdrop fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="$emit('close')">
        <div class="obs-datatable" role="dialog" aria-label="Claims data table" ref="panelRef">
          <div class="obs-datatable__header">
            <div class="flex items-center gap-3">
              <h2 class="obs-datatable__title">
                <Icon name="lucide:table" class="w-3 h-3 inline mr-1" />
                Claims Data
              </h2>
              <span class="obs-datatable__count">{{ sortedData.length.toLocaleString() }} claims</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="tableSearch"
                class="obs-datatable__search"
                placeholder="Search..."
                aria-label="Search claims"
              />
              <button type="button" class="obs-datatable__close" aria-label="Close" @click="$emit('close')">×</button>
            </div>
          </div>
          <div class="obs-datatable__body" ref="scrollContainer" @scroll="onScroll">
            <table class="obs-datatable__table">
              <thead class="obs-datatable__thead">
                <tr>
                  <th v-for="col in columns" :key="col.key" class="obs-datatable__th" @click="toggleSort(col.key)">
                    <span class="flex items-center gap-1">
                      {{ col.label }}
                      <span v-if="sortKey === col.key" class="text-red-400">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody class="obs-datatable__tbody">
                <tr v-for="row in visibleRows" :key="row.p" class="obs-datatable__row" @click="$emit('fly-to', [row.lo, row.la])">
                  <td class="obs-datatable__td">
                    <span class="obs-datatable__cat-dot" :style="{ background: catColor(row.c) }" />
                  </td>
                  <td class="obs-datatable__td obs-datatable__td--name">{{ row.n || '—' }}</td>
                  <td class="obs-datatable__td font-mono text-[clamp(8px,1.3vw,11px)]">{{ row.p || '—' }}</td>
                  <td class="obs-datatable__td">{{ row.u || '—' }}</td>
                  <td class="obs-datatable__td font-mono">{{ row.y || '—' }}</td>
                  <td class="obs-datatable__td">{{ row.f || '—' }}</td>
                  <td class="obs-datatable__td">
                    <span class="obs-datatable__danger" :style="{ color: dangerColor(row.ds) }">{{ row.ds.toFixed(1) }}</span>
                  </td>
                  <td class="obs-datatable__td font-mono">{{ formatHa(row.a) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import type { RareEarthFeatureSummary } from '@/composables/useRareEarthData'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import { useFocusTrap } from '@/composables/useFocusTrap'

const props = defineProps<{
  visible: boolean
  data: RareEarthFeatureSummary[]
}>()

defineEmits<{
  'close': []
  'fly-to': [coords: [number, number]]
}>()

const scrollContainer = ref<HTMLElement | null>(null)
const tableSearch = ref('')
const sortKey = ref<string>('ds')
const sortDir = ref<'asc' | 'desc'>('desc')
const PAGE_SIZE = 50
const visibleCount = ref(PAGE_SIZE)
const panelRef = ref<HTMLElement | null>(null)
const isActive = computed(() => props.visible)
useFocusTrap(panelRef, { active: isActive })

const columns = [
  { key: 'c', label: '' },
  { key: 'n', label: 'Name' },
  { key: 'p', label: 'Processo' },
  { key: 'u', label: 'UF' },
  { key: 'y', label: 'Year' },
  { key: 'f', label: 'Phase' },
  { key: 'ds', label: 'Danger' },
  { key: 'a', label: 'Area' },
]

const filteredData = computed(() => {
  const term = tableSearch.value.toLowerCase().trim()
  if (!term) return props.data
  return props.data.filter(d =>
    `${d.n} ${d.p} ${d.u} ${d.s} ${d.f}`.toLowerCase().includes(term)
  )
})

const sortedData = computed(() => {
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filteredData.value].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[key] ?? ''
    const bv = (b as unknown as Record<string, unknown>)[key] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

const visibleRows = computed(() => sortedData.value.slice(0, visibleCount.value))

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'ds' ? 'desc' : 'asc'
  }
  visibleCount.value = PAGE_SIZE
}

function onScroll() {
  if (!scrollContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, sortedData.value.length)
  }
}

function catColor(cat: string): string {
  return RARE_EARTH_CATEGORIES[cat]?.color ?? '#666'
}

function dangerColor(score: number): string {
  if (score >= 8) return '#e74c3c'
  if (score >= 6) return '#f39c12'
  return '#27ae60'
}

function formatHa(ha: number): string {
  if (ha >= 10000) return `${Math.round(ha / 1000).toLocaleString()}K`
  return `${ha.toLocaleString()}`
}

watch(() => props.visible, (v) => {
  if (v) visibleCount.value = PAGE_SIZE
})

</script>

<style scoped>
.obs-datatable {
  background: rgba(12, 12, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  width: clamp(320px, 70vw, 800px);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: inherit;
}
.obs-datatable__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(8px, 1.5vw, 16px) clamp(10px, 2vw, 20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: clamp(6px, 1.2vw, 12px);
}
.obs-datatable__title {
  margin: 0;
  font-size: clamp(12px, 1.8vw, 15px);
  font-weight: 700;
  color: #e8e8e8;
}
.obs-datatable__count {
  font-size: clamp(9px, 1.4vw, 12px);
  color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.06);
  padding: clamp(2px, 0.5vw, 6px);
  border-radius: 4px;
}
.obs-datatable__search {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: clamp(2px, 0.5vw, 6px) clamp(6px, 1.2vw, 12px);
  font-size: clamp(10px, 1.5vw, 13px);
  color: rgba(255, 255, 255, 0.8);
  outline: none;
  width: 120px;
  font-family: inherit;
  transition: border-color 0.15s;
}
.obs-datatable__search:focus {
  border-color: rgba(231, 76, 60, 0.4);
}
.obs-datatable__close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: clamp(18px, 3vw, 26px);
  cursor: pointer;
  line-height: 1;
  padding: clamp(2px, 0.5vw, 6px);
  border-radius: 4px;
  transition: all 0.15s;
}
.obs-datatable__close:hover {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}
.obs-datatable__body {
  overflow-y: auto;
  flex: 1;
}
.obs-datatable__table {
  width: 100%;
  border-collapse: collapse;
}
.obs-datatable__thead {
  position: sticky;
  top: 0;
  z-index: 1;
}
.obs-datatable__th {
  padding: clamp(4px, 0.8vw, 8px) clamp(6px, 1.2vw, 12px);
  font-size: clamp(8px, 1.3vw, 11px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-align: left;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.obs-datatable__th:hover {
  color: rgba(255, 255, 255, 0.7);
}
.obs-datatable__row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: background 0.1s;
}
.obs-datatable__row:hover {
  background: rgba(231, 76, 60, 0.06);
}
.obs-datatable__td {
  padding: clamp(4px, 0.8vw, 8px) clamp(6px, 1.2vw, 12px);
  font-size: clamp(10px, 1.5vw, 13px);
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}
.obs-datatable__td--name {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.obs-datatable__cat-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.obs-datatable__danger {
  font-weight: 700;
  font-size: clamp(9px, 1.4vw, 12px);
}

.claims-dt-backdrop { z-index: var(--obs-z-modal-backdrop); }
.modal-fade-enter-active { transition: opacity 0.2s ease; }
.modal-fade-leave-active { transition: opacity 0.15s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active, .modal-fade-leave-active { transition: none; }
}
</style>
