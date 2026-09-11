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
          <span class="text-xs text-zinc-600 font-mono">{{ loadProgress }}%</span>
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
          <!-- ── Topbar (brand + stats only) ─────────────────────── -->
          <header class="vulc-topbar" role="toolbar" :aria-label="t('nav.observatoryOfVulcan')">
            <div class="vulc-topbar__brand">
              <span class="vulc-topbar__pulse" aria-hidden="true" />
              <div class="flex flex-col leading-tight min-w-0">
                <h1 class="text-sm sm:text-base font-black text-red-400 uppercase tracking-tight whitespace-nowrap truncate">
                  {{ t('observatory.v2.brandTitleGlobe') }}
                </h1>
                <span class="text-[10px] sm:text-xs text-zinc-500 font-medium whitespace-nowrap truncate">
                  {{ t('observatory.v2.brandSubGlobe') }}
                </span>
              </div>
            </div>

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
          </header>

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

          <!-- ── Right-side: Cultural browser ─────────────────────── -->
          <ObservatorySidebar
            :rare-earth-cultural="culturalData"
            :speculator-index="speculatorIndex"
            :layer-vis="controls.layerVis.value"
            :toggle-layer="controls.toggleLayer"
            @fly-to-coord="flyToCoord"
            @fly-to-enterprise="zoomToDanger"
            @jump-to-cultural="onJumpToCultural"
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
          <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useVulcanObservatoryPage } from '@/composables/useVulcanObservatoryPage'

import MapView3D from '@/components/MapView3D.vue'
import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
import RedeCorporativa from '@/components/RedeCorporativa.vue'
import DataDownloadPanel from '@/components/DataDownloadPanel.vue'
import ClaimReportModal from '@/components/observatory/ClaimReportModal.vue'
import ExportModal from '@/components/observatory/ExportModal.vue'
import KeyboardShortcuts from '@/components/observatory/KeyboardShortcuts.vue'
import GeoLocateModal from '@/components/observatory/GeoLocateModal.vue'
import UserContributionModal from '@/components/observatory/UserContributionModal.vue'
import ClaimsDataTable from '@/components/observatory/ClaimsDataTable.vue'
import ClaimDetailModal from '@/components/observatory/ClaimDetailModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

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
  polygonsData,
  protectedData,
  waterData,
  culturalData,
  layerVis,
  flyToTarget,
  onMapInit,
  allFeatures,
  speculatorIndex,
  isLoading,
  loadProgress,
  error,
  loadRareEarthData,
  showRedeCorporativa,
  showDownload,
  showUserContribution,
  showClaimDetail,
  claimDetailProps,
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
} = useVulcanObservatoryPage()

const { categoryStats, totalCount } = stats

const actionsExpanded = ref(false)

function onRedeCorporativa() { showRedeCorporativa.value = true }
function onDataDownload() { showDownload.value = true }
function onUserContribution() { showUserContribution.value = true }
function updatePhases(value: Set<string>) {
  controls.selectedPhases.value = value
  controls.debouncedFilter()
}
function onJumpToCultural(coord: [number, number], _name: string) {
  flyToTarget.value = { lng: coord[0], lat: coord[1], zoom: 6 }
}
</script>

<style scoped>
/* Same shell styles as the 2D page — see pages/vulcan-observatory/index.vue */
/* Inlined here to keep the 3D page self-contained when navigated-to directly. */

.vulc-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: clamp(3.25rem, 7vh, 4rem);
  z-index: 540;
  pointer-events: auto;
  display: grid;
  grid-template-columns: minmax(0, auto) 1fr;
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
  animation: vulc-pulse-3d 2s ease-out infinite;
}
@keyframes vulc-pulse-3d {
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
.vulc-stat__dot { width: 0.45rem; height: 0.45rem; border-radius: 50%; flex-shrink: 0; }
.vulc-stat__count { font-weight: 800; color: rgb(255, 255, 255); font-variant-numeric: tabular-nums; }
.vulc-stat__label { color: rgba(255, 255, 255, 0.55); }
.vulc-stat__sep { width: 1px; height: 1rem; background: rgba(255, 255, 255, 0.1); flex-shrink: 0; }
.vulc-stat__total {
  font-size: clamp(10px, 1.4vw, 12px);
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  flex-shrink: 0;
}
.vulc-stat__total strong { color: #fff; font-weight: 800; font-variant-numeric: tabular-nums; }

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
  top: clamp(3.5rem, 7vh, 4.5rem);
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

/* ── Actions expand transition ──────────────────────────────────── */
.vulc-actions-expand-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.vulc-actions-expand-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.vulc-actions-expand-enter-from,
.vulc-actions-expand-leave-to { opacity: 0; transform: translateY(8px); }

/* ── Topbar responsive ──────────────────────────────────────────── */
@media (max-width: 640px) {
  .vulc-topbar { height: 3rem; padding: 0 0.5rem; gap: 0.35rem; }
  .vulc-topbar__brand { gap: 0.4rem; }
  .vulc-stat__label, .vulc-stat__total { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .vulc-topbar__pulse, .vulc-icon-btn { animation: none; transition: none; }
}
</style>
