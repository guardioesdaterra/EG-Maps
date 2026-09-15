/**
 * pages/vulcan-observatory/3d.vue
 * @why Vulcan observatory 3D globe — culture-first layout: rare-earth
 *      mining claims on a 3D globe with Mapa Cultura + Floresta Ativista
 *      agents highlighted as a featured overlay. Mirrors the 2D page
 *      (`/index.vue`) one-for-one but uses MapView3D and exposes a
 *      "view flat map" toggle to return to `/vulcan-observatory`.
 *
 * @deps @/composables/useI18n (useI18n);
 *       @/composables/useVulcanObservatoryPage (useVulcanObservatoryPage);
 *       @/components/observatory/ObservatorySidebar.vue;
 * @connections /vulcan-observatory/index.vue (2D counterpart)
 */
<template>
  <div id="main-content" tabindex="-1" class="relative w-full h-[100svh] overflow-hidden bg-black focus:outline-none" :class="{ 'vulc-has-panel': rightPanelOpen }">
    <!-- ── Loading overlay ─────────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="isLoading || error"
        class="fixed inset-0 z-[9980] bg-black/90 flex flex-col items-center justify-center gap-5"
      >
        <template v-if="error && !isLoading">
          <div class="text-center">
            <Icon name="lucide:alert-triangle" class="text-5xl mb-4 mx-auto text-red-400" />
            <h2 class="text-lg font-bold text-red-400 uppercase tracking-wider mb-2">
              {{ t('observatory.error.loadFailed') }}
            </h2>
            <p class="text-sm text-zinc-500 mb-5 max-w-md">{{ error.message }}</p>
            <button
              type="button"
              class="px-5 py-2 text-sm font-bold rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              @click="loadRareEarthData()"
            >
              {{ t('observatory.error.retry') }}
            </button>
          </div>
        </template>
        <template v-else>
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-20 h-20 text-red-500" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
                <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
              </path>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <Icon name="lucide:mountain" class="text-3xl text-red-500" />
            </div>
          </div>
          <div class="text-center">
            <h2 class="text-base font-bold text-zinc-200 uppercase tracking-wider mb-1">
              {{ t('loading.observatoryOfVulcanGlobe') }}
            </h2>
            <p class="text-xs text-zinc-500">{{ loadingMessage }}</p>
          </div>
          <div class="w-56 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :style="{
                width: `${loadProgress}%`,
                background: 'linear-gradient(90deg, var(--obs-red), var(--obs-amber))',
              }"
            />
          </div>
          <span class="text-xs text-zinc-400 font-mono">{{ loadProgress }}%</span>
        </template>
      </div>
    </Transition>

    <ClientOnly>
      <MapView3D
        :default-dataset="'vulcan-observatory'"
        :rare-earth-points="pointsData"
        :rare-earth-filtered="filteredPoints"
        :rare-earth-polygons="visiblePolygons"
        :rare-earth-protected="protectedData"
        :rare-earth-water="waterData"
        :rare-earth-cultural="culturalData"
        :layer-visibility="layerVis"
        :fly-to-target="flyToTarget"
        @map-init="onMapInit"
      >
        <template #overlays>
          <!-- ── Merged topbar (brand + stats + menu in one bar) ─── -->
          <ObservatoryTopbar
            :category-stats="categoryStats"
            :total-count="totalCount"
            :animated-count="controls.animatedCount"
            :title="t('observatory.v2.brandTitleGlobe')"
            :subtitle="t('observatory.v2.brandSubGlobe')"
            :on-near-me="toggleGeoLocate"
            :near-me-active="controls.showGeoLocate.value"
          />

          <!-- ── Desktop: Floating action bubble (bottom-right) ──── -->
          <div class="vulc-actions-bubble" role="region" :aria-label="t('observatory.v2.actions')">
            <button
              type="button"
              class="vulc-actions-bubble__toggle"
              :aria-label="actionsExpanded ? 'Collapse actions' : 'Expand actions'"
              :aria-expanded="actionsExpanded"
              @click="actionsExpanded = !actionsExpanded"
            >
              <Icon :name="actionsExpanded ? 'lucide:x' : 'lucide:settings-2'" />
            </button>
            <Transition name="vulc-actions-expand">
              <nav v-show="actionsExpanded" class="vulc-actions-bubble__menu" :aria-label="t('observatory.v2.actions')">
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :class="{ 'is-active': rightPanelOpen && rightPanelTab === 'timeline' }"
                  :aria-label="t('observatory.tabs.timeline')"
                  :aria-pressed="rightPanelOpen && rightPanelTab === 'timeline'"
                  @click="toggleTimeline"
                >
                  <Icon name="lucide:clock" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.tabs.timeline') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :class="{ 'is-active': controls.enterpriseLayerVisible.value }"
                  :aria-label="t('observatory.v2.enterpriseHq')"
                  :aria-pressed="controls.enterpriseLayerVisible.value"
                  @click="controls.toggleEnterpriseLayer()"
                >
                  <Icon name="lucide:building-2" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.enterpriseHq') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :class="{ 'is-active': controls.showDataTable.value }"
                  :aria-label="t('observatory.v2.dataTable')"
                  :aria-pressed="controls.showDataTable.value"
                  @click="controls.showDataTable.value = !controls.showDataTable.value"
                >
                  <Icon name="lucide:table" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.dataTable') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.export')"
                  @click="controls.showExport.value = !controls.showExport.value"
                >
                  <Icon name="lucide:file-down" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.export') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.shortcuts')"
                  @click="controls.showShortcuts.value = !controls.showShortcuts.value"
                >
                  <Icon name="lucide:keyboard" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.shortcuts') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn"
                  :aria-label="t('observatory.v2.nearMe')"
                  @click="controls.showGeoLocate.value = !controls.showGeoLocate.value"
                >
                  <Icon name="lucide:map-pin" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.nearMe') }}</span>
                </button>
                <button
                  type="button"
                  class="vulc-icon-btn vulc-icon-btn--primary"
                  :aria-label="t('observatory.v2.viewFlat')"
                  @click="navigateTo('/vulcan-observatory')"
                >
                  <Icon name="lucide:map" />
                  <span class="vulc-icon-btn__tip">{{ t('observatory.v2.viewFlat') }}</span>
                </button>
              </nav>
            </Transition>
          </div>

          <!-- ── Mobile: Vertical action menu (right side) ──────── -->
          <nav class="vulc-mobile-actions" :aria-label="t('observatory.v2.actions')">
            <button
              type="button"
              class="vulc-icon-btn vulc-icon-btn--primary"
              :class="{ 'is-active': rightPanelOpen }"
              :aria-label="t('observatory.v2.panel.expand')"
              :aria-pressed="rightPanelOpen"
              @click="rightPanelOpen = !rightPanelOpen"
            >
              <Icon :name="rightPanelOpen ? 'lucide:panel-right-close' : 'lucide:panel-right-open'" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.panel.expand') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :class="{ 'is-active': rightPanelOpen && rightPanelTab === 'timeline' }"
              :aria-label="t('observatory.tabs.timeline')"
              :aria-pressed="rightPanelOpen && rightPanelTab === 'timeline'"
              @click="toggleTimeline"
            >
              <Icon name="lucide:clock" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.tabs.timeline') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :class="{ 'is-active': controls.enterpriseLayerVisible.value }"
              :aria-label="t('observatory.v2.enterpriseHq')"
              :aria-pressed="controls.enterpriseLayerVisible.value"
              @click="controls.toggleEnterpriseLayer()"
            >
              <Icon name="lucide:building-2" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.enterpriseHq') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :class="{ 'is-active': controls.showDataTable.value }"
              :aria-label="t('observatory.v2.dataTable')"
              :aria-pressed="controls.showDataTable.value"
              @click="controls.showDataTable.value = !controls.showDataTable.value"
            >
              <Icon name="lucide:table" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.dataTable') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.export')"
              @click="controls.showExport.value = !controls.showExport.value"
            >
              <Icon name="lucide:file-down" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.export') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.shortcuts')"
              @click="controls.showShortcuts.value = !controls.showShortcuts.value"
            >
              <Icon name="lucide:keyboard" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.shortcuts') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn"
              :aria-label="t('observatory.v2.nearMe')"
              @click="controls.showGeoLocate.value = !controls.showGeoLocate.value"
            >
              <Icon name="lucide:map-pin" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.nearMe') }}</span>
            </button>
            <button
              type="button"
              class="vulc-icon-btn vulc-icon-btn--primary"
              :aria-label="t('observatory.v2.viewFlat')"
              @click="navigateTo('/vulcan-observatory')"
            >
              <Icon name="lucide:map" />
              <span class="vulc-icon-btn__tip">{{ t('observatory.v2.viewFlat') }}</span>
            </button>
          </nav>

          <!-- ── Right-side: Territory / Culture / Powers / Timeline intel ── -->
          <ObservatorySidebar
            v-model:open="rightPanelOpen"
            v-model:active-tab="rightPanelTab"
            :rare-earth-cultural="culturalData"
            :speculator-index="speculatorIndex"
            :layer-vis="controls.layerVis.value"
            :toggle-layer="controls.toggleLayer"
            :deep-analysis="deepAnalysis"
            :protected-breakdown="protectedSummary"
            :overlap-summary="overlapSummary"
            :water-summary="waterSummary"
            :foreign-holders="foreignHolders"
            :search-term="controls.searchTerm.value"
            :selected-phases="controls.selectedPhases.value"
            :sob-demanda-only="controls.sobDemandaOnly.value"
            :pin-threats="pinThreats"
            :layer-counts="layerCounts"
            :category-stats="categoryStats"
            :total-claims="totalCount"
            :last-sync="lastSync"
            :year-min="yearMin"
            :year-max="yearMax"
            :filtered-count="filteredCount"
            :protected-matches="controls.protectedMatches.value"
            :cultural-loading="culturalLoading"
            :cultural-error="culturalError?.message ?? null"
            @fly-to-coord="flyToCoord"
            @fly-to-enterprise="zoomToDanger"
            @jump-to-cultural="onJumpToCultural"
            @retry-cultural="loadCulturalAgents"
            @report-enterprise="onReportEnterprise"
            @report-pattern="onReportPattern"
            @add-observation="onUserContribution()"
            @update:year-min="onUpdateYearMin"
            @update:year-max="onUpdateYearMax"
            @update:search-term="onUpdateSearchTerm"
            @update:selected-phases="updatePhases"
            @update:sob-demanda-only="onUpdateSobDemanda"
          />

        </template>
      </MapView3D>

      <!-- ── Modals ──────────────────────────────────── -->
      <RedeCorporativa
        :visible="showRedeCorporativa"
        @close="showRedeCorporativa = false"
        @fly-to-enterprise="flyToEnterprise"
      />
      <DataDownloadPanel :visible="showDownload" @close="showDownload = false" />
      <ClaimReportModal :visible="showClaimReport" :claim="reportClaim" @close="showClaimReport = false" />
      <ExportModal :visible="showExport" :map-container="mapContainerRef" :filter-summary="activeFilterSummary" @close="showExport = false" />
      <KeyboardShortcuts :visible="showShortcuts" @close="showShortcuts = false" />
      <GeoLocateModal :visible="showGeoLocate" @close="showGeoLocate = false" @locate="onGeoLocateWithPin" />
      <UserContributionModal :visible="showUserContribution" @close="showUserContribution = false" />
      <ClaimsDataTable
        :visible="showDataTable"
        :data="allFeatures"
        @close="showDataTable = false"
        @fly-to="(coords: [number, number]) => (flyToTarget = { lng: coords[0], lat: coords[1], zoom: 8 })"
      />
      <ClaimDetailModal :visible="showClaimDetail" :claim="claimDetailProps" :context="claimDetailContext" @close="closeClaimDetail" />

      <template #fallback>
        <div class="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useVulcanObservatoryPage } from '@/composables/useVulcanObservatoryPage'

import MapView3D from '@/components/MapView3D.vue'
import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
import ObservatoryTopbar from '@/components/observatory/ObservatoryTopbar.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
// Below-fold modals/panels load on demand so the initial bundle stays lean
// (all render behind `visible` gates — no feature change, just timing).
const RedeCorporativa = defineAsyncComponent(() => import('@/components/RedeCorporativa.vue'))
const DataDownloadPanel = defineAsyncComponent(() => import('@/components/DataDownloadPanel.vue'))
const ClaimReportModal = defineAsyncComponent(() => import('@/components/observatory/ClaimReportModal.vue'))
const ExportModal = defineAsyncComponent(() => import('@/components/observatory/ExportModal.vue'))
const KeyboardShortcuts = defineAsyncComponent(() => import('@/components/observatory/KeyboardShortcuts.vue'))
const GeoLocateModal = defineAsyncComponent(() => import('@/components/observatory/GeoLocateModal.vue'))
const UserContributionModal = defineAsyncComponent(() => import('@/components/observatory/UserContributionModal.vue'))
const ClaimsDataTable = defineAsyncComponent(() => import('@/components/observatory/ClaimsDataTable.vue'))
const ClaimDetailModal = defineAsyncComponent(() => import('@/components/observatory/ClaimDetailModal.vue'))

const { t } = useI18n()

useHead({
  title: 'Vulcan Observatory Globe (3D) · Poços de Caldas | Earth Guardians',
  meta: [
    {
      name: 'description',
      content:
        'A 3D community observatory for Poços de Caldas: public mining records, water, protected territories and cultural agents brought together for context-aware Earth Guardians action.',
    },
  ],
})

const {
  controls,
  stats,
  pointsData,
  filteredPoints,
  filteredPolygons,
  polygonsData,
  protectedData,
  waterData,
  culturalData,
  layerVis,
  flyToTarget,
  onMapInit,
  allFeatures,
  speculatorIndex,
  deepAnalysis,
  layerCounts,
  overlapSummary,
  protectedSummary,
  waterSummary,
  foreignHolders,
  pinThreats,
  setUserPin,
  lastSync,
  yearMin,
  yearMax,
  filteredCount,
  isLoading,
  loadProgress,
  error,
  loadRareEarthData,
  showRedeCorporativa,
  showDownload,
  showUserContribution,
  showClaimDetail,
  claimDetailProps,
  claimDetailContext,
  closeClaimDetail,
  loadingMessage,
  flyToEnterprise,
  zoomToDanger,
  flyToCoord,
  onGeoLocate,
  activeFilterSummary,
  showShortcuts,
  showDataTable,
  showTimeline,
  showExport,
  showGeoLocate,
  showClaimReport,
  reportClaim,
  mapContainerRef,
  culturalLoading,
  culturalError,
  loadCulturalAgents,
} = useVulcanObservatoryPage()

const { categoryStats, totalCount, activeFilterCount } = stats

// Polygons honour the mining-phase filter (see useObservatoryControls).
const visiblePolygons = computed(() => {
  const f = filteredPolygons.value as unknown as GeoJSON.FeatureCollection | undefined
  const raw = polygonsData.value as unknown as GeoJSON.FeatureCollection | undefined
  if (f?.features?.length) return f
  if (!raw?.features?.length) return f ?? raw
  if ((activeFilterCount?.value ?? 0) > 0) return f ?? raw
  return raw
})

const actionsExpanded = ref(false)

// Right intel panel state (bound to ObservatorySidebar via v-model).
type VulcPanelTab = 'territory' | 'culture' | 'power' | 'timeline'
const isNarrowScreen = typeof window !== 'undefined' ? window.innerWidth < 769 : false
const rightPanelOpen = ref(!isNarrowScreen)
const rightPanelTab = ref<VulcPanelTab>('territory')

/** Timeline action: opens the intel panel on the timeline tab. */
function toggleTimeline() {
  if (rightPanelOpen.value && rightPanelTab.value === 'timeline') {
    rightPanelOpen.value = false
    return
  }
  rightPanelTab.value = 'timeline'
  rightPanelOpen.value = true
  controls.showTimeline.value = true
}

watch(rightPanelOpen, (open) => {
  if (!open) controls.showTimeline.value = false
})
watch(rightPanelTab, (tab) => {
  if (tab !== 'timeline') controls.showTimeline.value = false
})

function onRedeCorporativa() { showRedeCorporativa.value = true }
function onDataDownload() { showDownload.value = true }
function onUserContribution() { showUserContribution.value = true }
/** Header Nearby action: opens the geolocate dialog (drops a watch pin). */
function toggleGeoLocate() { controls.showGeoLocate.value = !controls.showGeoLocate.value }
function onReportEnterprise(name: string, score: number, flags: string[]) {
  reportClaim.value = { n: name, score, flags }
  showClaimReport.value = true
}
function onReportPattern(_key: string) {
  showUserContribution.value = true
}
function onUpdateYearMin(v: number) {
  controls.yearMin.value = v
  controls.debouncedFilter()
}
function onUpdateYearMax(v: number) {
  controls.yearMax.value = v
  controls.debouncedFilter()
}
function onUpdateSearchTerm(v: string) {
  controls.searchTerm.value = v
  controls.debouncedFilter()
}
function onUpdateSobDemanda(v: boolean) {
  controls.sobDemandaOnly.value = v
  controls.debouncedFilter()
}
function updatePhases(value: Set<string>) {
  controls.selectedPhases.value = value
  controls.debouncedFilter()
}
function onGeoLocateWithPin(lat: number, lng: number, city: string) {
  onGeoLocate(lat, lng, city)
  setUserPin({ lng, lat }, city || 'My location')
}
function onJumpToCultural(coord: [number, number], _name: string) {
  flyToTarget.value = { lng: coord[0], lat: coord[1], zoom: 6 }
}
</script>

<style scoped>
/* Merged top-bar visuals live in components/observatory/ObservatoryTopbar.vue. */

/* No global header on this route — panels anchor below the merged bar. */
#main-content {
  --vulc-bar-top: calc(env(safe-area-inset-top) + 0.5rem);
  --vulc-bar-h: 3rem;
  --vulc-panel-top: calc(var(--vulc-bar-top) + var(--vulc-bar-h) + 0.9rem);
}

/* ── Icon buttons (shared) ──────────────────────────────────────── */
.vulc-icon-btn {
  position: relative;
  width: clamp(1.85rem, 3.5vw, 2.25rem);
  height: clamp(1.85rem, 3.5vw, 2.25rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}
.vulc-icon-btn svg, .vulc-icon-btn :deep(svg) { width: 60%; height: 60%; }
.vulc-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.vulc-icon-btn.is-active {
  background: color-mix(in srgb, var(--obs-red, #e74c3c) 22%, transparent);
  border-color: color-mix(in srgb, var(--obs-red, #e74c3c) 45%, transparent);
  color: var(--obs-red, #e74c3c);
}
.vulc-icon-btn--primary {
  background: color-mix(in srgb, var(--obs-emerald, #10b981) 18%, transparent);
  border-color: color-mix(in srgb, var(--obs-emerald, #10b981) 45%, transparent);
  color: var(--obs-emerald, #10b981);
}
.vulc-icon-btn__tip {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 0.55rem;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #000;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 1;
}
.vulc-icon-btn:hover .vulc-icon-btn__tip { opacity: 1; }

/* ── Desktop: Floating action bubble (bottom-right) ─────────────── */
.vulc-actions-bubble {
  position: absolute;
  bottom: clamp(1rem, 3vh, 1.5rem);
  right: clamp(0.75rem, 1.5vw, 1.25rem);
  z-index: 550;
  pointer-events: auto;
  display: none;
}
.vulc-actions-bubble__toggle {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.2s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.vulc-actions-bubble__toggle svg { width: 55%; height: 55%; }
.vulc-actions-bubble__toggle:hover {
  background: #1a1a1e;
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: scale(1.05);
}
.vulc-actions-bubble__menu {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem;
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.vulc-actions-bubble__menu .vulc-icon-btn__tip {
  right: calc(100% + 8px);
  left: auto;
  top: 50%;
  transform: translateY(-50%);
}

/* ── Mobile: Vertical action menu (right side pillar) ───────────── */
.vulc-mobile-actions {
  position: absolute;
  top: var(--vulc-panel-top);
  right: clamp(0.35rem, 0.8vw, 0.5rem);
  bottom: 0;
  z-index: 540;
  pointer-events: auto;
  display: none;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem;
  background: rgba(10, 10, 12, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  overflow-y: auto;
  scrollbar-width: none;
}
.vulc-mobile-actions::-webkit-scrollbar { display: none; }
.vulc-mobile-actions .vulc-icon-btn { width: 2rem; height: 2rem; }

/* ── Desktop show/hide ──────────────────────────────────────────── */
@media (min-width: 769px) {
  .vulc-actions-bubble { display: block; }
}
/* ── Mobile show/hide ───────────────────────────────────────────── */
@media (max-width: 768px) {
  .vulc-mobile-actions { display: flex; }
}

/* ── Tablet/phone: non-overlapping auto-adjust stack ──────────────
   Merged topbar → sheet / action pillar
   → bottom dock. The pillar hides while the intel sheet is open. */
@media (max-width: 768px) {
  .vulc-mobile-actions {
    top: var(--vulc-panel-top);
    bottom: var(--vulc-dock-clear);
    max-height: none;
  }
  .vulc-has-panel .vulc-mobile-actions { display: none; }
}

/* ── Actions expand transition ──────────────────────────────────── */
.vulc-actions-expand-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.vulc-actions-expand-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.vulc-actions-expand-enter-from,
.vulc-actions-expand-leave-to { opacity: 0; transform: translateY(8px); }

/* ── Merged topbar responsive: handled inside ObservatoryTopbar.vue ── */

@media (prefers-reduced-motion: reduce) {
  .vulc-icon-btn { animation: none; transition: none; }
}
</style>
