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
      <MapView3D
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
      </MapView3D>

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

      <template #fallback>
        <div class="flex h-[100svh] w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import type maplibregl from 'maplibre-gl'
import { useObservatoryControls, type ObservatoryData, type ObservatoryTabKey } from '@/composables/useObservatoryControls'
import ObservatoryControls from '@/components/observatory/ObservatoryControls.vue'
import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
import ClaimReportModal from '@/components/observatory/ClaimReportModal.vue'
import ExportModal from '@/components/observatory/ExportModal.vue'
import KeyboardShortcuts from '@/components/observatory/KeyboardShortcuts.vue'
import ClaimsDataTable from '@/components/observatory/ClaimsDataTable.vue'
import GeoLocateModal from '@/components/observatory/GeoLocateModal.vue'
import UserContributionModal from '@/components/observatory/UserContributionModal.vue'
import { useRareEarthData } from '@/composables/useRareEarthData'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: 'Observatory of Vulcan Globe (3D) | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

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
const { pointsData: _rawPointsData, polygonsData: _rawPolygonsData, protectedData: _rawProtectedData, waterData: _rawWaterData, culturalData: _rawCulturalData, features: allFeatures, speculatorIndex, deepAnalysis, isLoading, loadPhase, loadProgress, error, load: loadRareEarthData, loadFullBrazil, isRegional } = useRareEarthData(baseURL)

// Cast data to match component prop types
const pointsData = computed(() => (_rawPointsData.value ?? { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection))
const polygonsData = computed<GeoJSON.FeatureCollection | undefined>(() => _rawPolygonsData.value != null ? _rawPolygonsData.value as GeoJSON.FeatureCollection : undefined)
const protectedData = computed<GeoJSON.FeatureCollection | undefined>(() => _rawProtectedData.value != null ? _rawProtectedData.value as GeoJSON.FeatureCollection : undefined)
const waterData = computed(() => _rawWaterData.value ?? null)
const culturalData = computed(() => _rawCulturalData.value ?? null)

// Wire data into composable
controls.setupObservatory({
  allFeatures: allFeatures as unknown as Ref<unknown[]>,
  pointsData: _rawPointsData as unknown as Ref<GeoJSON.FeatureCollection>,
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
