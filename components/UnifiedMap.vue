<template>
  <div class="w-full h-screen relative overflow-hidden bg-black">
    <!-- Background effects -->
    <div class="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-cyan-900/20 pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }" />
    <div v-if="!isMobile" class="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-purple-900/20 pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }" />
    <div class="absolute inset-0 pointer-events-none" :style="{ zIndex: 'var(--z-map-overlays)', boxShadow: 'inset 0 0 150px 20px rgba(0,0,0,0.7)' }" />

    <!-- Hex grid overlay -->
    <canvas v-if="showHexGrid" ref="hexCanvasRef" class="absolute inset-0 w-full h-full pointer-events-none opacity-20" :style="{ zIndex: 'var(--z-map-hex-grid)' }" />

    <!-- Grid overlay -->
    <img
      v-if="gridOverlayLoaded"
      src="/grid-overlay.png"
      alt="Grid Overlay"
      class="absolute inset-0 pointer-events-none w-full h-full object-cover opacity-5"
      :style="{ zIndex: 'calc(var(--z-map-hex-grid) + 1)' }"
    />

    <!-- Noise overlay -->
    <img
      v-if="noiseLoaded"
      src="/noise.png"
      alt="Noise Texture"
      class="absolute inset-0 pointer-events-none opacity-[0.02] animate-noise-bg"
      :style="{ zIndex: 'calc(var(--z-map-effects) + 1)', width: '512px', height: '512px', backgroundRepeat: 'repeat' }"
    />

    <!-- Scanline overlay -->
    <img
      v-if="scanlineLoaded"
      src="/scanline.gif"
      alt="Scanline Effect"
      class="absolute inset-0 pointer-events-none opacity-[0.015]"
      :style="{ zIndex: 'calc(var(--z-map-effects) + 2)', width: '512px', height: '512px', backgroundRepeat: 'repeat' }"
    />

    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }">
      <div :class="`absolute top-0 left-0 w-full h-full ${isMobile ? 'opacity-5' : 'opacity-10'}`">
        <div class="absolute top-0 left-0 w-1/3 h-1/3 bg-cyan-500/20 blur-3xl animate-pulse-slow" />
        <template v-if="!isMobile">
          <div class="absolute bottom-0 right-0 w-1/3 h-1/3 bg-purple-500/20 blur-3xl animate-pulse-slow-delay" />
          <div class="absolute top-1/2 right-1/4 w-1/4 h-1/4 bg-pink-500/20 blur-3xl animate-pulse-slow-delay-2" />
        </template>
      </div>
    </div>

    <!-- Earth Guardians Banner -->
    <div v-if="isMobile" class="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none px-2" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img src="/white-banner.png" alt="Earth Guardians" class="h-auto w-auto max-h-[12vh] max-w-[240px] object-contain" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img src="/white-banner.png" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[180px] -rotate-90 origin-center" />
    </div>

    <!-- Map Container -->
    <div ref="mapContainerRef" class="w-full h-full relative" :style="{ zIndex: 'var(--z-map-base)' }" />

    <!-- Controls - 2D/3D toggle -->
    <div class="absolute top-4 left-4" :style="{ zIndex: 'var(--z-map-ui-controls)' }">
      <div class="panel-cyber rounded-lg p-2">
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            2D Map
          </button>
          <NuxtLink
            :to="`${datasetBaseRoute}/3d`"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-black/50 text-cyan-400 hover:bg-cyan-950/30"
          >
            3D Globe
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Global Stats (for project grants only - UnifiedMap is always 2D) -->
    <div v-if="activeDataset === 'project-grants'" class="absolute right-0 bottom-0 w-full max-w-xl px-4 sm:px-0" :style="{ zIndex: 'var(--z-map-global-stats)' }">
      <GlobalStats :projects="projectsData" />
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
    <div v-if="hasError" class="absolute inset-0 bg-black flex flex-col items-center justify-center text-white" :style="{ zIndex: 'var(--z-map-error-overlay)' }">
      <div class="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-orange-600 animate-pulse mb-6"></div>
      <h2 class="text-xl font-bold mb-2">Unable to Load Map</h2>
      <p class="text-gray-300 mb-4">The map could not be initialized.</p>
      <button @click="() => { hasError = false; initMap() }" class="px-4 py-2 bg-black bg-opacity-70 rounded border border-purple-500/50 text-purple-400 hover:bg-purple-900/30 transition-colors">
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

let map: maplibregl.Map | null = null
let markers: maplibregl.Marker[] = []
let connectionSources: string[] = []

// Overlay image loading
const gridOverlayLoaded = ref(true)
const noiseLoaded = ref(true)
const scanlineLoaded = ref(true)

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
  el.style.transition = 'all 0.3s ease'

  const innerWrapper = document.createElement('div')
  innerWrapper.style.width = '100%'
  innerWrapper.style.height = '100%'
  innerWrapper.style.borderRadius = '50%'
  innerWrapper.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
  innerWrapper.style.border = `2px solid ${color}`
  innerWrapper.style.boxShadow = `0 0 ${beneficiaryFactor * 15}px ${color}, 0 0 ${beneficiaryFactor * 3}px #fff`
  innerWrapper.style.display = 'flex'
  innerWrapper.style.justifyContent = 'center'
  innerWrapper.style.alignItems = 'center'
  innerWrapper.style.position = 'relative'
  innerWrapper.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease'
  el.appendChild(innerWrapper)

  const centerDot = document.createElement('div')
  centerDot.style.width = `${markerSize * 0.5}px`
  centerDot.style.height = `${markerSize * 0.5}px`
  centerDot.style.backgroundColor = color
  centerDot.style.borderRadius = '50%'
  centerDot.style.boxShadow = `0 0 ${beneficiaryFactor * 3}px ${color}`
  innerWrapper.appendChild(centerDot)

  el.addEventListener('mouseenter', () => {
    innerWrapper.style.transform = 'scale(1.2)'
    innerWrapper.style.boxShadow = `0 0 ${beneficiaryFactor * 30}px ${color}, 0 0 ${beneficiaryFactor * 6}px #fff`
    el.style.zIndex = '10'
  })

  el.addEventListener('mouseleave', () => {
    innerWrapper.style.transform = 'scale(1)'
    innerWrapper.style.boxShadow = `0 0 ${beneficiaryFactor * 15}px ${color}, 0 0 ${beneficiaryFactor * 3}px #fff`
    el.style.zIndex = '1'
  })

  return el
}

function createSpeciesMarkerElement(species: Species): HTMLElement {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64030'
  const markerSize = 14

  const el = document.createElement('div')
  el.style.width = `${markerSize}px`
  el.style.height = `${markerSize}px`
  el.style.borderRadius = '50%'
  el.style.backgroundColor = color
  el.style.border = '2px solid rgba(255,255,255,0.85)'
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)'
  el.style.cursor = 'pointer'
  el.style.transition = 'transform 0.2s ease'

  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)' })
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
  connectionSources.forEach(id => {
    if (map?.getLayer(id)) map.removeLayer(id)
    if (map?.getSource(id)) map.removeSource(id)
  })
  connectionSources = []

  // Only add connections for project-grants dataset
  if (activeDataset.value !== 'project-grants') return

  const maxConnectionsPerProject = isMobile.value ? 2 : 3
  const projectsToProcess = isMobile.value ? projectsData.value.slice(0, Math.min(15, projectsData.value.length)) : projectsData.value
  const connections: Array<{ from: [number, number]; to: [number, number]; direct: number; indirect: number }> = []

  // Use a seeded approach for deterministic connections
  projectsToProcess.forEach((project, idx) => {
    const availableTargets = projectsToProcess.filter(p => p.project_title !== project.project_title && isValidCoordinate(p.latitude, p.longitude))
    const connectionsToMake = Math.min(maxConnectionsPerProject, availableTargets.length)

    // Use index-based selection for deterministic results
    for (let i = 0; i < connectionsToMake; i++) {
      const targetIndex = (idx + i + 1) % availableTargets.length
      const target = availableTargets[targetIndex]
      if (target) {
        connections.push({
          from: [project.longitude, project.latitude],
          to: [target.longitude, target.latitude],
          direct: project.direct_beneficiaries,
          indirect: project.indirect_beneficiaries
        })
      }
    }
  })

  connections.slice(0, 80).forEach((conn, index) => {
    const connectionId = `connection-${index}`
    const controlPoint = generateCurvedPath(conn.from, conn.to)
    const color = getProjectColorByBeneficiaries(conn.direct, conn.indirect)

    map!.addSource(connectionId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [conn.from, controlPoint, conn.to]
        }
      }
    })

    map!.addLayer({
      id: connectionId,
      type: 'line',
      source: connectionId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': color,
        'line-width': 2.5,
        'line-opacity': 0.2,
        'line-dasharray': [0.5, 2]
      }
    })

    connectionSources.push(connectionId)
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
