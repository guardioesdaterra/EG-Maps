<template>
  <div id="main-content" class="relative">
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
      <GlobeView
        :default-dataset="'vulcan-observatory'"
        :rare-earth-points="pointsData"
        :rare-earth-polygons="polygonsData"
        :rare-earth-protected="protectedData"
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
import { ref, computed, onMounted } from 'vue'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import { useRareEarthData } from '@/composables/useRareEarthData'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: 'Observatory of Vulcan Globe (3D) | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

const { pointsData, polygonsData, protectedData, isLoading, loadProgress, error, load: loadRareEarthData } = useRareEarthData(baseURL)

const flyToTarget = ref<{ lng: number; lat: number; zoom?: number } | null>(null)

// Layer visibility state
const layerVis = ref<Record<string, boolean>>({})
const categories = Object.entries(RARE_EARTH_CATEGORIES) as [string, { label: string; color: string }][]
categories.forEach(([key]) => { layerVis.value[key] = true })
layerVis.value['enterprise_hq'] = false
layerVis.value['protected_ti'] = true
layerVis.value['protected_quilombo'] = true
layerVis.value['overlaps'] = true
layerVis.value['heatmap'] = false

// Extra layers
const extraLayers = ['polygons', 'water', 'sites', 'network', 'heatmap']
extraLayers.forEach(k => { layerVis.value[k] = true })

// Loading message based on phase
const loadingMessage = computed(() => {
  if (isLoading.value) return 'Loading mining claims data...'
  return 'Ready'
})

onMounted(async () => {
  await loadRareEarthData()
})
</script>
