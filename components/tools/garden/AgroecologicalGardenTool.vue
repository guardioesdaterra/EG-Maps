/**
 * components/tools/garden/AgroecologicalGardenTool.vue
 * @why Full-screen satellite map editor for designing agroecological gardens:
 * drawing toolbar, layer panel, plant library, measurement tools, save/load.
 * @component AgroecologicalGardenTool
 * @emits close: []
 * @deps vue (ref, computed, onMounted, onUnmounted, nextTick); maplibre-gl; ~/composables/useGardenProject; ~/composables/useToast; ~/lib/garden-types; ~/lib/garden-plants; ~/lib/garden-utils; ~/lib/garden-constants; @/components/Icon.vue; @/components/ui/Button.vue
 */
<template>
  <div class="garden-tool w-full h-full bg-[#0b0b0c] flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="garden-tool__header flex items-center justify-between gap-2 px-4 py-2 z-20 bg-[#0b0b0c]/90 backdrop-blur-md border-b border-white/10">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="garden-tool__btn ghost"
          :aria-label="t('general.back')"
          @click="emit('close')"
        >
          <Icon name="tabler:arrow-left" class="h-5 w-5" />
        </button>
        <div class="flex flex-col">
          <h1 class="garden-tool__title text-sm font-semibold text-white">
            {{ activeProject?.name || t('tools.agroecologicalGarden.title') }}
          </h1>
          <p class="garden-tool__subtitle text-[11px] text-gray-400">
            {{ activeProject?.description || t('tools.agroecologicalGarden.description') }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div v-if="coordinate" class="garden-tool__coord hidden sm:flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-300 font-mono">
          <span>{{ coordinate.lat.toFixed(4) }}, {{ coordinate.lng.toFixed(4) }}</span>
        </div>
        <button
          type="button"
          class="garden-tool__btn ghost"
          :aria-label="t('tools.agroecologicalGarden.project.save')"
          @click="saveProject"
        >
          <Icon name="tabler:device-floppy" class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="garden-tool__btn ghost"
          :aria-label="t('tools.agroecologicalGarden.project.export')"
          @click="showExport = true"
        >
          <Icon name="tabler:share" class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="garden-tool__btn ghost"
          :aria-label="t('tools.agroecologicalGarden.toolbar.select')"
          @click="setMode('select')"
          :class="{ 'text-cyan-400': drawingMode === 'select' }"
        >
          <Icon name="tabler:pointer" class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- Main body: map + right panel -->
    <div class="garden-tool__body flex-1 flex relative overflow-hidden">

      <!-- Map area -->
      <div
        ref="mapContainerRef"
        class="garden-tool__map w-full h-full relative bg-black"
        @contextmenu.prevent
      >
        <!-- Coordinate crosshair -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div class="w-[1px] h-8 bg-cyan-500/50" />
          <div class="h-[1px] w-8 bg-cyan-500/50" />
        </div>

        <!-- Drawing toolbar (left side overlay) -->
        <div class="absolute top-4 left-4 z-30 flex flex-col gap-1 bg-[#0b0b0c]/80 backdrop-blur rounded-lg p-1.5 border border-white/10 shadow-lg">
          <button
            v-for="(mode, key) in drawingModes"
            :key="key"
            type="button"
            class="garden-tool__mode-btn rounded-md p-2 transition-colors"
            :class="[
              activeMode === key ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50' : 'text-gray-400 hover:bg-white/5 hover:text-white',
            ]"
            :aria-label="mode.label"
            @click="setMode(key)"
          >
            <Icon :name="mode.icon" class="h-4 w-4" />
          </button>
        </div>

        <!-- Measurement result -->
        <div v-if="measurement" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-md bg-[#0b0b0c]/90 backdrop-blur border border-cyan-400/40 text-cyan-300 text-[11px] font-medium shadow-lg">
          {{ measurement.label }}
        </div>

        <!-- Empty state -->
        <div
          v-if="!activeProject && visibleFeatures.length === 0"
          class="absolute inset-0 z-20 flex flex-col items-center justify-center text-gray-500"
        >
          <Icon name="tabler:seedling" class="h-12 w-12 mb-2 opacity-30" />
          <p class="text-sm">{{ t('tools.agroecologicalGarden.emptyStates.noFeatures') }}</p>
        </div>
      </div>

      <!-- Right panel: layers + tools -->
      <aside class="garden-tool__panel w-full md:w-80 flex flex-col border-l border-white/10 bg-[#0b0b0c]/80 backdrop-blur z-30">
        <div class="flex-1 overflow-y-auto p-3 space-y-3">

          <!-- Layers section -->
          <section class="garden-tool__section">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {{ t('tools.agroecologicalGarden.layers.title') }}
              </h3>
              <button
                type="button"
                class="garden-tool__btn ghost size-sm"
                :aria-label="t('tools.agroecologicalGarden.layers.addLayer')"
                @click="addLayerPrompt"
              >
                <Icon name="tabler:plus" class="h-3 w-3" />
              </button>
            </div>

            <div class="space-y-1">
              <div
                v-for="layer of activeProject?.layers || []"
                :key="layer.id"
                class="garden-tool__layer rounded-md p-2 border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                :class="{ 'border-cyan-400/50 bg-cyan-500/5': activeLayerId === layer.id }"
              >
                <div class="flex items-center gap-2 cursor-pointer group" @click="setActiveLayer(layer.id)">
                  <input
                    type="checkbox"
                    class="rounded border-white/20 text-cyan-400 focus:ring-cyan-400"
                    :checked="layer.visible"
                    @change="(e) => setLayerVisibility(layer.id, (e.target as HTMLInputElement).checked)"
                  />
                  <span
                    class="text-xs truncate"
                    :class="{ 'text-gray-300': layer.visible, 'text-gray-600 line-through': !layer.visible }"
                  >
                    {{ layer.name }}
                  </span>
                </div>
                <div class="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    class="garden-tool__btn ghost size-sm px-1"
                    :aria-label="t('tools.agroecologicalGarden.layers.lock')"
                    @click="setLayerLocked(layer.id, !layer.locked)"
                    :class="layer.locked ? 'text-gray-500' : 'text-gray-400 hover:text-white'"
                  >
                    <Icon :name="layer.locked ? 'tabler:lock' : 'tabler:lock-open'" class="h-3 w-3" />
                  </button>
                  <input
                    type="range"
                    min="0" max="1" step="0.1"
                    class="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    :value="layer.opacity"
                    @input="(e) => setLayerOpacity(layer.id, parseFloat((e.target as HTMLInputElement).value))"
                  />
                  <button
                    type="button"
                    class="garden-tool__btn ghost size-sm px-1 text-red-400 hover:text-red-300"
                    :aria-label="t('tools.agroecologicalGarden.layers.delete')"
                    @click.stop="deleteLayer(layer.id)"
                  >
                    <Icon name="tabler:trash-x" class="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
            <p v-if="!(activeProject?.layers.length)" class="text-[10px] text-gray-500 mt-2">
              {{ t('tools.agroecologicalGarden.emptyStates.noLayers') }}
            </p>
          </section>

          <!-- Drawing modes -->
          <section class="garden-tool__section">
            <h3 class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              {{ t('tools.agroecologicalGarden.draw') }}
            </h3>
            <div class="grid grid-cols-2 gap-1">
              <button
                v-for="(mode, key) in drawingModes"
                :key="key"
                type="button"
                class="garden-tool__btn outline size-sm text-[10px] px-2 py-1.5 leading-tight"
                :class="{ 'bg-cyan-500/20 border-cyan-400 text-cyan-400': activeMode === key }"
                :aria-pressed="activeMode === key"
                @click="setMode(key)"
              >
                {{ mode.short }}
              </button>
            </div>
          </section>

          <!-- Measurement -->
          <section v-if="measurement" class="garden-tool__section">
            <h3 class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              {{ t('tools.agroecologicalGarden.measurement.title') }}
            </h3>
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-gray-400">{{ t('tools.agroecologicalGarden.measurement.type') }}:</span>
                <span class="text-white">{{ measurement.type }}</span>
              </div>
              <div class="flex justify-between text-xs font-mono text-cyan-300">
                <span>{{ t('tools.agroecologicalGarden.measurement.value') }}:</span>
                <span>{{ measurement.label }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-400">{{ t('tools.agroecologicalGarden.measurement.units') }}:</span>
                <button
                  type="button"
                  class="garden-tool__btn ghost text-[10px] px-1.5 py-0.5 rounded"
                  :class="{ 'bg-white/10 text-white': unitSystem === 'metric', 'text-gray-400': unitSystem !== 'metric' }"
                  @click="toggleUnit('metric')"
                >
                  {{ t('tools.agroecologicalGarden.measurement.metric') }}
                </button>
                <button
                  type="button"
                  class="garden-tool__btn ghost text-[10px] px-1.5 py-0.5 rounded ml-1"
                  :class="{ 'bg-white/10 text-white': unitSystem === 'imperial', 'text-gray-400': unitSystem !== 'imperial' }"
                  @click="toggleUnit('imperial')"
                >
                  {{ t('tools.agroecologicalGarden.measurement.imperial') }}
                </button>
              </div>
            </div>
          </section>

          <!-- Plant library -->
          <section v-if="plantLibraryOpen" class="garden-tool__section garden-tool__plant-library">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {{ t('tools.agroecologicalGarden.plantLibrary.title') }}
              </h3>
              <button
                type="button"
                class="garden-tool__btn ghost size-sm"
                :aria-label="t('general.close')"
                @click="plantLibraryOpen = false"
              >
                <Icon name="tabler:trash-x" class="h-3 w-3" />
              </button>
            </div>
            <input
              type="text"
              v-model="plantSearch"
              class="w-full px-2 py-1.5 rounded-md border border-white/10 bg-white/5 text-xs text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
              :placeholder="t('tools.agroecologicalGarden.plantLibrary.search')"
            />
            <div class="mt-2 max-h-48 overflow-y-auto space-y-1">
              <button
                v-for="plant of filteredPlants"
                :key="plant.id"
                type="button"
                class="garden-tool__plant-btn w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                @click="selectPlant(plant.id)"
              >
                <span class="text-lg leading-none">{{ plantIcon(plant.category) }}</span>
                <span class="truncate">{{ plant.name }}</span>
                <span class="ml-auto text-[9px] text-gray-500 uppercase">{{ plant.category }}</span>
              </button>
            </div>
            <p v-if="filteredPlants.length === 0" class="text-[10px] text-gray-500 mt-1">
              {{ t('tools.agroecologicalGarden.emptyStates.noPlants') }}
            </p>
          </section>

        </div>
      </aside>

    </div>

    <!-- Export modal -->
    <Teleport to="body">
      <div v-if="showExport" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showExport = false">
        <div class="bg-[#0b0b0c] rounded-xl border border-white/10 p-5 max-w-md w-full shadow-2xl">
          <h3 class="text-sm font-semibold text-white mb-3">{{ t('tools.agroecologicalGarden.project.export') }}</h3>
          <div class="space-y-2 mb-4">
            <button
              v-for="fmt in exportFormats"
              :key="fmt"
              type="button"
              class="w-full garden-tool__btn outline text-xs text-left px-3 py-2"
              @click="exportProject(fmt)"
            >
              {{ fmt }}
            </button>
          </div>
          <button
            type="button"
            class="w-full garden-tool__btn secondary text-sm"
            @click="showExport = false"
          >
            {{ t('general.close') }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { useGardenProject } from '@/composables/useGardenProject'
import type { GardenFeature, GardenLayerType, DrawingMode, LayerStyle, MeasurementResult } from '@/lib/garden-types'
import { PLANTS, getPlant, searchPlants } from '@/lib/garden-plants'
import { haversineDistance, polygonPerimeter, generateId, computeBounds } from '@/lib/garden-utils'

const exportFormats = ['GeoJSON', 'JSON']

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const toast = useToast()
const garden = useGardenProject()

// ── Refs ─────────────────────────────────────────────────────────────────────

const mapContainerRef = ref<HTMLDivElement | null>(null)
const mapRef = shallowRef<MapLibreMap | null>(null)
const isMapReady = ref(false)

// Drawing state
const drawingMode = ref<DrawingMode>('select')
const activeMode = ref<string>('select')
const coordinate = ref<{ lat: number; lng: number } | null>(null)
const measurement = ref<MeasurementResult | null>(null)
const pendingPlant = ref<{ plantId: string; name: string } | null>(null)
const showExport = ref(false)
const plantSearch = ref('')

// Drawing in-progress
let activeDraw: {
  type: 'point' | 'line' | 'polygon'
  coords: [number, number][]
  layerId: string
  style: LayerStyle
  featureId: string
} | null = null

// ── Computed ─────────────────────────────────────────────────────────────────

const activeProject = computed(() => garden.activeProject)
const activeLayer = computed(() => garden.activeLayer)
const activeLayerId = computed(() => garden.activeLayerId)
const visibleFeatures = computed(() => garden.visibleFeatures)
const unitSystem = computed(() => garden.unitSystem)
const plantLibraryOpen = computed({
  get: () => garden.plantLibraryOpen,
  set: (v: boolean) => garden.setPlantLibraryOpen(v),
})

const drawingModes = computed(() => ({
  select: { label: t('tools.agroecologicalGarden.toolbar.select'), icon: 'tabler:pointer', short: 'Sel' },
  pan: { label: t('tools.agroecologicalGarden.toolbar.pan'), icon: 'tabler:pointer', short: 'Pan' },
  point: { label: t('tools.agroecologicalGarden.toolbar.point'), icon: 'tabler:map-pin', short: 'Pt' },
  line: { label: t('tools.agroecologicalGarden.toolbar.line'), icon: 'tabler:route', short: 'Line' },
  polygon: { label: t('tools.agroecologicalGarden.toolbar.polygon'), icon: 'tabler:polygon', short: 'Poly' },
  measure: { label: t('tools.agroecologicalGarden.toolbar.measure'), icon: 'tabler:ruler', short: 'Meas' },
}))

const filteredPlants = computed(() => {
  if (!plantSearch.value) return PLANTS.slice(0, 30)
  return searchPlants(plantSearch.value).slice(0, 30)
})

// ── Map lifecycle ────────────────────────────────────────────────────────────

onMounted(() => {
  nextTick(initMap)
})

function initMap() {
  if (!mapContainerRef.value || isMapReady.value) return

  const apiKey = useRuntimeConfig().public.maptilerApiKey || ''
  const styleUrl = apiKey
    ? `https://api.maptiler.com/maps/satellite-v4/style.json?key=${apiKey}`
    : undefined

  const map = new maplibregl.Map({
    container: mapContainerRef.value!,
    style: styleUrl || {
      version: 8,
      sources: {},
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0b0b0c' } }],
    },
    center: activeProject.value?.location.lng
      ? [activeProject.value.location.lng, activeProject.value.location.lat]
      : [-47.9292, -15.7801],
    zoom: activeProject.value?.location.zoom ?? 16,
    hash: false,
    interactive: true,
    touchZoomRotate: true,
    dragRotate: false,
    scrollZoom: true,
    attributionControl: false,
  })

  mapRef.value = map

  map.on('load', () => {
    isMapReady.value = true
    setupMapLayers(map)
    renderFeatures(map)
    fitMapToFeatures(map)
    addDrawLayers(map)
  })

  map.on('mousemove', (e) => {
    coordinate.value = { lat: e.lngLat.lat, lng: e.lngLat.lng }
    if (activeDraw && activeDraw.type === 'line' && activeDraw.coords.length > 0) {
      updateDrawPreview(map, e.lngLat.lng, e.lngLat.lat)
    }
  })

  map.on('click', (e) => {
    // Don't draw if clicking on UI
    if (mapContainerRef.value && !mapContainerRef.value.contains(e.originalEvent.target as Node)) {
      handleMapClick(e.lngLat.lng, e.lngLat.lat)
    }
  })

  map.on('moveend', () => {
    if (mapRef.value) {
      const project = garden.activeProject
      if (project) {
        const c = mapRef.value.getCenter()
        project.location = { lat: c.lat, lng: c.lng, zoom: mapRef.value.getZoom() }
      }
    }
  })
}

function setupMapLayers(map: MapLibreMap) {
  // Add satellite-optimized draw layers
  // These are empty GeoJSON sources that get populated as user draws
  map.addSource('garden-draw-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addSource('garden-draw-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addSource('garden-draw-polygons', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

  // Points layer
  map.addLayer({
    id: 'garden-layer-points',
    type: 'circle',
    source: 'garden-draw-points',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 18, 10],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.9,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1,
    },
  })

  // Lines layer
  map.addLayer({
    id: 'garden-layer-lines',
    type: 'line',
    source: 'garden-draw-lines',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['get', 'width'],
      'line-opacity': 0.8,
    },
  })

  // Polygons fill
  map.addLayer({
    id: 'garden-layer-polygons-fill',
    type: 'fill',
    source: 'garden-draw-polygons',
    paint: {
      'fill-color': ['get', 'fillColor'],
      'fill-opacity': ['get', 'fillOpacity'],
    },
  })

  // Polygons outline
  map.addLayer({
    id: 'garden-layer-polygons-outline',
    type: 'line',
    source: 'garden-draw-polygons',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2,
      'line-opacity': 0.8,
    },
  })
}

function renderFeatures(map: MapLibreMap) {
  if (!isMapReady.value) return

  const pointFeatures: GeoJSON.Feature[] = []
  const lineFeatures: GeoJSON.Feature[] = []
  const polygonFeatures: GeoJSON.Feature[] = []

  for (const f of visibleFeatures.value) {
    const layer = activeProject.value?.layers.find(l => l.id === f.layerId)
    if (!layer || !layer.visible) continue

    const style = layer.style
    const color = style.color ?? '#0ea5e9'
    const fillColor = style.fillColor ?? color
    const fillOpacity = style.fillOpacity ?? 0.3

    if (f.type === 'point') {
      const coords = f.geometry.coordinates as [number, number]
      pointFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: { color, radius: style.radius ?? 6, label: f.properties.label, id: f.id },
      })
    } else if (f.type === 'line') {
      const coords = f.geometry.coordinates as [number, number][]
      lineFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { color, width: style.lineWidth ?? 2, label: f.properties.label, id: f.id },
      })
    } else if (f.type === 'polygon') {
      const coords = (f.geometry as GeoJSON.Polygon).coordinates as unknown as [number, number][]
      polygonFeatures.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: { color, fillColor, fillOpacity, label: f.properties.label, id: f.id },
      })
    }
  }

  ;(map.getSource('garden-draw-points') as GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: pointFeatures,
  })
  ;(map.getSource('garden-draw-lines') as GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: lineFeatures,
  })
  ;(map.getSource('garden-draw-polygons') as GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: polygonFeatures,
  })
}

function addDrawLayers(map: MapLibreMap) {
  // In-progress drawing layers (separate sources for real-time feedback)
  map.addSource('garden-active-draw', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: 'garden-active-line',
    type: 'line',
    source: 'garden-active-draw',
    paint: { 'line-color': '#0ea5e9', 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': [4, 2] },
  })
  map.addLayer({
    id: 'garden-active-polygon',
    type: 'fill',
    source: 'garden-active-draw',
    paint: { 'fill-color': '#0ea5e9', 'fill-opacity': 0.2 },
  })
  map.addLayer({
    id: 'garden-active-point',
    type: 'circle',
    source: 'garden-active-draw',
    paint: { 'circle-color': '#0ea5e9', 'circle-radius': 6, 'circle-opacity': 0.9 },
  })
}

function fitMapToFeatures(map: MapLibreMap) {
  const features = visibleFeatures.value
  if (features.length === 0) return
  const bounds = computeBounds(features)
  if (bounds[0][0] === 0 && bounds[0][1] === 0 && bounds[1][0] === 0 && bounds[1][1] === 0) return
  map.fitBounds(bounds, { padding: 60, maxZoom: 18 })
}

// ── Drawing handlers ─────────────────────────────────────────────────────────

function setMode(mode: string) {
  activeMode.value = mode as DrawingMode
  drawingMode.value = mode as DrawingMode
  measurement.value = null
  activeDraw = null
  clearDrawPreview()

  if (mode === 'pan') {
    mapRef.value?.dragPan.enable()
  } else {
    mapRef.value?.dragPan.disable()
  }
}

function handleMapClick(lng: number, lat: number) {
  if (!isMapReady.value || !mapRef.value) return

  const mode = activeMode.value

  if (mode === 'select') {
    // Select feature at click (simplified: check proximity)
    selectFeatureAt(lng, lat)
    return
  }

  if (mode === 'pan') return

  const layerId = activeLayerId.value
  if (!layerId) {
    toast.warning(t('tools.agroecologicalGarden.emptyStates.noLayers'))
    return
  }

  const layer = activeProject.value?.layers.find(l => l.id === layerId)
  if (!layer || layer.locked) return

  const style = layer.style

  if (mode === 'point') {
    const plant = pendingPlant.value
    pendingPlant.value = null
    const feature: GardenFeature = {
      id: generateId('feat'),
      type: 'point',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { label: plant?.name ?? layer.name, plantId: plant?.plantId, variety: '' },
    }
    garden.addFeature(feature, layerId)
    renderFeatures(mapRef.value!)
    toast.success(t('tools.agroecologicalGarden.toasts.featureAdded'))
    return
  }

  if (mode === 'line' || mode === 'polygon') {
    if (!activeDraw) {
      activeDraw = {
        type: mode === 'line' ? 'line' : 'polygon',
        coords: [[lng, lat]],
        layerId,
        style,
        featureId: generateId('feat'),
      }
      updateDrawPreview(mapRef.value!, lng, lat)
    } else {
      activeDraw.coords.push([lng, lat])
      updateDrawPreview(mapRef.value!, lng, lat)
    }
    return
  }

  if (mode === 'measure') {
    // Start or continue measurement
    if (!activeDraw) {
      activeDraw = { type: 'line', coords: [[lng, lat]], layerId, style, featureId: generateId('feat') }
      updateDrawPreview(mapRef.value!, lng, lat)
    } else {
      activeDraw.coords.push([lng, lat])
      const dist = polygonPerimeter(activeDraw.coords)
      measurement.value = {
        type: 'distance',
        value: unitSystem.value === 'metric' ? dist : dist * 3.28084,
        unit: unitSystem.value === 'metric' ? 'm' : 'ft',
        label: formatDistance(dist, unitSystem.value),
        coordinates: activeDraw.coords,
      }
      updateDrawPreview(mapRef.value!, lng, lat)
    }
    return
  }
}

function updateDrawPreview(map: MapLibreMap, lng: number, lat: number) {
  if (!activeDraw) return
  const coords = [...activeDraw.coords, [lng, lat]]
  let feature: GeoJSON.Feature
  if (activeDraw.type === 'line') {
    feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }
  } else {
    feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
  }
  ;(map.getSource('garden-active-draw') as GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: [feature],
  })
}

function clearDrawPreview() {
  if (!mapRef.value) return
  ;(mapRef.value.getSource('garden-active-draw') as GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: [],
  })
}

function finishDraw() {
  if (!activeDraw || !isMapReady.value || !mapRef.value) return

  const { type, coords, layerId, style, featureId } = activeDraw
  const layer = activeProject.value?.layers.find(l => l.id === layerId)
  if (!layer) {
    activeDraw = null
    clearDrawPreview()
    return
  }

  if (type === 'line') {
    const feature: GardenFeature = {
      id: featureId,
      type: 'line',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { label: layer.name },
    }
    garden.addFeature(feature, layerId)
  } else if (type === 'polygon') {
    // Close ring if not closed
    const ring = coords[0] === coords[coords.length - 1] ? coords : [...coords, coords[0]]
    const feature: GardenFeature = {
      id: featureId,
      type: 'polygon',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { label: layer.name },
    }
    garden.addFeature(feature, layerId)
  }

  renderFeatures(mapRef.value!)
  clearDrawPreview()
  activeDraw = null
  toast.success(t('tools.agroecologicalGarden.toasts.featureAdded'))
}

function selectFeatureAt(lng: number, lat: number) {
  // Simple proximity-based selection
  const all = visibleFeatures.value
  let nearest: { feature: typeof all[0]; dist: number } | null = null
  for (const f of all) {
    const coords =
      f.type === 'point'
        ? [(f.geometry as GeoJSON.Point).coordinates as [number, number]]
        : f.type === 'line'
        ? ((f.geometry as GeoJSON.LineString).coordinates as [number, number][])
        : ((f.geometry as GeoJSON.Polygon).coordinates as unknown as [number, number][][])[0]
    for (const c of coords) {
      const d = haversineDistance([lng, lat], c)
      if (d < 30 && (!nearest || d < nearest.dist)) {
        nearest = { feature: f, dist: d }
      }
    }
  }
  if (nearest) {
    garden.selectFeature(nearest.feature.id)
  } else {
    garden.selectFeature(null)
  }
}

// ── Plant handling ───────────────────────────────────────────────────────────

function selectPlant(plantId: string) {
  const plant = getPlant(plantId)
  if (!plant) return
  garden.setSelectedPlant(plantId)
  plantLibraryOpen.value = false
  // Switch to point mode and prepare to place plant on next click
  setMode('point')
  const layerId = ensurePlantLayer()
  if (layerId) {
    pendingPlant.value = { plantId: plant.id, name: plant.name }
    toast.info(`${t('tools.agroecologicalGarden.plantLibrary.details.description')}: ${plant.name}`)
  }
}

function ensurePlantLayer(): string | null {
  if (!activeProject.value) return null
  let layer = activeProject.value.layers.find(l => l.type === 'vegetable')
  if (!layer) {
    layer = garden.addLayer('vegetable')
  }
  return layer.id
}

// ── Layers ───────────────────────────────────────────────────────────────────

function addLayerPrompt() {
  // Simple: cycle through common layer types
  const types: GardenLayerType[] = ['bed', 'path', 'water-way', 'spring', 'compost', 'mulch']
  const existing = new Set(activeProject.value?.layers.map(l => l.type))
  const next = types.find(t => !existing.has(t))
  if (next) {
    garden.addLayer(next)
    toast.success(t('tools.agroecologicalGarden.toasts.layerAdded'))
  } else {
    toast.info('All standard layers already added')
  }
}

function setLayerVisibility(layerId: string, visible: boolean) {
  garden.setLayerVisibility(layerId, visible)
  renderFeatures(mapRef.value!)
}

function setLayerOpacity(layerId: string, opacity: number) {
  garden.setLayerOpacity(layerId, opacity)
  renderFeatures(mapRef.value!)
}

function setLayerLocked(layerId: string, locked: boolean) {
  garden.setLayerLocked(layerId, locked)
}

function deleteLayer(layerId: string) {
  garden.deleteLayer(layerId)
  renderFeatures(mapRef.value!)
}

function setActiveLayer(layerId: string) {
  garden.setActiveLayer(layerId)
}

// ── Measurement & units ──────────────────────────────────────────────────────

function formatDistance(meters: number, system: 'metric' | 'imperial'): string {
  if (system === 'metric') {
    if (meters < 1000) return `${meters.toFixed(1)} m`
    return `${(meters / 1000).toFixed(2)} km`
  }
  const ft = meters * 3.28084
  if (ft < 5280) return `${ft.toFixed(1)} ft`
  return `${(ft / 5280).toFixed(2)} mi`
}

function toggleUnit(system: 'metric' | 'imperial') {
  garden.setUnitSystem(system)
  if (measurement.value && measurement.value.type === 'distance') {
    const m = measurement.value.unit === 'm' ? measurement.value.value : measurement.value.value / 3.28084
    measurement.value = {
      ...measurement.value,
      value: system === 'metric' ? m : m * 3.28084,
      unit: system === 'metric' ? 'm' : 'ft',
      label: formatDistance(m, system),
    }
  }
}

// ── Plant icon ───────────────────────────────────────────────────────────────

function plantIcon(category: string): string {
  const map: Record<string, string> = {
    vegetable: '🥬',
    'native-tree': '🌳',
    rhizome: '🥔',
    'cover-crop': '🌾',
    herb: '🌿',
    fruit: '🍎',
    flower: '🌸',
  }
  return map[category] ?? '🌱'
}

// ── Project actions ──────────────────────────────────────────────────────────

function saveProject() {
  garden.saveToStorage()
  toast.success(t('tools.agroecologicalGarden.toasts.saved'))
}

function exportProject(fmt: string) {
  const json = garden.exportProject(activeProject.value?.id || '')
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `garden-${activeProject.value?.name || 'project'}.${fmt === 'GeoJSON' ? 'geojson' : 'json'}`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(t('tools.agroecologicalGarden.toasts.exported'))
  showExport.value = false
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

onUnmounted(() => {
  if (mapRef.value) {
    mapRef.value.remove()
    mapRef.value = null
  }
  isMapReady.value = false
  activeDraw = null
})

// Expose for template
const toolApi = {
  activeProject,
  activeLayer,
  activeLayerId,
  drawingMode,
  activeMode,
  coordinate,
  measurement,
  plantLibraryOpen,
  showExport,
  plantSearch,
  exportFormats,
  unitSystem,
  visibleFeatures,
  setMode,
  toggleUnit,
  selectPlant,
  addLayerPrompt,
  setLayerVisibility,
  setLayerOpacity,
  setLayerLocked,
  deleteLayer,
  setActiveLayer,
  saveProject,
  exportProject,
  finishDraw,
  plantIcon,
  t,
}

defineExpose({ ...toolApi, finishDraw })
</script>

<style scoped>
.garden-tool {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.garden-tool__header {
  height: 56px;
  flex-shrink: 0;
}
.garden-tool__title {
  letter-spacing: -0.01em;
}
.garden-tool__subtitle {
  line-height: 1.2;
}
.garden-tool__body {
  display: flex;
  height: 100%;
  min-height: 0;
}
.garden-tool__map {
  flex: 1;
  min-height: 0;
  position: relative;
}
.garden-tool__panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.garden-tool__section {
  margin-bottom: 1.5rem;
}
.garden-tool__btn {
  transition: all 0.15s ease;
}
.garden-tool__btn.ghost {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #cbd5e1;
}
.garden-tool__btn.ghost:hover {
  background: rgba(255,255,255,0.1);
  color: #ffffff;
}
.garden-tool__btn.outline {
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: #94a3b8;
}
.garden-tool__btn.outline:hover {
  background: rgba(255,255,255,0.05);
  color: #ffffff;
}
.garden-tool__btn.secondary {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: #ffffff;
}
.garden-tool__btn.size-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
.garden-tool__mode-btn {
  border: 1px solid transparent;
}
.garden-tool__layer {
  transition: all 0.15s ease;
}
.garden-tool__plant-btn {
  transition: all 0.1s ease;
}
.garden-tool__coord {
  backdrop-filter: blur(4px);
}
.garden-tool__plant-library {
  max-height: none;
}
</style>