<template>
  <div id="main-content" class="relative">
    <!-- Loading overlay -->
    <Transition name="fade">
      <div v-if="isLoading || error" class="fixed inset-0 z-[9998] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4">
        <template v-if="error && !isLoading">
          <div class="text-center">
            <span class="text-4xl mb-3 block">⚠️</span>
            <h2 class="text-fluid-sm font-bold text-red-400 uppercase tracking-wider mb-1">Failed to load data</h2>
            <p class="text-fluid-xs text-zinc-500 mb-4">{{ error.message }}</p>
            <button
              type="button"
              class="px-fluid-md py-fluid-xs text-fluid-xs font-bold rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              @click="loadRareEarthData()">
              Retry
            </button>
          </div>
        </template>
        <template v-else>
          <div class="relative">
            <div class="w-[clamp(3.5rem,10vw,5rem)] h-[clamp(3.5rem,10vw,5rem)] border-4 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-fluid-xl">🌋</span>
            </div>
          </div>
          <div class="text-center">
            <h2 class="text-fluid-sm font-bold text-zinc-200 uppercase tracking-wider mb-1">{{ t('loading.observatoryOfVulcan') }}</h2>
            <p class="text-fluid-xs text-zinc-500">{{ loadingMessage }}</p>
          </div>
          <div class="w-[clamp(10rem,24vw,14rem)] h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :style="{ width: `${loadProgress}%`, background: `linear-gradient(90deg, var(--obs-red), var(--obs-amber))` }"
            />
          </div>
          <span class="text-fluid-xs text-zinc-600 font-mono">{{ loadProgress }}%</span>
        </template>
      </div>
    </Transition>

    <ClientOnly>
      <UnifiedMap
        :default-dataset="'observatory-of-vulcan'"
        :rare-earth-points="pointsData"
        :rare-earth-polygons="polygonsData"
        :rare-earth-protected="protectedData"
        :layer-visibility="layerVis"
        :fly-to-target="flyToTarget"
        @map-init="onMapInit"
      >
        <template #overlays>
          <!-- Stats panel top-left -->
          <div class="absolute top-[clamp(0.75rem,2vh,1rem)] left-[clamp(0.5rem,1.5vw,0.75rem)] z-[500] obs-stats-panel">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <h1 class="text-fluid-sm font-black text-red-400 uppercase tracking-tight">Terras Raras Brasil</h1>
            </div>
            <p class="text-[9px] text-zinc-400 leading-tight">
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-red);color:#fff">{{ t('observatory.badges.mil') }}</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-green);color:#fff">{{ t('observatory.badges.amb') }}</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-purple);color:#fff">{{ t('observatory.badges.ill') }}</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:var(--obs-blue-dark);color:#fff">{{ t('observatory.badges.for') }}</span>
              {{ t('home.observatoryDesc') }}
            </p>
          </div>

          <!-- Animated stats counts -->
          <div class="absolute top-[clamp(0.75rem,2vh,1rem)] left-1/2 -translate-x-1/2 z-[500] hidden md:flex gap-2 bg-[var(--obs-panel-bg)] backdrop-blur border border-[var(--obs-panel-border)] rounded-xl px-fluid-md py-fluid-sm shadow-lg">
            <div v-for="s in categoryStats" :key="s.key" class="flex items-center gap-1.5 text-[9px] group cursor-default" :title="s.label">
              <span class="w-2 h-2 rounded-full transition-transform group-hover:scale-150" :style="{ background: s.color }" />
              <span class="font-bold text-zinc-200 tabular-nums">{{ animatedCount(s.key, s.count) }}</span>
              <span class="text-zinc-500 hidden lg:inline">{{ s.label }}</span>
            </div>
            <div class="w-px bg-zinc-700 mx-1" />
            <span class="text-[9px] font-bold text-zinc-300 tabular-nums" aria-live="polite" aria-atomic="true">{{ animatedCount('__total', totalCount) }} total</span>
          </div>

          <!-- Sync + Secrecy -->
          <div v-if="deepAnalysis" class="absolute top-[clamp(0.75rem,2vh,1rem)] right-[clamp(0.5rem,1.5vw,0.75rem)] z-[500] hidden lg:flex flex-col gap-1 bg-[var(--obs-panel-bg)] backdrop-blur border border-[var(--obs-panel-border)] rounded-xl px-3 py-2 shadow-lg max-w-[clamp(10rem,20vw,14rem)]">
            <div class="flex items-center gap-1.5 text-[8.5px]" :title="t('observatory.sync.syncNote')">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span class="text-zinc-500 uppercase tracking-wider font-bold">{{ t('observatory.sync.lastSync') }}</span>
              <span class="text-zinc-300 font-mono ml-auto">{{ formatSyncDate(deepAnalysis.last_sync) }}</span>
            </div>
            <div v-if="deepAnalysis.sigilo_stats" class="flex items-center gap-1.5 text-[8.5px] pt-1 border-t border-zinc-800">
              <span class="text-zinc-500 uppercase tracking-wider font-bold">🔒</span>
              <span class="text-zinc-500">{{ t('observatory.sync.secrecyClaims') }}:</span>
              <span class="text-amber-400 font-bold">{{ deepAnalysis.sigilo_stats.total }}</span>
              <span class="text-zinc-400 font-mono ml-auto">{{ formatHa(deepAnalysis.sigilo_stats.total_area_ha) }} {{ t('observatory.sync.secrecyArea') }}</span>
            </div>
          </div>

          <!-- Action Buttons Row -->
          <div class="absolute top-[clamp(3.5rem,10vh,5rem)] left-[clamp(0.5rem,1.5vw,0.75rem)] z-[500] flex flex-wrap gap-1.5 max-w-[clamp(16rem,40vw,22rem)]">
            <button
@click="showTimeline = true"
              class="obs-action-btn"
              :style="{ '--accent': 'var(--obs-red)' }">
              <span>📖</span> Geopolitical Timeline
            </button>
            <button
@click="showRedeCorporativa = true"
              class="obs-action-btn"
              :style="{ '--accent': 'var(--obs-blue-light)' }">
              <span>🔗</span> Rede Corporativa
            </button>
            <button
@click="showDownload = true"
              class="obs-action-btn"
              :style="{ '--accent': 'var(--obs-green)' }">
              <span>⬇️</span> Download Data
            </button>
            <button
@click="showExport = true"
              class="obs-action-btn"
              :style="{ '--accent': 'var(--obs-purple-soft)' }">
              <span>📄</span> Export
            </button>
            <button
@click="toggleEnterpriseLayer"
              class="obs-action-btn"
              :class="enterpriseLayerVisible ? 'obs-action-btn--active' : ''"
              :style="{ '--accent': 'var(--obs-purple-soft)' }">
              <span>🏢</span> {{ t('observatory.layers.enterpriseHq') }}
            </button>
            <button
@click="showShortcuts = true"
              class="obs-action-btn"
              title="Keyboard shortcuts (?)"
              :style="{ '--accent': 'var(--obs-gray)' }">
              <span>⌨️</span> ?
            </button>
            <button
@click="showDataTable = true"
              class="obs-action-btn"
              title="View all claims in table (T)"
              style="--accent:#3498db">
              <span>📊</span> Table
            </button>
            <button
@click="showGeoLocate = true"
              class="obs-action-btn"
              title="Find claims near you"
              style="--accent:#27ae60">
              <span>📍</span> Near Me
            </button>
          </div>

          <!-- Tab navigation -->
          <ObservatorySidebar
            :active-tab="activeTab"
            :danger-items="speculatorIndex"
            :show-all="showAll"
            class="absolute"
            style="top: clamp(5.5rem, 14vh, 8rem); right: clamp(0.5rem, 1.5vw, 0.75rem);"
            @update:active-tab="(tab) => activeTab = tab"
            @update:show-all="(v) => showAll = v"
            @fly-to-enterprise="zoomToDanger"
            @fly-to-coord="flyToCoord"
          />

          <!-- My Territory Pin -->
          <div
v-if="userPin" class="absolute z-[500] bg-[var(--obs-panel-bg-dark)] backdrop-blur border border-emerald-700/40 rounded-xl px-3 py-2.5 shadow-lg max-w-[clamp(14rem,35vw,18rem)]"
            style="bottom: clamp(5rem, 12vh, 7.5rem); right: clamp(0.5rem, 1.5vw, 0.75rem);">
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-1.5">
                <span class="text-fluid-sm">📍</span>
                <h3 class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{{ t('observatory.myTerritory.title') }}</h3>
              </div>
              <button type="button" class="text-zinc-500 hover:text-red-400 text-[12px] leading-none" :aria-label="t('observatory.myTerritory.clear')" @click="clearPin">×</button>
            </div>
            <div class="text-[9px] text-zinc-300 leading-snug mb-1 break-words">
              <span v-if="userPinShared" class="inline-block text-[7px] font-bold uppercase text-amber-400 mr-1">{{ t('observatory.myTerritory.sharedBadge') }}</span>
              <strong>{{ userPin.label }}</strong>
            </div>
            <div class="text-[8px] text-zinc-500 font-mono mb-2">
              {{ userPin.lng.toFixed(4) }}, {{ userPin.lat.toFixed(4) }}
            </div>
            <div class="flex gap-1.5">
              <button type="button" class="flex-1 px-2 py-1 text-[9px] font-bold rounded border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/30 transition-colors" @click="flyToUserPin">
                {{ t('observatory.myTerritory.flyTo') }}
              </button>
              <button type="button" class="flex-1 px-2 py-1 text-[9px] font-bold rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors" @click="copyPinUrl" :aria-label="t('observatory.myTerritory.share')">
                {{ shareCopied ? t('observatory.myTerritory.copied') : t('observatory.myTerritory.share') }}
              </button>
            </div>
          </div>

          <!-- Drop Pin Floating Button -->
          <button
type="button"
            class="absolute z-[500] bg-[var(--obs-panel-bg-dark)] backdrop-blur border border-emerald-700/40 rounded-full px-3 py-2 text-fluid-xs font-bold text-emerald-300 hover:bg-emerald-900/30 hover:border-emerald-500 transition-all flex items-center gap-1.5 shadow-lg"
            :style="pinPickerMode ? 'bottom: clamp(4rem, 10vh, 5.5rem); right: clamp(0.5rem, 1.5vw, 0.75rem); background: color-mix(in srgb, var(--obs-emerald) 25%, transparent); border-color: var(--obs-emerald); color: #fff;' : 'bottom: clamp(4rem, 10vh, 5.5rem); right: clamp(0.5rem, 1.5vw, 0.75rem);'"
            @click="togglePinPicker">
            <span>📍</span>
            {{ pinPickerMode ? t('observatory.myTerritory.cancel') : t('observatory.myTerritory.dropPin') }}
          </button>

          <!-- Layer toggles + Year Slider + Phase Filter -->
          <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] left-[clamp(0.5rem,1.5vw,0.75rem)] z-[500] obs-filter-panel">
            <button
              type="button"
              class="obs-filter-toggle"
              @click="filtersExpanded = !filtersExpanded"
            >
              <span class="obs-filter-toggle__icon">⚙</span>
              <span class="obs-filter-toggle__label">{{ t('observatory.layers.title') }}</span>
              <span v-if="activeFilterCount > 0" class="obs-filter-toggle__badge">{{ activeFilterCount }}</span>
              <span class="obs-filter-toggle__chevron" :class="{ 'obs-filter-toggle__chevron--open': filtersExpanded }">›</span>
            </button>

            <Transition name="obs-filter-expand">
              <div v-if="filtersExpanded" class="obs-filter-body">
                <YearSlider
                  :year-min="yearMin"
                  :year-max="yearMax"
                  :filtered-count="filteredCount"
                  @update:year-min="(v) => { yearMin = v; debouncedFilter() }"
                  @update:year-max="(v) => { yearMax = v; debouncedFilter() }"
                />

                <hr class="border-zinc-800 my-2" />

                <PhaseFilter
                  :selected="selectedPhases"
                  @update:selected="(v) => { selectedPhases = v; debouncedFilter() }"
                />

                <hr class="border-zinc-800 my-2" />

                <h3 class="obs-filter-section-title">{{ t('observatory.layers.title') }}</h3>
                <div
v-for="c in categories" :key="c.key" class="obs-filter-checkbox"
                  role="checkbox"
                  :aria-checked="layerVis[c.key]"
                  :aria-label="c.label"
                  tabindex="0"
                  @click="toggleLayer(c.key)"
                  @keydown.enter="toggleLayer(c.key)"
                  @keydown.space.prevent="toggleLayer(c.key)">
                  <div
:class="['obs-filter-checkbox__box', layerVis[c.key] ? '' : 'obs-filter-checkbox__box--off']"
                    :style="{ '--cb-color': c.color }">
                    <svg v-if="layerVis[c.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <span class="obs-filter-checkbox__label">{{ c.label }}</span>
                </div>
                <hr class="border-zinc-800 my-1.5" />
                <div
v-for="e in extraLayers" :key="e.key" class="obs-filter-checkbox"
                  role="checkbox"
                  :aria-checked="layerVis[e.key]"
                  :aria-label="t(e.labelKey)"
                  tabindex="0"
                  @click="toggleLayer(e.key)"
                  @keydown.enter="toggleLayer(e.key)"
                  @keydown.space.prevent="toggleLayer(e.key)">
                  <div
:class="['obs-filter-checkbox__box', layerVis[e.key] ? '' : 'obs-filter-checkbox__box--off']"
                    :style="{ '--cb-color': e.color }">
                    <svg v-if="layerVis[e.key]" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <span class="obs-filter-checkbox__label">{{ t(e.labelKey) }}</span>
                </div>
                <hr class="border-zinc-800 my-1.5" />
                <div
class="obs-filter-checkbox"
                  role="checkbox"
                  :aria-checked="layerVis['protected_ti'] !== false"
                  :aria-label="t('observatory.layers.indigenousLands')"
                  tabindex="0"
                  @click="toggleLayer('protected_ti')"
                  @keydown.enter="toggleLayer('protected_ti')"
                  @keydown.space.prevent="toggleLayer('protected_ti')">
                  <div
:class="['obs-filter-checkbox__box', layerVis['protected_ti'] !== false ? '' : 'obs-filter-checkbox__box--off']"
                    :style="{ '--cb-color': 'var(--obs-red-dark)' }">
                    <svg v-if="layerVis['protected_ti'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <span class="obs-filter-checkbox__label">{{ t('observatory.layers.indigenousLands') }}</span>
                </div>
                <div
class="obs-filter-checkbox"
                  role="checkbox"
                  :aria-checked="layerVis['protected_quilombo'] !== false"
                  :aria-label="t('observatory.layers.quilombolaTerritories')"
                  tabindex="0"
                  @click="toggleLayer('protected_quilombo')"
                  @keydown.enter="toggleLayer('protected_quilombo')"
                  @keydown.space.prevent="toggleLayer('protected_quilombo')">
                  <div
:class="['obs-filter-checkbox__box', layerVis['protected_quilombo'] !== false ? '' : 'obs-filter-checkbox__box--off']"
                    :style="{ '--cb-color': 'var(--obs-amber)' }">
                    <svg v-if="layerVis['protected_quilombo'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <span class="obs-filter-checkbox__label">{{ t('observatory.layers.quilombolaTerritories') }}</span>
                </div>
                <div
class="obs-filter-checkbox"
                  role="checkbox"
                  :aria-checked="layerVis['overlaps'] !== false"
                  :aria-label="t('observatory.layers.overlaps')"
                  tabindex="0"
                  @click="toggleLayer('overlaps')"
                  @keydown.enter="toggleLayer('overlaps')"
                  @keydown.space.prevent="toggleLayer('overlaps')">
                  <div
:class="['obs-filter-checkbox__box', layerVis['overlaps'] !== false ? '' : 'obs-filter-checkbox__box--off']"
                    :style="{ '--cb-color': 'var(--obs-magenta)' }">
                    <svg v-if="layerVis['overlaps'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <span class="obs-filter-checkbox__label">{{ t('observatory.layers.overlaps') }}</span>
                </div>
                <div
class="obs-filter-checkbox"
                  role="checkbox"
                  :aria-checked="layerVis['enterprise_hq'] !== false"
                  :aria-label="t('observatory.layers.enterpriseHq')"
                  tabindex="0"
                  @click="toggleLayer('enterprise_hq')"
                  @keydown.enter="toggleLayer('enterprise_hq')"
                  @keydown.space.prevent="toggleLayer('enterprise_hq')">
                  <div
:class="['obs-filter-checkbox__box', layerVis['enterprise_hq'] !== false ? '' : 'obs-filter-checkbox__box--off']"
                    :style="{ '--cb-color': 'var(--obs-purple-light)' }">
                    <svg v-if="layerVis['enterprise_hq'] !== false" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <span class="obs-filter-checkbox__label">{{ t('observatory.layers.enterpriseHq') }}</span>
                </div>

                <hr class="border-zinc-800 my-1.5" />

                <label
class="obs-filter-checkbox"
                  @click.stop="sobDemandaOnly = !sobDemandaOnly; debouncedFilter()">
                  <div
:class="['obs-filter-checkbox__box', sobDemandaOnly ? '' : 'obs-filter-checkbox__box--off']"
                    :style="{ '--cb-color': 'var(--obs-purple-deep)' }">
                    <svg v-if="sobDemandaOnly" class="obs-filter-checkbox__check" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  <span class="obs-filter-checkbox__label">Sob Demanda</span>
                </label>
              </div>
            </Transition>
          </div>

          <!-- Search -->
          <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] left-1/2 -translate-x-1/2 z-[500] hidden sm:block">
            <div class="obs-search">
              <span class="obs-search__icon">🔍</span>
              <input
v-model="searchTerm" @input="debouncedFilter" :placeholder="t('observatory.search')"
                class="obs-search__input" />
              <span v-if="searchTerm" class="obs-search__clear" @click="searchTerm = ''; debouncedFilter()">×</span>
            </div>
          </div>

          <!-- Minimap -->
          <Minimap :map="mapRef" class="hidden lg:block" />

          <!-- Water legend -->
          <div class="absolute bottom-[clamp(1rem,4vh,1.5rem)] right-[clamp(0.5rem,1.5vw,0.75rem)] z-[500] obs-legend-panel">
            <h3 class="obs-legend-title">{{ t('observatory.legend.hydrography') }}</h3>
            <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-blue)' }"></div>{{ t('observatory.legend.basins') }}</div>
            <div class="obs-legend-item"><div class="obs-legend-line" :style="{ background: 'var(--obs-purple-light)' }"></div>{{ t('observatory.legend.aquifers') }}</div>
            <div class="obs-legend-item"><div class="obs-legend-line obs-legend-line--dashed" :style="{ background: 'var(--obs-red)', borderColor: 'var(--obs-red-dark)' }"></div>{{ t('observatory.legend.conflictZones') }}</div>
          </div>
        </template>
      </UnifiedMap>

      <!-- Timeline Modal -->
      <GeoPoliticalTimeline :visible="showTimeline" @close="showTimeline = false" />

      <!-- Rede Corporativa Panel -->
      <RedeCorporativa :visible="showRedeCorporativa" @close="showRedeCorporativa = false" @fly-to-enterprise="flyToEnterprise" />

      <!-- Download Panel -->
      <DataDownloadPanel :visible="showDownload" @close="showDownload = false" />

      <!-- Claim Report Modal -->
      <ClaimReportModal :visible="showClaimReport" :claim="reportClaim" @close="showClaimReport = false" />

      <!-- Export Modal -->
      <ExportModal :visible="showExport" :map-container="mapContainerRef" :filter-summary="activeFilterSummary" @close="showExport = false" />

      <!-- Keyboard Shortcuts -->
      <KeyboardShortcuts :visible="showShortcuts" @close="showShortcuts = false" />

      <!-- Geo Locate -->
      <GeoLocateModal :visible="showGeoLocate" @close="showGeoLocate = false" @locate="onGeoLocate" />

      <!-- Claims Data Table -->
      <ClaimsDataTable :visible="showDataTable" :data="allFeatures" @close="showDataTable = false" @fly-to="(coords) => flyToTarget = { lng: coords[0], lat: coords[1], zoom: 8 }" />

      <template #fallback>
        <div class="flex h-[100svh] w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcan')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type maplibregl from 'maplibre-gl'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import type { EnterpriseHQ } from '@/lib/enterprise-data'
import { ENTERPRISES } from '@/lib/enterprise-data'
import { setupEnterpriseLayer, cleanupEnterpriseLayer } from '@/composables/useEnterpriseMarkers'
import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
import YearSlider from '@/components/observatory/YearSlider.vue'
import PhaseFilter from '@/components/observatory/PhaseFilter.vue'
import ClaimReportModal from '@/components/observatory/ClaimReportModal.vue'
import ExportModal from '@/components/observatory/ExportModal.vue'
import { useRareEarthData } from '@/composables/useRareEarthData'
import { useStateHash } from '@/composables/useStateHash'
import Minimap from '@/components/observatory/Minimap.vue'
import KeyboardShortcuts from '@/components/observatory/KeyboardShortcuts.vue'
import ClaimsDataTable from '@/components/observatory/ClaimsDataTable.vue'
import GeoLocateModal from '@/components/observatory/GeoLocateModal.vue'

type ObservatoryTabKey = 'danger' | 'military' | 'illegal' | 'env' | 'network' | 'timeline'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

// Command palette registrations
if (import.meta.client) {
  const { register, openPalette } = useCommandPalette()
  register({
    id: 'obs:open-palette',
    group: t('nav.observatoryOfVulcan'),
    label: t('palette.title'),
    icon: 'mdi:command-key',
    shortcut: 'Ctrl+K',
    keywords: ['palette', 'search', 'command', 'keyboard'],
    onSelect: () => openPalette(),
  })
  register({
    id: 'obs:toggle-layers',
    group: t('nav.observatoryOfVulcan'),
    label: t('observatory.layers.title'),
    icon: 'mdi:layers',
    keywords: ['layers', 'filters', 'toggle'],
    onSelect: () => {
      const { success } = useToast()
      success(t('observatory.layers.title'), t('observatory.layers.title'))
    },
  })
}

useHead({
  title: 'Observatory of Vulcan | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

const { pointsData, polygonsData, protectedData, features: allFeatures, speculatorIndex, deepAnalysis, isLoading, loadPhase, loadProgress, error, load: loadRareEarthData } = useRareEarthData(baseURL)
const { restoredState, updateHash } = useStateHash()
const searchTerm = ref('')
const flyToTarget = ref<{ lng: number; lat: number; zoom?: number } | null>(null)
let mapRef: maplibregl.Map | null = null

// Animated counter for smooth number transitions
// Keys are category keys (e.g., 'direct_ree') NOT count values — prevents
// categories with equal counts from sharing animated state.
const displayCounts = ref<Record<string, number>>({})
let counterRaf: number | null = null

function animatedCount(categoryKey: string, target: number): number {
  return displayCounts.value[categoryKey] ?? target
}

function animateCounters() {
  let anyChanged = false
  const allKeys: Array<{ key: string; target: number }> = [
    ...categoryStats.value.map(s => ({ key: s.key, target: s.count })),
    { key: '__total', target: totalCount.value },
  ]
  for (const { key, target } of allKeys) {
    const current = displayCounts.value[key] ?? 0
    if (current === target) continue
    const diff = target - current
    const step = Math.ceil(Math.abs(diff) / 10)
    displayCounts.value[key] = diff > 0 ? Math.min(current + step, target) : Math.max(current - step, target)
    anyChanged = true
  }
  if (anyChanged) {
    counterRaf = requestAnimationFrame(tick)
  }
}

function tick() {
  animateCounters()
}

function startCounterAnimation() {
  if (counterRaf) cancelAnimationFrame(counterRaf)
  counterRaf = requestAnimationFrame(tick)
}

onUnmounted(() => { if (counterRaf) cancelAnimationFrame(counterRaf) })

// Loading message based on phase
const loadingMessage = computed(() => {
  switch (loadPhase.value) {
    case 'points': return 'Loading mining claims...'
    case 'overlaps': return 'Loading territory overlaps...'
    case 'polygons': return 'Loading claim boundaries...'
    case 'protected': return 'Loading protected areas & analysis...'
    case 'complete': return 'Ready'
    default: return 'Initializing...'
  }
})

// Popups
const showTimeline = ref(false)
const showRedeCorporativa = ref(false)
const showDownload = ref(false)
const showExport = ref(false)
const showClaimReport = ref(false)
interface ClaimReportData { p?: string; n?: string; u?: string; s?: string; la?: number; lo?: number; [key: string]: unknown }
const reportClaim = ref<ClaimReportData | null>(null)
const enterpriseLayerVisible = ref(false)
const mapContainerRef = ref<HTMLElement | null>(null)
const showShortcuts = ref(false)
const showDataTable = ref(false)
const showGeoLocate = ref(false)
const userLocationRadius = ref(0)

// Year & Phase filters
const yearMin = ref(1935)
const yearMax = ref(2026)
const selectedPhases = ref(new Set<string>([
  'REQUERIMENTO', 'REQUERIMENTO DE PESQUISA', 'AUTORIZAÇÃO DE PESQUISA',
  'DISPONIBILIDADE', 'LICENCIAMENTO', 'CONCESSÃO', 'LAVRA',
]))
const sobDemandaOnly = ref(false)
const filteredCount = ref(0)
const filtersExpanded = ref(true)

const activeFilterCount = computed(() => {
  let count = 0
  if (yearMin.value > 1935 || yearMax.value < 2026) count++
  if (selectedPhases.value.size < 7) count++
  if (sobDemandaOnly.value) count++
  if (searchTerm.value.trim()) count++
  // Count hidden categories + extra layers (iterate explicitly for reliable tracking)
  const vis = layerVis.value
  let hiddenLayers = 0
  for (const key of Object.keys(vis)) {
    if (!vis[key]) hiddenLayers++
  }
  if (hiddenLayers > 0) count++
  return count
})

// My Territory pin
const { pin: userPin, sharedFromUrl: userPinShared, setPin: setUserPin, clearPin, copyShareUrl } = useUserPin()
const pinPickerMode = ref(false)
const shareCopied = ref(false)
let pinClickHandler: ((_e: maplibregl.MapMouseEvent) => void) | null = null
let pinKeyHandler: ((_e: KeyboardEvent) => void) | null = null

function togglePinPicker() {
  if (pinPickerMode.value) {
    pinPickerMode.value = false
    detachPinClick()
  } else {
    pinPickerMode.value = true
    attachPinClick()
  }
}

function attachPinClick() {
  if (!mapRef) return
  mapRef.getCanvas().style.cursor = 'crosshair'
  pinClickHandler = (e: maplibregl.MapMouseEvent) => {
    if (!pinPickerMode.value) return
    const { lng, lat } = e.lngLat
    setUserPin({ lng, lat }, t('observatory.myTerritory.defaultLabel'))
    pinPickerMode.value = false
    if (mapRef) mapRef.getCanvas().style.cursor = ''
    flyToTarget.value = { lng, lat, zoom: 8 }
  }
  mapRef.on('click', pinClickHandler)
  pinKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && pinPickerMode.value) togglePinPicker()
  }
  window.addEventListener('keydown', pinKeyHandler)
}

function detachPinClick() {
  if (mapRef && pinClickHandler) {
    mapRef.off('click', pinClickHandler)
    mapRef.getCanvas().style.cursor = ''
    pinClickHandler = null
  }
  if (pinKeyHandler) {
    window.removeEventListener('keydown', pinKeyHandler)
    pinKeyHandler = null
  }
}

function flyToUserPin() {
  if (userPin.value) {
    flyToTarget.value = { lng: userPin.value.lng, lat: userPin.value.lat, zoom: 8 }
  }
}

async function copyPinUrl() {
  const toast = useToast()
  const ok = await copyShareUrl()
  if (ok) {
    shareCopied.value = true
    setTimeout(() => { shareCopied.value = false }, 2000)
    toast.success(t('observatory.myTerritory.copied'))
  } else {
    toast.error(t('observatory.myTerritory.shareError') || 'Copy failed')
  }
}

onUnmounted(() => {
  detachPinClick()
})

const catEntries = Object.entries(RARE_EARTH_CATEGORIES) as [string, { label: string; color: string }][]
const categories = catEntries.map(([key, val]) => ({
  key,
  label: val.label,
  color: val.color,
}))

const extraLayers = [
  { key: 'polygons', labelKey: 'observatory.layers.polygons', color: '#e74c3c' },
  { key: 'water', labelKey: 'observatory.layers.hydrography', color: '#3498db' },
  { key: 'sites', labelKey: 'observatory.layers.conflictZones', color: '#c0392b' },
  { key: 'network', labelKey: 'observatory.layers.corpNetwork', color: '#5dade2' },
  { key: 'heatmap', labelKey: 'observatory.layers.heatmap', color: '#f39c12' },
]

const layerVis = ref<Record<string, boolean>>({})
categories.forEach(c => { layerVis.value[c.key] = true })
extraLayers.forEach(e => { layerVis.value[e.key] = true })
layerVis.value['enterprise_hq'] = false
layerVis.value['protected_ti'] = true
layerVis.value['protected_quilombo'] = true
layerVis.value['overlaps'] = true
layerVis.value['heatmap'] = false

const activeTab = ref<ObservatoryTabKey>('danger')

const showAll = ref(false)

const categoryStats = computed(() => {
  const counts: Record<string, number> = {}
  categories.forEach(c => counts[c.key] = 0)
  allFeatures.value.forEach((d: { c: string }) => { if (counts[d.c] !== undefined) counts[d.c]++ })
  return categories.map(c => ({ key: c.key, label: c.label.split(' ')[0], color: c.color, count: counts[c.key] || 0 }))
})

const totalCount = computed(() => allFeatures.value.length)

function formatSyncDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function formatHa(ha: number): string {
  if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
  if (ha >= 1000) return `${Math.round(ha / 1000)}K`
  return `${ha}`
}

function toggleLayer(key: string) {
  layerVis.value[key] = !layerVis.value[key]
  if (key === 'enterprise_hq') {
    enterpriseLayerVisible.value = layerVis.value[key]
    if (mapRef) {
      if (enterpriseLayerVisible.value) {
        setupEnterpriseLayer(mapRef, onEnterpriseClick, speculatorIndex.value)
      } else {
        cleanupEnterpriseLayer(mapRef)
      }
    }
  }
}

function toggleEnterpriseLayer() {
  toggleLayer('enterprise_hq')
}

function onEnterpriseClick(enterprise: EnterpriseHQ) {
  flyToTarget.value = { lng: enterprise.lng, lat: enterprise.lat, zoom: 6 }
}

function flyToEnterprise(name: string) {
  const specEntry = speculatorIndex.value.find(s =>
    s.normalizedName.includes(name.toUpperCase().split(' ')[0]) ||
    name.toUpperCase().includes(s.displayName.split('/')[0].trim().split(' ')[0])
  )
  if (specEntry?.centroid) { flyToTarget.value = { lng: specEntry.centroid.lng, lat: specEntry.centroid.lat, zoom: 6 }; return }
  const ent = ENTERPRISES.find(e => e.name === name || name.includes(e.name))
  if (ent) flyToTarget.value = { lng: ent.lng, lat: ent.lat, zoom: 6 }
}

function onMapInit(map: maplibregl.Map) {
  mapRef = map
}

function flyToCoord(coord: [number, number]) {
  flyToTarget.value = { lng: coord[0], lat: coord[1], zoom: 8 }
}

function onGeoLocate(lat: number, lng: number, _city: string) {
  // Fly to the detected location with a good zoom for nearby claims
  flyToTarget.value = { lng, lat, zoom: 7 }
  userLocationRadius.value = 1 // marker that we have a user location
}

function zoomToDanger(name: string) {
  const target = speculatorIndex.value.find(s =>
    s.normalizedName === name
    || s.displayName.toLowerCase().split('/')[0].trim() === name.toLowerCase().split('/')[0].trim()
  )
  if (target?.centroid) { flyToTarget.value = { lng: target.centroid.lng, lat: target.centroid.lat, zoom: 9 }; return }
  const ent = ENTERPRISES.find(e => name.includes(e.name.toUpperCase().split(' ')[0]) || e.name.toUpperCase().includes(name.split('/')[0].trim()))
  if (ent) { flyToTarget.value = { lng: ent.lng, lat: ent.lat, zoom: 7 }; return }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedFilter() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(updateFilter, 250)
}

function updateFilter() {
  const term = searchTerm.value.toLowerCase().trim()
  const catKeys = Object.keys(RARE_EARTH_CATEGORIES)
  const visKeys = Object.entries(layerVis.value).filter(([k, v]) => v && catKeys.includes(k)).map(([k]) => k)
  const filtered = allFeatures.value.filter((d: { c: string; n: string; s: string; u: string; p: string; f: string; net: string; y: number; dsprocesso: string }) => {
    if (!visKeys.includes(d.c)) return false
    if (term) return `${d.n} ${d.s} ${d.u} ${d.p} ${d.f} ${d.net||''}`.toLowerCase().includes(term)
    if (d.y < yearMin.value || d.y > yearMax.value) return false
    if (!selectedPhases.value.has(d.f)) return false
    if (sobDemandaOnly.value && !String(d.dsprocesso || '').includes('DEMANDA')) return false
    return true
  })
  filteredCount.value = filtered.length
  pointsData.value = {
    type: 'FeatureCollection',
    features: filtered.map((d: { lo: number; la: number; [key: string]: unknown }, i: number) => ({
      type: 'Feature', id: i,
      properties: { ...d, id: i },
      geometry: { type: 'Point', coordinates: [d.lo, d.la] },
    })),
  }
}

const activeFilterSummary = computed(() => {
  const parts: string[] = []
  if (yearMin.value > 1935 || yearMax.value < 2026) parts.push(`${yearMin.value}-${yearMax.value}`)
  if (selectedPhases.value.size < 7) parts.push(`${selectedPhases.value.size} phases`)
  if (sobDemandaOnly.value) parts.push('Sob Demanda')
  if (searchTerm.value.trim()) parts.push(`"${searchTerm.value.trim()}"`)
  return parts.join(', ') || 'All claims'
})

onMounted(async () => {
  startCounterAnimation()
  await loadRareEarthData()
  filteredCount.value = allFeatures.value.length
  mapContainerRef.value = document.querySelector('.maplibregl-canvas-container')?.closest('.relative') as HTMLElement | null

  // Restore state from URL hash
  if (restoredState.value) {
    const s = restoredState.value
    if (s.center) flyToTarget.value = { lng: s.center[0], lat: s.center[1], zoom: s.zoom ?? 6 }
    if (s.yearMin) yearMin.value = s.yearMin
    if (s.yearMax) yearMax.value = s.yearMax
    if (s.phases) selectedPhases.value = new Set(s.phases)
    if (s.heatmap) layerVis.value['heatmap'] = true
    if (s.enterprise) layerVis.value['enterprise_hq'] = true
    if (s.tab) activeTab.value = s.tab as ObservatoryTabKey
    debouncedFilter()
  } else {
    // First visit: show geo-locate prompt after a short delay
    setTimeout(() => { showGeoLocate.value = true }, 800)
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  // Don't capture if typing in an input
  if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return

  // ? — show shortcuts
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault()
    showShortcuts.value = !showShortcuts.value
    return
  }

  // T — toggle data table
  if (e.key === 't' || e.key === 'T') {
    showDataTable.value = !showDataTable.value
    return
  }

  // Escape — close panels / clear search
  if (e.key === 'Escape') {
    if (showShortcuts.value) { showShortcuts.value = false; return }
    if (showDataTable.value) { showDataTable.value = false; return }
    if (showTimeline.value) { showTimeline.value = false; return }
    if (showRedeCorporativa.value) { showRedeCorporativa.value = false; return }
    if (showDownload.value) { showDownload.value = false; return }
    if (showExport.value) { showExport.value = false; return }
    if (showClaimReport.value) { showClaimReport.value = false; return }
    if (searchTerm.value) { searchTerm.value = ''; debouncedFilter(); return }
    return
  }

  // Ctrl+F — focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    const searchInput = document.querySelector('.obs-search__input') as HTMLInputElement | null
    searchInput?.focus()
    return
  }

  // H — toggle heatmap
  if (e.key === 'h' || e.key === 'H') {
    toggleLayer('heatmap')
    return
  }

  // P — toggle polygons
  if (e.key === 'p' || e.key === 'P') {
    toggleLayer('polygons')
    return
  }

  // W — toggle hydrography
  if (e.key === 'w' || e.key === 'W') {
    toggleLayer('water')
    return
  }

  // 1-6 — switch sidebar tabs
  const tabKeys: ObservatoryTabKey[] = ['danger', 'military', 'illegal', 'env', 'network', 'timeline']
  const num = parseInt(e.key, 10)
  if (num >= 1 && num <= 6) {
    activeTab.value = tabKeys[num - 1]
  }
}

watch(totalCount, () => { animateCounters() })

// Update URL hash on state changes (debounced)
let hashTimer: ReturnType<typeof setTimeout> | null = null
function scheduleHashUpdate() {
  if (hashTimer) clearTimeout(hashTimer)
  hashTimer = setTimeout(() => {
    updateHash({
      yearMin: yearMin.value > 1935 ? yearMin.value : undefined,
      yearMax: yearMax.value < 2026 ? yearMax.value : undefined,
      phases: selectedPhases.value.size < 7 ? Array.from(selectedPhases.value) : undefined,
      heatmap: layerVis.value['heatmap'] || undefined,
      enterprise: layerVis.value['enterprise_hq'] || undefined,
      tab: activeTab.value !== 'danger' ? activeTab.value : undefined,
    })
  }, 500)
}

watch([yearMin, yearMax], scheduleHashUpdate)
watch(selectedPhases, scheduleHashUpdate, { deep: true })
watch(() => layerVis.value['heatmap'], scheduleHashUpdate)
watch(() => layerVis.value['enterprise_hq'], scheduleHashUpdate)
watch(activeTab, scheduleHashUpdate)
</script>

<style>
.obs-stats-panel {
  background: var(--obs-panel-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--obs-panel-border);
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: var(--obs-panel-shadow), inset var(--obs-panel-inset);
  max-width: 320px;
  transition: opacity 0.3s, transform 0.3s;
}

.obs-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.obs-action-btn:hover {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 20%, transparent);
}
.obs-action-btn:active {
  transform: translateY(0);
}
.obs-action-btn--active {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes flyto-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 0.3; }
  100% { transform: scale(1); opacity: 0.6; }
}

@media (prefers-reduced-motion: reduce) {
  .obs-action-btn { transition: none; }
  .obs-action-btn:hover { transform: none; }
}

.obs-filter-panel {
  background: var(--obs-panel-bg-dark);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid var(--obs-panel-border-light);
  border-radius: 12px;
  box-shadow: var(--obs-panel-shadow-deep), inset var(--obs-panel-inset);
  max-width: 260px;
  overflow: hidden;
}

.obs-filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 0;
  color: var(--obs-text-body);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.obs-filter-toggle:hover {
  background: rgba(255, 255, 255, 0.04);
}
.obs-filter-toggle__icon {
  font-size: 12px;
}
.obs-filter-toggle__label {
  flex: 1;
  text-align: left;
}
.obs-filter-toggle__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: rgba(231, 76, 60, 0.25);
  color: var(--obs-red);
  font-size: 8px;
  font-weight: 800;
}
.obs-filter-toggle__chevron {
  font-size: 14px;
  transition: transform 0.2s ease;
  transform: rotate(0deg);
}
.obs-filter-toggle__chevron--open {
  transform: rotate(90deg);
}

.obs-filter-body {
  padding: 0 10px 10px;
}

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
  padding: 4px 0;
  cursor: pointer;
  user-select: none;
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
}
.obs-filter-checkbox:hover .obs-filter-checkbox__label {
  color: var(--obs-text-primary);
}

.obs-filter-expand-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.obs-filter-expand-leave-active {
  transition: all 0.15s ease;
  overflow: hidden;
}
.obs-filter-expand-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}
.obs-filter-expand-enter-to {
  opacity: 1;
  max-height: 600px;
}
.obs-filter-expand-leave-from {
  opacity: 1;
  max-height: 600px;
}
.obs-filter-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

@media (prefers-reduced-motion: reduce) {
  .obs-filter-toggle__chevron { transition: none; }
  .obs-filter-expand-enter-active, .obs-filter-expand-leave-active { transition: none; }
}

.obs-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 260px;
  padding: 0 12px;
  height: 36px;
  background: var(--obs-panel-bg-dark);
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
}
.obs-search__clear:hover {
  color: var(--obs-red);
}

.obs-legend-panel {
  background: var(--obs-panel-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--obs-panel-border-light);
  border-radius: 10px;
  padding: 8px 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.obs-legend-title {
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--obs-text-muted);
  margin: 0 0 4px;
}
.obs-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  color: var(--obs-text-label);
  padding: 1px 0;
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

.obs-minimap {
  position: absolute;
  bottom: clamp(4rem, 10vh, 5.5rem);
  left: clamp(0.5rem, 1.5vw, 0.75rem);
  z-index: 500;
  width: 140px;
  height: 100px;
  background: var(--obs-panel-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--obs-panel-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: width 0.2s, height 0.2s;
}
.obs-minimap--collapsed {
  width: 28px;
  height: 28px;
}
.obs-minimap__toggle {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 2;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: 0;
  border-radius: 4px;
  color: var(--obs-text-body);
  font-size: 10px;
  cursor: pointer;
  transition: color 0.15s;
}
.obs-minimap__toggle:hover {
  color: var(--obs-red);
}
.obs-minimap__map {
  width: 100%;
  height: 100%;
}
.obs-minimap__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.obs-minimap__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--obs-panel-border);
  border-top-color: var(--obs-red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
