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
      <ClaimsDataTable :visible="showDataTable" :data="allFeatures" @close="showDataTable = false" @fly-to="(coords: [number, number]) => flyToTarget = { lng: coords[0], lat: coords[1], zoom: 8 }" />
      <ClaimDetailModal :visible="showClaimDetail" :claim="claimDetailProps" @close="closeClaimDetail" />

      <template #fallback>
        <div class="flex h-[100svh] w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { useVulcanObservatoryPage } from '@/composables/useVulcanObservatoryPage'

const { t } = useI18n()

useHead({
  title: 'Observatory of Vulcan Globe (3D) | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

const {
  controls, stats, data,
  pointsData, filteredPoints, polygonsData, protectedData, waterData, culturalData,
  layerVis, flyToTarget, onMapInit,
  allFeatures, speculatorIndex, deepAnalysis, isLoading, loadPhase, loadProgress, error,
  loadRareEarthData, loadFullBrazil, isRegional,
  showRedeCorporativa, showDownload, showUserContribution, showAll,
  showClaimDetail, claimDetailProps, closeClaimDetail,
  userPin, userPinShared, pinPickerMode, shareCopied,
  togglePinPicker, flyToUserPin, copyPinUrl, loadingMessage,
  toggleEnterpriseLayer, flyToEnterprise, zoomToDanger, flyToCoord, onGeoLocate, expandToFullBrazil,
  activeTab, activeFilterSummary,
  showShortcuts, showDataTable, showTimeline, showExport, showGeoLocate, showClaimReport, reportClaim,
  mapContainerRef, filteredCount, clearPin,
} = useVulcanObservatoryPage()
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
