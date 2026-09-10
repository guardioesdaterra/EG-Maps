/**
 * pages/vulcan-observatory/index.vue
 * @why Vulcan observatory 2D map — culture-first layout: rare-earth mining
 *      claims overlaid on a full-bleed 2D map with Mapa Cultura +
 *      Floresta Ativista agents highlighted as a featured overlay.
 *
 *      UI shape (top→bottom):
 *        - topbar  · brand, live counters, action icons
 *        - map     · fills the whole screen, panels overlay on top
 *        - right   · floating glass panel: Cultural Agents browser + legend
 *        - bottom  · year slider + my-territory pin tools + 3D toggle
 *
 *      Data flow (unchanged from v1):
 *        public/data/rare-earth/pococaldas/*.geojson        → useRareEarthData
 *        public/data/cultural-agents/cultural-agents.json   → useCulturalAgentsData (mapa_cultura + floresta_ativista merged)
 *        public/data/cultural-agents/floresta-ativista.json → useCulturalAgentsData (additive)
 *        Supabase community_pins (status='approved')        → useCulturalAgentsData
 *
 * @deps @/composables/useI18n (useI18n);
 *       @/composables/useVulcanObservatoryPage (useVulcanObservatoryPage);
 *       @/components/observatory/ObservatorySidebar.vue (Cultural browser — replaces the old 6-tab grid);
 * @connections /vulcan-observatory/3d.vue (3D counterpart sharing the same data composable)
 */
<template>
  <div id="main-content" tabindex="-1" class="relative w-full h-screen overflow-hidden bg-black focus:outline-none">
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
            <div class="w-20 h-20 border-4 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
            <div class="absolute inset-0 flex items-center justify-center">
              <Icon name="lucide:mountain" class="text-3xl text-red-500" />
            </div>
          </div>
          <div class="text-center">
            <h2 class="text-base font-bold text-zinc-200 uppercase tracking-wider mb-1">
              {{ t('loading.observatoryOfVulcan') }}
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
          <span class="text-xs text-zinc-600 font-mono">{{ loadProgress }}%</span>
        </template>
      </div>
    </Transition>

    <!-- ── Map (fills the viewport; panels overlay on top) ─────────────── -->
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
          <!-- ── Topbar ──────────────────────────────────────────────── -->
          <header class="vulc-topbar" role="toolbar" :aria-label="t('nav.observatoryOfVulcan')">
            <div class="vulc-topbar__brand">
              <span class="vulc-topbar__pulse" aria-hidden="true" />
              <div class="flex flex-col leading-tight min-w-0">
                <h1 class="text-sm sm:text-base font-black text-red-400 uppercase tracking-tight whitespace-nowrap truncate">
                  {{ t('observatory.v2.brandTitle') }}
                </h1>
                <span class="text-[10px] sm:text-xs text-zinc-500 font-medium whitespace-nowrap truncate">
                  {{ t('observatory.v2.brandSub') }}
                </span>
              </div>
            </div>

            <!-- Live counters -->
            <div class="vulc-topbar__stats" role="status">
              <div
                v-for="s in categoryStats"
                :key="s.key"
                class="vulc-stat"
                :title="s.label"
              >
                <span class="vulc-stat__dot" :style="{ background: s.color }" aria-hidden="true" />
                <span class="vulc-stat__count">{{ controls.animatedCount?.(s.key, s.count) ?? s.count }}</span>
                <span class="vulc-stat__label">{{ s.label }}</span>
              </div>
              <span class="vulc-stat__sep" aria-hidden="true" />
              <span class="vulc-stat__total">
                <strong>{{ totalCount }}</strong> {{ t('observatory.v2.claimsTotal') }}
              </span>
            </div>

            <!-- Action icons -->
            <nav class="vulc-topbar__actions" :aria-label="t('observatory.v2.actions')">
              <button
                type="button"
                class="vulc-icon-btn"
                :class="{ 'is-active': controls.showTimeline.value }"
                :aria-label="t('observatory.tabs.timeline')"
                :aria-pressed="controls.showTimeline.value"
                @click="controls.showTimeline.value = !controls.showTimeline.value"
              >
                <Icon name="lucide:clock" />
                <span class="vulc-icon-btn__tip">{{ t('observatory.tabs.timeline') }}</span>
              </button>
              <button
                type="button"
                class="vulc-icon-btn"
                :aria-label="t('observatory.v2.corporateNetwork')"
                @click="onRedeCorporativa()"
              >
                <Icon name="lucide:share-2" />
                <span class="vulc-icon-btn__tip">{{ t('observatory.v2.corporateNetwork') }}</span>
              </button>
              <button
                type="button"
                class="vulc-icon-btn"
                :aria-label="t('observatory.v2.downloadData')"
                @click="onDataDownload()"
              >
                <Icon name="lucide:download" />
                <span class="vulc-icon-btn__tip">{{ t('observatory.v2.downloadData') }}</span>
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
                v-if="isRegional && onExpandToFullBrazil"
                type="button"
                class="vulc-icon-btn vulc-icon-btn--accent"
                :aria-label="t('observatory.v2.fullBrazil')"
                @click="onExpandToFullBrazil()"
              >
                <Icon name="lucide:earth" />
                <span class="vulc-icon-btn__tip">{{ t('observatory.v2.fullBrazil') }}</span>
              </button>
              <button
                type="button"
                class="vulc-icon-btn"
                :aria-label="t('observatory.v2.monitor')"
                @click="onUserContribution()"
              >
                <Icon name="lucide:notebook-pen" />
                <span class="vulc-icon-btn__tip">{{ t('observatory.v2.monitor') }}</span>
              </button>
              <button
                type="button"
                class="vulc-icon-btn vulc-icon-btn--primary"
                :aria-label="t('observatory.v2.viewGlobe')"
                @click="navigateTo('/vulcan-observatory/3d')"
              >
                <Icon name="lucide:globe" />
                <span class="vulc-icon-btn__tip">{{ t('observatory.v2.viewGlobe') }}</span>
              </button>
            </nav>
          </header>

          <!-- ── Left-side: Mining claim filters ──────────────────── -->
          <aside v-show="leftSidebarOpen" class="vulc-leftpanel" aria-label="Mining claim filters">
            <div class="vulc-leftpanel__scroll">
              <div class="vulc-leftpanel__section">
                <h3 class="vulc-leftpanel__heading">{{ t('observatory.layers.title') }}</h3>
                <div
                  v-for="c in categoryStats" :key="c.key"
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value[c.key]"
                  :aria-label="c.label"
                  tabindex="0"
                  @click="controls.toggleLayer(c.key)"
                  @keydown.enter="controls.toggleLayer(c.key)"
                  @keydown.space.prevent="controls.toggleLayer(c.key)"
                >
                  <div :class="['vulc-leftpanel__box', !controls.layerVis.value[c.key] && 'is-off']" :style="{ '--cb-c': c.color }">
                    <Icon v-if="controls.layerVis.value[c.key]" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ c.label }}</span>
                </div>
              </div>

              <hr class="vulc-leftpanel__divider">

              <div class="vulc-leftpanel__section">
                <div
                  v-for="ex in controls.extraLayers" :key="ex.key"
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value[ex.key]"
                  :aria-label="t(ex.labelKey)"
                  tabindex="0"
                  @click="controls.toggleLayer(ex.key)"
                  @keydown.enter="controls.toggleLayer(ex.key)"
                  @keydown.space.prevent="controls.toggleLayer(ex.key)"
                >
                  <div :class="['vulc-leftpanel__box', !controls.layerVis.value[ex.key] && 'is-off']" :style="{ '--cb-c': ex.color }">
                    <Icon v-if="controls.layerVis.value[ex.key]" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t(ex.labelKey) }}</span>
                </div>
              </div>

              <hr class="vulc-leftpanel__divider">

              <div class="vulc-leftpanel__section">
                <h3 class="vulc-leftpanel__heading">{{ t('observatory.layers.protectedAreas') }}</h3>
                <div
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value['protected_ti'] !== false"
                  :aria-label="t('observatory.layers.indigenousLands')"
                  tabindex="0"
                  @click="controls.toggleLayer('protected_ti')"
                  @keydown.enter="controls.toggleLayer('protected_ti')"
                  @keydown.space.prevent="controls.toggleLayer('protected_ti')"
                >
                  <div :class="['vulc-leftpanel__box', controls.layerVis.value['protected_ti'] === false && 'is-off']" style="--cb-c: #c0392b">
                    <Icon v-if="controls.layerVis.value['protected_ti'] !== false" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.layers.indigenousLands') }}</span>
                </div>
                <div
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value['protected_quilombo'] !== false"
                  :aria-label="t('observatory.layers.quilombolaTerritories')"
                  tabindex="0"
                  @click="controls.toggleLayer('protected_quilombo')"
                  @keydown.enter="controls.toggleLayer('protected_quilombo')"
                  @keydown.space.prevent="controls.toggleLayer('protected_quilombo')"
                >
                  <div :class="['vulc-leftpanel__box', controls.layerVis.value['protected_quilombo'] === false && 'is-off']" style="--cb-c: #f39c12">
                    <Icon v-if="controls.layerVis.value['protected_quilombo'] !== false" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.layers.quilombolaTerritories') }}</span>
                </div>
                <div
                  class="vulc-leftpanel__check"
                  role="checkbox"
                  :aria-checked="controls.layerVis.value['overlaps'] !== false"
                  :aria-label="t('observatory.layers.overlaps')"
                  tabindex="0"
                  @click="controls.toggleLayer('overlaps')"
                  @keydown.enter="controls.toggleLayer('overlaps')"
                  @keydown.space.prevent="controls.toggleLayer('overlaps')"
                >
                  <div :class="['vulc-leftpanel__box', controls.layerVis.value['overlaps'] === false && 'is-off']" style="--cb-c: #ff00ff">
                    <Icon v-if="controls.layerVis.value['overlaps'] !== false" name="lucide:check" class="w-2.5 h-2.5" />
                  </div>
                  <span class="vulc-leftpanel__label">{{ t('observatory.layers.overlaps') }}</span>
                </div>
              </div>
            </div>
            <button type="button" class="vulc-leftpanel__toggle" :aria-label="leftSidebarOpen ? 'Collapse layers' : 'Expand layers'" @click="leftSidebarOpen = false">
              <Icon name="lucide:chevron-left" class="w-3.5 h-3.5" />
            </button>
          </aside>
          <button v-if="!leftSidebarOpen" type="button" class="vulc-leftpanel__show" aria-label="Show layers" @click="leftSidebarOpen = true">
            <Icon name="lucide:layers" class="w-4 h-4" />
          </button>

          <!-- ── Right-side: Cultural browser + filters ──────────────── -->
          <ObservatorySidebar
            :rare-earth-cultural="culturalData"
            :speculator-index="speculatorIndex"
            :layer-vis="controls.layerVis.value"
            :toggle-layer="controls.toggleLayer"
            @fly-to-coord="flyToCoord"
            @fly-to-enterprise="zoomToDanger"
            @jump-to-cultural="onJumpToCultural"
          />

          <!-- ── Bottombar: phase filter + year slider + my territory ── -->
          <footer class="vulc-bottombar" role="toolbar" :aria-label="t('observatory.v2.bottomTools')">
            <div class="vulc-bottombar__left">
              <PhaseFilter :selected="controls.selectedPhases.value" @update:selected="updatePhases" />
            </div>

            <div class="vulc-bottombar__center">
              <YearSlider
                :year-min="controls.yearMin.value"
                :year-max="controls.yearMax.value"
                :filtered-count="controls.filteredPoints.value?.features?.length ?? 0"
                @update:year-min="(v: number) => (controls.yearMin.value = v)"
                @update:year-max="(v: number) => (controls.yearMax.value = v)"
              />
            </div>

            <div class="vulc-bottombar__right">
              <button
                type="button"
                class="vulc-pin-btn"
                :class="{ 'is-active': pinPickerMode }"
                :aria-label="pinPickerMode ? t('observatory.myTerritory.cancel') : t('observatory.myTerritory.dropPin')"
                @click="togglePinPicker"
              >
                <Icon name="lucide:map-pin" />
                <span class="hidden sm:inline">{{ pinPickerMode ? t('observatory.myTerritory.cancel') : t('observatory.myTerritory.dropPin') }}</span>
              </button>
              <div v-if="userPin" class="vulc-pin-info">
                <div class="flex items-center gap:1.5 min-w-0 truncate">
                  <span v-if="userPinShared" class="vulc-pin-info__badge">SHARED</span>
                  <strong class="truncate">{{ userPin.label }}</strong>
                </div>
                <div class="flex gap-1">
                  <button type="button" class="vulc-pin-info__btn vulc-pin-info__btn--ok" @click="flyToUserPin">{{ t('observatory.myTerritory.flyTo') }}</button>
                  <button type="button" class="vulc-pin-info__btn" @click="copyPinUrl">{{ shareCopied ? t('observatory.myTerritory.copied') : t('observatory.myTerritory.share') }}</button>
                  <button type="button" class="vulc-pin-info__btn vulc-pin-info__btn--danger" :aria-label="t('observatory.myTerritory.clear')" @click="clearPin">
                    <Icon name="lucide:x" />
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </template>
      </MapView2D>

      <!-- ── Modals (kept from v1 — same shape) ──────────────────────── -->
      <GeoPoliticalTimeline :visible="showTimeline" @close="showTimeline = false" />
      <RedeCorporativa
        :visible="showRedeCorporativa"
        @close="showRedeCorporativa = false"
        @fly-to-enterprise="flyToEnterprise"
      />
      <DataDownloadPanel :visible="showDownload" @close="showDownload = false" />
      <ClaimReportModal :visible="showClaimReport" :claim="reportClaim" @close="showClaimReport = false" />
      <ExportModal :visible="showExport" :map-container="mapContainerRef" :filter-summary="activeFilterSummary" @close="showExport = false" />
      <KeyboardShortcuts :visible="showShortcuts" @close="showShortcuts = false" />
      <GeoLocateModal :visible="showGeoLocate" @close="showGeoLocate = false" @locate="onGeoLocate" />
      <UserContributionModal :visible="showUserContribution" @close="showUserContribution = false" />
      <ClaimsDataTable
        :visible="showDataTable"
        :data="allFeatures"
        @close="showDataTable = false"
        @fly-to="(coords: [number, number]) => (flyToTarget = { lng: coords[0], lat: coords[1], zoom: 8 })"
      />
      <ClaimDetailModal :visible="showClaimDetail" :claim="claimDetailProps" @close="closeClaimDetail" />

      <template #fallback>
        <div class="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcan')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useVulcanObservatoryPage } from '@/composables/useVulcanObservatoryPage'

import MapView2D from '@/components/MapView2D.vue'
import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
import GeoPoliticalTimeline from '@/components/GeoPoliticalTimeline.vue'
import RedeCorporativa from '@/components/RedeCorporativa.vue'
import DataDownloadPanel from '@/components/DataDownloadPanel.vue'
import ClaimReportModal from '@/components/observatory/ClaimReportModal.vue'
import ExportModal from '@/components/observatory/ExportModal.vue'
import KeyboardShortcuts from '@/components/observatory/KeyboardShortcuts.vue'
import GeoLocateModal from '@/components/observatory/GeoLocateModal.vue'
import UserContributionModal from '@/components/observatory/UserContributionModal.vue'
import ClaimsDataTable from '@/components/observatory/ClaimsDataTable.vue'
import ClaimDetailModal from '@/components/observatory/ClaimDetailModal.vue'
import PhaseFilter from '@/components/observatory/PhaseFilter.vue'
import YearSlider from '@/components/observatory/YearSlider.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { t } = useI18n()

useHead({
  title: 'Vulcan Community Observatory · Poços de Caldas | Earth Guardians',
  meta: [
    {
      name: 'description',
      content:
        'A community observatory for Poços de Caldas: public mining records, water, protected territories and cultural agents brought together for context-aware Earth Guardians action.',
    },
  ],
})

const {
  controls,
  stats,
  pointsData,
  filteredPoints,
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
  isLoading,
  loadPhase,
  loadProgress,
  error,
  loadRareEarthData,
  loadFullBrazil,
  isRegional,
  showRedeCorporativa,
  showDownload,
  showUserContribution,
  showClaimDetail,
  claimDetailProps,
  closeClaimDetail,
  userPin,
  userPinShared,
  pinPickerMode,
  shareCopied,
  togglePinPicker,
  flyToUserPin,
  copyPinUrl,
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
  clearPin,
} = useVulcanObservatoryPage('pococaldas')

const { categoryStats, totalCount } = stats

const leftSidebarOpen = ref(false)
onMounted(() => {
  if (window.innerWidth >= 768) leftSidebarOpen.value = true
})

// Hoist callbacks for template (so they're defined before used)
function onRedeCorporativa() {
  showRedeCorporativa.value = true
}
function onDataDownload() {
  showDownload.value = true
}
function onUserContribution() {
  showUserContribution.value = true
}
function onExpandToFullBrazil() {
  loadFullBrazil()
}
function updatePhases(value: Set<string>) {
  controls.selectedPhases.value = value
  controls.debouncedFilter()
}
function onJumpToCultural(coord: [number, number], name: string) {
  flyToTarget.value = { lng: coord[0], lat: coord[1], zoom: 10 }
}
</script>

<style>
/* ════════════════════════════════════════════════════════════════════════
 *  Vulcan Observatory v2 — culture-first overlay shell
 *  Layout:  ┌─ topbar (brand · counters · actions) ─────────────────┐
 *           │                                                    │
 *           │   map fills the viewport behind glass panels        │
 *           │   right panel = CULTURE AND TERRITORY                │
 *           │                                                    │
 *           └─ bottombar (phase · year · my-territory) ───────────┘
 * ═══════════════════════════════════════════════════════════════════ */

.vulc-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: clamp(3.25rem, 7vh, 4rem);
  z-index: 540;
  pointer-events: auto;
  display: grid;
  grid-template-columns: minmax(0, auto) 1fr minmax(0, auto);
  align-items: center;
  gap: clamp(0.5rem, 1.5vw, 1rem);
  padding: 0 clamp(0.5rem, 1.5vw, 1rem);
  background: #0a0a0c;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.vulc-topbar__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
  padding-right: clamp(0.5rem, 1vw, 0.75rem);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}
.vulc-topbar__pulse {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--obs-red, #e74c3c);
  flex-shrink: 0;
  box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
  animation: vulc-pulse 2s ease-out infinite;
}
@keyframes vulc-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.6); }
  70%  { box-shadow: 0 0 0 8px rgba(231, 76, 60, 0); }
  100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
}
.vulc-topbar__stats {
  display: flex;
  align-items: center;
  gap: clamp(0.4rem, 1vw, 0.75rem);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  min-width: 0;
}
.vulc-topbar__stats::-webkit-scrollbar { display: none; }
.vulc-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-size: clamp(10px, 1.4vw, 12px);
  white-space: nowrap;
  flex-shrink: 0;
}
.vulc-stat__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.vulc-stat__count {
  font-weight: 800;
  color: rgb(255, 255, 255);
  font-variant-numeric: tabular-nums;
}
.vulc-stat__label {
  color: rgba(255, 255, 255, 0.55);
}
.vulc-stat__sep {
  width: 1px;
  height: 1rem;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}
.vulc-stat__total {
  font-size: clamp(10px, 1.4vw, 12px);
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  flex-shrink: 0;
}
.vulc-stat__total strong {
  color: #fff;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.vulc-topbar__actions {
  display: flex;
  align-items: center;
  gap: clamp(0.2rem, 0.5vw, 0.35rem);
  flex-shrink: 0;
}
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
.vulc-icon-btn svg,
.vulc-icon-btn :deep(svg) {
  width: 60%;
  height: 60%;
}
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
.vulc-icon-btn--accent {
  background: color-mix(in srgb, var(--obs-amber, #f39c12) 14%, transparent);
  border-color: color-mix(in srgb, var(--obs-amber, #f39c12) 35%, transparent);
  color: var(--obs-amber, #f39c12);
}
.vulc-icon-btn--primary {
  background: color-mix(in srgb, var(--obs-emerald, #10b981) 18%, transparent);
  border-color: color-mix(in srgb, var(--obs-emerald, #10b981) 45%, transparent);
  color: var(--obs-emerald, #10b981);
}
.vulc-icon-btn:focus-visible {
  outline: 2px solid var(--obs-red, #e74c3c);
  outline-offset: 2px;
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
.vulc-icon-btn:hover .vulc-icon-btn__tip {
  opacity: 1;
}
@media (max-width: 640px) {
  .vulc-topbar { height: 3rem; padding: 0 0.5rem; gap: 0.35rem; }
  .vulc-topbar__brand { gap: 0.4rem; }
  .vulc-stat__label, .vulc-stat__total { display: none; }
  .vulc-icon-btn { width: 1.75rem; height: 1.75rem; }
}

/* ── Bottombar ───────────────────────────────────────────────────────── */
.vulc-bottombar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: clamp(3.5rem, 8vh, 4.25rem);
  z-index: 540;
  pointer-events: auto;
  display: grid;
  grid-template-columns: minmax(0, auto) 1fr minmax(0, auto);
  align-items: center;
  gap: clamp(0.5rem, 1.5vw, 1rem);
  padding: 0 clamp(0.5rem, 1.5vw, 1rem);
  background: #0a0a0c;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* ── Left Panel (mining claim filters) ─────────────────────────────── */
.vulc-leftpanel {
  position: absolute;
  top: clamp(3.5rem, 7vh, 4.5rem);
  left: clamp(0.5rem, 1vw, 0.75rem);
  bottom: clamp(3.75rem, 8.5vh, 5rem);
  width: clamp(14rem, 20vw, 17rem);
  z-index: 530;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.vulc-leftpanel__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.65rem 0.75rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.vulc-leftpanel__scroll::-webkit-scrollbar { width: 4px; }
.vulc-leftpanel__scroll::-webkit-scrollbar-track { background: transparent; }
.vulc-leftpanel__scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
.vulc-leftpanel__section { display: flex; flex-direction: column; gap: 0.15rem; }
.vulc-leftpanel__heading {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
  margin: 0 0 0.3rem;
}
.vulc-leftpanel__divider {
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 0.4rem 0;
}
.vulc-leftpanel__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: background 0.1s;
}
.vulc-leftpanel__check:hover { background: rgba(255, 255, 255, 0.03); }
.vulc-leftpanel__check:focus-visible { outline: 2px solid var(--obs-red, #e74c3c); outline-offset: -2px; }
.vulc-leftpanel__box {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: 2px solid var(--cb-c, #666);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.vulc-leftpanel__box.is-off { opacity: 0.3; }
.vulc-leftpanel__box svg { width: 0.6rem; height: 0.6rem; color: #fff; }
.vulc-leftpanel__label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
  overflow-wrap: break-word;
  min-width: 0;
}
.vulc-leftpanel__check:hover .vulc-leftpanel__label { color: #fff; }
.vulc-leftpanel__toggle {
  flex-shrink: 0;
  padding: 0.35rem;
  background: transparent;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s, background 0.15s;
  text-align: center;
}
.vulc-leftpanel__toggle:hover { color: #fff; background: rgba(255, 255, 255, 0.04); }
.vulc-leftpanel__show {
  position: absolute;
  top: clamp(3.5rem, 7vh, 4.5rem);
  left: clamp(0.5rem, 1vw, 0.75rem);
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111113;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-family: inherit;
  z-index: 530;
  pointer-events: auto;
  transition: background 0.15s, color 0.15s;
}
.vulc-leftpanel__show:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
@media (max-width: 768px) {
  .vulc-leftpanel { display: none; }
  .vulc-leftpanel__show { display: none; }
}
.vulc-bottombar__left,
.vulc-bottombar__right {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.vulc-bottombar__center {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vulc-pin-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: transparent;
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 6px;
  color: rgb(16, 185, 129);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.vulc-pin-btn svg {
  width: 0.85rem;
  height: 0.85rem;
}
.vulc-pin-btn:hover {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgb(16, 185, 129);
}
.vulc-pin-btn.is-active {
  background: rgba(16, 185, 129, 0.22);
  border-color: rgb(16, 185, 129);
  color: #fff;
}
.vulc-pin-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 0.6rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 0;
  flex: 1;
  overflow: hidden;
}
.vulc-pin-info__badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(243, 156, 18, 0.18);
  color: rgb(243, 156, 18);
  flex-shrink: 0;
}
.vulc-pin-info strong {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 8rem;
}
.vulc-pin-info__btn {
  padding: 0.2rem 0.5rem;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.vulc-pin-info__btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.vulc-pin-info__btn--ok {
  border-color: rgba(16, 185, 129, 0.5);
  color: rgb(16, 185, 129);
}
.vulc-pin-info__btn--ok:hover {
  background: rgba(16, 185, 129, 0.12);
}
.vulc-pin-info__btn--danger {
  border-color: transparent;
  color: rgba(255, 255, 255, 0.4);
}
.vulc-pin-info__btn--danger:hover {
  color: var(--obs-red, #e74c3c);
}
@media (max-width: 768px) {
  .vulc-bottombar {
    height: auto;
    padding: 0.35rem 0.5rem;
    gap: 0.35rem;
    grid-template-columns: auto 1fr auto;
    align-items: center;
  }
  .vulc-bottombar__left { order: 1; min-width: 0; overflow: hidden; }
  .vulc-bottombar__center { order: 2; min-width: 0; }
  .vulc-bottombar__right { order: 3; min-width: 0; }
  .vulc-pin-info strong { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .vulc-topbar__pulse, .vulc-icon-btn { animation: none; transition: none; }
}
</style>
