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
      <GlobeView
        :default-dataset="'vulcan-observatory'"
        :rare-earth-points="pointsData"
        :rare-earth-polygons="polygonsData"
        :rare-earth-protected="protectedData"
        :rare-earth-water="waterData"
        :rare-earth-cultural="culturalData"
        :layer-visibility="layerVis"
        :fly-to-target="flyToTarget"
      />

      <template #fallback>
        <div class="flex h-[100svh] w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from 'vue'
import { useObservatoryControls } from '@/composables/useObservatoryControls'
import { useRareEarthData } from '@/composables/useRareEarthData'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: 'Observatory of Vulcan Globe (3D) | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

// ---- Composable ----
const controls = useObservatoryControls()
const {
  layerVis, flyToTarget,
  startCounterAnimation,
  restoredState, debouncedFilter,
  yearMin, yearMax, selectedPhases, activeTab,
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

onMounted(async () => {
  startCounterAnimation()
  await loadRareEarthData()

  // Restore state from URL hash
  if (restoredState.value) {
    const s = restoredState.value as Record<string, unknown>
    if (s.center) flyToTarget.value = { lng: (s.center as number[])[0], lat: (s.center as number[])[1], zoom: (s.zoom as number) ?? 6 }
    if (s.yearMin) yearMin.value = s.yearMin as number
    if (s.yearMax) yearMax.value = s.yearMax as number
    if (s.phases) selectedPhases.value = new Set(s.phases as string[])
    if (s.tab) activeTab.value = s.tab as 'danger' | 'military' | 'illegal' | 'env' | 'network' | 'timeline'
    debouncedFilter()
  }
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
