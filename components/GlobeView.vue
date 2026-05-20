<template>
  <div class="w-full h-screen relative overflow-hidden">
    <!-- Background effects -->
    <div class="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-cyan-900/20 pointer-events-none z-10"></div>
    <div class="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-purple-900/20 pointer-events-none z-10"></div>
    <div class="absolute inset-0 pointer-events-none z-20" style="box-shadow: inset 0 0 150px 20px rgba(0,0,0,0.7)"></div>

    <!-- Hex grid overlay -->
    <UiOverlayImage
      v-if="showHexGrid"
      src="/grid-overlay.png"
      alt="Grid Overlay"
      :width="1920"
      :height="1080"
      class="absolute inset-0 pointer-events-none z-[450] opacity-5"
    />

    <!-- Noise overlay -->
    <UiOverlayImage
      src="/noise.png"
      alt="Noise Texture"
      :width="512"
      :height="512"
      class="absolute inset-0 pointer-events-none z-30 opacity-[0.05] animate-noise-bg"
      :style="{ backgroundRepeat: 'repeat' }"
    />

    <!-- Scanline overlay -->
    <UiOverlayImage
      src="/scanline.gif"
      alt="Scanline Effect"
      :width="512"
      :height="512"
      class="absolute inset-0 pointer-events-none opacity-[0.01] z-40"
    />

    <!-- Map container -->
    <div ref="containerRef" class="w-full h-full" />

    <!-- White Banner -->
    <div v-if="isMobile" class="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none px-2" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img src="/white-banner.png" alt="Earth Guardians" class="h-auto w-auto max-h-[12vh] max-w-[240px] object-contain" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img src="/white-banner.png" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[180px] -rotate-90 origin-center" />
    </div>

    <!-- Controls - 2D/3D toggle -->
    <div class="absolute top-4 left-4 z-[600]">
      <div class="panel-cyber rounded-lg p-2">
        <div class="flex items-center gap-2">
          <NuxtLink
            :to="datasetBaseRoute"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-black/50 text-cyan-400 hover:bg-cyan-950/30"
          >
            2D Map
          </NuxtLink>
          <button
            class="px-3 py-1.5 rounded-md text-sm font-medium bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            disabled
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

    <!-- Error state -->
    <div v-if="hasError" class="w-full h-screen bg-black flex flex-col items-center justify-center text-white">
      <div class="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-orange-600 animate-pulse mb-6"></div>
      <h2 class="text-xl font-bold mb-2">Unable to Load Visualization</h2>
      <p class="text-gray-300 mb-4">The component could not be loaded.</p>
      <div class="flex space-x-4">
        <button @click="() => { hasError = false; initMap() }" class="px-4 py-2 bg-black bg-opacity-70 rounded border border-purple-500/50 text-purple-400 hover:bg-purple-900/30 transition-colors">
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type maplibregl from 'maplibre-gl'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { allProjectsData } from '@/lib/project-data'
import type { ProjectData } from '@/lib/types'
import type { Species } from '@/composables/useSpeciesData'
import { isValidCoordinate, generateCurvedPath, calculateDistance, GROUP_COLORS, escapeHtml } from '@/lib/map-utils'
import { getProjectColorByBeneficiaries } from '@/lib/colors'

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

// Base route for dataset navigation
const datasetBaseRoute = computed(() => {
  return activeDataset.value === 'project-grants' ? '/project-grants' : '/endangered-species'
})

const isMobile = useMediaQuery('(max-width: 768px)')
const containerRef = ref<HTMLDivElement | null>(null)
const hasError = ref(false)
const activeDataset = ref<'project-grants' | 'endangered-species'>(props.defaultDataset)

let map: maplibregl.Map | null = null
let markers: maplibregl.Marker[] = []
let connectionsRef: { id: string }[] = []
let animationFrameId: number | null = null
let particles: any[] = []
let particleElements: HTMLDivElement[] = []
let isMounted = true

const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''

const MAP_STYLE = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

async function initMap() {
  if (typeof window === 'undefined' || !containerRef.value) return

  try {
    const maplibregl = await import('maplibre-gl')

    // Add CSS if not already present
    if (!document.querySelector('link[href*="maplibre-gl"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.css'
      document.head.appendChild(link)
    }

    map = new maplibregl.default.Map({
      container: containerRef.value,
      style: MAP_STYLE,
      zoom: isMobile.value ? 1.8 : 3,
      center: [0, 0],
      attributionControl: false,
      renderWorldCopies: false,
    })

    map.addControl(
      new maplibregl.default.AttributionControl({
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

function buildProjectPopupHTML(project: ProjectData): string {
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)
  return `
    <div class="cyber-popup-content" data-type="project">
      <div style="border-bottom: 1px solid rgba(6,182,212,0.3); padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="font-weight: bold; font-size: 1.125rem; background: linear-gradient(to right, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">
          ${escapeHtml(project.project_title)}
        </h3>
        <span style="display: inline-block; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; color: white; background-color: ${color}; padding: 2px 8px; border-radius: 9999px;">
          PROJECT GRANTEE
        </span>
      </div>
      <div style="margin-top: 12px; font-size: 0.875rem; color: #d1d5db;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span>&#x1F4CD;</span><span>${escapeHtml(project.country_province || 'Unknown location')}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span>&#x1F465;</span><span>Direct Beneficiaries: ${project.direct_beneficiaries.toLocaleString()}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>&#x1F465;</span><span>Indirect Beneficiaries: ${project.indirect_beneficiaries.toLocaleString()}</span>
        </div>
      </div>
    </div>
  `
}

function buildSpeciesPopupHTML(species: Species): string {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64032'
  return `
    <div class="cyber-popup-content cyber-popup-species" data-type="species">
      <div style="border-bottom: 1px solid rgba(6,182,212,0.3); padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="font-weight: bold; font-size: 1.125rem; background: linear-gradient(to right, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px;">
          ${escapeHtml(species.commonName)}
        </h3>
        <p style="font-style: italic; font-size: 0.875rem; color: #a3a3a3; margin-bottom: 4px;">${escapeHtml(species.scientificName)}</p>
        <span style="display: inline-block; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; color: white; background-color: ${color}; padding: 2px 8px; border-radius: 9999px;">
          ${escapeHtml(species.category)}
        </span>
        <span style="display: inline-block; margin-left: 6px; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; color: ${color}; padding: 2px 8px; border-radius: 9999px; border: 1px solid ${color};">
          ${escapeHtml(species.taxonomicGroup)}
        </span>
      </div>
      <div style="margin-top: 12px; font-size: 0.875rem; color: #d1d5db;">
        <p style="margin-bottom: 8px; line-height: 1.5;"><strong style="color: #22d3ee;">Region:</strong> ${escapeHtml(species.region)}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #22d3ee;">Ecosystem:</strong> ${escapeHtml(species.ecosystem)}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #22d3ee;">Threats:</strong> ${species.threatTypes.map(escapeHtml).join(', ')}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #ef4444;">Why endangered:</strong> ${escapeHtml(species.endangerment)}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #10b981;">Ecosystem needs:</strong> ${escapeHtml(species.ecosystemNeeds)}</p>
        <p><strong style="color: #f59e0b;">How to help:</strong> ${escapeHtml(species.actions)}</p>
      </div>
    </div>
  `
}

function createProjectMarkerElement(project: ProjectData): HTMLElement {
  const beneficiaryFactor = Math.min(Math.max(project.indirect_beneficiaries / 10000, 0.5), 5)
  const markerSize = (15 + beneficiaryFactor * 10) * (isMobile.value ? 0.7 : 1)
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)

  const el = document.createElement('div')
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
  innerWrapper.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
  innerWrapper.style.border = `2px solid ${color}`
  innerWrapper.style.boxShadow = `0 0 ${beneficiaryFactor * 15}px ${color}, 0 0 ${beneficiaryFactor * 3}px #fff`
  innerWrapper.style.display = 'flex'
  innerWrapper.style.justifyContent = 'center'
  innerWrapper.style.alignItems = 'center'
  innerWrapper.style.position = 'relative'
  innerWrapper.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease'
  el.appendChild(innerWrapper)

  const pulseWrapper = document.createElement('div')
  pulseWrapper.style.position = 'absolute'
  pulseWrapper.style.width = `${markerSize * 1.5}px`
  pulseWrapper.style.height = `${markerSize * 1.5}px`
  pulseWrapper.style.borderRadius = '50%'
  pulseWrapper.style.opacity = '0'
  pulseWrapper.style.backgroundColor = color
  pulseWrapper.style.animation = 'pulse 2s infinite'
  pulseWrapper.style.zIndex = '-1'
  innerWrapper.appendChild(pulseWrapper)

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
    pulseWrapper.style.opacity = '0.5'
    el.style.zIndex = '10'
  })
  el.addEventListener('mouseleave', () => {
    innerWrapper.style.transform = 'scale(1)'
    innerWrapper.style.boxShadow = `0 0 ${beneficiaryFactor * 15}px ${color}, 0 0 ${beneficiaryFactor * 3}px #fff`
    pulseWrapper.style.opacity = '0'
    el.style.zIndex = '1'
  })

  return el
}

function createSpeciesMarkerElement(species: Species): HTMLElement {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64030'
  const markerSize = 14 * (isMobile.value ? 0.7 : 1)

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
      const popup = new maplibregl.default.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: isMobile.value ? '280px' : '320px',
        className: 'cyberpunk-popup',
      }).setHTML(buildProjectPopupHTML(project))

      const marker = new maplibregl.default.Marker({ element: el })
        .setLngLat([project.longitude, project.latitude])
        .setPopup(popup)
        .addTo(map!)

      markers.push(marker)
    })
  } else if (activeDataset.value === 'endangered-species' && speciesData.value.length) {
    speciesData.value.forEach((species) => {
      const el = createSpeciesMarkerElement(species)
      const popup = new maplibregl.default.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: '380px',
        className: 'cyberpunk-popup',
      }).setHTML(buildSpeciesPopupHTML(species))

      const marker = new maplibregl.default.Marker({ element: el })
        .setLngLat([species.lng, species.lat])
        .setPopup(popup)
        .addTo(map!)

      markers.push(marker)
    })
  }
}

function addConnections() {
  if (!map || activeDataset.value !== 'project-grants' || !projectsData.value.length) {
    // Clear existing connections if not project grants
    connectionsRef.forEach(conn => {
      if (!map) return
      if (map.getLayer(conn.id)) map.removeLayer(conn.id)
      if (map.getSource(conn.id)) map.removeSource(conn.id)
    })
    connectionsRef = []
    return
  }

  const maxConnectionsPerProject = isMobile.value ? 2 : 3
  const projectsToProcess = isMobile.value ? projectsData.value.slice(0, Math.min(15, projectsData.value.length)) : projectsData.value
  const newConnections: any[] = []
  const usedAsTarget = new Set<string>()

  projectsToProcess.forEach(project => {
    if (project.latitude === undefined || project.latitude === null || project.longitude === undefined || project.longitude === null) return
    const availableTargets = projectsToProcess.filter(
      p => p.project_title !== project.project_title && isValidCoordinate(p.latitude, p.longitude) && !usedAsTarget.has(p.project_title)
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
        newConnections.push({
          from: [project.longitude, project.latitude] as [number, number],
          to: [targetData.project.longitude!, targetData.project.latitude!] as [number, number],
          from_project_indirect_beneficiaries: project.indirect_beneficiaries || 1000,
          from_project_direct_beneficiaries: project.direct_beneficiaries || 1000,
        })
        usedAsTarget.add(targetData.project.project_title)
      }
    }
  })

  // Clear old connections
  connectionsRef.forEach(conn => {
    if (!map) return
    if (map.getLayer(conn.id)) map.removeLayer(conn.id)
    if (map.getSource(conn.id)) map.removeSource(conn.id)
  })
  connectionsRef = []

  // Add new connections
  newConnections.forEach((connection, index) => {
    if (!map) return
    const connectionId = `connection-${index}`
    const controlPoint = generateCurvedPath(connection.from, connection.to)
    const color = getProjectColorByBeneficiaries(connection.from_project_direct_beneficiaries, connection.from_project_indirect_beneficiaries)

    map.addSource(connectionId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [connection.from, controlPoint, connection.to]
        }
      }
    })

    map.addLayer({
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

    connectionsRef.push({ id: connectionId })
  })

  // Store for particles
  ;(map as any)._connections = newConnections
}

async function startParticles() {
  if (!isMounted) return
  if (!map || !containerRef.value) return
  const connections = (map as any)._connections
  if (!connections || connections.length === 0) return

  // Cancel existing animation and clean up old particles
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  particleElements.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el)
  })
  particleElements = []
  particles = []

  const particlePoolSize = 50
  particleElements = []

  // Create particle elements
  for (let i = 0; i < particlePoolSize; i++) {
    const element = document.createElement('div')
    element.style.position = 'absolute'
    element.style.width = '4px'
    element.style.height = '4px'
    element.style.borderRadius = '50%'
    element.style.backgroundColor = '#ffffff'
    element.style.pointerEvents = 'none'
    element.style.zIndex = '1000'
    element.style.opacity = '0'
    element.style.transition = 'opacity 0.3s ease'
    containerRef.value.appendChild(element)
    particleElements.push(element)
  }

  function createParticle(connection: any, element: HTMLDivElement) {
    if (!map || !containerRef.value) return
    const controlPoint = generateCurvedPath(connection.from, connection.to)
    const color = getProjectColorByBeneficiaries(connection.from_project_direct_beneficiaries, connection.from_project_indirect_beneficiaries)

    element.style.backgroundColor = color
    element.style.boxShadow = `0 0 6px ${color}`
    element.style.opacity = '1'

    const pixelCoords = map.project(connection.from)
    element.style.left = `${pixelCoords.x}px`
    element.style.top = `${pixelCoords.y}px`

    const targetPoint = Math.random() < 0.5 ? controlPoint : connection.to

    particles.push({
      element,
      currentPoint: [...connection.from] as [number, number],
      targetPoint: targetPoint as [number, number],
      speed: 0.1 + Math.random() * 0.3,
    })
  }

  function animate() {
    if (!isMounted) return
    if (!map) return
    animationFrameId = requestAnimationFrame(animate)

    // Process existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      const dx = p.targetPoint[0] - p.currentPoint[0]
      const dy = p.targetPoint[1] - p.currentPoint[1]
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > p.speed) {
        p.currentPoint[0] += (dx / distance) * p.speed
        p.currentPoint[1] += (dy / distance) * p.speed

        const pixelCoords = map.project(p.currentPoint)
        if (p.element) {
          p.element.style.left = `${pixelCoords.x}px`
          p.element.style.top = `${pixelCoords.y}px`
        }
      } else {
        if (p.element) p.element.style.opacity = '0'
        particles.splice(i, 1)
      }
    }

    // Create new particles
    if (particles.length < particlePoolSize * 0.7 && Math.random() < 0.1) {
      const unusedElement = particleElements.find(el => !particles.some((p: any) => p.element === el))
      if (unusedElement) {
        const conn = connections[Math.floor(Math.random() * connections.length)]
        if (conn) createParticle(conn, unusedElement)
      }
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

// Add pulse keyframe
if (typeof document !== 'undefined' && !document.getElementById('globe-pulse-style')) {
  const style = document.createElement('style')
  style.id = 'globe-pulse-style'
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0; }
      50% { transform: scale(1.1); opacity: 0.4; }
      100% { transform: scale(0.95); opacity: 0; }
    }
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
      border: none;
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
  `
  document.head.appendChild(style)
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  isMounted = false
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  particleElements.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el)
  })
  markers.forEach(m => m.remove())
  connectionsRef.forEach(conn => {
    if (!map) return
    if (map.getLayer(conn.id)) map.removeLayer(conn.id)
    if (map.getSource(conn.id)) map.removeSource(conn.id)
  })
  if (map) {
    map.remove()
    map = null
  }
})

defineExpose({ initMap })
</script>
