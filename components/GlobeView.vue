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
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-1" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-2" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-3" />
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
      aria-hidden="true"
      class="absolute inset-0 pointer-events-none opacity-[0.02]"
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
      aria-hidden="true"
      class="absolute inset-0 w-full h-full pointer-events-none opacity-15"
      :style="{ zIndex: 'var(--z-map-hex-grid)' }"
    />

    <!-- Map container -->
    <div ref="containerRef" class="w-full h-full" :style="{ zIndex: 'var(--z-map-base)' }" />

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
      :show-connections="showConnectionsGlobe"
      :dataset="activeDataset"
      :projects="activeDataset === 'project-grants' ? projectsData : undefined"
      :species="activeDataset === 'endangered-species' ? speciesData : undefined"
      :style="{ zIndex: 'var(--z-map-ui-controls)' }"
      @toggle-hex-grid="isHexGridVisible = !isHexGridVisible"
      @toggle-connections="toggleConnectionsGlobe"
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
      <div v-if="availablePopupLocales.length > 0" class="species-popup-lang-bar">
        <button
          v-for="loc in availablePopupLocales"
          :key="loc"
          class="species-popup-lang-btn"
          :class="{ active: popupLocale === loc }"
          @click="popupLocale = loc"
          :aria-label="`Show in ${(localeNames as Record<string, string>)[loc] || loc}`"
        >{{ (localeNames as Record<string, string>)[loc] || loc }}</button>
      </div>
      <div class="species-popup-content-fixed" v-html="speciesOverlayHTML"></div>
    </div>

    <!-- Detached fullscreen project popup overlay -->
    <div v-if="showProjectOverlay" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Project details" @click.self="closeProjectOverlay" @keydown.esc="closeProjectOverlay">
      <button ref="projectCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeProjectOverlay" aria-label="Close project details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="project-popup-content-fixed" v-html="projectOverlayHTML"></div>
    </div>

    <!-- Species cluster panel -->
    <SpeciesPanel @species-selected="handleSpeciesSelected" />
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
import type { Species } from '@/lib/map-utils'
import {
  preloadSpeciesImages,
  clearImageCache,
} from '@/lib/image-utils'
import { useMapCluster } from '@/composables/useMapCluster'
import type { ClusterPoint, ClusterItem } from '@/composables/useMapCluster'
import {
  createProjectMarkerElement,
  createSpeciesMarkerElement,
  createClusterMarkerElement,
} from '@/composables/useMapMarkers'
import {
  useGeoJSONMarkers,
  speciesIndexToGeoJSON,
  projectsToGeoJSON,
  type SpeciesIndexItem,
} from '@/composables/useGeoJSONMarkers'
import { useSpeciesPanel } from '@/composables/useSpeciesPanel'
import { useMapConnections } from '@/composables/useMapConnections'

const { t, locale, localeNames } = useI18n()
const speciesPanel = useSpeciesPanel()
const baseURL = useRuntimeConfig().app.baseURL

function getLocalizedSpecies(species: Species | SpeciesIndexItem, overLocale?: string): Species {
  if (!('content' in species)) {
    return {
      ...species,
      imageUrl: species.imageUrl ?? '',
      region: '',
      ecosystem: '',
      imageCredit: '',
      ecosystemNeeds: undefined,
      actions: undefined,
      content: {},
    }
  }

  const targetLocale = overLocale ?? locale.value
  const content = species.content?.[targetLocale] ?? species.content?.en
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
const showSpeciesOverlay = ref(false)
const speciesOverlayHTML = ref('')
const popupLocale = ref<string>(locale.value)
const selectedPopupSpecies = ref<Species | SpeciesIndexItem | null>(null)
const availablePopupLocales = computed(() => {
  const s = selectedPopupSpecies.value
  if (!s || !('content' in s) || !s.content) return []
  return (Object.keys(s.content) as Array<string>).filter(l => l !== popupLocale.value)
})
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
let rotationAnimationId: number | null = null
let isUserInteracting = false
const connectionsGlobe = useMapConnections(
  () => map,
  containerRef as import('vue').Ref<HTMLElement | null>,
  { zIndex: 30, isMounted: () => isMounted },
)
const { showConnections: showConnectionsGlobe, toggleConnections: toggleConnectionsGlobe } = connectionsGlobe
let interactionTimeout: ReturnType<typeof setTimeout> | null = null
const clusterer = useMapCluster()
const geoJSONMarkers = useGeoJSONMarkers()
let lastClusterZoom = -1
let lastBboxCenter: { lng: number; lat: number } | null = null
function openSpeciesOverlay(species: Species | SpeciesIndexItem) {
  selectedPopupSpecies.value = species
  popupLocale.value = locale.value
  rebuildSpeciesOverlay()
  showSpeciesOverlay.value = true
  lastFocusedEl = document.activeElement as HTMLElement
  nextTick(() => speciesCloseBtnRef.value?.focus())
}

function rebuildSpeciesOverlay() {
  const species = selectedPopupSpecies.value
  if (!species) return
  const localizedSpecies = getLocalizedSpecies(species, popupLocale.value)
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
}

function closeSpeciesOverlay() {
  showSpeciesOverlay.value = false
  speciesOverlayHTML.value = ''
  selectedPopupSpecies.value = null
  nextTick(() => lastFocusedEl?.focus())
}

function handleSpeciesSelected(species: SpeciesIndexItem) {
  speciesPanel.closePanel()
  openSpeciesOverlay(species)
}

function findSpeciesAtCoord(lat: number, lng: number, source: SpeciesIndexItem[]): SpeciesIndexItem[] {
  return source.filter(s =>
    Math.abs(s.lat - lat) < 0.001 && Math.abs(s.lng - lng) < 0.001
  )
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

function transformRequest(url: string, _resourceType?: string) {
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
      connectionsGlobe.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', projectsData.value, speciesData.value)
      connectionsGlobe.startParticles()
      setupHexGrid()
      startMarkerVisibilityCheck()
      startAutoRotate()
    })

    function pauseAutoRotate() {
      isUserInteracting = true
      stopAutoRotate()
      if (interactionTimeout) clearTimeout(interactionTimeout)
    }

    function resumeAutoRotate() {
      isUserInteracting = false
      if (interactionTimeout) clearTimeout(interactionTimeout)
      interactionTimeout = setTimeout(() => {
        isUserInteracting = false
        startAutoRotate()
      }, 3000)
    }

    map.on('dragstart', pauseAutoRotate)
    map.on('dragend', resumeAutoRotate)
    map.on('wheel', () => {
      pauseAutoRotate()
      interactionTimeout = setTimeout(() => {
        isUserInteracting = false
        startAutoRotate()
      }, 3000)
    })
    map.on('touchstart', pauseAutoRotate)

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
        } else if (errObj?.error?.message) {
          errorMessage.value = errObj.error.message
        } else {
          errorMessage.value = 'Failed to load globe tiles. Please check your network connection and try again.'
        }
      }
    })

    // Timeout fallback — show error instead of silently hiding loading
    setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false
        if (!hasError.value) {
          hasError.value = true
          errorMessage.value = 'Globe tiles took too long to load. Please check your network connection and try again.'
        }
      }
    }, 20000)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load maplibre-gl:', err)
    isLoading.value = false
    hasError.value = true
  }
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

const useNativeGeoJSON = true
const SOURCE_ID = 'globe-species-markers'

let geoJSONInitializedFor: 'project-grants' | 'endangered-species' | null = null
let geoJSONSpeciesIndex: SpeciesIndexItem[] | null = null

function applySpeciesFilters(speciesIndex: SpeciesIndexItem[]): SpeciesIndexItem[] {
  return speciesIndex
}

function setupGeoJSONMarkers(forceReinit = false) {
  if (!map || !useNativeGeoJSON) return

  const dataset = activeDataset.value === 'project-grants' ? 'project-grants' : 'endangered-species'

  if (!forceReinit && geoJSONInitializedFor === dataset) {
    updateGeoJSONMarkerData()
    return
  }

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
      (props, _coords) => {
        const project = validProjects.find(p => p.project_title === props.id)
        if (project) openProjectOverlay(project)
      },
      () => { /* easeTo handled inside setupEventHandlers */ }
    )
    geoJSONInitializedFor = 'project-grants'
  } else if (speciesIndexData.value.length) {
    // Use lightweight index for map markers
    const filteredIndex = applySpeciesFilters(speciesIndexData.value)
    geoJSONSpeciesIndex = speciesIndexData.value
    const geojson = speciesIndexToGeoJSON(filteredIndex)
    geoJSONMarkers.addGeoJSONSource(SOURCE_ID, geojson, true)
    geoJSONMarkers.addClusterLayers(SOURCE_ID, 'endangered-species')

    geoJSONMarkers.setupEventHandlers(
      SOURCE_ID,
      'endangered-species',
      (props, coords) => {
        const [lng, lat] = coords
        const matches = findSpeciesAtCoord(lat, lng, speciesIndexData.value)
        if (matches.length > 1) {
          speciesPanel.openPanel(matches, { lat, lng })
        } else {
          const speciesId = props.id as string
          const indexItem = speciesIndexData.value.find(s => s.id === speciesId)
          if (indexItem) openSpeciesOverlay(indexItem)
        }
      },
      (_, coords) => {
        const [lng, lat] = coords
        const matches = findSpeciesAtCoord(lat, lng, speciesIndexData.value)
        if (matches.length > 1) {
          speciesPanel.openPanel(matches, { lat, lng })
        }
      }
    )
    geoJSONInitializedFor = 'endangered-species'
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
      async (props, _coords) => {
        const speciesId = props.id as string
        const species = speciesData.value.find(s => s.id === speciesId)
        if (species) openSpeciesOverlay(species)
      },
      () => { /* easeTo handled inside setupEventHandlers */ }
    )
    geoJSONInitializedFor = 'endangered-species'
  }

  lastClusterZoom = Math.floor(map.getZoom())
  const center = map.getCenter()
  lastBboxCenter = { lng: center.lng, lat: center.lat }
}

function updateGeoJSONMarkerData() {
  if (!map || !geoJSONInitializedFor) return
  if (geoJSONInitializedFor === 'project-grants') {
    const validProjects = projectsData.value.filter(p => isValidCoordinate(p.latitude, p.longitude))
    geoJSONMarkers.updateData(SOURCE_ID, projectsToGeoJSON(validProjects))
  } else if (speciesIndexData.value.length) {
    geoJSONMarkers.updateData(SOURCE_ID, speciesIndexToGeoJSON(applySpeciesFilters(speciesIndexData.value)))
  } else if (speciesData.value.length) {
    const validSpecies = speciesData.value.filter(s => isValidCoordinate(s.lat, s.lng))
    geoJSONMarkers.updateData(SOURCE_ID, speciesIndexToGeoJSON(validSpecies.map(s => ({
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
    }))))
  }
}

function rebuildMarkers() {
  if (!map) return

  const currentZoom = map.getZoom()

  // Use native GeoJSON for large datasets (endangered species with 4000+ points)
  if (useNativeGeoJSON && activeDataset.value === 'endangered-species' && speciesIndexData.value.length > 500) {
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

    clusterer.loadImmediate(clusterItems)

    const bounds = map.getBounds()
    const bbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(),
      bounds.getEast(), bounds.getNorth(),
    ]
    const clusters = clusterer.getClusters(bbox, currentZoom)

    clusters.forEach((cp: ClusterPoint) => {
      if (cp.type === 'cluster') {
        const onItemClick = (item: ClusterItem) => {
          const project = validProjects[item.index]
          if (project) openProjectOverlay(project)
        }
        const el = createClusterMarkerElement(activeDataset.value, cp.count, cp.items, onItemClick, validProjects)
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} projects`)
        el.addEventListener('click', (e) => {
          // If click was on a mini-marker the click handler there already handled it
          if ((e.target as HTMLElement | null)?.classList.contains('cluster-mini-hover')) return
          if (map) {
            const zoom = Math.min(Math.max(clusterer.getClusterExpansionZoom(cp.clusterId), map.getZoom() + 1), map.getMaxZoom())
            map.flyTo({ center: [cp.lng, cp.lat], zoom, duration: 500, essential: true })
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
  } else if (activeDataset.value === 'endangered-species' && speciesIndexData.value.length) {
    const data = isMobile.value
      ? speciesIndexData.value.slice(0, 80)
      : speciesIndexData.value
    const speciesToRender = data.filter(s => isValidCoordinate(s.lat, s.lng))
    const imageUrls = speciesToRender.map(s => s.imageUrl).filter((url): url is string => url !== null)

    preloadSpeciesImages(imageUrls, true, baseURL)

    const clusterItems = speciesToRender.map((s, i) => ({
      lng: s.lng,
      lat: s.lat,
      type: 'species' as const,
      index: i,
    }))

    clusterer.loadImmediate(clusterItems)

    const bounds = map.getBounds()
    const bbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(),
      bounds.getEast(), bounds.getNorth(),
    ]
    const clusters = clusterer.getClusters(bbox, currentZoom)

    clusters.forEach((cp: ClusterPoint) => {
      if (cp.type === 'cluster') {
        const onItemClick = (item: ClusterItem) => {
          const species = speciesToRender[item.index]
          if (species) openSpeciesOverlay(species)
        }
        const el = createClusterMarkerElement(activeDataset.value, cp.count, cp.items, onItemClick, undefined, speciesToRender)
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} species`)
        el.addEventListener('click', (e) => {
          if ((e.target as HTMLElement | null)?.classList.contains('cluster-mini-hover')) return
          if (map) {
            const zoom = Math.min(Math.max(clusterer.getClusterExpansionZoom(cp.clusterId), map.getZoom() + 1), map.getMaxZoom())
            map.flyTo({ center: [cp.lng, cp.lat], zoom, duration: 500, essential: true })
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
    @keyframes cluster-rainbow-spin {
      from { --a: 0deg; }
      to { --a: 360deg; }
    }
    @property --a {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }
    .species-popup-lang-bar {
      position: absolute; top: 68px; right: 16px;
      z-index: 2147483647; display: flex; flex-wrap: wrap; gap: 4px; max-width: 180px;
    }
    .species-popup-lang-btn {
      padding: 3px 8px; font-size: 10px; font-weight: 700; line-height: 1.3;
      border-radius: 4px; border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
      cursor: pointer; transition: all 0.15s ease; letter-spacing: 0.02em; text-transform: uppercase;
    }
    .species-popup-lang-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
    .species-popup-lang-btn.active {
      background: rgba(6,182,212,0.25); border-color: rgba(6,182,212,0.5); color: #67e8f9;
    }
    @keyframes flyto-pulse {
      0% { transform: scale(0.3); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.6; }
      100% { transform: scale(1); opacity: 0; }
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

watch(connectionsGlobe.showConnections, () => {
  connectionsGlobe.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', projectsData.value, speciesData.value)
  if (connectionsGlobe.showConnections.value) connectionsGlobe.startParticles()
})

watch(speciesIndexData, () => {
  if (!map) return
  if (!useNativeGeoJSON) {
    rebuildMarkers()
    return
  }
  if (geoJSONInitializedFor) {
    updateGeoJSONMarkerData()
  } else {
    rebuildMarkers()
  }
}, { deep: true })

// Rebuild species overlay when popup language changes
watch(popupLocale, () => {
  if (showSpeciesOverlay.value) rebuildSpeciesOverlay()
})

onUnmounted(() => {
  isMounted = false
  stopAutoRotate()
  if (interactionTimeout) clearTimeout(interactionTimeout)
  connectionsGlobe.cleanup()
  if (hexGridDebounceTimer) clearTimeout(hexGridDebounceTimer)
  markers.forEach(m => m.remove())
  clusterer.destroy()
  if (useNativeGeoJSON) {
    geoJSONMarkers.cleanup()
  }
  geoJSONInitializedFor = null
  clearImageCache()
  if (map) {
    map.remove()
    map = null
  }
  window.removeEventListener('resize', debouncedSetupHexGrid)
})

defineExpose({ initMap })
</script>
