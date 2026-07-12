<template>
  <div id="main-content" class="relative w-full h-dvh overflow-hidden">
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
          <ObservatoryLayout
            :controls="controls"
            :stats="stats"
            :data="data"
            :on-rede-corporativa="() => showRedeCorporativa = true"
            :on-data-download="() => showDownload = true"
            :on-user-contribution="() => showUserContribution = true"
            :on-expand-to-full-brazil="() => expandToFullBrazil(loadFullBrazil)"
            :user-pin="userPin"
            :user-pin-shared="userPinShared"
            :pin-picker-mode="pinPickerMode"
            :share-copied="shareCopied"
            :toggle-pin-picker="togglePinPicker"
            :fly-to-user-pin="flyToUserPin"
            :copy-pin-url="copyPinUrl"
            :clear-pin="clearPin"
          >
            <template #sidebar>
              <ObservatorySidebar
                :active-tab="activeTab"
                :danger-items="speculatorIndex"
                :show-all="showAll"
                style="position: relative; height: 100%;"
                @update:active-tab="(tab) => activeTab = tab"
                @update:show-all="(v) => showAll = v"
                @fly-to-enterprise="zoomToDanger"
                @fly-to-coord="flyToCoord"
              />
            </template>
          </ObservatoryLayout>
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
      <ClaimsDataTable :visible="showDataTable" :data="allFeatures" @close="showDataTable = false" @fly-to="(coords: [number, number]) => flyToTarget = { lng: coords[0], lat: coords[1], zoom: 8 }" />
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
import { useI18n } from '@/composables/useI18n'
import { useVulcanObservatoryPage } from '@/composables/useVulcanObservatoryPage'

const { t } = useI18n()

useHead({
  title: 'Observatory of Vulcan | Earth Guardians',
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
  flyToEnterprise, zoomToDanger, flyToCoord, onGeoLocate, expandToFullBrazil,
  activeTab, activeFilterSummary,
  showShortcuts, showDataTable, showTimeline, showExport, showGeoLocate, showClaimReport, reportClaim,
  mapContainerRef, filteredCount, clearPin,
} = useVulcanObservatoryPage('pococaldas')
</script>
