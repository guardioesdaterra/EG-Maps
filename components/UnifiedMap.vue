<template>
  <div class="w-full h-screen relative overflow-hidden bg-black" role="main" aria-label="Interactive Map Visualization">
    <!-- Background effects -->
    <div class="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-purple-950/10 to-emerald-950/20 pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }" />
    <div v-if="!isMobile" class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }" />
    <div class="absolute inset-0 pointer-events-none" :style="{ zIndex: 'var(--z-map-overlays)', boxShadow: 'inset 0 0 200px 50px rgba(0,0,0,0.8)' }" />

    <!-- Hex grid overlay -->
    <canvas v-if="showHexGrid" ref="hexCanvasRef" class="absolute inset-0 w-full h-full pointer-events-none opacity-15" :style="{ zIndex: 'var(--z-map-hex-grid)' }" />

    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }">
      <div :class="`absolute top-0 left-0 w-full h-full ${isMobile ? 'opacity-5' : 'opacity-10'}`">
        <div class="absolute top-0 left-1/4 w-1/3 h-1/3 bg-cyan-500/20 blur-3xl animate-pulse-slow" />
        <template v-if="!isMobile">
          <div class="absolute bottom-0 right-1/4 w-1/3 h-1/3 bg-purple-500/20 blur-3xl animate-pulse-slow-delay" />
          <div class="absolute top-1/2 left-1/2 w-1/4 h-1/4 bg-emerald-500/15 blur-3xl animate-pulse-slow-delay-2" />
        </template>
      </div>
    </div>

    <!-- Earth Guardians Banner -->
    <div v-if="isMobile" class="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none px-2" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img src="/white-banner.png" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] max-w-[200px] object-contain" loading="lazy" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img src="/white-banner.png" alt="Earth Guardians" class="h-auto w-auto max-h-[12vh] max-w-[150px] -rotate-90 origin-center" loading="lazy" />
    </div>

    <!-- Map Container -->
    <div ref="mapContainerRef" class="w-full h-full relative" :style="{ zIndex: 'var(--z-map-base)' }" />

    <!-- Controls - 2D/3D toggle -->
    <div class="absolute top-4 left-4" :style="{ zIndex: 'var(--z-map-ui-controls)' }">
      <div class="panel-cyber rounded-lg p-2">
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            aria-current="page"
          >
            2D Map
          </button>
          <NuxtLink
            :to="`${datasetBaseRoute}/3d`"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-black/50 text-cyan-400 hover:bg-cyan-950/30"
            aria-label="Switch to 3D Globe view"
          >
            3D Globe
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Dataset indicator -->
    <div class="absolute top-4 left-1/2 -translate-x-1/2" :style="{ zIndex: 'var(--z-map-ui-controls)' }">
      <div class="panel-cyber rounded-lg px-4 py-2">
        <div class="flex items-center gap-2">
          <div :class="`w-2 h-2 rounded-full ${activeDataset === 'project-grants' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-green-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`" />
          <span class="text-xs font-medium text-[var(--text-primary)]">
            {{ activeDataset === 'project-grants' ? 'Project Grants' : 'Endangered Species' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Global Stats (for project grants only) -->
    <div v-if="activeDataset === 'project-grants'" class="absolute right-0 bottom-0 w-full max-w-xl px-4 sm:px-0" :style="{ zIndex: 'var(--z-map-global-stats)' }">
      <GlobalStats :projects="projectsData" />
    </div>

    <!-- Species legend (for endangered species) -->
    <div v-if="activeDataset === 'endangered-species'" class="absolute left-4 bottom-20 sm:bottom-4" :style="{ zIndex: 'var(--z-map-global-stats)' }">
      <div class="panel-cyber rounded-lg p-3">
        <h3 class="text-xs font-bold text-[var(--text-primary)] mb-2">Taxonomic Groups</h3>
        <div class="grid grid-cols-2 gap-1.5">
          <div v-for="(color, group) in GROUP_COLORS" :key="group" class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: color }" />
            <span class="text-[10px] text-[var(--text-secondary)]">{{ group }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Map Controls -->
    <MapControls
      :is-globe-view="false"
      :show-hex-grid="showHexGrid"
      :dataset="activeDataset"
      :projects="activeDataset === 'project-grants' ? projectsData : undefined"
      :species="activeDataset === 'endangered-species' ? speciesData : undefined"
      @toggle-hex-grid="showHexGrid = !showHexGrid"
      @navigate="navigateToLocation"
      :style="{ zIndex: 'var(--z-map-ui-controls)' }"
    />

    <!-- Error state -->
    <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white" :style="{ zIndex: 'var(--z-map-error-overlay)' }">
      <div class="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-orange-600 animate-pulse mb-6" />
      <h2 class="text-xl font-bold mb-2">Unable to Load Map</h2>
      <p class="text-gray-400 mb-4 text-center px-4">The map could not be initialized. Please check your connection and try again.</p>
      <button @click="() => { hasError = false; initMap() }" class="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(6,182,212,0.3)]">
        Try Again
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { allProjectsData } from '@/lib/project-data'
import type { ProjectData } from '@/lib/types'
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import type { Species } from '@/lib/map-utils'
import { buildProjectPopupHTML, buildSpeciesPopupHTML, isValidCoordinate, generateCurvedPath, GROUP_COLORS } from '@/lib/map-utils'

const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''

const MAP_STYLE = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

const tileCache = new Map<string, Response>()

function transformRequest(url: string, resourceType?: string) {
  if (resourceType === 'Tile' && tileCache.has(url)) {
    return { url }
  }
  return { url }
}

interface Props {
  projects?: ProjectData[]
  species?: Species[]
  defaultDataset?: 'project-grants' | 'endangered-species'
}

const props = withDefaults(defineProps<Props>(), {
  defaultDataset: 'project-grants',
})
const projectsData = computed(() => props.projects || allProjectsData)
const speciesData = computed(() => props.species || [])

// Base route for dataset navigation (without /3d suffix)
const datasetBaseRoute = computed(() => {
  return activeDataset.value === 'project-grants' ? '/project-grants' : '/endangered-species'
})

const isMobile = useMediaQuery('(max-width: 768px)')
const mapContainerRef = ref<HTMLDivElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
const showHexGrid = ref(true)
const activeDataset = ref<'project-grants' | 'endangered-species'>(props.defaultDataset)
const hasError = ref(false)

function createProjectMarkerElement(project: ProjectData): HTMLElement {
  const beneficiaryFactor = Math.min(Math.max(project.indirect_beneficiaries / 10000, 0.5), 5)
  const markerSize = 15 + beneficiaryFactor * 10
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)

  const el = document.createElement('div')
  el.style.width = `${markerSize}px`
  el.style.height = `${markerSize}px`
  el.style.display = 'flex'
  el.style.justifyContent = 'center'
  el.style.alignItems = 'center'
  el.style.cursor = 'pointer'
  el.style.transition = 'all 0.2s ease'
  el.style.willChange = 'transform'

  const innerWrapper = document.createElement('div')
  innerWrapper.style.width = '100%'
  innerWrapper.style.height = '100%'
  innerWrapper.style.borderRadius = '50%'
  innerWrapper.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
  innerWrapper.style.border = `2px solid ${color}`
  innerWrapper.style.boxShadow = `0 0 ${beneficiaryFactor * 12}px ${color}`
  innerWrapper.style.display = 'flex'
  innerWrapper.style.justifyContent = 'center'
  innerWrapper.style.alignItems = 'center'
  innerWrapper.style.position = 'relative'
  innerWrapper.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease'
  innerWrapper.style.willChange = 'transform'
  el.appendChild(innerWrapper)

  const centerDot = document.createElement('div')
  centerDot.style.width = `${markerSize * 0.45}px`
  centerDot.style.height = `${markerSize * 0.45}px`
  centerDot.style.backgroundColor = color
  centerDot.style.borderRadius = '50%'
  centerDot.style.boxShadow = `0 0 ${beneficiaryFactor * 2}px ${color}`
  innerWrapper.appendChild(centerDot)

  el.addEventListener('mouseenter', () => {
    innerWrapper.style.transform = 'scale(1.25)'
    innerWrapper.style.boxShadow = `0 0 ${beneficiaryFactor * 25}px ${color}, 0 0 ${beneficiaryFactor * 5}px #fff`
  })

  el.addEventListener('mouseleave', () => {
    innerWrapper.style.transform = 'scale(1)'
    innerWrapper.style.boxShadow = `0 0 ${beneficiaryFactor * 12}px ${color}`
  })

  return el
}

function createSpeciesMarkerElement(species: Species): HTMLElement {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64030'
  const markerSize = 12

  const el = document.createElement('div')
  el.style.width = `${markerSize}px`
  el.style.height = `${markerSize}px`
  el.style.borderRadius = '50%'
  el.style.backgroundColor = color
  el.style.border = '2px solid rgba(255,255,255,0.9)'
  el.style.boxShadow = `0 0 6px ${color}40`
  el.style.cursor = 'pointer'
  el.style.transition = 'transform 0.15s ease'
  el.style.willChange = 'transform'

  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.4)' })
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

  return el
}

function rebuildMarkers() {
  if (!map) return

  // Clear existing markers
  markers.forEach(m => m.remove())
  markers = []

  if (activeDataset.value === 'project-grants') {
    projectsData.value.forEach((project) => {
      if (!isValidCoordinate(project.latitude, project.longitude)) return

      const el = createProjectMarkerElement(project)
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '320px',
        className: 'cyberpunk-popup'
      }).setHTML(buildProjectPopupHTML(project))

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([project.longitude, project.latitude])
        .setPopup(popup)
        .addTo(map!)

      markers.push(marker)
    })
  } else if (activeDataset.value === 'endangered-species' && props.species) {
    props.species.forEach((species) => {
      if (!isValidCoordinate(species.lat, species.lng)) return

      const el = createSpeciesMarkerElement(species)

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '380px',
        className: 'cyberpunk-popup'
      }).setHTML(buildSpeciesPopupHTML(species))

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([species.lng, species.lat])
        .setPopup(popup)
        .addTo(map!)

      markers.push(marker)
    })
  }
}

function addConnections() {
  if (!map) return

  // Clear existing
  if (map.getLayer('connections-layer')) map.removeLayer('connections-layer')
  if (map.getSource('connections-source')) map.removeSource('connections-source')

  // Only add connections for project-grants dataset
  if (activeDataset.value !== 'project-grants') return

  const maxConnectionsPerProject = isMobile.value ? 2 : 3
  const projectsToProcess = isMobile.value ? projectsData.value.slice(0, Math.min(15, projectsData.value.length)) : projectsData.value
  const features: any[] = []

  // Use a seeded approach for deterministic connections
  projectsToProcess.forEach((project, idx) => {
    const availableTargets = projectsToProcess.filter(p => p.project_title !== project.project_title && isValidCoordinate(p.latitude, p.longitude))
    const connectionsToMake = Math.min(maxConnectionsPerProject, availableTargets.length)

    // Use index-based selection for deterministic results
    for (let i = 0; i < connectionsToMake; i++) {
      const targetIndex = (idx + i + 1) % availableTargets.length
      const target = availableTargets[targetIndex]
      if (target) {
        const controlPoint = generateCurvedPath(
          [project.longitude, project.latitude],
          [target.longitude, target.latitude]
        )
        const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)
        features.push({
          type: 'Feature',
          properties: { color },
          geometry: {
            type: 'LineString',
            coordinates: [
              [project.longitude, project.latitude],
              controlPoint,
              [target.longitude, target.latitude]
            ]
          }
        })
      }
    }
  })

  if (features.length === 0) return

  map.addSource('connections-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features
    }
  })

  map.addLayer({
    id: 'connections-layer',
    type: 'line',
    source: 'connections-source',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2,
      'line-opacity': 0.2,
      'line-dasharray': [0.5, 2]
    }
  })
}

function navigateToLocation(lat: number, lng: number) {
  if (map) {
    map.flyTo({ center: [lng, lat], zoom: 6, duration: 1500 })
  }
}

function setupHexGrid() {
  const canvas = hexCanvasRef.value
  if (!canvas) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const hexSize = isMobile.value ? 35 : 50
  const hexHeight = hexSize * Math.sqrt(3)
  const hexWidth = hexSize * 2
  const hexVerticalOffset = hexHeight * 0.75
  const hexHorizontalOffset = hexWidth * 0.5
  const columns = Math.ceil(window.innerWidth / hexHorizontalOffset) + 1
  const rows = Math.ceil(window.innerHeight / hexVerticalOffset) + 1

  ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)'
  ctx.lineWidth = 1.5

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * hexHorizontalOffset
      const y = row * hexVerticalOffset + (col % 2 === 0 ? 0 : hexHeight / 2)
      if (x < -hexWidth || x > canvas.width + hexWidth || y < -hexHeight || y > canvas.height + hexHeight) continue

      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i
        const hx = x + hexSize * Math.cos(angle)
        const hy = y + hexSize * Math.sin(angle)
        if (i === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }
}

let hexGridDebounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSetupHexGrid() {
  if (hexGridDebounceTimer) clearTimeout(hexGridDebounceTimer)
  hexGridDebounceTimer = setTimeout(() => {
    setupHexGrid()
    hexGridDebounceTimer = null
  }, 150)
}

function initMap() {
  if (!mapContainerRef.value) return

  // Clean up existing map if retry
  if (map) {
    markers.forEach(m => m.remove())
    markers = []
    map.remove()
    map = null
  }

  try {
    map = new maplibregl.Map({
      container: mapContainerRef.value,
      style: MAP_STYLE,
      zoom: isMobile.value ? 1.8 : 3,
      center: [0, 0],
      attributionControl: false,
      fadeDuration: 100,
      maxTileCacheSize: 200,
      maxTileCacheZoomLevels: 5,
      transformRequest,
    })

    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`
      })
    )

    if (!isMobile.value) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
    }

    map.on('load', () => {
      rebuildMarkers()
      addConnections()
      setupHexGrid()
    })

    map.on('error', (err) => {
      console.error('MapLibre error:', err)
      hasError.value = true
    })

    window.addEventListener('resize', debouncedSetupHexGrid)
  } catch (err) {
    console.error('Failed to initialize map:', err)
    hasError.value = true
  }
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (hexGridDebounceTimer) clearTimeout(hexGridDebounceTimer)
  markers.forEach(m => m.remove())
  markers = []
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style>
.maplibregl-popup-content {
  background: rgba(0, 0, 0, 0.9) !important;
  border-radius: 4px;
  border: 1px solid rgba(6, 182, 212, 0.5);
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.3), inset 0 0 10px rgba(6, 182, 212, 0.1);
  padding: 16px !important;
  min-width: 200px;
}

.cyber-popup-species {
  background: rgba(0, 0, 0, 0.97) !important;
  border-color: rgba(6, 182, 212, 0.6) !important;
  box-shadow: 0 0 30px rgba(6, 182, 212, 0.4), inset 0 0 15px rgba(6, 182, 212, 0.15) !important;
}

.maplibregl-popup-tip {
  border-top-color: rgba(6, 182, 212, 0.8);
  border-bottom-color: rgba(6, 182, 212, 0.8);
}

.maplibregl-popup-close-button {
  color: rgba(6, 182, 212, 0.8);
  font-size: 20px;
  padding: 0 6px;
  background: transparent;
}

.maplibregl-popup-close-button:hover {
  background-color: rgba(6, 182, 212, 0.2);
  color: rgba(6, 182, 212, 1);
}

.maplibregl-ctrl-bottom-right {
  margin-bottom: 5px;
  margin-right: 5px;
}

.maplibregl-ctrl-attrib-inner {
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  background-color: rgba(0, 0, 0, 0.5) !important;
}

.maplibregl-ctrl-attrib-inner a {
  color: rgba(6, 182, 212, 0.8);
  text-decoration: none;
}

.maplibregl-map {
  background-color: transparent !important;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.1; }
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}

.bg-gradient-radial {
  background: radial-gradient(ellipse at center, var(--tw-gradient-stops));
}
</style>
