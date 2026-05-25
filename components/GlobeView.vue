<template>
  <div class="w-full h-screen relative overflow-hidden bg-black" role="main" aria-label="3D Globe Visualization">
    <!-- Loading skeleton -->
    <Transition name="fade">
      <div v-if="isLoading" class="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
        <div class="relative mb-5 xs:mb-6">
          <div class="w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <div class="absolute inset-0 w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/10 border-b-white/50 animate-spin" style="animation-delay: 0.5s; animation-direction: reverse" />
          <div class="absolute inset-0 flex items-center justify-center">
            <Icon name="lucide:globe" class="w-7 h-7 xs:w-8 xs:h-8 text-white/70 animate-pulse" />
          </div>
        </div>
        <p class="text-white font-medium mb-1.5 xs:mb-2 text-sm xs:text-base">{{ t('globe.loading') }}</p>
        <p class="text-gray-500 text-xs xs:text-sm">{{ t('globe.preparingData', { dataset: activeDataset === 'project-grants' ? t('home.projectGrants').toLowerCase() : t('home.species').toLowerCase() }) }}</p>
        <div class="mt-3 xs:mt-4 flex gap-1">
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay: 0ms" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay: 150ms" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay: 300ms" />
        </div>
      </div>
    </Transition>

    <!-- Star field background -->
    <div class="star-field" aria-hidden="true"></div>

    <!-- Black void overlay for globe edges -->
    <div class="absolute inset-0 pointer-events-none z-10 bg-black/20"></div>

    <!-- Subtle radial glow behind globe -->
    <div class="absolute inset-0 pointer-events-none z-10 bg-black/5 dark:bg-white/5"></div>

    <!-- Atmospheric glow effect -->
    <div class="absolute inset-0 pointer-events-none z-10">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-black/5 dark:bg-white/5 blur-3xl animate-pulse-slow" />
    </div>

    <!-- Vignette -->
    <div class="absolute inset-0 pointer-events-none z-20" style="box-shadow: inset 0 0 150px 30px rgba(0,0,0,0.7)"></div>

    <!-- Grid overlay with image-set for 2x resolution -->
    <div
      class="absolute inset-0 pointer-events-none opacity-[0.03]"
      :style="{
        zIndex: 'calc(var(--z-map-effects) + 1)',
        backgroundImage: `image-set(url(${baseURL}grid-overlay.png) 1x, url(${baseURL}grid-overlay.png) 2x)`,
        backgroundRepeat: 'repeat',
      }"
    />

    <!-- Noise overlay with image-set for 2x resolution -->
    <div
      class="absolute inset-0 pointer-events-none opacity-[0.02] animate-noise-bg"
      :style="{
        zIndex: 'calc(var(--z-map-effects) + 2)',
        backgroundImage: `image-set(url(${baseURL}noise.png) 1x, url(${baseURL}noise.png) 2x)`,
        backgroundRepeat: 'repeat',
      }"
    />

    <!-- Scanline overlay with image-set for 2x resolution -->
    <div
      class="absolute inset-0 pointer-events-none opacity-[0.015]"
      :style="{
        zIndex: 'calc(var(--z-map-effects) + 3)',
        backgroundImage: `image-set(url(${baseURL}scanline.gif) 1x, url(${baseURL}scanline.gif) 2x)`,
        backgroundRepeat: 'repeat',
      }"
    />

    <!-- Hex grid overlay -->
    <canvas
      v-if="isHexGridVisible"
      ref="hexCanvasRef"
      class="absolute inset-0 w-full h-full pointer-events-none opacity-15"
      :style="{ zIndex: 'var(--z-map-hex-grid)' }"
    />

    <!-- Map container -->
    <div ref="containerRef" class="w-full h-full" />

    <!-- White Banner - Mobile optimized -->
    <div v-if="isMobile" class="absolute top-2 xs:top-3 left-1/2 -translate-x-1/2 pointer-events-none px-2" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[180px] xs:max-w-[240px] object-contain" loading="lazy" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[180px] -rotate-90 origin-center" loading="lazy" />
    </div>

    <!-- Data Bubble: species groups or project stats -->
    <DataBubble
      :mode="activeDataset === 'endangered-species' ? 'species' : 'projects'"
      :projects="projectsData"
      position-top="clamp(14rem, 35vh, 19rem)"
    />

    <!-- Map Controls -->
    <MapControls
      :is-globe-view="true"
      :show-hex-grid="isHexGridVisible"
      :show-connections="showConnections"
      :dataset="activeDataset"
      :projects="activeDataset === 'project-grants' ? projectsData : undefined"
      :species="activeDataset === 'endangered-species' ? speciesData : undefined"
      :style="{ zIndex: 'var(--z-map-ui-controls)' }"
      @toggle-hex-grid="isHexGridVisible = !isHexGridVisible"
      @toggle-connections="toggleConnections"
      @navigate="navigateToLocation"
    />

    <!-- Error state -->
    <Transition name="fade">
      <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[2000]">
        <div class="relative mb-5 xs:mb-6">
          <div class="w-14 h-14 xs:w-16 xs:h-16 rounded-full bg-[var(--text-primary)]/10 animate-pulse" />
          <Icon name="lucide:alert-triangle" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 xs:h-8 xs:w-8 text-[var(--text-primary)]" />
        </div>
        <h2 class="text-lg xs:text-xl font-bold mb-1.5 xs:mb-2">{{ t('globe.unableToLoad') }}</h2>
        <p class="text-gray-400 mb-4 text-center px-4 xs:px-4 max-w-xs xs:max-w-md text-sm xs:text-base">{{ errorMessage || t('globe.connectionError') }}</p>
        <button v-if="!noWebglSupport" @click="() => { hasError = false; initMap() }" class="px-5 xs:px-6 py-2 xs:py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-medium hover:opacity-80 transition-all duration-300 flex items-center gap-2 text-sm xs:text-base">
          <Icon name="lucide:refresh-cw" class="h-4 w-4" />
          {{ t('globe.tryAgain') }}
        </button>
      </div>
    </Transition>

    <!-- Detached fullscreen species popup overlay -->
    <div v-if="showSpeciesOverlay" class="species-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Species details" @click.self="closeSpeciesOverlay" @keydown.esc="closeSpeciesOverlay">
      <button ref="speciesCloseBtnRef" class="species-popup-close-btn-fixed" @click="closeSpeciesOverlay" aria-label="Close species details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="species-popup-content-fixed" v-html="speciesOverlayHTML"></div>
    </div>

    <!-- Detached fullscreen project popup overlay -->
    <div v-if="showProjectOverlay" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Project details" @click.self="closeProjectOverlay" @keydown.esc="closeProjectOverlay">
      <button ref="projectCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeProjectOverlay" aria-label="Close project details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="project-popup-content-fixed" v-html="projectOverlayHTML"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useI18n } from '@/composables/useI18n'
import { allProjectsData } from '@/lib/project-data'
import type { ProjectData } from '@/lib/types'
import { isValidCoordinate, GROUP_COLORS, buildProjectPopupHTML, buildSpeciesPopupHTML } from '@/lib/map-utils'
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import type { Species } from '@/lib/map-utils'
import {
  buildMapConnectionFeatures,
  createMapParticleSystem,
  syncMapConnectionLayers,
  type MapConnectionFeature,
  type MapParticleSystem,
} from '@/lib/map-effects'
import {
  getMarkerImageUrl,
  preloadSpeciesImages,
  clearImageCache,
  getMarkerPlaceholder,
  getProjectPlaceholder,
} from '@/lib/image-utils'
import { useMapCluster } from '@/composables/useMapCluster'
import { MAX_CLUSTER_SIZE, type ClusterPoint, type ClusterItem } from '@/composables/useMapCluster'
import {
  useGeoJSONMarkers,
  speciesIndexToGeoJSON,
  projectsToGeoJSON,
  type SpeciesIndexItem,
} from '@/composables/useGeoJSONMarkers'

const { t, locale } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

function getLocalizedSpecies(species: Species): Species {
  const content = species.content?.[locale.value] ?? species.content?.en
  if (!content) return species

  return {
    ...species,
    description: content.description ?? species.description,
    endangerment: content.endangerment ?? species.endangerment,
    ecosystemNeeds: content.ecosystemNeeds ?? species.ecosystemNeeds,
    actions: content.actions ?? species.actions,
    region: content.region ?? species.region,
  }
}

function getTaxonomicGroupLabels() {
  return Object.keys(GROUP_COLORS).reduce<Record<string, string>>((labels, group) => {
    labels[group] = t(`taxonomy.${group}`)
    return labels
  }, {})
}

interface Props {
  projects?: ProjectData[]
  species?: Species[]
  speciesIndex?: SpeciesIndexItem[]  // Lightweight index for markers
  showHexGrid?: boolean
  defaultDataset?: 'project-grants' | 'endangered-species'
}

const props = withDefaults(defineProps<Props>(), {
  showHexGrid: true,
  defaultDataset: 'project-grants',
})

const projectsData = computed(() => props.projects || allProjectsData)
const speciesData = computed(() => props.species || [])
const speciesIndexData = computed(() => props.speciesIndex || [])



const isMobile = useMediaQuery('(max-width: 768px)')
const containerRef = ref<HTMLDivElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
const hasError = ref(false)
const errorMessage = ref('')
const noWebglSupport = ref(false)
const isLoading = ref(true)
const activeDataset = ref<'project-grants' | 'endangered-species'>(props.defaultDataset)
const isHexGridVisible = ref(props.showHexGrid)
const showConnections = ref(true)
const showSpeciesOverlay = ref(false)
const speciesOverlayHTML = ref('')
const showProjectOverlay = ref(false)
const projectOverlayHTML = ref('')

let map: maplibregl.Map | null = null
let markers: maplibregl.Marker[] = []
let isMounted = true
let pendingVisibilityUpdate = false
let pendingClusterRebuild = false
const speciesCloseBtnRef = ref<HTMLElement | null>(null)
const projectCloseBtnRef = ref<HTMLElement | null>(null)
let lastFocusedEl: HTMLElement | null = null
let connectionFeatures: MapConnectionFeature[] = []
let particleSystem: MapParticleSystem | null = null
let rotationAnimationId: number | null = null
let isUserInteracting = false
let interactionTimeout: ReturnType<typeof setTimeout> | null = null
const clusterer = useMapCluster()
const geoJSONMarkers = useGeoJSONMarkers()
let lastClusterZoom = -1
let lastBboxCenter: { lng: number; lat: number } | null = null
function openSpeciesOverlay(species: Species) {
  const localizedSpecies = getLocalizedSpecies(species)
  const speciesPopupTranslations = {
    scientificName: t('species.scientificName'),
    threatTypes: t('species.threatTypes'),
    population: t('species.population'),
    habitat: t('species.habitat'),
    region: t('filter.region'),
    ecosystem: t('filter.ecosystem'),
    groupLabels: getTaxonomicGroupLabels()
  }
  speciesOverlayHTML.value = buildSpeciesPopupHTML(localizedSpecies, speciesPopupTranslations, baseURL)
  showSpeciesOverlay.value = true
  lastFocusedEl = document.activeElement as HTMLElement
  nextTick(() => speciesCloseBtnRef.value?.focus())
}

function closeSpeciesOverlay() {
  showSpeciesOverlay.value = false
  speciesOverlayHTML.value = ''
  nextTick(() => lastFocusedEl?.focus())
}

function openProjectOverlay(project: ProjectData) {
  const projectPopupTranslations = {
    projectGrantee: t('stats.projectGrantees'),
    directBeneficiaries: t('stats.directBeneficiaries'),
    indirectBeneficiaries: t('stats.indirectBeneficiaries'),
    location: t('project.location'),
    status: t('project.status'),
    unknownLocation: t('project.unknownLocation')
  }
  projectOverlayHTML.value = buildProjectPopupHTML(project, projectPopupTranslations)
  showProjectOverlay.value = true
  lastFocusedEl = document.activeElement as HTMLElement
  nextTick(() => projectCloseBtnRef.value?.focus())
}

function closeProjectOverlay() {
  showProjectOverlay.value = false
  projectOverlayHTML.value = ''
  nextTick(() => lastFocusedEl?.focus())
}

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
      headers: {} as Record<string, string>,
      method: 'GET' as const,
      type: 'image' as const,
      credentials: 'same-origin' as const,
      collectResourceTiming: false,
      _cachedResponse: cached,
    } as maplibregl.RequestParameters
  }
  return { url }
}

function startAutoRotate() {
  if (!map || rotationAnimationId !== null) return
  function rotate() {
    if (!map || !isMounted || isUserInteracting) {
      rotationAnimationId = null
      return
    }
    const center = map.getCenter()
    map.setCenter([center.lng - 0.15, center.lat])
    rotationAnimationId = requestAnimationFrame(rotate)
  }
  rotationAnimationId = requestAnimationFrame(rotate)
}

function stopAutoRotate() {
  if (rotationAnimationId !== null) {
    cancelAnimationFrame(rotationAnimationId)
    rotationAnimationId = null
  }
}

async function initMap() {
  if (typeof window === 'undefined' || !containerRef.value) return

  noWebglSupport.value = false
  isLoading.value = true

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
    } as maplibregl.MapOptions & { antialias?: boolean })

    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`
      })
    )

    map.on('style.load', () => {
      if (map) {
        try {
          map.setProjection({ type: 'globe' })
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Error setting globe projection:', e)
        }
      }
    })

    map.on('load', () => {
      isLoading.value = false
      rebuildMarkers()
      addConnections()
      startParticles()
      setupHexGrid()
      startMarkerVisibilityCheck()
      startAutoRotate()
    })

    map.on('mousedown', () => {
      isUserInteracting = true
      stopAutoRotate()
      if (interactionTimeout) clearTimeout(interactionTimeout)
    })

    map.on('dragstart', () => {
      isUserInteracting = true
      stopAutoRotate()
      if (interactionTimeout) clearTimeout(interactionTimeout)
    })

    map.on('dragend', () => {
      isUserInteracting = false
      if (interactionTimeout) clearTimeout(interactionTimeout)
      interactionTimeout = setTimeout(() => {
        if (!isUserInteracting) startAutoRotate()
      }, 3000)
    })

    map.on('scroll', () => {
      isUserInteracting = true
      stopAutoRotate()
      if (interactionTimeout) clearTimeout(interactionTimeout)
      interactionTimeout = setTimeout(() => {
        isUserInteracting = false
        startAutoRotate()
      }, 3000)
    })

    map.on('touchstart', () => {
      isUserInteracting = true
      stopAutoRotate()
      if (interactionTimeout) clearTimeout(interactionTimeout)
    })

    map.on('wheel', () => {
      isUserInteracting = true
      stopAutoRotate()
      if (interactionTimeout) clearTimeout(interactionTimeout)
      interactionTimeout = setTimeout(() => {
        isUserInteracting = false
        startAutoRotate()
      }, 3000)
    })

    function shouldRebuildClusters(): boolean {
      if (!map) return false
      const currentZoom = Math.floor(map.getZoom())
      if (currentZoom !== lastClusterZoom) return true
      const bounds = map.getBounds()
      const center = map.getCenter()
      const lngSpan = bounds.getEast() - bounds.getWest()
      const latSpan = bounds.getNorth() - bounds.getSouth()
      return (
        !lastBboxCenter ||
        Math.abs(center.lng - lastBboxCenter.lng) > lngSpan * 0.6 ||
        Math.abs(center.lat - lastBboxCenter.lat) > latSpan * 0.6
      )
    }

    map.on('move', () => {
      if (!pendingVisibilityUpdate) {
        pendingVisibilityUpdate = true
        requestAnimationFrame(() => {
          updateMarkerVisibility()
          pendingVisibilityUpdate = false
        })
      }
      if (!pendingClusterRebuild && map && shouldRebuildClusters()) {
        pendingClusterRebuild = true
        requestAnimationFrame(() => {
          rebuildMarkers()
          pendingClusterRebuild = false
        })
      }
    })

    map.on('moveend', () => {
      updateMarkerVisibility()
      if (map && shouldRebuildClusters()) {
        rebuildMarkers()
      }
    })

    let errorCount = 0
    let usedFallback = false

    map.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('MapLibre error:', err)
      errorCount++
      if (!usedFallback && errorCount >= 2 && MAP_STYLE.includes('maptiler.com')) {
        usedFallback = true
        // eslint-disable-next-line no-console
        console.warn('MapTiler style failed, falling back to demotiles style')
        map!.setStyle('https://demotiles.maplibre.org/style.json')
        return
      }
      if (!map?.loaded()) {
        isLoading.value = false
        hasError.value = true
        const errObj = err as { error?: { status?: number; message?: string } }
        if (errObj?.error?.status === 403) {
          errorMessage.value = 'MapTiler API key is invalid or restricted. Please update your API key in the .env file.'
        }
      }
    })

    // Timeout fallback for loading
    setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false
      }
    }, 10000)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load maplibre-gl:', err)
    isLoading.value = false
    hasError.value = true
  }
}

function getUnifiedMarkerMetrics(options: {
  color: string
  size: number
  centerScale?: number
  imageUrl?: string
  originalImageUrl?: string
  group?: string
}) {
  const hitSize = Math.max(34, Math.round(options.size + 12))
  const visualSize = Math.round(options.size)

  return {
    hitSize,
    visualSize,
    color: options.color,
    centerSize: Math.max(7, Math.round(visualSize * (options.centerScale ?? 0.42))),
    imageUrl: options.imageUrl,
    originalImageUrl: options.originalImageUrl,
    group: options.group,
  }
}

function createUnifiedMarkerElement(metrics: ReturnType<typeof getUnifiedMarkerMetrics>) {
  const el = document.createElement('div')
  el.className = 'globe-marker-item'
  el.style.width = `${metrics.hitSize}px`
  el.style.height = `${metrics.hitSize}px`
  el.style.display = 'flex'
  el.style.justifyContent = 'center'
  el.style.alignItems = 'center'
  el.style.cursor = 'pointer'
  el.style.pointerEvents = 'auto'
  el.style.zIndex = '10'

  const inner = document.createElement('div')
  inner.style.width = `${metrics.visualSize}px`
  inner.style.height = `${metrics.visualSize}px`
  inner.style.borderRadius = '50%'
  inner.style.background = `radial-gradient(circle at 30% 25%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.88) 85%)`
  inner.style.backdropFilter = 'blur(4px)'
  inner.style.border = `1.5px solid ${metrics.color}`
  inner.style.boxShadow = `0 0 ${Math.max(6, metrics.visualSize * 0.35)}px ${metrics.color}, 0 0 1px rgba(255,255,255,0.5), inset 0 0 12px rgba(0,0,0,0.3)`
  inner.style.display = 'flex'
  inner.style.justifyContent = 'center'
  inner.style.alignItems = 'center'
  inner.style.position = 'relative'
  inner.style.overflow = 'hidden'
  inner.style.transition = 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 180ms ease'
  inner.style.transformOrigin = 'center center'
  inner.style.transform = 'scale(1)'
  inner.classList.add('marker-glow-breathe')

  if (metrics.originalImageUrl) {
    const thumbUrl = getMarkerImageUrl(metrics.originalImageUrl, baseURL)
    if (thumbUrl) {
      inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.25)), url("${thumbUrl}")`
      inner.style.backgroundSize = 'cover'
      inner.style.backgroundPosition = 'center'
    }
  } else if (metrics.imageUrl) {
    inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.25)), url("${metrics.imageUrl}")`
    inner.style.backgroundSize = 'cover'
    inner.style.backgroundPosition = 'center'
  } else {
    inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.25)), url("${getMarkerPlaceholder(metrics.group)}")`
    inner.style.backgroundSize = 'cover'
    inner.style.backgroundPosition = 'center'
  }

  el.appendChild(inner)

  el.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.25)'
    inner.style.boxShadow = `0 0 ${Math.max(14, metrics.visualSize * 0.8)}px ${metrics.color}, 0 0 3px rgba(255,255,255,0.8), inset 0 0 16px rgba(0,0,0,0.2)`
    el.style.zIndex = '100'
  })

  el.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)'
    inner.style.boxShadow = `0 0 ${Math.max(6, metrics.visualSize * 0.35)}px ${metrics.color}, 0 0 1px rgba(255,255,255,0.5), inset 0 0 12px rgba(0,0,0,0.3)`
    el.style.zIndex = '10'
  })

  return el
}

function createProjectMarkerElement(project: ProjectData): HTMLElement {
  const beneficiaryFactor = Math.min(Math.max(project.indirect_beneficiaries / 10000, 0.5), 5)
  const markerSize = 15 + beneficiaryFactor * 10
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)

  return createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color,
    size: markerSize,
    group: getProjectPlaceholder(project.project_title),
  }))
}

function createSpeciesMarkerElement(species: Species): HTMLElement {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64030'
  return createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color,
    size: species.imageUrl ? 26 : 20,
    centerScale: 0.62,
    originalImageUrl: species.imageUrl || undefined,
    group: species.taxonomicGroup,
  }))
}

function updateMarkerVisibility() {
  if (!map) return

  const canvas = map.getCanvas()
  const margin = 50
  const bounds = {
    minX: -margin,
    maxX: canvas.width + margin,
    minY: -margin,
    maxY: canvas.height + margin
  }

  // Batch DOM updates - only change what actually changed
  markers.forEach(marker => {
    const el = marker.getElement()
    try {
      const point = map!.project(marker.getLngLat())
      if (!point || isNaN(point.x) || isNaN(point.y)) {
        el.style.display = 'none'
        el.style.pointerEvents = 'none'
        return
      }

      const isVisible = (
        point.x >= bounds.minX &&
        point.x <= bounds.maxX &&
        point.y >= bounds.minY &&
        point.y <= bounds.maxY
      )

      // Only update DOM if state changed
      const wasVisible = el.style.display !== 'none'
      if (isVisible !== wasVisible) {
        el.style.display = isVisible ? '' : 'none'
        el.style.pointerEvents = isVisible ? '' : 'none'
      }
    } catch {
      el.style.display = 'none'
      el.style.pointerEvents = 'none'
    }
  })
}

function startMarkerVisibilityCheck() {
  // RAF-based updates handle this during interaction
}

function parseColor(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)]
}

function formatColor(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

function blendColors(colors: string[]): string {
  if (!colors.length) return '#6366f1'
  const unique = [...new Set(colors)]
  if (unique.length === 1) return unique[0]
  const parsed = unique.map(c => parseColor(c))
  const total = parsed.reduce((s, c) => [s[0] + c[0], s[1] + c[1], s[2] + c[2]], [0, 0, 0])
  const r = Math.round(total[0] / parsed.length)
  const g = Math.round(total[1] / parsed.length)
  const b = Math.round(total[2] / parsed.length)
  return formatColor(r, g, b)
}

function createClusterMarkerElement(
  count: number,
  items: ClusterItem[],
  sourceProjects?: ProjectData[],
  sourceSpecies?: Species[]
) {
  const dataset = activeDataset.value

  function resolveMini(item: ClusterItem): { url: string; color: string } {
    if (dataset === 'endangered-species' && sourceSpecies?.length) {
      const sp = sourceSpecies[item.index]
      if (sp) {
        const color = GROUP_COLORS[sp.taxonomicGroup] ?? '#B64030'
        if (sp.imageUrl) {
          const thumbUrl = getMarkerImageUrl(sp.imageUrl, baseURL)
          if (thumbUrl) return { url: thumbUrl, color }
        }
        return { url: getMarkerPlaceholder(sp.taxonomicGroup), color }
      }
    }
    if (dataset === 'project-grants' && sourceProjects?.length) {
      const pr = sourceProjects[item.index]
      if (pr) {
        const color = getProjectColorByBeneficiaries(pr.direct_beneficiaries, pr.indirect_beneficiaries)
        const placeholder = getProjectPlaceholder(pr.project_title)
        return { url: getMarkerPlaceholder(placeholder), color }
      }
    }
    return { url: getMarkerPlaceholder(), color: '#6366f1' }
  }

  const resolved = items.map(i => resolveMini(i))
  const colors = resolved.map(r => r.color)
  const dominant = blendColors(colors)
  const [dr, dg, db] = parseColor(dominant)

  const outer = document.createElement('div')
  outer.className = 'globe-marker-item'
  outer.style.cursor = 'pointer'
  outer.style.pointerEvents = 'auto'
  outer.style.zIndex = '20'
  outer.style.position = 'relative'
  outer.title = `${count} items`

  if (items.length <= MAX_CLUSTER_SIZE) {
    const miniSize = items.length <= 3 ? 24 : 20
    const containerSize = items.length <= 2 ? 48 : items.length <= 4 ? 58 : 66
    const orbitRadius = items.length <= 2 ? 10 : items.length <= 4 ? 14 : 17

    outer.style.width = `${containerSize}px`
    outer.style.height = `${containerSize}px`
    outer.style.display = 'flex'
    outer.style.justifyContent = 'center'
    outer.style.alignItems = 'center'

    const clusterInner = document.createElement('div')
    clusterInner.style.position = 'relative'
    clusterInner.style.width = `${containerSize}px`
    clusterInner.style.height = `${containerSize}px`
    clusterInner.style.display = 'flex'
    clusterInner.style.justifyContent = 'center'
    clusterInner.style.alignItems = 'center'

    const ringOuterR = (containerSize + 6) / 2
    const ringInnerR = ringOuterR - 1.5
    const rainbowRing = document.createElement('div')
    rainbowRing.className = 'cluster-rainbow-ring'
    rainbowRing.style.position = 'absolute'
    rainbowRing.style.inset = '-3px'
    rainbowRing.style.borderRadius = '50%'
    rainbowRing.style.background = 'conic-gradient(from var(--a, 0deg), #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6, #ff6b6b)'
    rainbowRing.style.mask = `radial-gradient(farthest-side, transparent ${ringInnerR}px, #000 ${ringOuterR}px)`
    rainbowRing.style.webkitMask = `radial-gradient(farthest-side, transparent ${ringInnerR}px, #000 ${ringOuterR}px)`
    rainbowRing.style.pointerEvents = 'none'
    clusterInner.appendChild(rainbowRing)

    const bgBlob = document.createElement('div')
    bgBlob.style.position = 'absolute'
    bgBlob.style.inset = '-2px'
    bgBlob.style.borderRadius = '50%'
    bgBlob.style.background = `radial-gradient(circle at 30% 25%, rgba(${dr},${dg},${db},0.18), rgba(0,0,0,0.9) 75%)`
    bgBlob.style.backdropFilter = 'blur(8px)'
    bgBlob.style.boxShadow = `0 0 12px rgba(${dr},${dg},${db},0.25), inset 0 0 20px rgba(${dr},${dg},${db},0.04)`
    bgBlob.style.transition = 'transform 200ms ease, box-shadow 200ms ease'
    bgBlob.style.transformOrigin = 'center center'
    clusterInner.appendChild(bgBlob)

    const angleStep = (Math.PI * 2) / items.length
    items.forEach((_item, i) => {
      const { url, color: itemColor } = resolved[i]
      const angle = angleStep * i - Math.PI / 2
      const x = Math.cos(angle) * orbitRadius
      const y = Math.sin(angle) * orbitRadius

      const mini = document.createElement('div')
      mini.className = 'cluster-mini-hover'
      mini.style.position = 'absolute'
      mini.style.width = `${miniSize}px`
      mini.style.height = `${miniSize}px`
      mini.style.borderRadius = '50%'
      mini.style.background = `url("${url}") center/cover`
      mini.style.border = '1.5px solid rgba(255,255,255,0.85)'
      mini.style.boxShadow = `0 0 7px ${itemColor}, 0 0 1.5px #fff`
      mini.style.top = `calc(50% + ${y}px - ${miniSize / 2}px)`
      mini.style.left = `calc(50% + ${x}px - ${miniSize / 2}px)`
      mini.style.pointerEvents = 'none'
      clusterInner.appendChild(mini)
    })

    const countBadge = document.createElement('div')
    countBadge.textContent = `${count}`
    countBadge.style.position = 'absolute'
    countBadge.style.bottom = '-4px'
    countBadge.style.right = '-4px'
    countBadge.style.background = dominant
    countBadge.style.color = '#fff'
    countBadge.style.fontSize = '8px'
    countBadge.style.fontWeight = '800'
    countBadge.style.lineHeight = '1'
    countBadge.style.padding = '2px 5px'
    countBadge.style.borderRadius = '8px'
    countBadge.style.border = '1.5px solid rgba(0,0,0,0.5)'
    countBadge.style.boxShadow = `0 0 8px ${dominant}`
    countBadge.style.zIndex = '5'
    clusterInner.appendChild(countBadge)

    outer.appendChild(clusterInner)

    outer.addEventListener('mouseenter', () => {
      bgBlob.style.transform = 'scale(1.12)'
      bgBlob.style.boxShadow = `0 0 22px rgba(${dr},${dg},${db},0.45), inset 0 0 30px rgba(${dr},${dg},${db},0.08)`
      rainbowRing.style.opacity = '0.85'
      outer.style.zIndex = '100'
    })
    outer.addEventListener('mouseleave', () => {
      bgBlob.style.transform = 'scale(1)'
      bgBlob.style.boxShadow = `0 0 12px rgba(${dr},${dg},${db},0.25), inset 0 0 20px rgba(${dr},${dg},${db},0.04)`
      rainbowRing.style.opacity = '1'
      outer.style.zIndex = '20'
    })
  } else {
    const miniSize = 14
    const cols = 4
    const rows = Math.ceil(Math.min(count, 12) / cols)
    const gap = 2
    const pad = 5
    const gridW = cols * (miniSize + gap) - gap + pad * 2
    const gridH = rows * (miniSize + gap) - gap + pad * 2

    outer.style.width = `${gridW}px`
    outer.style.height = `${gridH}px`
    outer.style.display = 'flex'
    outer.style.justifyContent = 'center'
    outer.style.alignItems = 'center'

    const grid = document.createElement('div')
    grid.style.position = 'relative'
    grid.style.display = 'flex'
    grid.style.flexWrap = 'wrap'
    grid.style.alignContent = 'center'
    grid.style.justifyContent = 'center'
    grid.style.gap = `${gap}px`
    grid.style.width = '100%'
    grid.style.height = '100%'
    grid.style.padding = `${pad}px`
    grid.style.borderRadius = '14px'
    grid.style.background = `radial-gradient(circle at 30% 25%, rgba(${dr},${dg},${db},0.12), rgba(0,0,0,0.92) 75%)`
    grid.style.backdropFilter = 'blur(8px)'
    grid.style.boxShadow = `0 0 12px rgba(${dr},${dg},${db},0.18), inset 0 0 16px rgba(${dr},${dg},${db},0.03)`
    grid.style.transition = 'transform 200ms ease, box-shadow 200ms ease'
    grid.style.transformOrigin = 'center center'

    const gridOuterR = Math.min(gridW, gridH) / 2 + 2
    const gridInnerR = gridOuterR - 1.5
    const rainbowBorder = document.createElement('div')
    rainbowBorder.className = 'cluster-rainbow-border'
    rainbowBorder.style.position = 'absolute'
    rainbowBorder.style.inset = '-2px'
    rainbowBorder.style.borderRadius = '15px'
    rainbowBorder.style.background = 'conic-gradient(from var(--a, 0deg), #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6, #ff6b6b)'
    rainbowBorder.style.mask = `radial-gradient(farthest-side, transparent ${gridInnerR}px, #000 ${gridOuterR}px)`
    rainbowBorder.style.webkitMask = `radial-gradient(farthest-side, transparent ${gridInnerR}px, #000 ${gridOuterR}px)`
    rainbowBorder.style.pointerEvents = 'none'
    rainbowBorder.style.zIndex = '0'

    const gridInner = document.createElement('div')
    gridInner.style.position = 'relative'
    gridInner.style.display = 'flex'
    gridInner.style.flexWrap = 'wrap'
    gridInner.style.alignContent = 'center'
    gridInner.style.justifyContent = 'center'
    gridInner.style.gap = `${gap}px`
    gridInner.style.width = '100%'
    gridInner.style.height = '100%'
    gridInner.style.zIndex = '1'

    const maxShow = cols * rows - 1
    resolved.slice(0, maxShow).forEach(({ url, color: itemColor }) => {
      const mini = document.createElement('div')
      mini.className = 'cluster-mini-hover'
      mini.style.width = `${miniSize}px`
      mini.style.height = `${miniSize}px`
      mini.style.borderRadius = '50%'
      mini.style.background = `url("${url}") center/cover`
      mini.style.border = '1px solid rgba(255,255,255,0.75)'
      mini.style.boxShadow = `0 0 4px ${itemColor}`
      mini.style.flexShrink = '0'
      gridInner.appendChild(mini)
    })

    if (count > maxShow) {
      const more = document.createElement('div')
      more.className = 'cluster-mini-hover'
      more.textContent = `+${count - maxShow}`
      more.style.width = `${miniSize}px`
      more.style.height = `${miniSize}px`
      more.style.borderRadius = '50%'
      more.style.background = `rgba(${dr},${dg},${db},0.55)`
      more.style.backdropFilter = 'blur(4px)'
      more.style.border = `1.5px solid ${dominant}`
      more.style.color = '#fff'
      more.style.fontSize = '7px'
      more.style.fontWeight = '800'
      more.style.display = 'flex'
      more.style.alignItems = 'center'
      more.style.justifyContent = 'center'
      more.style.flexShrink = '0'
      gridInner.appendChild(more)
    }

    grid.appendChild(rainbowBorder)
    grid.appendChild(gridInner)
    outer.appendChild(grid)

    outer.addEventListener('mouseenter', () => {
      grid.style.transform = 'scale(1.1)'
      grid.style.boxShadow = `0 0 22px rgba(${dr},${dg},${db},0.4), inset 0 0 28px rgba(${dr},${dg},${db},0.06)`
      outer.style.zIndex = '100'
    })
    outer.addEventListener('mouseleave', () => {
      grid.style.transform = 'scale(1)'
      grid.style.boxShadow = `0 0 12px rgba(${dr},${dg},${db},0.18), inset 0 0 16px rgba(${dr},${dg},${db},0.03)`
      outer.style.zIndex = '20'
    })
  }

  return outer
}

let useNativeGeoJSON = true
const SOURCE_ID = 'globe-species-markers'

function setupGeoJSONMarkers() {
  if (!map || !useNativeGeoJSON) return

  // Clean up old DOM markers
  markers.forEach(m => m.remove())
  markers = []
  clusterer.destroy()

  geoJSONMarkers.init(map)

  if (activeDataset.value === 'project-grants') {
    const validProjects = projectsData.value.filter(p => isValidCoordinate(p.latitude, p.longitude))
    const geojson = projectsToGeoJSON(validProjects)
    geoJSONMarkers.addGeoJSONSource(SOURCE_ID, geojson, true)
    geoJSONMarkers.addClusterLayers(SOURCE_ID, 'project-grants')
    
    geoJSONMarkers.setupEventHandlers(
      SOURCE_ID,
      'project-grants',
      (props, coords) => {
        const project = validProjects.find(p => 
          Math.abs(p.longitude - coords[0]) < 0.001 && 
          Math.abs(p.latitude - coords[1]) < 0.001
        )
        if (project) openProjectOverlay(project)
      },
      (clusterId, coords) => {
        if (map) {
          geoJSONMarkers.getClusterExpansionZoom(SOURCE_ID, clusterId).then((expansionZoom: number) => {
            map!.flyTo({
              center: coords,
              zoom: Math.min(expansionZoom, 14),
              duration: 500
            })
          })
        }
      }
    )
  } else if (speciesIndexData.value.length) {
    // Use lightweight index for map markers
    const geojson = speciesIndexToGeoJSON(speciesIndexData.value)
    geoJSONMarkers.addGeoJSONSource(SOURCE_ID, geojson, true)
    geoJSONMarkers.addClusterLayers(SOURCE_ID, 'endangered-species')
    
    geoJSONMarkers.setupEventHandlers(
      SOURCE_ID,
      'endangered-species',
      async (props, coords) => {
        const speciesId = props.id as string
        const fullSpecies = await geoJSONMarkers.loadFullSpeciesData(speciesId, baseURL)
        if (fullSpecies) {
          openSpeciesOverlay(fullSpecies)
        } else {
          // Fallback: create minimal species from index
          const indexItem = speciesIndexData.value.find(s => s.id === speciesId)
          if (indexItem) {
            const minimalSpecies = {
              ...indexItem,
              region: '',
              ecosystem: '',
              imageCredit: '',
              threatTypes: indexItem.threatTypes || [],
              content: {},
            } as Species
            openSpeciesOverlay(minimalSpecies)
          }
        }
      },
      (clusterId, coords) => {
        if (map) {
          geoJSONMarkers.getClusterExpansionZoom(SOURCE_ID, clusterId).then((expansionZoom: number) => {
            map!.flyTo({
              center: coords,
              zoom: Math.min(expansionZoom, 14),
              duration: 500
            })
          })
        }
      }
    )
  } else if (speciesData.value.length) {
    // Fallback to full species data if index not available
    const validSpecies = speciesData.value.filter(s => isValidCoordinate(s.lat, s.lng))
    const geojson = speciesIndexToGeoJSON(validSpecies.map(s => ({
      id: s.id,
      commonName: s.commonName,
      scientificName: s.scientificName,
      taxonomicGroup: s.taxonomicGroup,
      category: s.category,
      lat: s.lat,
      lng: s.lng,
      imageUrl: s.imageUrl || null,
      description: '',
      endangerment: '',
      threatTypes: s.threatTypes || [],
    })))
    geoJSONMarkers.addGeoJSONSource(SOURCE_ID, geojson, true)
    geoJSONMarkers.addClusterLayers(SOURCE_ID, 'endangered-species')
    
    geoJSONMarkers.setupEventHandlers(
      SOURCE_ID,
      'endangered-species',
      async (props, coords) => {
        const speciesId = props.id as string
        const species = speciesData.value.find(s => s.id === speciesId)
        if (species) openSpeciesOverlay(species)
      },
      (clusterId, coords) => {
        if (map) {
          geoJSONMarkers.getClusterExpansionZoom(SOURCE_ID, clusterId).then((expansionZoom: number) => {
            map!.flyTo({
              center: coords,
              zoom: Math.min(expansionZoom, 14),
              duration: 500
            })
          })
        }
      }
    )
  }

  lastClusterZoom = Math.floor(map.getZoom())
  const center = map.getCenter()
  lastBboxCenter = { lng: center.lng, lat: center.lat }
}

function rebuildMarkers() {
  if (!map) return

  const currentZoom = map.getZoom()

  // Use native GeoJSON for large datasets (endangered species with 4000+ points)
  if (useNativeGeoJSON && activeDataset.value === 'endangered-species' && speciesData.value.length > 500) {
    setupGeoJSONMarkers()
    return
  }

  markers.forEach(m => m.remove())
  markers = []
  clusterer.destroy()

  if (activeDataset.value === 'project-grants') {
    const data = isMobile.value
      ? projectsData.value.slice(0, 60)
      : projectsData.value
    const validProjects = data.filter(p => isValidCoordinate(p.latitude, p.longitude))

    const clusterItems = validProjects.map((p, i) => ({
      lng: p.longitude,
      lat: p.latitude,
      type: 'project' as const,
      index: i,
    }))

    clusterer.load(clusterItems)

    const bounds = map.getBounds()
    const bbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(),
      bounds.getEast(), bounds.getNorth(),
    ]
    const clusters = clusterer.getClusters(bbox, currentZoom)

    clusters.forEach((cp: ClusterPoint) => {
      if (cp.type === 'cluster') {
        const el = createClusterMarkerElement(cp.count, cp.items, validProjects)
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} projects`)
        el.addEventListener('click', () => {
          if (map) {
            const items = cp.items
            const lats = items.map(i => i.lat)
            const lngs = items.map(i => i.lng)
            const maxLat = Math.max(...lats)
            const minLat = Math.min(...lats)
            const maxLng = Math.max(...lngs)
            const minLng = Math.min(...lngs)
            const spanLat = maxLat - minLat
            const spanLng = maxLng - minLng
            const span = Math.max(spanLat, spanLng)
            const zoom = Math.max(4, Math.min(12, 14 - Math.log2(Math.max(span, 0.1))))
            map.flyTo({ center: [cp.lng, cp.lat], zoom, duration: 400 })
          }
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([cp.lng, cp.lat])
          .addTo(map!)
        markers.push(marker)
      } else {
        const project = validProjects[cp.sourceIndex]
        if (!project) return
        const el = createProjectMarkerElement(project)
        el.style.cursor = 'pointer'
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', project.project_title)
        el.addEventListener('click', () => { openProjectOverlay(project) })
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProjectOverlay(project) }
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([project.longitude, project.latitude])
          .addTo(map!)
        markers.push(marker)
      }
    })
  } else if (activeDataset.value === 'endangered-species' && speciesData.value.length) {
    const data = isMobile.value
      ? speciesData.value.slice(0, 80)
      : speciesData.value
    const speciesToRender = data.filter(s => isValidCoordinate(s.lat, s.lng))
    const imageUrls = speciesToRender.map(s => s.imageUrl).filter(Boolean)
    
    preloadSpeciesImages(imageUrls, true, baseURL)

    const clusterItems = speciesToRender.map((s, i) => ({
      lng: s.lng,
      lat: s.lat,
      type: 'species' as const,
      index: i,
    }))

    clusterer.load(clusterItems)

    const bounds = map.getBounds()
    const bbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(),
      bounds.getEast(), bounds.getNorth(),
    ]
    const clusters = clusterer.getClusters(bbox, currentZoom)

    clusters.forEach((cp: ClusterPoint) => {
      if (cp.type === 'cluster') {
        const el = createClusterMarkerElement(cp.count, cp.items, undefined, speciesToRender)
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} species`)
        el.addEventListener('click', () => {
          if (map) {
            const items = cp.items
            const lats = items.map(i => i.lat)
            const lngs = items.map(i => i.lng)
            const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs))
            const zoom = Math.max(4, Math.min(12, 14 - Math.log2(Math.max(span, 0.1))))
            map.flyTo({ center: [cp.lng, cp.lat], zoom, duration: 400 })
          }
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([cp.lng, cp.lat])
          .addTo(map!)
        markers.push(marker)
      } else {
        const species = speciesToRender[cp.sourceIndex]
        if (!species) return
        const el = createSpeciesMarkerElement(species)
        el.style.cursor = 'pointer'
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', species.commonName)
        el.addEventListener('click', () => { openSpeciesOverlay(species) })
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSpeciesOverlay(species) }
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([species.lng, species.lat])
          .addTo(map!)
        markers.push(marker)
      }
    })
  }

  lastClusterZoom = Math.floor(currentZoom)
  if (map) {
    const c = map.getCenter()
    lastBboxCenter = { lng: c.lng, lat: c.lat }
  }
  updateMarkerVisibility()
}

function addConnections() {
  if (!map) return

  cleanupParticles()

  if (!showConnections.value) {
    connectionFeatures = []
    syncMapConnectionLayers(map, [])
    return
  }

  connectionFeatures = buildMapConnectionFeatures({
    dataset: activeDataset.value,
    projects: projectsData.value,
    species: speciesData.value,
    isMobile: isMobile.value,
  })

  syncMapConnectionLayers(map, connectionFeatures)
}

function cleanupParticles() {
  particleSystem?.stop()
  particleSystem = null
}

function startParticles() {
  if (!showConnections.value || !isMounted || !map || !containerRef.value || !connectionFeatures.length) return

  cleanupParticles()

  particleSystem = createMapParticleSystem({
    map,
    container: containerRef.value,
    getFeatures: () => connectionFeatures,
    isMobile: () => isMobile.value,
    zIndex: 30,
  })
  particleSystem.start()
}

function toggleConnections() {
  showConnections.value = !showConnections.value
}

function navigateToLocation(lat: number, lng: number) {
  if (map) {
    map.flyTo({ center: [lng, lat], zoom: isMobile.value ? 3 : 4, duration: 1500, essential: true })
  }
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

// Globe-specific global styles only — all shared popup/overlay styles are in main.css and UnifiedMap.vue
if (typeof document !== 'undefined' && !document.getElementById('globe-styles')) {
  const style = document.createElement('style')
  style.id = 'globe-styles'
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0; }
      50% { transform: scale(1.1); opacity: 0.4; }
      100% { transform: scale(0.95); opacity: 0; }
    }
    .maplibregl-map {
      background-color: transparent !important;
    }
    .globe-marker-item {
      transform: translateZ(0);
      backface-visibility: hidden;
    }
    @keyframes cluster-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @keyframes mini-pop {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
  `
  document.head.appendChild(style)
}

// Add fade transition
if (typeof document !== 'undefined' && !document.getElementById('globe-transition-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'globe-transition-styles'
  styleSheet.textContent = `
    .fade-enter-active,
    .fade-leave-active {
      transition: opacity 0.3s ease;
    }
    .fade-enter-from,
    .fade-leave-to {
      opacity: 0;
    }

  `
  document.head.appendChild(styleSheet)
}

onMounted(() => {
  initMap()
  window.addEventListener('resize', debouncedSetupHexGrid)
})

watch(locale, () => {
  rebuildMarkers()
})

watch(isHexGridVisible, async (visible) => {
  if (!visible) return
  await nextTick()
  setupHexGrid()
})

watch(showConnections, () => {
  addConnections()
  if (showConnections.value) startParticles()
})

onUnmounted(() => {
  isMounted = false
  stopAutoRotate()
  if (interactionTimeout) clearTimeout(interactionTimeout)
  cleanupParticles()
  if (hexGridDebounceTimer) clearTimeout(hexGridDebounceTimer)
  markers.forEach(m => m.remove())
  clusterer.destroy()
  if (useNativeGeoJSON) {
    geoJSONMarkers.cleanup()
  }
  clearImageCache()
  if (map) {
    map.remove()
    map = null
  }
  window.removeEventListener('resize', debouncedSetupHexGrid)
})

defineExpose({ initMap })
</script>
