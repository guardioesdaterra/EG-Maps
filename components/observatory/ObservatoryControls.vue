<script setup lang="ts">
import { computed } from 'vue'
import type { ObservatoryControls as ObservatoryControlsState, ObservatoryStats, ObservatoryFilters, ObservatoryLayers } from '@/composables/useObservatoryControls'
import type { EnterpriseHQ } from '@/lib/enterprise-data'
import YearSlider from './YearSlider.vue'
import PhaseFilter from './PhaseFilter.vue'

type Props = {
  state: ObservatoryControlsState
  stats: ObservatoryStats
  onRedeCorporativa?: () => void
  onDataDownload?: () => void
  onUserContribution?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  onRedeCorporativa: undefined,
  onDataDownload: undefined,
  onUserContribution: undefined,
})

const emit = defineEmits<{
  (e: 'toggle-enterprise' | 'toggle-pin-picker' | 'clear-pin' | 'fly-to-user-pin' | 'copy-pin-url' | 'toggle-legend'): void
  (e: 'fly-to-enterprise', name: string): void
  (e: 'update', payload: { key: 'user-location-radius'; value: number } | { key: 'year-min'; value: number } | { key: 'year-max'; value: number } | { key: 'selected-phases'; value: Set<string> }): void
}>()

const { t } = useI18n()

const activeFilterCount = computed(() => props.stats.activeFilterCount.value)
const categoryStats = computed(() => props.stats.categoryStats.value)
const totalCount = computed(() => props.stats.totalCount.value)
const filteredCount = computed(() => props.stats.filteredCount.value)
const activeFilterSummary = computed(() => props.stats.activeFilterSummary.value)
const enterpriseLayerVisible = computed(() => props.state.enterpriseLayerVisible.value)

const layerVis = computed<Record<string, boolean>>({
  get: () => props.state.layerVis.value,
  set: (value) => { props.state.layerVis.value = value }
})
const enterpriseLayerVisible = computed({
  get: () => props.state.enterpriseLayerVisible.value,
  set: (value) => { props.state.enterpriseLayerVisible.value = value }
})
const layers = computed<ObservatoryLayers>(() => ({
  layerVis,
  enterpriseLayerVisible,
  toggleLayer: props.state.toggleLayer,
  toggleEnterpriseLayer: props.state.toggleEnterpriseLayer,
  onEnterpriseClick: props.state.onEnterpriseClick,
}))

const filters = computed<ObservatoryFilters>(() => ({
  yearMin: props.state.yearMin,
  yearMax: props.state.yearMax,
  selectedPhases: props.state.selectedPhases,
  searchTerm: props.state.searchTerm,
  sobDemandaOnly: props.state.sobDemandaOnly,
  filtersExpanded: props.state.filtersExpanded,
  activeTab: props.state.activeTab,
  showShortcuts: props.state.showShortcuts,
  showDataTable: props.state.showDataTable,
  showTimeline: props.state.showTimeline,
  showExport: props.state.showExport,
  showGeoLocate: props.state.showGeoLocate,
  showClaimReport: props.state.showClaimReport,
  reportClaim: props.state.reportClaim,
  userLocationRadius: props.state.userLocationRadius,
  mapContainerRef: props.state.mapContainerRef,
  debouncedFilter: props.state.debouncedFilter,
  updateFilter: props.state.updateFilter,
}))

const animations = computed<ObservatoryAnimations>(() => ({
  displayCounts: props.state.displayCounts,
  startCounterAnimation: props.state.startCounterAnimation,
  animatedCount: props.state.animatedCount,
  animateCounters: props.state.animateCounters,
  totalCount: props.state.totalCount,
}))

const categories = computed(() => categoryStats.value.map(s => ({ key: s.key, label: s.label, color: s.color })))

const extraLayers = computed(() => [
  { key: 'heatmap', labelKey: 'observatory.layers.heatmap', color: '#f59e0b' },
  { key: 'cultural', labelKey: 'observatory.layers.cultural', color: '#8b5cf6' },
  { key: 'sites', labelKey: 'observatory.layers.sites', color: '#0ea5e9' },
  { key: 'network', labelKey: 'observatory.layers.network', color: '#10b981' },
])

function onEnterpriseClick(enterprise: EnterpriseHQ) {
  props.state.flyToEnterprise(enterprise.name)
}

function updateYearMin(value: number) {
  props.state.yearMin.value = value
  props.state.debouncedFilter()
}

function updateYearMax(value: number) {
  props.state.yearMax.value = value
  props.state.debouncedFilter()
}

function updatePhases(value: Set<string>) {
  props.state.selectedPhases.value = value
  props.state.debouncedFilter()
}
</script>

<template>
  <div>
    <!-- Top row: stats + sync -->
    <div class="absolute top-[clamp(0.75rem,2vh,1rem)] left-[clamp(0.75rem,2vw,1rem)] z-[500] obs-stats-panel">
      <div class="flex items-center gap-2 mb-1.5">
        <span class="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
        <h1 class="text-fluid-sm font-black text-red-400 uppercase tracking-tight">Terras Raras Brasil</h1>
      </div>
      <p class="text-[9px] text-zinc-400 leading-tight hidden sm:block">
        <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-red);color:#fff">MIL</span>
        <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-green);color:#fff">AMB</span>
        <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-purple);color:#fff">ILL</span>
        <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-blue-dark);color:#fff">FOR</span>
        <span>Rare Earth Mining Claims</span>
      </p>
    </div>

    <div class="absolute top-[clamp(0.75rem,2vh,1rem)] left-1/2 -translate-x-1/2 z-[500] hidden md:flex gap-2 bg-[var(--obs-panel-bg)] backdrop-blur border border-[var(--obs-panel-border)] rounded-xl px-3 py-1.5 shadow-lg">
      <div v-for="s in categoryStats" :key="s.key" class="flex items-center gap-1.5 text-[9px] group cursor-default" :title="s.label">
        <span class="w-2 h-2 rounded-full transition-transform group-hover:scale-150" :style="{ background: s.color }" />
        <span class="font-bold text-zinc-200 tabular-nums">{{ animations.animatedCount(s.key, s.count) }}</span>
        <span class="text-zinc-500 hidden lg:inline">{{ s.label }}</span>
      </div>
      <div class="w-px bg-zinc-700 mx-1" />
      <span class="text-[9px] font-bold text-zinc-300 tabular-nums" aria-live="polite" aria-atomic="true">{{ animations.animatedCount('__total', totalCount) }} total</span>
    </div>

    <!-- Actions row -->
    <div class="absolute top-[clamp(3.5rem,10vh,5rem)] left-[clamp(0.75rem,2vw,1rem)] z-[500] flex flex-wrap gap-1.5 max-w-[clamp(16rem,40vw,22rem)]">
      <button type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-red)' }" @click="() => { filters.showTimeline = !filters.showTimeline }">
        <span>📖</span> <span class="hidden sm:inline">Geopolitical Timeline</span><span class="sm:hidden">Timeline</span>
      </button>
      <button v-if="onRedeCorporativa" type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-blue-light)' }" @click="onRedeCorporativa()">
        <span>🔗</span> <span class="hidden sm:inline">Rede Corporativa</span><span class="sm:hidden">Network</span>
      </button>
      <button v-if="onDataDownload" type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-green)' }" @click="onDataDownload()">
        <span>⬇️</span> <span class="hidden sm:inline">Download Data</span><span class="sm:hidden">Download</span>
      </button>
      <button type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-purple-soft)' }" @click="() => { filters.showExport = !filters.showExport }">
        <span>📄</span> Export
      </button>
      <button type="button" class="obs-action-btn" :class="enterpriseLayerVisible ? 'obs-action-btn--active' : ''" :style="{ '--accent': 'var(--obs-purple-soft)' }" @click="emit('toggle-enterprise')">
        <span>🏢</span> <span class="hidden sm:inline">{{ t('observatory.layers.enterpriseHq') }}</span><span class="sm:hidden">HQ</span>
      </button>
      <button type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-gray)' }" @click="() => { filters.showShortcuts = !filters.showShortcuts }">
        <span>⌨️</span> ?
      </button>
      <button type="button" class="obs-action-btn" :style="{ '--accent': '#3498db' }" @click="() => { filters.showDataTable = !filters.showDataTable }">
        <span>📊</span> Table
      </button>
      <button type="button" class="obs-action-btn" :style="{ '--accent': '#27ae60' }" @click="() => { filters.showGeoLocate = !filters.showGeoLocate }">
        <span>📍</span> <span class="hidden sm:inline">Near Me</span><span class="sm:hidden">Near</span>
      </button>
      <button type="button" class="obs-action-btn" :style="{ '--accent': '#e67e22' }" @click="() => { filters.filtersExpanded = !filters.filtersExpanded }">
        <span>🌍</span> Layers
      </button>
      <button v-if="onUserContribution" type="button" class="obs-action-btn" :style="{ '--accent': '#2ecc71' }" @click="onUserContribution">
        <span>📝</span> <span class="hidden sm:inline">Monitor</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] left-[clamp(0.75rem,2vw,1rem)] z-[500] obs-filter-panel">
      <button type="button" class="obs-filter-toggle" @click="filters.filtersExpanded = !filters.filtersExpanded">
        <span class="obs-filter-toggle__icon">⚙</span>
        <span class="obs-filter-toggle__label">{{ t('observatory.layers.title') }}</span>
        <span v-if="activeFilterCount > 0" class="obs-filter-toggle__badge">{{ activeFilterCount }}</span>
        <span class="obs-filter-toggle__chevron" :class="{ 'obs-filter-toggle__chevron--open': filters.filtersExpanded }">›</span>
      </button>

      <Transition name="obs-filter-expand">
        <div v-if="filters.filtersExpanded" class="obs-filter-body">
          <YearSlider :year-min="filters.yearMin" :year-max="filters.yearMax" :filtered-count="filteredCount" @update:year-min="updateYearMin" @update:year-max="updateYearMax" />
          <hr class="border-zinc-800 my-2" />

          <PhaseFilter :selected="filters.selectedPhases" @update:selected="updatePhases" />
          <hr class="border-zinc-800 my-2" />

          <h3 class="obs-filter-section-title">{{ t('observatory.layers.title') }}</h3>
          <div
            v-for="c in categories"
            :key="c.key"
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="layers.layerVis[c.key]"
            :aria-label="c.label"
            tabindex="0"
            @click="layers.toggleLayer(c.key)"
            @keydown.enter="layers.toggleLayer(c.key)"
            @keydown.space.prevent="layers.toggleLayer(c.key)"
          >
            <div :class="['obs-filter-checkbox__box', layers.layerVis[c.key] ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': c.color }">
              <svg v-if="layers.layerVis[c.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ c.label }}</span>
          </div>

          <hr class="border-zinc-800 my-1.5" />
          <div
            v-for="ex in extraLayers"
            :key="ex.key"
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="layers.layerVis[ex.key]"
            :aria-label="t(ex.labelKey)"
            tabindex="0"
            @click="layers.toggleLayer(ex.key)"
            @keydown.enter="layers.toggleLayer(ex.key)"
            @keydown.space.prevent="layers.toggleLayer(ex.key)"
          >
            <div :class="['obs-filter-checkbox__box', layers.layerVis[ex.key] ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': ex.color }">
              <svg v-if="layers.layerVis[ex.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t(ex.labelKey) }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] left-1/2 -translate-x-1/2 z-[500] hidden sm:block">
      <div class="obs-search">
        <span class="obs-search__icon">🔍</span>
        <input v-model="filters.searchTerm" @input="filters.debouncedFilter" :placeholder="t('observatory.search')" class="obs-search__input" />
        <span v-if="filters.searchTerm" class="obs-search__clear" @click="filters.searchTerm = ''; filters.debouncedFilter()">×</span>
      </div>
    </div>

    <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] right-[clamp(0.75rem,2vw,1rem)] z-[500] obs-legend-panel hidden md:block">
      <h3 class="obs-legend-title">{{ t('observatory.legend.hydrography') }}</h3>
      <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-blue)' }" /><span>{{ t('observatory.legend.basins') }}</span></div>
      <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-purple-light)' }" /><span>{{ t('observatory.legend.aquifers') }}</span></div>
      <div class="obs-legend-item"><div class="obs-legend-line obs-legend-line--dashed" :style="{ background: 'var(--obs-red)', borderColor: 'var(--obs-red-dark)' }" /><span>{{ t('observatory.legend.conflictZones') }}</span></div>
    </div>
  </div>
</template>

<style>