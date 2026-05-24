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

    <!-- Global Stats (only shown for project grants) - Mobile optimized -->
    <div v-if="activeDataset === 'project-grants'" class="absolute right-0 bottom-0 z-[1000] w-full max-w-[calc(100vw-1rem)] xs:max-w-xl px-2 xs:px-4 sm:px-0">
      <GlobalStats :projects="projectsData" @close="() => {}" />
    </div>

    <!-- Species legend (for endangered species) - Mobile optimized -->
    <div v-if="activeDataset === 'endangered-species'" class="absolute right-[max(0.5rem,env(safe-area-inset-right))] sm:right-4 top-[clamp(14rem,35vh,19rem)] xs:top-[clamp(16rem,38vh,22rem)] z-[600]">
      <div class="taxonomic-group-bubble">
        <button @click="taxonomicGroupsCollapsed = !taxonomicGroupsCollapsed" class="flex items-center gap-1.5 w-full text-left mb-1.5 xs:mb-2">
          <Icon :name="taxonomicGroupsCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'" class="h-3.5 w-3.5 xs:h-4 xs:w-4 text-[var(--text-secondary)] transition-transform" />
          <span class="text-[10px] xs:text-xs font-bold text-[var(--text-primary)]">{{ t('globe.taxonomicGroups') }}</span>
        </button>
        <div v-if="!taxonomicGroupsCollapsed" class="grid grid-cols-2 gap-1 xs:gap-1.5 animate-fade-in">
          <div v-for="(color, group) in GROUP_COLORS" :key="group" class="flex items-center gap-1 xs:gap-1.5 group cursor-pointer">
            <div class="w-2 h-2 xs:w-2.5 xs:h-2.5 rounded-full transition-transform duration-200 group-hover:scale-125" :style="{ backgroundColor: color }" />
            <span class="text-[9px] xs:text-[10px] text-[var(--text-secondary)] group-hover:text-cyan-400 transition-colors">{{ group }}</span>
          </div>
        </div>
      </div>
    </div>

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
import type { ClusterPoint } from '@/composables/useMapCluster'

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
  showHexGrid?: boolean
  defaultDataset?: 'project-grants' | 'endangered-species'
}

const props = withDefaults(defineProps<Props>(), {
  showHexGrid: true,
  defaultDataset: 'project-grants',
})

const projectsData = computed(() => props.projects || allProjectsData)
const speciesData = computed(() => props.species || [])



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
const taxonomicGroupsCollapsed = ref(true)
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
let lastClusterZoom = -1
let lastBboxCenter: { lng: number; lat: number } | null = null
let clusterIdCounter = 0

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

function checkWebGLSupport(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (gl) {
      gl.getExtension('WEBGL_lose_context')
      return true
    }
    return false
  } catch {
    return false
  }
}

async function initMap() {
  if (typeof window === 'undefined' || !containerRef.value) return

  if (!checkWebGLSupport()) {
    isLoading.value = false
    hasError.value = true
    noWebglSupport.value = true
    errorMessage.value = 'WebGL is not supported in this browser. The globe requires a GPU-accelerated browser. Try enabling hardware acceleration or using a different browser.'
    return
  }

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

    map.on('move', () => {
      if (!pendingVisibilityUpdate) {
        pendingVisibilityUpdate = true
        requestAnimationFrame(() => {
          updateMarkerVisibility()
          pendingVisibilityUpdate = false
        })
      }
      if (!pendingClusterRebuild && map) {
        let needsRebuild = false
        const currentZoom = Math.floor(map.getZoom())
        if (currentZoom !== lastClusterZoom) {
          needsRebuild = true
        } else {
          const bounds = map.getBounds()
          const center = map.getCenter()
          const lngSpan = bounds.getEast() - bounds.getWest()
          const latSpan = bounds.getNorth() - bounds.getSouth()
          if (
            !lastBboxCenter ||
            Math.abs(center.lng - lastBboxCenter.lng) > lngSpan * 0.4 ||
            Math.abs(center.lat - lastBboxCenter.lat) > latSpan * 0.4
          ) {
            needsRebuild = true
          }
        }
        if (needsRebuild) {
          pendingClusterRebuild = true
          requestAnimationFrame(() => {
            rebuildMarkers()
            pendingClusterRebuild = false
          })
        }
      }
    })

    map.on('moveend', () => {
      updateMarkerVisibility()
      if (map) {
        let needsRebuild = false
        const currentZoom = Math.floor(map.getZoom())
        if (currentZoom !== lastClusterZoom) {
          needsRebuild = true
        } else {
          const bounds = map.getBounds()
          const center = map.getCenter()
          const lngSpan = bounds.getEast() - bounds.getWest()
          const latSpan = bounds.getNorth() - bounds.getSouth()
          if (
            !lastBboxCenter ||
            Math.abs(center.lng - lastBboxCenter.lng) > lngSpan * 0.4 ||
            Math.abs(center.lat - lastBboxCenter.lat) > latSpan * 0.4
          ) {
            needsRebuild = true
          }
        }
        if (needsRebuild) {
          rebuildMarkers()
        }
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
    const msg = String(err)
    if (msg.includes('Failed to initialize WebGL')) {
      errorMessage.value = 'WebGL is not supported in this browser. The globe requires a GPU-accelerated browser. Try enabling hardware acceleration or using a different browser.'
    }
  }
}

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function getBlobBorderRadius(size: number, seed: number): string {
  const a = 44 + Math.sin(seed * 1.7 + size * 0.1) * 14
  const b = 56 + Math.cos(seed * 2.3 + size * 0.15) * 14
  const c = 48 + Math.sin(seed * 3.7 + size * 0.2) * 14
  const d = 52 + Math.cos(seed * 5.1 + size * 0.25) * 14
  return `${a}% ${b}% ${c}% ${d}% / ${b}% ${c}% ${d}% ${a}%`
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

  const blobRadius = getBlobBorderRadius(metrics.visualSize, hashString(metrics.group ?? metrics.color))

  const inner = document.createElement('div')
  inner.style.width = `${metrics.visualSize}px`
  inner.style.height = `${metrics.visualSize}px`
  inner.style.borderRadius = blobRadius
  inner.style.backgroundColor = 'rgba(0, 0, 0, 0.82)'
  inner.style.border = '2px solid rgba(255, 255, 255, 0.86)'
  inner.style.boxShadow = `0 0 ${Math.max(8, metrics.visualSize * 0.5)}px ${metrics.color}, 0 0 1.5px #fff`
  inner.style.display = 'flex'
  inner.style.justifyContent = 'center'
  inner.style.alignItems = 'center'
  inner.style.position = 'relative'
  inner.style.overflow = 'hidden'
  inner.style.transition = 'transform 160ms ease, box-shadow 160ms ease'
  inner.style.transformOrigin = 'center center'
  inner.style.transform = 'scale(1)'

  if (metrics.originalImageUrl) {
    const thumbUrl = getMarkerImageUrl(metrics.originalImageUrl, baseURL)
    if (thumbUrl) {
      inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${thumbUrl}")`
      inner.style.backgroundSize = 'cover'
      inner.style.backgroundPosition = 'center'
    }
  } else if (metrics.imageUrl) {
    inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${metrics.imageUrl}")`
    inner.style.backgroundSize = 'cover'
    inner.style.backgroundPosition = 'center'
  } else {
    inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${getMarkerPlaceholder(metrics.group)}")`
    inner.style.backgroundSize = 'cover'
    inner.style.backgroundPosition = 'center'
  }

  el.appendChild(inner)

  el.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.28)'
    inner.style.boxShadow = `0 0 ${Math.max(16, metrics.visualSize * 0.9)}px ${metrics.color}, 0 0 4px #fff`
    el.style.zIndex = '100'
  })

  el.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)'
    inner.style.boxShadow = `0 0 ${Math.max(8, metrics.visualSize * 0.5)}px ${metrics.color}, 0 0 1.5px #fff`
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

function createClusterMarkerElement(count: number, _items: { lat: number; lng: number; type: string }[]) {
  const uid = ++clusterIdCounter
  const size = Math.max(42, 28 + count * 5)
  const blobRadius = getBlobBorderRadius(size, count * 7 + size)

  const outer = document.createElement('div')
  outer.className = 'globe-marker-item'
  outer.style.width = `${size + 18}px`
  outer.style.height = `${size + 18}px`
  outer.style.display = 'flex'
  outer.style.justifyContent = 'center'
  outer.style.alignItems = 'center'
  outer.style.cursor = 'pointer'
  outer.style.pointerEvents = 'auto'
  outer.style.zIndex = '20'
  outer.style.position = 'relative'

  const blob = document.createElement('div')
  blob.style.width = `${size}px`
  blob.style.height = `${size}px`
  blob.style.borderRadius = blobRadius
  blob.style.background = `radial-gradient(circle at 35% 30%, rgba(6, 182, 212, 0.25), rgba(0, 0, 0, 0.92) 70%)`
  blob.style.border = '2px solid rgba(6, 182, 212, 0.7)'
  blob.style.boxShadow = `0 0 ${Math.max(10, size * 0.35)}px rgba(6, 182, 212, 0.35), 0 0 ${Math.max(4, size * 0.15)}px rgba(255, 255, 255, 0.3), inset 0 0 30px rgba(6, 182, 212, 0.08)`
  blob.style.display = 'flex'
  blob.style.flexDirection = 'column'
  blob.style.justifyContent = 'center'
  blob.style.alignItems = 'center'
  blob.style.position = 'relative'
  blob.style.overflow = 'hidden'
  blob.style.transition = 'transform 200ms ease, box-shadow 200ms ease'
  blob.style.transformOrigin = 'center center'
  blob.style.transform = 'scale(1)'
  blob.style.animation = `clusterPulse ${2.5 + (count % 3) * 0.5}s ease-in-out infinite`

  const shine = document.createElement('div')
  shine.style.position = 'absolute'
  shine.style.top = '8%'
  shine.style.left = '12%'
  shine.style.width = '35%'
  shine.style.height = '25%'
  shine.style.borderRadius = '50%'
  shine.style.background = 'radial-gradient(ellipse, rgba(255,255,255,0.18), transparent)'
  shine.style.pointerEvents = 'none'
  blob.appendChild(shine)

  const countEl = document.createElement('span')
  countEl.textContent = `${count}`
  countEl.style.color = '#fff'
  countEl.style.fontSize = `${Math.max(13, 16 - count)}px`
  countEl.style.fontWeight = '800'
  countEl.style.lineHeight = '1'
  countEl.style.textShadow = '0 0 8px rgba(6, 182, 212, 0.9), 0 0 20px rgba(6, 182, 212, 0.4)'
  countEl.style.position = 'relative'
  countEl.style.zIndex = '1'
  blob.appendChild(countEl)

  const styleId = `gcluster-pulse-${uid}`
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes clusterPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); }
      }
    `
    document.head.appendChild(style)
  }

  outer.appendChild(blob)

  outer.addEventListener('mouseenter', () => {
    blob.style.animation = 'none'
    blob.style.transform = 'scale(1.18)'
    blob.style.boxShadow = `0 0 ${Math.max(18, size * 0.6)}px rgba(6, 182, 212, 0.6), 0 0 6px rgba(255, 255, 255, 0.5), inset 0 0 40px rgba(6, 182, 212, 0.12)`
    outer.style.zIndex = '100'
  })

  outer.addEventListener('mouseleave', () => {
    blob.style.animation = `clusterPulse ${2.5 + (count % 3) * 0.5}s ease-in-out infinite`
    blob.style.transform = 'scale(1)'
    blob.style.boxShadow = `0 0 ${Math.max(10, size * 0.35)}px rgba(6, 182, 212, 0.35), 0 0 ${Math.max(4, size * 0.15)}px rgba(255, 255, 255, 0.3), inset 0 0 30px rgba(6, 182, 212, 0.08)`
    outer.style.zIndex = '20'
  })

  return outer
}

function rebuildMarkers() {
  if (!map) return

  const currentZoom = map.getZoom()

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
        const el = createClusterMarkerElement(cp.count, cp.items)
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} projects`)
        el.addEventListener('click', () => {
          if (map) {
            const zoom = clusterer.getClusterExpansionZoom(cp.clusterId)
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
        const el = createClusterMarkerElement(cp.count, cp.items)
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} species`)
        el.addEventListener('click', () => {
          if (map) {
            const zoom = clusterer.getClusterExpansionZoom(cp.clusterId)
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
  clearImageCache()
  if (map) {
    map.remove()
    map = null
  }
  window.removeEventListener('resize', debouncedSetupHexGrid)
})

defineExpose({ initMap })
</script>
