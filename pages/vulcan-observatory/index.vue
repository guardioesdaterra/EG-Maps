<template>
  <div id="main-content" class="relative">
    <!-- Loading overlay -->
    <Transition name="fade">
      <div v-if="isLoading || error" class="fixed inset-0 z-[9998] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4">
        <template v-if="error && !isLoading">
          <div class="text-center">
            <span class="text-4xl mb-3 block">⚠️</span>
            <h2 class="text-fluid-sm font-bold text-red-400 uppercase tracking-wider mb-1">{{ t('observatory.error.loadFailed') }}</h2>
            <p class="text-fluid-xs text-zinc-500 mb-4">{{ error.message }}</p>
            <button
              type="button"
              class="px-fluid-md py-fluid-xs text-fluid-xs font-bold rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              @click="loadRareEarthData()">
              {{ t('observatory.error.retry') }}
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
      <MapView2D
        :default-dataset="'vulcan-observatory'"
        :rare-earth-points="pointsData"
        :rare-earth-filtered="filteredPoints"
        :rare-earth-polygons="polygonsData"
        :rare-earth-protected="protectedData"
        :rare-earth-water="waterData"
        :rare-earth-cultural="culturalData"
        :layer-visibility="layerVis"
        :fly-to-target="flyToTarget"
        @map-init="onMapInit"
      >
        <template #overlays>
          <ObservatoryControls
            :state="controls"
            :stats="stats"
            :data="data"
            :on-rede-corporativa="() => showRedeCorporativa = true"
            :on-data-download="() => showDownload = true"
            :on-user-contribution="() => showUserContribution = true"
            :on-expand-to-full-brazil="() => expandToFullBrazil(loadFullBrazil)"
            @toggle-enterprise="toggleEnterpriseLayer"
          />

          <!-- Tab navigation sidebar -->
          <ObservatorySidebar
            :active-tab="activeTab"
            :danger-items="speculatorIndex"
            :show-all="showAll"
            class="absolute"
            style="top: clamp(6.5rem, 18vh, 10rem); right: clamp(0.75rem, 2vw, 1rem);"
            @update:active-tab="(tab) => activeTab = tab"
            @update:show-all="(v) => showAll = v"
            @fly-to-enterprise="zoomToDanger"
            @fly-to-coord="flyToCoord"
          />

          <!-- My Territory Pin -->
          <div
            v-if="userPin" class="absolute z-[500] bg-[var(--obs-panel-bg-dark)] backdrop-blur border border-emerald-700/40 rounded-xl px-3 py-2.5 shadow-lg max-w-[clamp(14rem,35vw,18rem)]"
            style="bottom: clamp(5rem, 12vh, 7.5rem); right: clamp(0.75rem, 2vw, 1rem);">
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
            :style="pinPickerMode ? 'bottom: clamp(4rem, 10vh, 5.5rem); right: clamp(0.75rem, 2vw, 1rem); background: color-mix(in srgb, var(--obs-emerald) 25%, transparent); border-color: var(--obs-emerald); color: #fff;' : 'bottom: clamp(4rem, 10vh, 5.5rem); right: clamp(0.75rem, 2vw, 1rem);'"
            @click="togglePinPicker">
            <span>📍</span>
            {{ pinPickerMode ? t('observatory.myTerritory.cancel') : t('observatory.myTerritory.dropPin') }}
          </button>
        </template>
      </MapView2D>

      <!-- Modals -->
      <GeoPoliticalTimeline :visible="showTimeline" @close="showTimeline = false" />
      <RedeCorporativa :visible="showRedeCorporativa" @close="showRedeCorporativa = false" @fly-to-enterprise="flyToEnterprise" />
      <DataDownloadPanel :visible="showDownload" @close="showDownload = false" />
      <ClaimReportModal :visible="showClaimReport" :claim="reportClaim" @close="showClaimReport = false" />
      <ExportModal :visible="showExport" :map-container="mapContainerRef" :filter-summary="activeFilterSummary" @close="showExport = false" />
      <KeyboardShortcuts :visible="showShortcuts" @close="showShortcuts = false" />
      <GeoLocateModal :visible="showGeoLocate" @close="showGeoLocate = false" @locate="onGeoLocate" />
      <UserContributionModal :visible="showUserContribution" @close="showUserContribution = false" />
      <ClaimsDataTable :visible="showDataTable" :data="allFeatures" @close="showDataTable = false" @fly-to="(coords) => flyToTarget = { lng: coords[0], lat: coords[1], zoom: 8 }" />
      <ClaimDetailModal :visible="showClaimDetail" :claim="claimDetailProps" @close="closeClaimDetail" />

      <template #fallback>
        <div class="flex h-[100svh] w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcan')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type maplibregl from 'maplibre-gl'
import { useObservatoryControls, type ObservatoryData, type ObservatoryTabKey } from '@/composables/useObservatoryControls'
import { useObservatorySelection } from '@/composables/useObservatorySelection'
import ObservatoryControls from '@/components/observatory/ObservatoryControls.vue'
import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
import ClaimReportModal from '@/components/observatory/ClaimReportModal.vue'
import ExportModal from '@/components/observatory/ExportModal.vue'
import KeyboardShortcuts from '@/components/observatory/KeyboardShortcuts.vue'
import ClaimsDataTable from '@/components/observatory/ClaimsDataTable.vue'
import GeoLocateModal from '@/components/observatory/GeoLocateModal.vue'
import UserContributionModal from '@/components/observatory/UserContributionModal.vue'
import ClaimDetailModal from '@/components/observatory/ClaimDetailModal.vue'
import { useRareEarthData } from '@/composables/useRareEarthData'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: 'Observatory of Vulcan | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

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

// ---- Composable (all state + logic) ----
const controls = useObservatoryControls()
const {
  // filters
  yearMin, yearMax, selectedPhases, searchTerm, sobDemandaOnly, filtersExpanded, activeTab,
  showShortcuts, showDataTable, showTimeline, showExport, showGeoLocate, showClaimReport,
  reportClaim, userLocationRadius, mapContainerRef, filteredCount,
  // layers
  layerVis, enterpriseLayerVisible, toggleLayer, toggleEnterpriseLayer,
  // map
  flyToTarget, mapRef: _mapRef, onMapInit, flyToCoord, onGeoLocate, expandToFullBrazil, zoomToDanger, flyToEnterprise,
  // data
  filteredPoints,
  // stats
  categoryStats, totalCount, activeFilterCount, activeFilterSummary, formatSyncDate, formatHa,
  // animations
  displayCounts, startCounterAnimation, animatedCount, animateCounters,
  // hash
  restoredState,
  // keyboard
  handleKeydown,
  // filter logic
  debouncedFilter, updateFilter,
} = controls

// ---- Data ----
const { pointsData: _rawPointsData, polygonsData: _rawPolygonsData, protectedData: _rawProtectedData, waterData: _rawWaterData, culturalData: _rawCulturalData, features: allFeatures, speculatorIndex, deepAnalysis, isLoading, loadPhase, loadProgress, error, load: loadRareEarthData, loadFullBrazil, isRegional } = useRareEarthData(baseURL, 'pococaldas')

// Cast data to match component prop types (ShallowRef<T|undefined> -> Ref<T|undefined>)
const pointsData = computed(() => _rawPointsData.value ?? { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection)
const polygonsData = computed(() => _rawPolygonsData.value)
const protectedData = computed(() => _rawProtectedData.value)
const waterData = computed(() => _rawWaterData.value)
const culturalData = computed(() => _rawCulturalData.value)

// Wire data into composable
controls.setupObservatory({
  allFeatures,
  pointsData: _rawPointsData as unknown as Ref<GeoJSON.FeatureCollection>,
  polygonsData: _rawPolygonsData,
  protectedData: _rawProtectedData,
  waterData: _rawWaterData,
  culturalData: _rawCulturalData,
  speculatorIndex,
  deepAnalysis,
  isLoading,
  loadPhase,
  loadProgress,
  error,
  loadRareEarthData,
  loadFullBrazil,
  isRegional,
})

// ---- Stats (composable-provided) ----
const stats = { categoryStats, totalCount, filteredCount, activeFilterCount, activeFilterSummary, formatSyncDate, formatHa }
const data: ObservatoryData = {
  allFeatures: allFeatures as unknown as Ref<unknown[]>,
  pointsData: _rawPointsData as unknown as Ref<GeoJSON.FeatureCollection>,
  filteredPoints: filteredPoints as unknown as Ref<GeoJSON.FeatureCollection>,
  polygonsData: _rawPolygonsData as unknown as Ref<unknown>,
  protectedData: _rawProtectedData as unknown as Ref<unknown>,
  waterData: _rawWaterData as unknown as Ref<unknown>,
  culturalData: _rawCulturalData as unknown as Ref<unknown>,
  speculatorIndex: speculatorIndex as unknown as Ref<unknown[]>,
  deepAnalysis: deepAnalysis as unknown as Ref<{ last_sync?: string; sigilo_stats?: { total: number; total_area_ha: number } } | null>,
  isLoading,
  loadPhase,
  loadProgress,
  error: error as unknown as Ref<{ message?: string } | null>,
  loadRareEarthData,
  loadFullBrazil,
  isRegional,
  setupObservatory: () => {},
}

// ---- Modals (page-level, not in composable) ----
const showRedeCorporativa = ref(false)
const showDownload = ref(false)
const showUserContribution = ref(false)
const showAll = ref(false)

// ---- Claim full-screen overlay ----
const showClaimDetail = ref(false)
const claimDetailProps = ref<Record<string, unknown> | null>(null)
const obsSel = useObservatorySelection()

watch(() => obsSel.selection.value.processo, (processo) => {
  if (processo) {
    const sel = obsSel.selection.value
    const features = allFeatures.value as Array<Record<string, unknown>>
    const feature = features.find(f => f.p === processo) ?? { p: processo, n: sel.nome }
    claimDetailProps.value = {
      ...feature,
      lo: sel.coords?.[0] ?? feature.lo,
      la: sel.coords?.[1] ?? feature.la,
    } as Record<string, unknown>
    showClaimDetail.value = true
  }
})

function closeClaimDetail() {
  showClaimDetail.value = false
  claimDetailProps.value = null
}

// ---- My Territory pin ----
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
  const m = _mapRef.value
  if (!m) return
  m.getCanvas().style.cursor = 'crosshair'
  pinClickHandler = (e: maplibregl.MapMouseEvent) => {
    if (!pinPickerMode.value) return
    const { lng, lat } = e.lngLat
    setUserPin({ lng, lat }, t('observatory.myTerritory.defaultLabel'))
    pinPickerMode.value = false
    if (m) m.getCanvas().style.cursor = ''
    flyToTarget.value = { lng, lat, zoom: 8 }
  }
  m.on('click', pinClickHandler)
  pinKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && pinPickerMode.value) togglePinPicker()
  }
  window.addEventListener('keydown', pinKeyHandler)
}

function detachPinClick() {
  const m = _mapRef.value
  if (m && pinClickHandler) {
    m.off('click', pinClickHandler)
    m.getCanvas().style.cursor = ''
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

// ---- Loading message ----
const loadingMessage = computed(() => {
  const regionLabel = isRegional.value ? 'Poços de Caldas region' : 'Brazil'
  switch (loadPhase.value) {
    case 'points': return `Loading mining claims (${regionLabel})...`
    case 'overlaps': return 'Loading territory overlaps...'
    case 'polygons': return 'Loading claim boundaries...'
    case 'protected': return 'Loading protected areas, waterbodies & analysis...'
    case 'complete': return 'Ready'
    default: return 'Initializing...'
  }
})

// ---- Keyboard: handle Escape for page-level modals ----
function handleKeydownPage(e: KeyboardEvent) {
  if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
  if (e.key === 'Escape') {
    if (showTimeline.value) { showTimeline.value = false; return }
    if (showRedeCorporativa.value) { showRedeCorporativa.value = false; return }
    if (showDownload.value) { showDownload.value = false; return }
    if (showClaimReport.value) { showClaimReport.value = false; return }
    if (showUserContribution.value) { showUserContribution.value = false; return }
    if (showClaimDetail.value) { closeClaimDetail(); return }
  }
}

// ---- Lifecycle ----
onMounted(async () => {
  startCounterAnimation()
  await loadRareEarthData()
  filteredCount.value = allFeatures.value.length
  mapContainerRef.value = document.querySelector('.maplibregl-canvas-container')?.closest('.relative') as HTMLElement | null

  // Restore state from URL hash
  if (restoredState.value) {
    const s = restoredState.value as Record<string, unknown>
    if (s.center) flyToTarget.value = { lng: (s.center as number[])[0], lat: (s.center as number[])[1], zoom: (s.zoom as number) ?? 6 }
    if (s.yearMin) yearMin.value = s.yearMin as number
    if (s.yearMax) yearMax.value = s.yearMax as number
    if (s.phases) selectedPhases.value = new Set(s.phases as string[])
    if (s.heatmap) layerVis.value['heatmap'] = true
    if (s.enterprise) layerVis.value['enterprise_hq'] = true
    if (s.tab) activeTab.value = s.tab as ObservatoryTabKey
    debouncedFilter()
  } else {
    setTimeout(() => { showGeoLocate.value = true }, 800)
  }

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keydown', handleKeydownPage)
})

onUnmounted(() => {
  detachPinClick()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keydown', handleKeydownPage)
})
</script>

<style>
.obs-top-right-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

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

@media (max-width: 640px) {
  .obs-stats-panel {
    max-width: 180px;
    padding: 8px 10px;
  }
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

@media (max-width: 640px) {
  .obs-action-btn {
    padding: 5px 8px;
    font-size: 8px;
    gap: 4px;
  }
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

@media (max-width: 640px) {
  .obs-filter-panel {
    max-width: min(220px, calc(100vw - 2rem));
    border-radius: 10px;
  }
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

@media (max-width: 640px) {
  .obs-search {
    width: min(220px, calc(100vw - 2rem));
    height: 32px;
    padding: 0 10px;
    gap: 6px;
  }
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

@media (max-width: 640px) {
  .obs-legend-panel {
    padding: 6px 8px;
    border-radius: 8px;
  }
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
</style>
