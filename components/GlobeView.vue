<template>
  <div class="w-full h-[100svh] relative overflow-hidden bg-black" role="main" aria-label="3D Globe Visualization">
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
        <p class="text-gray-500 text-xs xs:text-sm">{{ t('globe.preparingData', { dataset: activeDataset === 'project-grants' ? t('home.projectGrants').toLowerCase() : activeDataset === 'active-crews' ? t('nav.activeCrews').toLowerCase() : activeDataset === 'vulcan-observatory' ? t('home.observatoryOfVulcan').toLowerCase() : t('home.species').toLowerCase() }) }}</p>
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
      <div class="absolute inset-0 pointer-events-none z-20" :style="{ boxShadow: `inset 0 0 clamp(40px, 12vw, 150px) clamp(8px, 3vw, 30px) rgba(0,0,0,0.7)` }"></div>

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
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[clamp(10rem,24vw,16rem)] object-contain" loading="lazy" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[clamp(10rem,24vw,16rem)] -rotate-90 origin-center" loading="lazy" />
    </div>

    <!-- Data Bubble: species groups or project stats (hidden for observatory) -->
    <DataBubble
      v-if="activeDataset !== 'active-crews' && activeDataset !== 'vulcan-observatory'"
      :mode="activeDataset === 'endangered-species' ? 'species' : 'projects'"
      :selected-groups="selectedSpeciesGroups"
      :projects="projectsData"
      position-top="clamp(14rem, 35vh, 19rem)"
      @toggle-group="toggleLegendGroup"
    />

    <!-- Map Controls (hidden for observatory) -->
    <MapControls
      v-if="activeDataset !== 'vulcan-observatory'"
      :is-globe-view="true"
      :show-hex-grid="isHexGridVisible"
      :show-connections="showConnectionsGlobe"
      :dataset="activeDataset"
      :projects="activeDataset === 'project-grants' ? projectsData : undefined"
      :species="activeDataset === 'endangered-species' ? speciesIndexData : undefined"
      :filter-open="showFilterPanel"
      :style="{ zIndex: 'var(--z-map-ui-controls)' }"
      @toggle-hex-grid="isHexGridVisible = !isHexGridVisible"
      @toggle-connections="toggleConnectionsGlobe"
      @toggle-filter="showFilterPanel = !showFilterPanel"
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

    <!-- Detached fullscreen crew popup overlay -->
    <div v-if="showCrewOverlay" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Crew details" @click.self="closeCrewOverlay" @keydown.esc="closeCrewOverlay">
      <button ref="crewCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeCrewOverlay" aria-label="Close crew details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="project-popup-content-fixed" v-html="crewOverlayHTML"></div>
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
import { openRareEarthOverlayPopup } from '@/lib/map-utils'
import type { Species } from '@/lib/map-utils'
import { detectWebGLSupport, getMapStyle } from '@/composables/useMapLibre'
import { useMapHexGrid } from '@/composables/useMapHexGrid'
import { useSpeciesPopup, useProjectPopup, useCrewPopup } from '@/composables/useMapPopup'
import { HEX_GRID } from '@/lib/constants'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import { allCrewRegionsData } from '@/lib/crew-data'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { useSpeciesPanel } from '@/composables/useSpeciesPanel'
import { useMapConnections } from '@/composables/useMapConnections'
import { useMapMarkerOrchestrator } from '@/composables/useMapMarkerOrchestrator'
import { useRareEarthController } from '@/composables/useRareEarthController'

const { t, locale, localeNames } = useI18n()
const speciesPanel = useSpeciesPanel()
const baseURL = useRuntimeConfig().app.baseURL

const isMobile = useMediaQuery('(max-width: 768px)')
const containerRef = ref<HTMLDivElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)

// ── Popup composables ──
const speciesPopup = useSpeciesPopup(baseURL)
const projectPopup = useProjectPopup()

const {
  showOverlay: showSpeciesOverlay,
  overlayHTML: speciesOverlayHTML,
  popupLocale,
  availableLocales: availablePopupLocales,
  closeBtnRef: speciesCloseBtnRef,
  open: openSpeciesPopup,
  close: closeSpeciesPopup,
  rebuild: rebuildSpeciesPopup,
} = speciesPopup
const {
  showOverlay: showProjectOverlay,
  overlayHTML: projectOverlayHTML,
  closeBtnRef: projectCloseBtnRef,
  open: openProjectPopup,
  close: closeProjectPopup,
} = projectPopup

const crewPopup = useCrewPopup()
const {
  showOverlay: showCrewOverlay,
  overlayHTML: crewOverlayHTML,
  closeBtnRef: crewCloseBtnRef,
  open: openCrewPopup,
  close: closeCrewPopup,
} = crewPopup

// ── Hex grid composable (globe-specific sizes) ──
const hexGrid = useMapHexGrid(hexCanvasRef, {
  mobileSize: HEX_GRID.mobileSizeGlobe,
  desktopSize: HEX_GRID.desktopSizeGlobe,
  strokeColor: HEX_GRID.strokeColorGlobe,
  lineWidth: HEX_GRID.lineWidthGlobe,
})
const onResize = hexGrid.debouncedSetup

// Template backward-compat wrappers
function openSpeciesOverlay(species: Species | SpeciesIndexItem) {
  lastFocusedEl = document.activeElement as HTMLElement
  openSpeciesPopup(species)
}
function closeSpeciesOverlay() {
  closeSpeciesPopup()
  nextTick(() => lastFocusedEl?.focus())
}
function rebuildSpeciesOverlay() { rebuildSpeciesPopup() }
function openProjectOverlay(project: ProjectData) {
  lastFocusedEl = document.activeElement as HTMLElement
  openProjectPopup(project)
}
function closeProjectOverlay() {
  closeProjectPopup()
  nextTick(() => lastFocusedEl?.focus())
}
function openCrewOverlay(crew: CrewRegionData | CrewLocation) {
  lastFocusedEl = document.activeElement as HTMLElement
  openCrewPopup(crew)
}
function closeCrewOverlay() {
  closeCrewPopup()
  nextTick(() => lastFocusedEl?.focus())
}
function handleSpeciesSelected(species: SpeciesIndexItem) {
  speciesPanel.closePanel()
  openSpeciesOverlay(species)
}

interface Props {
  projects?: ProjectData[]
  species?: Species[]
  speciesIndex?: SpeciesIndexItem[]
  crews?: CrewRegionData[]
  crewLocations?: CrewLocation[]
  showHexGrid?: boolean
  defaultDataset?: 'project-grants' | 'endangered-species' | 'active-crews' | 'vulcan-observatory'
  // Observatory (rare earth) props
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthProtected?: GeoJSON.FeatureCollection
  layerVisibility?: Record<string, boolean>
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null
}

const props = withDefaults(defineProps<Props>(), {
  showHexGrid: true,
  defaultDataset: 'project-grants',
})

const projectsData = computed(() => props.projects || allProjectsData)
const speciesData = computed(() => props.species || [])
const speciesIndexData = computed(() => props.speciesIndex || [])
const crewsData = computed(() => props.crews || allCrewRegionsData)
const crewLocationsData = computed(() => props.crewLocations || [])

const hasError = ref(false)
const errorMessage = ref('')
const noWebglSupport = ref(false)
const isLoading = ref(true)
const activeDataset = ref<'project-grants' | 'endangered-species' | 'active-crews' | 'vulcan-observatory'>(props.defaultDataset)
const { showHexGrid: isHexGridVisible } = hexGrid
const selectedSpeciesGroups = ref<string[]>([])
const showFilterPanel = ref(false)

let map: maplibregl.Map | null = null
let isMounted = true
let loadingTimeout: ReturnType<typeof setTimeout> | null = null
let pendingVisibilityUpdate = false
let pendingRebuildRAF: number | null = null
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

const mapRef = computed(() => map)

// ── Marker orchestrator (shared composable) ──
const orchestrator = useMapMarkerOrchestrator({
  map: mapRef as Ref<maplibregl.Map | null>,
  locale,
  isMobile,
  baseURL,
  defaultDataset: props.defaultDataset,
  isGlobe: true,
  callbacks: {
    openProjectOverlay: (project: ProjectData) => openProjectOverlay(project),
    openSpeciesOverlay: (species: Species | SpeciesIndexItem) => openSpeciesOverlay(species),
    openCrewOverlay: (crew: CrewRegionData | CrewLocation) => openCrewOverlay(crew),
    openRareEarthOverlay: (feature: GeoJSON.Feature) => openRareEarthOverlay(feature),
  },
})

// ── Rare Earth controller (observatory) ──
const rareEarthController = useRareEarthController({
  map: mapRef as Ref<maplibregl.Map | null>,
  isActive: computed(() => activeDataset.value === 'vulcan-observatory'),
  getProps: () => ({
    rareEarthPoints: props.rareEarthPoints,
    rareEarthPolygons: props.rareEarthPolygons,
    rareEarthProtected: props.rareEarthProtected,
    layerVisibility: props.layerVisibility,
    flyToTarget: props.flyToTarget,
  }),
  popup: { t, locale },
})

const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''

const MAP_STYLE = getMapStyle(MAPTILER_API_KEY)

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

  // Detect WebGL support before attempting to create map
  if (!detectWebGLSupport()) {
    noWebglSupport.value = true
    isLoading.value = false
    hasError.value = true
    errorMessage.value = 'WebGL is not supported in your browser. Please use a modern browser that supports WebGL.'
    return
  }

  noWebglSupport.value = false
  isLoading.value = true

  // Cancel pending RAFs from previous map lifecycle
  if (pendingRebuildRAF) { cancelAnimationFrame(pendingRebuildRAF); pendingRebuildRAF = null }
  pendingVisibilityUpdate = false
  // Clean up existing map if retry
  window.removeEventListener('resize', onResize)
  if (map) {
    stopAutoRotate()
    if (interactionTimeout) clearTimeout(interactionTimeout)
    orchestrator.cleanup()
    map.remove()
    map = null
  }

  try {

    const isRee = activeDataset.value === 'vulcan-observatory'
    map = new maplibregl.Map({
      container: containerRef.value,
      style: MAP_STYLE,
      zoom: isRee ? 4.2 : isMobile.value ? 1.5 : 2.5,
      center: isRee ? [-48, -15] : [0, 20],
      attributionControl: false,
      renderWorldCopies: false,
      fadeDuration: 100,
      maxTileCacheSize: 200,
      maxTileCacheZoomLevels: 5,
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
      console.error('Error setting globe projection:', e)
        }
      }
    })

    map.on('load', () => {

      isLoading.value = false
      if (activeDataset.value === 'vulcan-observatory') {
        rareEarthController.setupLayers()
      }
      rebuildMarkers()
      if (activeDataset.value !== 'active-crews' && activeDataset.value !== 'vulcan-observatory') {
        connectionsGlobe.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', projectsData.value, speciesData.value)
        connectionsGlobe.startParticles()
      }
      hexGrid.setupHexGrid()
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

    map.on('move', () => {
      if (!pendingVisibilityUpdate) {
        pendingVisibilityUpdate = true
        requestAnimationFrame(() => {
          updateMarkerVisibility()
          pendingVisibilityUpdate = false
        })
      }
    })

    map.on('moveend', () => {
      updateMarkerVisibility()
      if (!map) return
      if (pendingRebuildRAF) { cancelAnimationFrame(pendingRebuildRAF); pendingRebuildRAF = null }
      pendingRebuildRAF = requestAnimationFrame(() => {
        pendingRebuildRAF = null
        if (!map) return
        const currentZoom = Math.floor(map.getZoom())
        if (orchestrator.mapCore.shouldRebuildClusters(map, currentZoom, orchestrator.lastClusterZoom, orchestrator.lastBboxCenter)) {
          rebuildMarkers()
        }
      })
    })

    let errorCount = 0
    let usedFallback = false

    map.on('error', (err) => {
      console.error('[GlobeView] MapLibre error:', err)
      errorCount++
      if (!usedFallback && errorCount >= 2 && MAP_STYLE.includes('maptiler.com')) {
        usedFallback = true
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
    loadingTimeout = setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false
        if (!hasError.value) {
          hasError.value = true
          errorMessage.value = 'Globe tiles took too long to load. Please check your network connection and try again.'
        }
      }
    }, 20000)
  } catch (err) {
    console.error('[GlobeView] Failed to initialize map:', err)
    isLoading.value = false
    hasError.value = true
  }
}

function updateMarkerVisibility() {
  orchestrator.updateMarkerVisibility()
}


const useNativeGeoJSON = orchestrator.useNativeGeoJSON

function toggleLegendGroup(group: string | number) {
  const g = String(group)
  const idx = selectedSpeciesGroups.value.indexOf(g)
  if (idx === -1) {
    selectedSpeciesGroups.value = [...selectedSpeciesGroups.value, g]
  } else {
    selectedSpeciesGroups.value = selectedSpeciesGroups.value.filter(x => x !== g)
  }
}

function updateGeoJSONMarkerData() {
  if (!map) return
  orchestrator.updateGeoJSONMarkerData(
    activeDataset.value,
    projectsData.value,
    speciesIndexData.value,
    speciesData.value,
    selectedSpeciesGroups.value,
  )
}

function rebuildMarkers() {
  if (!map) return
  orchestrator.rebuildMarkers(
    activeDataset.value,
    projectsData.value,
    speciesIndexData.value,
    speciesData.value,
    crewsData.value,
    crewLocationsData.value,
    selectedSpeciesGroups.value,
    props.rareEarthPoints?.features,
  )
}

function navigateToLocation(lat: number, lng: number) {
  if (map) {
    map.flyTo({ center: [lng, lat], zoom: isMobile.value ? 3 : 4, duration: 1500, essential: true })
  }
}

function openRareEarthOverlay(feature: GeoJSON.Feature) {
  openRareEarthOverlayPopup(map!, feature)
}

// Hex grid is now handled by useMapHexGrid composable

// Globe-specific inline styles removed — moved to scoped <style> block below

onMounted(() => {

  initMap()
  window.addEventListener('resize', onResize)
})

watch(locale, () => {
  rebuildMarkers()
})

watch(isHexGridVisible, async (visible) => {
  if (!visible) return
  await nextTick()
  hexGrid.setupHexGrid()
})

watch(connectionsGlobe.showConnections, () => {
  if (activeDataset.value === 'active-crews') return
  connectionsGlobe.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', projectsData.value, speciesData.value)
  if (connectionsGlobe.showConnections.value) connectionsGlobe.startParticles()
})

watch(speciesIndexData, () => {
  if (!map) return
  if (!useNativeGeoJSON) {
    rebuildMarkers()
    return
  }
  if (orchestrator.geoJSONInitializedFor) {
    updateGeoJSONMarkerData()
  } else {
    rebuildMarkers()
  }
})

// Fly-to target from parent (for all datasets)
watch(() => props.flyToTarget, (target) => {
  if (!target || !map) return
  map.flyTo({
    center: [target.lng, target.lat],
    zoom: target.zoom ?? 5,
    duration: 1500,
    essential: true,
  })
}, { deep: true })

// Rebuild species overlay when popup language changes
watch(popupLocale, () => {
  if (showSpeciesOverlay.value) rebuildSpeciesOverlay()
})

onUnmounted(() => {
  isMounted = false
  stopAutoRotate()
  if (interactionTimeout) clearTimeout(interactionTimeout)
  if (loadingTimeout) clearTimeout(loadingTimeout)
  connectionsGlobe.cleanup()
  orchestrator.cleanup()
  if (map) {
    map.remove()
    map = null
  }
  window.removeEventListener('resize', onResize)
})

defineExpose({ initMap })
</script>

<style>
@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0; }
  50% { transform: scale(1.1); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0; }
}
.maplibregl-map {
  background-color: transparent !important;
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
</style>
