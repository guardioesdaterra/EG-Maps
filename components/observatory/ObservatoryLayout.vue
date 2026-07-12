<script setup lang="ts">
import { computed, ref, toRefs, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ObservatoryControls as OControls, ObservatoryData } from '@/composables/useObservatoryControls'
import type { UserPin } from '@/composables/useUserPin'
import YearSlider from './YearSlider.vue'
import PhaseFilter from './PhaseFilter.vue'

const props = defineProps<{
  controls: OControls
  stats: {
    categoryStats: OControls['categoryStats']
    totalCount: OControls['totalCount']
    filteredCount: OControls['filteredCount']
    activeFilterCount: OControls['activeFilterCount']
    activeFilterSummary: OControls['activeFilterSummary']
    formatSyncDate: (iso?: string) => string
    formatHa: (ha: number) => string
  }
  data: ObservatoryData
  onRedeCorporativa?: () => void
  onDataDownload?: () => void
  onUserContribution?: () => void
  onExpandToFullBrazil?: () => void
  userPin: UserPin | null
  userPinShared: boolean
  pinPickerMode: boolean
  shareCopied: boolean
  togglePinPicker: () => void
  flyToUserPin: () => void
  copyPinUrl: () => void
  clearPin: () => void
}>()

defineSlots<{
  sidebar(props: Record<string, never>): void
}>()

const { t } = useI18n()

const { controls, stats, userPin, userPinShared, pinPickerMode, shareCopied,
        togglePinPicker, flyToUserPin, copyPinUrl, clearPin,
        onRedeCorporativa, onDataDownload, onUserContribution, onExpandToFullBrazil } = toRefs(props)

const leftSidebarOpen = ref(true)

onMounted(() => {
  if (window.innerWidth < 768) {
    leftSidebarOpen.value = false
  }
})

const categoryStats = computed(() => props.stats.categoryStats.value)
const totalCount = computed(() => props.stats.totalCount.value)
const filteredCount = computed(() => props.stats.filteredCount.value)
const deepAnalysis = computed(() => props.data.deepAnalysis.value)
const isRegional = computed(() => props.data.isRegional.value)

function updateYearMin(value: number) {
  props.controls.yearMin.value = value
  props.controls.debouncedFilter()
}

function updateYearMax(value: number) {
  props.controls.yearMax.value = value
  props.controls.debouncedFilter()
}

function updatePhases(value: Set<string>) {
  props.controls.selectedPhases.value = value
  props.controls.debouncedFilter()
}
</script>

<template>
  <div class="obs-shell">
    <!-- TOP BAR -->
    <div class="obs-topbar" role="toolbar" :aria-label="t('nav.observatoryOfVulcan')">
      <div class="obs-topbar__left">
        <span class="w-2 h-2 rounded-full bg-red-600 animate-pulse flex-shrink-0" aria-hidden="true" />
        <h1 class="text-fluid-xs font-black text-red-400 uppercase tracking-tight whitespace-nowrap">Terras Raras Brasil</h1>
      </div>

      <div class="obs-topbar__center" role="status">
        <div v-for="s in categoryStats" :key="s.key" class="obs-topbar__stat">
          <span class="obs-topbar__stat-dot" :style="{ background: s.color }" aria-hidden="true" />
          <span class="font-bold text-zinc-200 tabular-nums">{{ controls.animatedCount?.(s.key, s.count) ?? s.count }}</span>
          <span class="text-zinc-500 hidden sm:inline">{{ s.label }}</span>
        </div>
        <div class="w-px h-3 bg-zinc-700 flex-shrink-0" aria-hidden="true" />
        <span class="text-[9px] font-bold text-zinc-300 tabular-nums whitespace-nowrap">{{ totalCount }} total</span>
      </div>

      <div class="obs-topbar__right">
        <div v-if="deepAnalysis" class="hidden lg:flex items-center gap-1.5 mr-2 text-[8px] text-zinc-500">
          <span class="w-1 h-1 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" aria-hidden="true" />
          <span class="font-mono">{{ stats.formatSyncDate(deepAnalysis.last_sync) }}</span>
        </div>

        <button type="button" class="obs-icon-btn" :aria-label="t('observatory.tabs.timeline')" @click="controls.showTimeline.value = !controls.showTimeline.value">
          <span aria-hidden="true">📖</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">{{ t('observatory.tabs.timeline') }}</span>
        </button>
        <button v-if="onRedeCorporativa" type="button" class="obs-icon-btn" aria-label="Corporate Network" @click="onRedeCorporativa()">
          <span aria-hidden="true">🔗</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Corporate Network</span>
        </button>
        <button v-if="onDataDownload" type="button" class="obs-icon-btn" aria-label="Download Data" @click="onDataDownload()">
          <span aria-hidden="true">⬇️</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Download Data</span>
        </button>
        <button type="button" class="obs-icon-btn" :class="{ 'obs-icon-btn--active': controls.enterpriseLayerVisible.value }" aria-label="Enterprise HQ" @click="controls.toggleEnterpriseLayer()">
          <span aria-hidden="true">🏢</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Enterprise HQ</span>
        </button>
        <button type="button" class="obs-icon-btn" aria-label="Export" @click="controls.showExport.value = !controls.showExport.value">
          <span aria-hidden="true">📄</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Export</span>
        </button>
        <button type="button" class="obs-icon-btn" aria-label="Shortcuts" @click="controls.showShortcuts.value = !controls.showShortcuts.value">
          <span aria-hidden="true">⌨️</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Shortcuts</span>
        </button>
        <button type="button" class="obs-icon-btn" aria-label="Data Table" @click="controls.showDataTable.value = !controls.showDataTable.value">
          <span aria-hidden="true">📊</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Data Table</span>
        </button>
        <button type="button" class="obs-icon-btn" aria-label="Near Me" @click="controls.showGeoLocate.value = !controls.showGeoLocate.value">
          <span aria-hidden="true">📍</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Near Me</span>
        </button>
        <button v-if="isRegional && onExpandToFullBrazil" type="button" class="obs-icon-btn" aria-label="Full Brazil" @click="onExpandToFullBrazil()">
          <span aria-hidden="true">🌎</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Full Brazil</span>
        </button>
        <button v-if="onUserContribution" type="button" class="obs-icon-btn" aria-label="Monitor" @click="onUserContribution()">
          <span aria-hidden="true">📝</span>
          <span class="obs-icon-btn__tooltip" role="tooltip">Monitor</span>
        </button>
      </div>
    </div>

    <!-- LEFT SIDEBAR -->
    <aside class="obs-leftbar" :class="{ 'obs-leftbar--collapsed': !leftSidebarOpen }" :aria-label="t('observatory.layers.title')">
      <button v-if="!leftSidebarOpen" type="button" class="obs-leftbar__toggle" :aria-label="t('observatory.layers.title')" @click="leftSidebarOpen = true">
        <span aria-hidden="true">⚙</span>
      </button>

      <template v-if="leftSidebarOpen">
        <div class="obs-leftbar__scroll">
          <div class="obs-search" role="search">
            <span class="obs-search__icon" aria-hidden="true">🔍</span>
            <input v-model="controls.searchTerm.value" :placeholder="t('observatory.search')" class="obs-search__input" :aria-label="t('observatory.search')" @input="controls.debouncedFilter()">
            <button v-if="controls.searchTerm.value" type="button" class="obs-search__clear" :aria-label="t('observatory.clearSearch')" @click="controls.searchTerm.value = ''; controls.debouncedFilter()">×</button>
          </div>

          <div class="mt-2">
            <YearSlider
              :year-min="controls.yearMin.value"
              :year-max="controls.yearMax.value"
              :filtered-count="filteredCount"
              @update:year-min="updateYearMin"
              @update:year-max="updateYearMax"
            />
          </div>

          <div class="mt-2">
            <PhaseFilter :selected="controls.selectedPhases.value" @update:selected="updatePhases" />
          </div>

          <hr class="border-zinc-800 my-2" aria-hidden="true">

          <h3 class="obs-filter-section-title">{{ t('observatory.layers.title') }}</h3>
          <div
            v-for="c in categoryStats" :key="c.key"
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="controls.layerVis.value[c.key]"
            :aria-label="c.label"
            tabindex="0"
            @click="controls.toggleLayer(c.key)"
            @keydown.enter="controls.toggleLayer(c.key)"
            @keydown.space.prevent="controls.toggleLayer(c.key)"
          >
            <div :class="['obs-filter-checkbox__box', controls.layerVis.value[c.key] ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': c.color }">
              <svg v-if="controls.layerVis.value[c.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ c.label }}</span>
          </div>

          <hr class="border-zinc-800 my-1.5" aria-hidden="true">

          <div
            v-for="ex in controls.extraLayers" :key="ex.key"
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="controls.layerVis.value[ex.key]"
            :aria-label="t(ex.labelKey)"
            tabindex="0"
            @click="controls.toggleLayer(ex.key)"
            @keydown.enter="controls.toggleLayer(ex.key)"
            @keydown.space.prevent="controls.toggleLayer(ex.key)"
          >
            <div :class="['obs-filter-checkbox__box', controls.layerVis.value[ex.key] ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': ex.color }">
              <svg v-if="controls.layerVis.value[ex.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t(ex.labelKey) }}</span>
          </div>

          <hr class="border-zinc-800 my-1.5" aria-hidden="true">

          <h3 class="obs-filter-section-title">{{ t('observatory.layers.protectedAreas') }}</h3>
          <div
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="controls.layerVis.value['protected_ti'] !== false"
            :aria-label="t('observatory.layers.indigenousLands')"
            tabindex="0"
            @click="controls.toggleLayer('protected_ti')"
            @keydown.enter="controls.toggleLayer('protected_ti')"
            @keydown.space.prevent="controls.toggleLayer('protected_ti')"
          >
            <div :class="['obs-filter-checkbox__box', controls.layerVis.value['protected_ti'] !== false ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-red-dark)' }">
              <svg v-if="controls.layerVis.value['protected_ti'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t('observatory.layers.indigenousLands') }}</span>
          </div>
          <div
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="controls.layerVis.value['protected_quilombo'] !== false"
            :aria-label="t('observatory.layers.quilombolaTerritories')"
            tabindex="0"
            @click="controls.toggleLayer('protected_quilombo')"
            @keydown.enter="controls.toggleLayer('protected_quilombo')"
            @keydown.space.prevent="controls.toggleLayer('protected_quilombo')"
          >
            <div :class="['obs-filter-checkbox__box', controls.layerVis.value['protected_quilombo'] !== false ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-amber)' }">
              <svg v-if="controls.layerVis.value['protected_quilombo'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t('observatory.layers.quilombolaTerritories') }}</span>
          </div>
          <div
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="controls.layerVis.value['overlaps'] !== false"
            :aria-label="t('observatory.layers.overlaps')"
            tabindex="0"
            @click="controls.toggleLayer('overlaps')"
            @keydown.enter="controls.toggleLayer('overlaps')"
            @keydown.space.prevent="controls.toggleLayer('overlaps')"
          >
            <div :class="['obs-filter-checkbox__box', controls.layerVis.value['overlaps'] !== false ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-magenta)' }">
              <svg v-if="controls.layerVis.value['overlaps'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t('observatory.layers.overlaps') }}</span>
          </div>
          <div
            class="obs-filter-checkbox"
            role="checkbox"
            :aria-checked="controls.layerVis.value['enterprise_hq'] !== false"
            :aria-label="t('observatory.layers.enterpriseHq')"
            tabindex="0"
            @click="controls.toggleLayer('enterprise_hq')"
            @keydown.enter="controls.toggleLayer('enterprise_hq')"
            @keydown.space.prevent="controls.toggleLayer('enterprise_hq')"
          >
            <div :class="['obs-filter-checkbox__box', controls.layerVis.value['enterprise_hq'] !== false ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-purple-light)' }">
              <svg v-if="controls.layerVis.value['enterprise_hq'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
            <span class="obs-filter-checkbox__label">{{ t('observatory.layers.enterpriseHq') }}</span>
          </div>

          <hr class="border-zinc-800 my-1.5" aria-hidden="true">

          <label
            class="obs-filter-checkbox"
            @click.stop="controls.sobDemandaOnly.value = !controls.sobDemandaOnly.value; controls.debouncedFilter()"
          >
            <div :class="['obs-filter-checkbox__box', controls.sobDemandaOnly.value ? '' : 'obs-filter-checkbox__box--off']" :style="{ '--cb-color': 'var(--obs-purple-deep)' }">
              <svg v-if="controls.sobDemandaOnly.value" class="obs-filter-checkbox__check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
            <span class="obs-filter-checkbox__label">Sob Demanda</span>
          </label>

          <hr class="border-zinc-800 my-1.5" aria-hidden="true">

          <h3 class="obs-filter-section-title">{{ t('observatory.legend.hydrography') }}</h3>
          <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-blue)' }" aria-hidden="true" /><span>{{ t('observatory.legend.basins') }}</span></div>
          <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-purple-light)' }" aria-hidden="true" /><span>{{ t('observatory.legend.aquifers') }}</span></div>
          <div class="obs-legend-item"><div class="obs-legend-line obs-legend-line--dashed" :style="{ background: 'var(--obs-red)', borderColor: 'var(--obs-red-dark)' }" aria-hidden="true" /><span>{{ t('observatory.legend.conflictZones') }}</span></div>
        </div>

        <button type="button" class="obs-leftbar__collapse" :aria-label="t('observatory.sidebarCollapse')" @click="leftSidebarOpen = false">«</button>
      </template>
    </aside>

    <!-- RIGHT SIDEBAR SLOT -->
    <div class="obs-rightslot">
      <slot name="sidebar" />
    </div>

    <!-- BOTTOM BAR -->
    <div class="obs-bottombar" :class="{ 'obs-bottombar--sidebar-open': leftSidebarOpen }" role="toolbar" :aria-label="t('observatory.myTerritory.title')">
      <button
        type="button"
        class="obs-bottombar__btn"
        :class="{ 'obs-bottombar__btn--active': pinPickerMode }"
        :aria-label="pinPickerMode ? t('observatory.myTerritory.cancel') : t('observatory.myTerritory.dropPin')"
        @click="togglePinPicker"
      >
        <span aria-hidden="true">📍</span>
        <span>{{ pinPickerMode ? t('observatory.myTerritory.cancel') : t('observatory.myTerritory.dropPin') }}</span>
      </button>

      <div v-if="userPin" class="obs-bottombar__pin">
        <div class="flex items-center gap-1.5 min-w-0 truncate">
          <span v-if="userPinShared" class="text-[7px] font-bold uppercase text-amber-400 flex-shrink-0">{{ t('observatory.myTerritory.sharedBadge') }}</span>
          <strong class="text-[10px] text-zinc-200 truncate max-w-[120px]">{{ userPin.label }}</strong>
          <span class="text-[8px] text-zinc-500 font-mono flex-shrink-0 hidden sm:inline">{{ userPin.lng.toFixed(3) }}, {{ userPin.lat.toFixed(3) }}</span>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button type="button" class="obs-bottombar__pin-btn obs-bottombar__pin-btn--emerald" :aria-label="t('observatory.myTerritory.flyTo')" @click="flyToUserPin">{{ t('observatory.myTerritory.flyTo') }}</button>
          <button type="button" class="obs-bottombar__pin-btn" :aria-label="t('observatory.myTerritory.share')" @click="copyPinUrl">{{ shareCopied ? t('observatory.myTerritory.copied') : t('observatory.myTerritory.share') }}</button>
          <button type="button" class="obs-bottombar__pin-btn obs-bottombar__pin-btn--danger" :aria-label="t('observatory.myTerritory.clear')" @click="clearPin">×</button>
        </div>
      </div>

      <div class="obs-bottombar__spacer" />

      <div class="sm:hidden obs-search" style="width: auto; flex: 1; max-width: 160px;" role="search">
        <span class="obs-search__icon" aria-hidden="true">🔍</span>
        <input v-model="controls.searchTerm.value" :placeholder="t('observatory.search')" class="obs-search__input" :aria-label="t('observatory.search')" @input="controls.debouncedFilter()">
      </div>
    </div>
  </div>
</template>

<style>
/* ── Layout shell ── */
.obs-shell {
  --obs-topbar-h: clamp(2.5rem, 5.5vh, 2.75rem);
  --obs-bottombar-h: 2.5rem;
  --obs-leftbar-w: 260px;

  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 490;
  isolation: isolate;
}

@media (max-width: 768px) {
  .obs-shell { --obs-leftbar-w: 240px; }
}

@media (max-width: 640px) {
  .obs-shell { --obs-leftbar-w: calc(100vw - 3rem); }
}

/* ---- Top Bar ---- */
.obs-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: var(--obs-topbar-h);
  pointer-events: auto;
  z-index: 550;
  background: var(--obs-panel-bg-dark);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border-bottom: 1px solid var(--obs-panel-border);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
}

.obs-topbar__left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.obs-topbar__center {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: center;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.obs-topbar__center::-webkit-scrollbar { display: none; }

.obs-topbar__stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  white-space: nowrap;
  flex-shrink: 0;
}

.obs-topbar__stat-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.obs-topbar__right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .obs-topbar { height: 2.5rem; padding: 0 6px; gap: 4px; }
  .obs-topbar__center { gap: 4px; }
  .obs-topbar__stat { font-size: 8px; }
  .obs-topbar__right { gap: 1px; }
}

/* ---- Icon Button ---- */
.obs-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--obs-text-body);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  transition: all 0.15s ease;
  position: relative;
  flex-shrink: 0;
}

.obs-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.15);
  color: #fff;
  transform: translateY(-1px);
}

.obs-icon-btn:active {
  transform: translateY(0);
}

.obs-icon-btn:focus-visible {
  outline: 2px solid var(--obs-red);
  outline-offset: 2px;
}

.obs-icon-btn--active {
  background: color-mix(in srgb, var(--obs-red) 20%, transparent);
  border-color: color-mix(in srgb, var(--obs-red) 40%, transparent);
  color: var(--obs-red);
}

.obs-icon-btn__tooltip {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 700;
  background: #000;
  color: #fff;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 700;
}

.obs-icon-btn:hover .obs-icon-btn__tooltip {
  opacity: 1;
}

.obs-icon-btn:last-child .obs-icon-btn__tooltip {
  left: auto;
  right: 0;
  transform: none;
}

@media (max-width: 640px) {
  .obs-icon-btn { width: 28px; height: 28px; font-size: 12px; border-radius: 6px; }
}

/* ---- Left Sidebar ---- */
.obs-leftbar {
  position: absolute;
  top: var(--obs-topbar-h);
  left: 0;
  bottom: var(--obs-bottombar-h);
  width: var(--obs-leftbar-w);
  pointer-events: auto;
  z-index: 520;
  background: var(--obs-panel-bg-dark);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border-right: 1px solid var(--obs-panel-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

.obs-leftbar--collapsed {
  transform: translateX(-100%);
}

.obs-leftbar__toggle {
  position: absolute;
  top: 0;
  right: -2.75rem;
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--obs-panel-bg-dark);
  backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid var(--obs-panel-border);
  border-left: 0;
  border-radius: 0 10px 10px 0;
  cursor: pointer;
  font-family: inherit;
  font-size: 1.125rem;
  color: var(--obs-text-body);
  transition: color 0.15s, background 0.15s;
}

.obs-leftbar__toggle:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.obs-leftbar__toggle:focus-visible {
  outline: 2px solid var(--obs-red);
  outline-offset: -2px;
}

.obs-leftbar__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  overflow-wrap: break-word;
}

.obs-leftbar__scroll::-webkit-scrollbar { width: 4px; }
.obs-leftbar__scroll::-webkit-scrollbar-track { background: transparent; }
.obs-leftbar__scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }

.obs-leftbar__collapse {
  flex-shrink: 0;
  padding: 6px 12px;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--obs-panel-border);
  color: var(--obs-text-dim);
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s, background 0.15s;
  text-align: center;
}

.obs-leftbar__collapse:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.04);
}

.obs-leftbar__collapse:focus-visible {
  outline: 2px solid var(--obs-red);
  outline-offset: -2px;
}

@media (max-width: 768px) {
  .obs-leftbar__scroll { padding: 6px 8px; }
}

@media (max-width: 640px) {
  .obs-leftbar {
    z-index: 560;
  }
}

/* ---- Right Sidebar Slot ---- */
.obs-rightslot {
  position: absolute;
  top: calc(var(--obs-topbar-h) + 0.25rem);
  right: clamp(0.5rem, 1vw, 0.75rem);
  bottom: calc(var(--obs-bottombar-h) + 0.25rem);
  pointer-events: auto;
  z-index: 510;
  --obs-panel-max-height: 100%;
}

@media (max-width: 768px) {
  .obs-rightslot { right: 0.5rem; }
}

/* ---- Bottom Bar ---- */
.obs-bottombar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--obs-bottombar-h);
  pointer-events: auto;
  z-index: 550;
  background: var(--obs-panel-bg-dark);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border-top: 1px solid var(--obs-panel-border);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: left;
}

.obs-bottombar--sidebar-open {
  left: var(--obs-leftbar-w);
}

@media (max-width: 640px) {
  .obs-bottombar { left: 0; padding: 0 6px; gap: 4px; }
  .obs-bottombar--sidebar-open { left: 0; }
}

.obs-bottombar__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  background: transparent;
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  color: rgb(16, 185, 129);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.obs-bottombar__btn:hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.5);
}

.obs-bottombar__btn:focus-visible {
  outline: 2px solid rgb(16, 185, 129);
  outline-offset: 2px;
}

.obs-bottombar__btn--active {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgb(16, 185, 129);
  color: #fff;
}

.obs-bottombar__pin {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-left: 1px solid var(--obs-panel-border);
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.obs-bottombar__pin-btn {
  padding: 2px 6px;
  font-size: 8px;
  font-weight: 700;
  border-radius: 4px;
  border: 1px solid var(--obs-panel-border);
  background: transparent;
  color: var(--obs-text-body);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  white-space: nowrap;
}

.obs-bottombar__pin-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.obs-bottombar__pin-btn:focus-visible {
  outline: 2px solid var(--obs-text-body);
  outline-offset: 1px;
}

.obs-bottombar__pin-btn--emerald {
  border-color: rgba(16, 185, 129, 0.5);
  color: rgb(16, 185, 129);
}

.obs-bottombar__pin-btn--emerald:hover {
  background: rgba(16, 185, 129, 0.15);
}

.obs-bottombar__pin-btn--danger {
  border-color: transparent;
  color: var(--obs-text-dim);
}

.obs-bottombar__pin-btn--danger:hover {
  color: var(--obs-red);
  background: transparent;
}

.obs-bottombar__spacer {
  flex: 1;
}

@media (max-width: 640px) {
  .obs-bottombar { left: 0; padding: 0 6px; gap: 4px; }
  .obs-bottombar__btn { padding: 3px 6px; font-size: 9px; }
  .obs-bottombar__pin { padding: 2px 4px; }
}

/* ---- Search ---- */
.obs-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0 12px;
  height: 36px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid var(--obs-panel-border);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.obs-search:focus-within {
  border-color: rgba(231, 76, 60, 0.4);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(231, 76, 60, 0.1);
}

.obs-search__icon {
  font-size: 12px;
  opacity: 0.5;
  flex-shrink: 0;
}

.obs-search__input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--obs-text-primary);
  font-size: 11px;
  font-family: inherit;
  padding: 0;
  min-width: 0;
}

.obs-search__input::placeholder {
  color: var(--obs-text-dim);
}

.obs-search__clear {
  font-size: 14px;
  color: var(--obs-text-dim);
  cursor: pointer;
  line-height: 1;
  transition: color 0.15s;
  background: none;
  border: 0;
  padding: 0;
  font-family: inherit;
}

.obs-search__clear:hover {
  color: var(--obs-red);
}

.obs-search__clear:focus-visible {
  outline: 2px solid var(--obs-red);
  outline-offset: 2px;
  border-radius: 2px;
}

@media (max-width: 640px) {
  .obs-search { height: 32px; padding: 0 10px; gap: 6px; }
}

/* ---- Filter checkbox ---- */
.obs-filter-section-title {
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--obs-text-muted);
  margin: 0 0 6px;
}

.obs-filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: background 0.1s;
}

.obs-filter-checkbox:hover {
  background: rgba(255, 255, 255, 0.03);
}

.obs-filter-checkbox:focus-visible {
  outline: 2px solid var(--obs-red);
  outline-offset: -2px;
}

.obs-filter-checkbox__box {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 2px solid var(--cb-color, #666);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.obs-filter-checkbox__box--off {
  opacity: 0.3;
}

.obs-filter-checkbox__check {
  width: 10px;
  height: 10px;
  color: var(--cb-color, #666);
}

.obs-filter-checkbox__label {
  font-size: 10px;
  color: var(--obs-text-label);
  font-weight: 500;
  overflow-wrap: break-word;
  min-width: 0;
}

.obs-filter-checkbox:hover .obs-filter-checkbox__label {
  color: var(--obs-text-primary);
}

/* ---- Legend ---- */
.obs-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  color: var(--obs-text-label);
  padding: 2px 0;
}

.obs-legend-line {
  width: 12px;
  height: 2px;
  border-radius: 1px;
  flex-shrink: 0;
}

.obs-legend-line--dashed {
  border: 1px dashed;
  background: transparent !important;
}

@media (prefers-reduced-motion: reduce) {
  .obs-leftbar,
  .obs-bottombar,
  .obs-icon-btn,
  .obs-filter-checkbox__box { transition: none; }
  .obs-icon-btn:hover { transform: none; }
}
</style>
