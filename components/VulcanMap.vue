<template>
  <div class="w-full h-[100svh] relative overflow-hidden bg-black" role="main" aria-label="Vulcan Observatory Map">
    <!-- Loading skeleton -->
    <Transition name="fade">
      <div v-if="isLoading" class="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
        <div class="relative mb-5">
          <div class="w-16 h-16 rounded-full border-4 border-white/20 border-t-red-500 animate-spin" />
          <div class="absolute inset-0 flex items-center justify-center">
            <span style="font-size:28px">🌋</span>
          </div>
        </div>
        <p class="text-white font-medium mb-1.5 text-sm">{{ loadingMessage }}</p>
        <div class="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden mt-2">
          <div
            class="h-full rounded-full transition-all duration-500 ease-out"
            :style="{ width: `${loadProgress}%`, background: 'linear-gradient(90deg, #e74c3c, #f39c12)' }"
          />
        </div>
        <span class="text-xs text-zinc-600 font-mono mt-1">{{ loadProgress }}%</span>
      </div>
    </Transition>

    <!-- Error state -->
    <Transition name="fade">
      <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[200]">
        <p class="text-gray-400 mb-4 text-center px-4 max-w-md">{{ errorMessage }}</p>
        <button @click="retryLoad" class="px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:opacity-80 transition-all">
          Try Again
        </button>
      </div>
    </Transition>

    <!-- Map Container -->
    <div ref="mapContainerRef" class="absolute inset-0 w-full h-full" style="z-index: 1" />

    <!-- Custom overlays slot (used by observatory-of-vulcan) -->
    <slot name="overlays" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useI18n } from '@/composables/useI18n'
import { useRareEarthController } from '@/composables/useRareEarthController'
import { syncRareEarthLayerVisibility } from '@/composables/useRareEarthLayers'
import { setupWaterLayers } from '@/composables/useWaterLayers'
import { setupVulcanCircles, setVulcanCirclesVisibility, VULCAN_CENTER } from '@/composables/useVulcanCircles'
import type { RareEarthFeatureCollection } from '@/lib/observatory-analysis'

const { t } = useI18n()
const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''

const MAP_STYLE = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/019f0fee-56db-7efd-a73d-2bd1b646bc72/style.json?key=${MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

interface Props {
  pointsData?: RareEarthFeatureCollection
  polygonsData?: RareEarthFeatureCollection
  protectedData?: RareEarthFeatureCollection
  waterData?: GeoJSON.FeatureCollection
  layerVisibility?: Record<string, boolean>
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null
  isRegional?: boolean
}

const emit = defineEmits<{
  mapInit: [map: maplibregl.Map]
  mapReady: []
}>()

const props = withDefaults(defineProps<Props>(), {})

const mapContainerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(true)
const hasError = ref(false)
const errorMessage = ref('')
const isMobile = useMediaQuery('(max-width: 768px)')

let map: maplibregl.Map | null = null
let isMounted = true
let waterCleanup: (() => void) | null = null
let circleCleanup: (() => void) | null = null

const loadProgress = ref(0)
const loadingMessage = computed(() => {
  if (loadProgress.value < 20) return 'Loading mining claims...'
  if (loadProgress.value < 40) return 'Loading overlaps...'
  if (loadProgress.value < 60) return 'Loading claim boundaries...'
  if (loadProgress.value < 80) return 'Loading protected areas & water...'
  return 'Ready'
})

// Rare Earth controller
const rareEarthController = useRareEarthController({
  map: computed(() => map),
  isActive: computed(() => true),
  getProps: () => ({
    rareEarthPoints: props.pointsData,
    rareEarthPolygons: props.polygonsData,
    rareEarthProtected: props.protectedData,
    layerVisibility: props.layerVisibility,
    flyToTarget: props.flyToTarget,
  }),
  popup: {
    t: (key: string) => t(key),
    locale: { value: 'en' },
  },
})

function getMapCenter(): [number, number] {
  return [...VULCAN_CENTER] as [number, number]
}

function getMapZoom(): number {
  return props.isRegional ? 11.5 : 4.2
}

function getMinZoom(): number {
  return props.isRegional ? 8 : 1.5
}

function initMap() {
  if (!mapContainerRef.value) return
  if (map) {
    map.remove()
    map = null
  }
  isLoading.value = true
  hasError.value = false
  loadProgress.value = 0

  try {
    map = new maplibregl.Map({
      container: mapContainerRef.value,
      style: MAP_STYLE,
      zoom: getMapZoom(),
      center: getMapCenter(),
      attributionControl: false,
      renderWorldCopies: true,
      minZoom: getMinZoom(),
      maxZoom: 16,
      fadeDuration: 100,
      maxTileCacheSize: 200,
    })

    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`,
      }),
    )

    if (!isMobile.value) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
    }

    map.on('load', () => {
      if (!isMounted) return
      isLoading.value = false
      loadProgress.value = 100
      emit('mapInit', map!)
      emit('mapReady')

      // Setup rare earth layers
      if (props.pointsData) {
        rareEarthController.setupLayers()
      }

      // Setup water layers
      if (props.waterData) {
        waterCleanup = setupWaterLayers(map!, props.waterData)
      }

      // Setup vulcan circles (regional mode only)
      if (props.isRegional) {
        circleCleanup = setupVulcanCircles(map!)
      }
    })

    map.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[VulcanMap] MapLibre error:', err)
      if (!map?.loaded()) {
        isLoading.value = false
        hasError.value = true
        errorMessage.value = 'Failed to load map tiles. Please check your network connection.'
      }
    })

    // Timeout fallback
    setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false
        if (!hasError.value) {
          hasError.value = true
          errorMessage.value = 'Map tiles took too long to load.'
        }
      }
    }, 20000)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[VulcanMap] Init error:', err)
    isLoading.value = false
    hasError.value = true
  }
}

function retryLoad() {
  hasError.value = false
  initMap()
}

// Watch layer visibility changes
watch(() => props.layerVisibility, (vis) => {
  if (!map || !map.isStyleLoaded()) return
  syncRareEarthLayerVisibility(map, vis || {})
  if (vis) {
    setVulcanCirclesVisibility(map, vis['vulcan_circles'] !== false)
    if (vis['water'] !== undefined) {
      const waterVis = vis['water'] !== false ? 'visible' : 'none'
      try {
        if (map.getLayer('ree-water-poly-fill')) map.setLayoutProperty('ree-water-poly-fill', 'visibility', waterVis)
        if (map.getLayer('ree-water-poly-line')) map.setLayoutProperty('ree-water-poly-line', 'visibility', waterVis)
        if (map.getLayer('ree-water-poly-label')) map.setLayoutProperty('ree-water-poly-label', 'visibility', waterVis)
        if (map.getLayer('ree-water-river-line')) map.setLayoutProperty('ree-water-river-line', 'visibility', waterVis)
        if (map.getLayer('ree-water-river-label')) map.setLayoutProperty('ree-water-river-label', 'visibility', waterVis)
      } catch { /* ignore */ }
    }
  }
}, { deep: true })

// Watch data changes
watch(() => [props.pointsData, props.polygonsData], () => {
  if (!map || !map.isStyleLoaded()) return
  rareEarthController.setupLayers()
}, { deep: true })

watch(() => props.protectedData, (newVal) => {
  if (!map || !map.isStyleLoaded() || !newVal) return
  try {
    const src = map.getSource('ree-protected') as maplibregl.GeoJSONSource | undefined
    if (src) src.setData(newVal)
  } catch { /* ignore */ }
}, { deep: true })

watch(() => props.waterData, (newVal) => {
  if (!map || !map.isStyleLoaded() || !newVal) return
  if (waterCleanup) waterCleanup()
  waterCleanup = setupWaterLayers(map, newVal)
}, { deep: true })

// Watch fly-to target
watch(() => props.flyToTarget, (target) => {
  if (!target || !map) return
  map.flyTo({
    center: [target.lng, target.lat],
    zoom: target.zoom ?? 9,
    duration: 1500,
    essential: true,
  })
}, { deep: true })

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  isMounted = false
  if (waterCleanup) waterCleanup()
  if (circleCleanup) circleCleanup()
  if (map) {
    map.remove()
    map = null
  }
})

// Expose methods for parent
defineExpose({
  getMap: () => map,
  flyTo: (lng: number, lat: number, zoom?: number) => {
    if (map) map.flyTo({ center: [lng, lat], zoom: zoom ?? 9, duration: 1500 })
  },
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
