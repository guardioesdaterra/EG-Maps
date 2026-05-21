<template>
  <div class="w-full h-screen relative overflow-hidden bg-black" role="main" aria-label="3D Globe Visualization">
    <!-- Star field background -->
    <div class="star-field" aria-hidden="true"></div>

    <!-- Black void overlay for globe edges -->
    <div class="absolute inset-0 pointer-events-none z-10 bg-black/40"></div>

    <!-- Subtle radial glow behind globe -->
    <div class="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent"></div>

    <!-- Vignette -->
    <div class="absolute inset-0 pointer-events-none z-20" style="box-shadow: inset 0 0 200px 40px rgba(0,0,0,0.9)"></div>

    <!-- Hex grid overlay -->
    <canvas
      v-if="showHexGrid"
      ref="hexCanvasRef"
      class="absolute inset-0 w-full h-full pointer-events-none opacity-15"
      :style="{ zIndex: 'var(--z-map-hex-grid)' }"
    />

    <!-- Map container -->
    <div ref="containerRef" class="w-full h-full" />

    <!-- White Banner -->
    <div v-if="isMobile" class="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none px-2" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img src="/white-banner.png" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] max-w-[200px] object-contain" loading="lazy" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img src="/white-banner.png" alt="Earth Guardians" class="h-auto w-auto max-h-[12vh] max-w-[150px] -rotate-90 origin-center" loading="lazy" />
    </div>

    <!-- Dataset indicator -->
    <div class="absolute top-4 left-1/2 -translate-x-1/2 z-[600]">
      <div class="panel-cyber rounded-lg px-4 py-2">
        <div class="flex items-center gap-2">
          <div :class="`w-2 h-2 rounded-full ${activeDataset === 'project-grants' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-green-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`" />
          <span class="text-xs font-medium text-[var(--text-primary)]">
            {{ activeDataset === 'project-grants' ? 'Project Grants' : 'Endangered Species' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Controls - 2D/3D toggle -->
    <div class="absolute top-4 left-4 z-[600]">
      <div class="panel-cyber rounded-lg p-2">
        <div class="flex items-center gap-2">
          <NuxtLink
            :to="datasetBaseRoute"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-black/50 text-cyan-400 hover:bg-cyan-950/30"
            aria-label="Switch to 2D Map view"
          >
            2D Map
          </NuxtLink>
          <button
            class="px-3 py-1.5 rounded-md text-sm font-medium bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            disabled
            aria-current="page"
          >
            3D Globe
          </button>
        </div>
      </div>
    </div>

    <!-- Global Stats (only shown for project grants) -->
    <div v-if="activeDataset === 'project-grants'" class="absolute right-0 bottom-0 z-[1000] w-full max-w-xl px-4 sm:px-0">
      <GlobalStats :projects="projectsData" />
    </div>

    <!-- Species legend (for endangered species) -->
    <div v-if="activeDataset === 'endangered-species'" class="absolute left-4 bottom-20 sm:bottom-4 z-[600]">
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

    <!-- Error state -->
    <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[2000]">
      <div class="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-orange-600 animate-pulse mb-6"></div>
      <h2 class="text-xl font-bold mb-2">Unable to Load Visualization</h2>
      <p class="text-gray-400 mb-4 text-center px-4">The component could not be loaded. Please check your connection and try again.</p>
      <div class="flex gap-4">
        <button @click="() => { hasError = false; initMap() }" class="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { allProjectsData } from '@/lib/project-data'
import type { ProjectData } from '@/lib/types'
import { isValidCoordinate, generateCurvedPath, calculateDistance, GROUP_COLORS, buildProjectPopupHTML, buildSpeciesPopupHTML } from '@/lib/map-utils'
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import type { Species } from '@/lib/map-utils'

interface Props {
  projects?: ProjectData[]
  species?: Species[]
  showHexGrid?: boolean
  defaultDataset?: 'project-grants' | 'endangered-species'
}

const props = withDefaults(defineProps<Props>(), {
  showHexGrid: true,
  defaultDataset: 'project-grants',
})

const projectsData = computed(() => props.projects || allProjectsData)
const speciesData = computed(() => props.species || [])

const datasetBaseRoute = computed(() => {
  return activeDataset.value === 'project-grants' ? '/project-grants' : '/endangered-species'
})

const isMobile = useMediaQuery('(max-width: 768px)')
const containerRef = ref<HTMLDivElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
const hasError = ref(false)
const activeDataset = ref<'project-grants' | 'endangered-species'>(props.defaultDataset)

let map: maplibregl.Map | null = null
let markers: maplibregl.Marker[] = []
let animationFrameId: number | null = null
let particles: any[] = []
let particleElements: HTMLDivElement[] = []
let isMounted = true
let markerVisibilityCheckTimer: ReturnType<typeof setTimeout> | null = null

const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''

const MAP_STYLE = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

const tileCache = new Map<string, Response>()

function transformRequest(url: string, resourceType?: string) {
  if (resourceType === 'Tile' && tileCache.has(url)) {
    const cached = tileCache.get(url)!
    return {
      url,
      headers: {},
      method: 'GET',
      type: 'image' as const,
      credentials: 'same-origin' as const,
      collectResourceTiming: false,
      _cachedResponse: cached,
    }
  }
  return { url }
}

async function initMap() {
  if (typeof window === 'undefined' || !containerRef.value) return

  try {
    map = new maplibregl.Map({
      container: containerRef.value,
      style: MAP_STYLE,
      zoom: isMobile.value ? 1.5 : 2.5,
      center: [0, 20],
      attributionControl: false,
      renderWorldCopies: false,
      fadeDuration: 100,
      maxTileCacheSize: 200,
      maxTileCacheZoomLevels: 5,
      transformRequest,
      antialias: true,
    })

    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`
      })
    )

    map.on('style.load', () => {
      if (map) {
        try {
          map.setProjection({ type: 'globe' } as any)
        } catch (e) {
          console.error('Error setting globe projection:', e)
        }
      }
    })

    map.on('load', () => {
      rebuildMarkers()
      addConnections()
      startParticles()
      setupHexGrid()
      startMarkerVisibilityCheck()
    })

    map.on('move', () => {
      updateMarkerVisibility()
    })

    map.on('moveend', () => {
      updateMarkerVisibility()
    })

    map.on('error', (err) => {
      console.error('MapLibre error:', err)
      hasError.value = true
    })
  } catch (err) {
    console.error('Failed to load maplibre-gl:', err)
    hasError.value = true
  }
}

function createProjectMarkerElement(project: ProjectData): HTMLElement {
  const beneficiaryFactor = Math.min(Math.max(project.indirect_beneficiaries / 10000, 0.5), 5)
  const markerSize = (15 + beneficiaryFactor * 10) * (isMobile.value ? 0.7 : 1)
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)

  const el = document.createElement('div')
  el.className = 'globe-marker-item'
  el.style.width = `${markerSize}px`
  el.style.height = `${markerSize}px`
  el.style.display = 'flex'
  el.style.justifyContent = 'center'
  el.style.alignItems = 'center'
  el.style.cursor = 'pointer'

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
  const markerSize = 12 * (isMobile.value ? 0.7 : 1)

  const el = document.createElement('div')
  el.className = 'globe-marker-item'
  el.style.width = `${markerSize}px`
  el.style.height = `${markerSize}px`
  el.style.borderRadius = '50%'
  el.style.backgroundColor = color
  el.style.border = '2px solid rgba(255,255,255,0.9)'
  el.style.boxShadow = `0 0 8px ${color}40`
  el.style.cursor = 'pointer'
  el.style.transition = 'transform 0.15s ease'
  el.style.willChange = 'transform'

  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.4)' })
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

  return el
}

function isMarkerVisibleOnGlobe(lng: number, lat: number): boolean {
  if (!map) return true
  try {
    const point = map.project([lng, lat])
    if (!point || isNaN(point.x) || isNaN(point.y)) return false
    const canvas = map.getCanvas()
    const margin = 100
    return (
      point.x >= -margin &&
      point.x <= canvas.width + margin &&
      point.y >= -margin &&
      point.y <= canvas.height + margin
    )
  } catch {
    return false
  }
}

function updateMarkerVisibility() {
  if (!map) return
  const center = map.getCenter()
  const antipodeLng = center.lng + 180

  markers.forEach(marker => {
    const el = marker.getElement()
    const lngLat = marker.getLngLat()

    let lngDiff = Math.abs(lngLat.lng - antipodeLng)
    if (lngDiff > 180) lngDiff = 360 - lngDiff

    const distFromCenter = calculateDistance(
      center.lat, center.lng,
      lngLat.lat, lngLat.lng
    )

    const isVisible = distFromCenter < 12000
    const wasVisible = el.style.display !== 'none'

    if (isVisible !== wasVisible) {
      el.style.display = isVisible ? '' : 'none'
      el.style.pointerEvents = isVisible ? '' : 'none'
    }
  })
}

function startMarkerVisibilityCheck() {
  if (markerVisibilityCheckTimer) clearInterval(markerVisibilityCheckTimer)
  markerVisibilityCheckTimer = setInterval(() => {
    if (map && isMounted) {
      updateMarkerVisibility()
    }
  }, 500)
}

function rebuildMarkers() {
  if (!map) return

  markers.forEach(m => m.remove())
  markers = []

  if (activeDataset.value === 'project-grants') {
    const data = isMobile.value
      ? projectsData.value.slice(0, 60)
      : projectsData.value

    data.forEach((project) => {
      if (!isValidCoordinate(project.latitude, project.longitude)) return

      const el = createProjectMarkerElement(project)
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: isMobile.value ? '260px' : '300px',
        className: 'cyberpunk-popup',
        offset: 15,
      }).setHTML(buildProjectPopupHTML(project))

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([project.longitude, project.latitude])
        .setPopup(popup)
        .addTo(map!)

      markers.push(marker)
    })
  } else if (activeDataset.value === 'endangered-species' && speciesData.value.length) {
    const data = isMobile.value
      ? speciesData.value.slice(0, 80)
      : speciesData.value

    data.forEach((species) => {
      if (!isValidCoordinate(species.lat, species.lng)) return

      const el = createSpeciesMarkerElement(species)
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '340px',
        className: 'cyberpunk-popup',
        offset: 10,
      }).setHTML(buildSpeciesPopupHTML(species))

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([species.lng, species.lat])
        .setPopup(popup)
        .addTo(map!)

      markers.push(marker)
    })
  }

  updateMarkerVisibility()
}

function addConnections() {
  if (!map) return

  if (map.getLayer('connections-layer')) map.removeLayer('connections-layer')
  if (map.getSource('connections-source')) map.removeSource('connections-source')

  if (activeDataset.value !== 'project-grants') return

  const maxConnectionsPerProject = isMobile.value ? 2 : 3
  const projectsToProcess = isMobile.value
    ? projectsData.value.slice(0, Math.min(15, projectsData.value.length))
    : projectsData.value

  const features: any[] = []
  const usedAsTarget = new Set<string>()

  projectsToProcess.forEach(project => {
    if (!isValidCoordinate(project.latitude, project.longitude)) return
    const availableTargets = projectsToProcess.filter(
      p => p.project_title !== project.project_title &&
           isValidCoordinate(p.latitude, p.longitude) &&
           !usedAsTarget.has(p.project_title)
    )
    if (availableTargets.length === 0) return

    const targetsWithDistance = availableTargets.map(target => ({
      project: target,
      distance: calculateDistance(project.latitude!, project.longitude!, target.latitude!, target.longitude!)
    })).sort((a, b) => b.distance - a.distance)

    const connectionsToMake = Math.min(maxConnectionsPerProject, targetsWithDistance.length)
    for (let i = 0; i < connectionsToMake; i++) {
      const targetData = targetsWithDistance[i]
      if (targetData && !usedAsTarget.has(targetData.project.project_title)) {
        const controlPoint = generateCurvedPath(
          [project.longitude, project.latitude],
          [targetData.project.longitude!, targetData.project.latitude!]
        )
        const color = getProjectColorByBeneficiaries(
          project.direct_beneficiaries || 1000,
          project.indirect_beneficiaries || 1000
        )

        features.push({
          type: 'Feature',
          properties: { color },
          geometry: {
            type: 'LineString',
            coordinates: [
              [project.longitude, project.latitude],
              controlPoint,
              [targetData.project.longitude!, targetData.project.latitude!]
            ]
          }
        })
        usedAsTarget.add(targetData.project.project_title)
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
      'line-opacity': 0.25,
      'line-dasharray': [0.5, 2.5]
    }
  })

  ;(map as any)._connectionFeatures = features
}

async function startParticles() {
  if (!isMounted) return
  if (!map || !containerRef.value) return
  const features = (map as any)._connectionFeatures
  if (!features || features.length === 0) return

  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  particleElements.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el)
  })
  particleElements = []
  particles = []

  const particlePoolSize = isMobile.value ? 25 : 40
  particleElements = []

  for (let i = 0; i < particlePoolSize; i++) {
    const element = document.createElement('div')
    element.style.position = 'absolute'
    element.style.width = '3px'
    element.style.height = '3px'
    element.style.borderRadius = '50%'
    element.style.backgroundColor = '#ffffff'
    element.style.pointerEvents = 'none'
    element.style.zIndex = '1000'
    element.style.opacity = '0'
    element.style.willChange = 'left, top, opacity'
    containerRef.value.appendChild(element)
    particleElements.push(element)
  }

  function createParticle(feature: any, element: HTMLDivElement) {
    if (!map || !containerRef.value) return
    const coords = feature.geometry.coordinates
    const from = coords[0]
    const to = coords[coords.length - 1]
    const color = feature.properties.color || '#ffffff'

    element.style.backgroundColor = color
    element.style.boxShadow = `0 0 4px ${color}`
    element.style.opacity = '0.9'

    const pixelCoords = map.project(from)
    element.style.left = `${pixelCoords.x}px`
    element.style.top = `${pixelCoords.y}px`

    particles.push({
      element,
      from,
      to,
      progress: 0,
      speed: 0.003 + Math.random() * 0.006,
    })
  }

  let lastTime = 0
  const throttleInterval = 16

  function animate(timestamp: number) {
    if (!isMounted) return
    if (!map) return
    animationFrameId = requestAnimationFrame(animate)

    if (timestamp - lastTime < throttleInterval) return
    lastTime = timestamp

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.progress += p.speed

      if (p.progress >= 1) {
        if (p.element) p.element.style.opacity = '0'
        particles.splice(i, 1)
        continue
      }

      const t = p.progress
      const lng = p.from[0] + (p.to[0] - p.from[0]) * t
      const lat = p.from[1] + (p.to[1] - p.from[1]) * t

      try {
        const pixelCoords = map.project([lng, lat])
        if (p.element) {
          p.element.style.left = `${pixelCoords.x}px`
          p.element.style.top = `${pixelCoords.y}px`
          const fadeStart = 0.8
          const opacity = t < fadeStart ? 0.9 : 0.9 * (1 - (t - fadeStart) / (1 - fadeStart))
          p.element.style.opacity = String(opacity)
        }
      } catch {
        if (p.element) p.element.style.opacity = '0'
        particles.splice(i, 1)
      }
    }

    if (particles.length < particlePoolSize * 0.6 && Math.random() < 0.08) {
      const unusedElement = particleElements.find(el => !particles.some((p: any) => p.element === el))
      if (unusedElement) {
        const feat = features[Math.floor(Math.random() * features.length)]
        if (feat) createParticle(feat, unusedElement)
      }
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

function setupHexGrid() {
  const canvas = hexCanvasRef.value
  if (!canvas) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  const hexSize = isMobile.value ? 30 : 45
  const hexHeight = hexSize * Math.sqrt(3)
  const hexWidth = hexSize * 2
  const hexVerticalOffset = hexHeight * 0.75
  const hexHorizontalOffset = hexWidth * 0.5
  const columns = Math.ceil(window.innerWidth / hexHorizontalOffset) + 1
  const rows = Math.ceil(window.innerHeight / hexVerticalOffset) + 1

  ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)'
  ctx.lineWidth = 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * hexHorizontalOffset
      const y = row * hexVerticalOffset + (col % 2 === 0 ? 0 : hexHeight / 2)
      if (x < -hexWidth || x > window.innerWidth + hexWidth || y < -hexHeight || y > window.innerHeight + hexHeight) continue

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
  }, 200)
}

if (typeof document !== 'undefined' && !document.getElementById('globe-styles')) {
  const style = document.createElement('style')
  style.id = 'globe-styles'
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0; }
      50% { transform: scale(1.1); opacity: 0.4; }
      100% { transform: scale(0.95); opacity: 0; }
    }
    .maplibregl-popup-content {
      background: rgba(0, 0, 0, 0.92) !important;
      border-radius: 6px;
      border: 1px solid rgba(6, 182, 212, 0.4);
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.25), inset 0 0 10px rgba(6, 182, 212, 0.08);
      padding: 14px !important;
      min-width: 180px;
    }
    .cyber-popup-species {
      background: rgba(0, 0, 0, 0.95) !important;
      border-color: rgba(6, 182, 212, 0.5) !important;
      box-shadow: 0 0 25px rgba(6, 182, 212, 0.3), inset 0 0 12px rgba(6, 182, 212, 0.1) !important;
    }
    .maplibregl-popup-tip {
      border-top-color: rgba(6, 182, 212, 0.7);
      border-bottom-color: rgba(6, 182, 212, 0.7);
    }
    .maplibregl-popup-close-button {
      color: rgba(6, 182, 212, 0.7);
      font-size: 18px;
      padding: 0 5px;
      background: transparent;
      border: none;
    }
    .maplibregl-popup-close-button:hover {
      background-color: rgba(6, 182, 212, 0.15);
      color: rgba(6, 182, 212, 1);
    }
    .maplibregl-ctrl-bottom-right {
      margin-bottom: 5px;
      margin-right: 5px;
    }
    .maplibregl-ctrl-attrib-inner {
      color: rgba(255, 255, 255, 0.6);
      font-size: 10px;
      background-color: rgba(0, 0, 0, 0.6) !important;
    }
    .maplibregl-ctrl-attrib-inner a {
      color: rgba(6, 182, 212, 0.7);
      text-decoration: none;
    }
    .maplibregl-map {
      background-color: transparent !important;
    }
    .globe-marker-item {
      will-change: transform;
      transform: translateZ(0);
    }
    .star-field {
      position: absolute;
      inset: 0;
      z-index: 0;
      background: #000;
    }
    .star-field::before,
    .star-field::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-repeat: repeat;
    }
    .star-field::before {
      background-image:
        radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1.5px 1.5px at 40% 10%, rgba(255,255,255,1), transparent),
        radial-gradient(1px 1px at 55% 45%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.8), transparent),
        radial-gradient(1.5px 1.5px at 85% 55%, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 15% 70%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 30% 85%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1.5px 1.5px at 50% 65%, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 65% 80%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 80% 90%, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 95% 40%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1.5px 1.5px at 5% 50%, rgba(255,255,255,1), transparent),
        radial-gradient(1px 1px at 20% 25%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 45% 90%, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 60% 5%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1.5px 1.5px at 75% 35%, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 90% 75%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 50% 30%, rgba(255,255,255,0.8), transparent);
      background-size: 200px 200px;
      animation: twinkle 4s ease-in-out infinite alternate;
    }
    .star-field::after {
      background-image:
        radial-gradient(1px 1px at 12% 22%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1.5px 1.5px at 28% 48%, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 42% 8%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1px 1px at 58% 52%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1.5px 1.5px at 72% 18%, rgba(255,255,255,1), transparent),
        radial-gradient(1px 1px at 88% 62%, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 8% 78%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 38% 92%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1.5px 1.5px at 52% 38%, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 68% 72%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 82% 88%, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 98% 32%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1.5px 1.5px at 18% 58%, rgba(255,255,255,1), transparent),
        radial-gradient(1px 1px at 32% 12%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1px 1px at 48% 82%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 62% 28%, rgba(255,255,255,0.9), transparent),
        radial-gradient(1.5px 1.5px at 78% 42%, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 92% 68%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 22% 95%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1px 1px at 55% 15%, rgba(255,255,255,0.5), transparent);
      background-size: 250px 250px;
      animation: twinkle 5s ease-in-out infinite alternate-reverse;
    }
    @keyframes twinkle {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.7; }
    }
  `
  document.head.appendChild(style)
}

onMounted(() => {
  initMap()
  window.addEventListener('resize', debouncedSetupHexGrid)
})

onUnmounted(() => {
  isMounted = false
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (markerVisibilityCheckTimer) clearInterval(markerVisibilityCheckTimer)
  if (hexGridDebounceTimer) clearTimeout(hexGridDebounceTimer)
  particleElements.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el)
  })
  markers.forEach(m => m.remove())
  if (map) {
    map.remove()
    map = null
  }
  window.removeEventListener('resize', debouncedSetupHexGrid)
})

defineExpose({ initMap })
</script>
