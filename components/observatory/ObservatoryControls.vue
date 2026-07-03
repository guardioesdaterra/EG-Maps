<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ObservatoryControls as ObservatoryControlsState, ObservatoryStats, ObservatoryFilters, ObservatoryLayers, ObservatoryAnimations, ObservatoryData } from '@/composables/useObservatoryControls'
import type { EnterpriseHQ } from '@/lib/enterprise-data'
import YearSlider from './YearSlider.vue'
import PhaseFilter from './PhaseFilter.vue'

type Props = {
  state: ObservatoryControlsState
  stats: ObservatoryStats
  data: ObservatoryData
  onRedeCorporativa?: () => void
  onDataDownload?: () => void
  onUserContribution?: () => void
  onExpandToFullBrazil?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  onRedeCorporativa: undefined,
  onDataDownload: undefined,
  onUserContribution: undefined,
  onExpandToFullBrazil: undefined,
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
const deepAnalysis = computed(() => props.data.deepAnalysis.value)
const isRegional = computed(() => props.data.isRegional.value)

const layerVis = computed<Record<string, boolean>>({
  get: () => props.state.layerVis.value,
  set: (value) => { props.state.layerVis.value = value }
})
const enterpriseLayerVisible = computed({
  get: () => props.state.enterpriseLayerVisible.value,
  set: (value) => { props.state.enterpriseLayerVisible.value = value }
})
const layers = computed(() => ({
  layerVis,
  enterpriseLayerVisible,
  extraLayers: props.state.extraLayers,
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
const extraLayers = computed(() => props.state.extraLayers)

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
    <!-- Top-right: Title + Badges + Stats + Actions (integrated below menu header) -->
    <div class="absolute top-[clamp(0.75rem,2vh,1rem)] right-[clamp(0.75rem,2vw,1rem)] z-[500] obs-top-right-stack">
      <!-- Title + Badges -->
      <div class="obs-stats-panel">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <h1 class="text-fluid-sm font-black text-red-400 uppercase tracking-tight">Terras Raras Brasil</h1>
        </div>
        <p class="text-[9px] text-zinc-400 leading-tight hidden sm:block">
          <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-red);color:#fff">{{ t('observatory.badges.mil') }}</span>
          <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-green);color:#fff">{{ t('observatory.badges.amb') }}</span>
          <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-purple);color:#fff">{{ t('observatory.badges.ill') }}</span>
          <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-blue-dark);color:#fff">{{ t('observatory.badges.for') }}</span>
          {{ t('home.observatoryDesc') }}
        </p>
      </div>

      <!-- Animated stats counts -->
      <div class="hidden md:flex gap-2 bg-[var(--obs-panel-bg)] backdrop-blur border border-[var(--obs-panel-border)] rounded-xl px-3 py-1.5 shadow-lg">
        <div v-for="s in categoryStats" :key="s.key" class="flex items-center gap-1.5 text-[9px] group cursor-default" :title="s.label">
          <span class="w-2 h-2 rounded-full transition-transform group-hover:scale-150" :style="{ background: s.color }" />
          <span class="font-bold text-zinc-200 tabular-nums">{{ animations.animatedCount(s.key, s.count) }}</span>
          <span class="text-zinc-500 hidden lg:inline">{{ s.label }}</span>
        </div>
        <div class="w-px bg-zinc-700 mx-1" />
        <span class="text-[9px] font-bold text-zinc-300 tabular-nums" aria-live="polite" aria-atomic="true">{{ animations.animatedCount('__total', totalCount) }} total</span>
      </div>

      <!-- Actions row -->
      <div class="flex flex-wrap gap-1.5 max-w-[clamp(16rem,40vw,22rem)]">
        <button type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-red)' }" @click="filters.showTimeline.value = !filters.showTimeline.value">
          <span>📖</span> <span class="hidden sm:inline">Geopolitical Timeline</span><span class="sm:hidden">Timeline</span>
        </button>
        <button v-if="onRedeCorporativa" type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-blue-light)' }" @click="onRedeCorporativa()">
          <span>🔗</span> <span class="hidden sm:inline">Rede Corporativa</span><span class="sm:hidden">Network</span>
        </button>
        <button v-if="onDataDownload" type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-green)' }" @click="onDataDownload()">
          <span>⬇️</span> <span class="hidden sm:inline">Download Data</span><span class="sm:hidden">Download</span>
        </button>
        <button type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-purple-soft)' }" @click="filters.showExport.value = !filters.showExport.value">
          <span>📄</span> Export
        </button>
        <button type="button" class="obs-action-btn" :class="enterpriseLayerVisible ? 'obs-action-btn--active' : ''" :style="{ '--accent': 'var(--obs-purple-soft)' }" @click="emit('toggle-enterprise')">
          <span>🏢</span> <span class="hidden sm:inline">{{ t('observatory.layers.enterpriseHq') }}</span><span class="sm:hidden">HQ</span>
        </button>
        <button type="button" class="obs-action-btn" :style="{ '--accent': 'var(--obs-gray)' }" @click="filters.showShortcuts.value = !filters.showShortcuts.value">
          <span>⌨️</span> ?
        </button>
        <button type="button" class="obs-action-btn" :style="{ '--accent': '#3498db' }" @click="filters.showDataTable.value = !filters.showDataTable.value">
          <span>📊</span> Table
        </button>
        <button type="button" class="obs-action-btn" :style="{ '--accent': '#27ae60' }" @click="filters.showGeoLocate.value = !filters.showGeoLocate.value">
          <span>📍</span> <span class="hidden sm:inline">Near Me</span><span class="sm:hidden">Near</span>
        </button>
        <button v-if="isRegional && onExpandToFullBrazil" type="button" class="obs-action-btn" :style="{ '--accent': '#e67e22' }" @click="onExpandToFullBrazil">
          <span>🌎</span> <span class="hidden sm:inline">Full Brazil</span><span class="sm:hidden">Brazil</span>
        </button>
        <button v-if="onUserContribution" type="button" class="obs-action-btn" :style="{ '--accent': '#2ecc71' }" @click="onUserContribution">
          <span>📝</span> <span class="hidden sm:inline">Monitor</span>
        </button>
      </div>

      <!-- Sync + Secrecy (below actions, away from sidebar) -->
      <div v-if="deepAnalysis" class="hidden lg:flex flex-col gap-1 bg-[var(--obs-panel-bg)] backdrop-blur border border-[var(--obs-panel-border)] rounded-xl px-3 py-2 shadow-lg max-w-[clamp(10rem,20vw,14rem)]">
        <div class="flex items-center gap-1.5 text-[8.5px]" :title="t('observatory.sync.syncNote')">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span class="text-zinc-500 uppercase tracking-wider font-bold">{{ t('observatory.sync.lastSync') }}</span>
          <span class="text-zinc-300 font-mono ml-auto">{{ stats.formatSyncDate(deepAnalysis.last_sync) }}</span>
        </div>
        <div v-if="deepAnalysis.sigilo_stats" class="flex items-center gap-1.5 text-[8.5px] pt-1 border-t border-zinc-800">
          <span class="text-zinc-500 uppercase tracking-wider font-bold">🔒</span>
          <span class="text-zinc-500">{{ t('observatory.sync.secrecyClaims') }}:</span>
          <span class="text-amber-400 font-bold">{{ deepAnalysis.sigilo_stats.total }}</span>
          <span class="text-zinc-400 font-mono ml-auto">{{ stats.formatHa(deepAnalysis.sigilo_stats.total_area_ha) }} {{ t('observatory.sync.secrecyArea') }}</span>
        </div>
      </div>
    </div>

    <!-- Filters panel bottom-left (minimized by default on small screens) -->
    <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] left-[clamp(0.75rem,2vw,1rem)] z-[500] obs-filter-panel">
      <button type="button" class="obs-filter-toggle" @click="filters.filtersExpanded.value = !filters.filtersExpanded.value">
        <span class="obs-filter-toggle__icon">⚙</span>
        <span class="obs-filter-toggle__label">{{ t('observatory.layers.title') }}</span>
        <span v-if="activeFilterCount > 0" class="obs-filter-toggle__badge">{{ activeFilterCount }}</span>
        <span class="obs-filter-toggle__chevron" :class="{ 'obs-filter-toggle__chevron--open': filters.filtersExpanded.value }">›</span>
      </button>

      <Transition name="obs-filter-expand">
        <div v-if="filters.filtersExpanded.value" class="obs-filter-body">
          <YearSlider :year-min="filters.yearMin.value" :year-max="filters.yearMax.value" :filtered-count="filteredCount" @update:year-min="updateYearMin" @update:year-max="updateYearMax" />
          <hr class="border-zinc-800 my-2" />

          <PhaseFilter :selected="filters.selectedPhases.value" @update:selected="updatePhases" />
          <hr class="border-zinc-800 my-2" />

          <h3 class="obs-filter-section-title">{{ t('observatory.layers.title') }}</h3>
          <div
            v-for="c in categories"
            :key="c.key"
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="layers.layerVis.value[c.key]"
            :aria-label="c.label"
            tabindex="0"
            @click="layers.toggleLayer(c.key)"
            @keydown.enter="layers.toggleLayer(c.key)"
            @keydown.space.prevent="layers.toggleLayer(c.key)"
          >
            <div :class="['obs-filter-checkbox__box', layers.layerVis.value[c.key] ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': c.color }">
              <svg v-if="layers.layerVis.value[c.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ c.label }}</span>
          </div>

          <hr class="border-zinc-800 my-1.5" />
          <div
            v-for="ex in extraLayers"
            :key="ex.key"
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="layers.layerVis.value[ex.key]"
            :aria-label="t(ex.labelKey)"
            tabindex="0"
            @click="layers.toggleLayer(ex.key)"
            @keydown.enter="layers.toggleLayer(ex.key)"
            @keydown.space.prevent="layers.toggleLayer(ex.key)"
          >
            <div :class="['obs-filter-checkbox__box', layers.layerVis.value[ex.key] ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': ex.color }">
              <svg v-if="layers.layerVis.value[ex.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t(ex.labelKey) }}</span>
          </div>

          <hr class="border-zinc-800 my-1.5" />

          <!-- Protected areas -->
          <div
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="layers.layerVis.value['protected_ti'] !== false"
            :aria-label="t('observatory.layers.indigenousLands')"
            tabindex="0"
            @click="layers.toggleLayer('protected_ti')"
            @keydown.enter="layers.toggleLayer('protected_ti')"
            @keydown.space.prevent="layers.toggleLayer('protected_ti')"
          >
            <div :class="['obs-filter-checkbox__box', layers.layerVis.value['protected_ti'] !== false ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-red-dark)' }">
              <svg v-if="layers.layerVis.value['protected_ti'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t('observatory.layers.indigenousLands') }}</span>
          </div>
          <div
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="layers.layerVis.value['protected_quilombo'] !== false"
            :aria-label="t('observatory.layers.quilombolaTerritories')"
            tabindex="0"
            @click="layers.toggleLayer('protected_quilombo')"
            @keydown.enter="layers.toggleLayer('protected_quilombo')"
            @keydown.space.prevent="layers.toggleLayer('protected_quilombo')"
          >
            <div :class="['obs-filter-checkbox__box', layers.layerVis.value['protected_quilombo'] !== false ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-amber)' }">
              <svg v-if="layers.layerVis.value['protected_quilombo'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t('observatory.layers.quilombolaTerritories') }}</span>
          </div>
          <div
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="layers.layerVis.value['overlaps'] !== false"
            :aria-label="t('observatory.layers.overlaps')"
            tabindex="0"
            @click="layers.toggleLayer('overlaps')"
            @keydown.enter="layers.toggleLayer('overlaps')"
            @keydown.space.prevent="layers.toggleLayer('overlaps')"
          >
            <div :class="['obs-filter-checkbox__box', layers.layerVis.value['overlaps'] !== false ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-magenta)' }">
              <svg v-if="layers.layerVis.value['overlaps'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t('observatory.layers.overlaps') }}</span>
          </div>
          <div
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="layers.layerVis.value['enterprise_hq'] !== false"
            :aria-label="t('observatory.layers.enterpriseHq')"
            tabindex="0"
            @click="layers.toggleLayer('enterprise_hq')"
            @keydown.enter="layers.toggleLayer('enterprise_hq')"
            @keydown.space.prevent="layers.toggleLayer('enterprise_hq')"
          >
            <div :class="['obs-filter-checkbox__box', layers.layerVis.value['enterprise_hq'] !== false ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-purple-light)' }">
              <svg v-if="layers.layerVis.value['enterprise_hq'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t('observatory.layers.enterpriseHq') }}</span>
          </div>

          <hr class="border-zinc-800 my-1.5" />

          <!-- Sob Demanda toggle -->
          <label
            class="obs-filter-checkbox"
            @click.stop="filters.sobDemandaOnly.value = !filters.sobDemandaOnly.value; filters.debouncedFilter()"
          >
            <div :class="['obs-filter-checkbox__box', filters.sobDemandaOnly.value ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-purple-deep)' }">
              <svg v-if="filters.sobDemandaOnly.value" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="obs-filter-checkbox__label">Sob Demanda</span>
          </label>
        </div>
      </Transition>
    </div>

    <!-- Search bottom-center -->
    <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] left-1/2 -translate-x-1/2 z-[500] hidden sm:block">
      <div class="obs-search">
        <span class="obs-search__icon">🔍</span>
        <input v-model="filters.searchTerm.value" @input="filters.debouncedFilter" :placeholder="t('observatory.search')" class="obs-search__input" />
        <span v-if="filters.searchTerm.value" class="obs-search__clear" @click="filters.searchTerm.value = ''; filters.debouncedFilter()">×</span>
      </div>
    </div>

    <!-- Water legend bottom-right -->
    <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] right-[clamp(0.75rem,2vw,1rem)] z-[500] obs-legend-panel hidden lg:block">
      <h3 class="obs-legend-title">{{ t('observatory.legend.hydrography') }}</h3>
      <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-blue)' }" /><span>{{ t('observatory.legend.basins') }}</span></div>
      <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-purple-light)' }" /><span>{{ t('observatory.legend.aquifers') }}</span></div>
      <div class="obs-legend-item"><div class="obs-legend-line obs-legend-line--dashed" :style="{ background: 'var(--obs-red)', borderColor: 'var(--obs-red-dark)' }" /><span>{{ t('observatory.legend.conflictZones') }}</span></div>
    </div>
  </div>
</template>
