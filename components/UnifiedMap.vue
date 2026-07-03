<template>
  <div class="w-full h-[100svh] relative overflow-hidden bg-black" role="main" aria-label="Interactive Map Visualization">
    <!-- Loading skeleton -->
    <Transition name="fade">
      <div v-if="isLoading" class="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
        <div class="relative mb-5 xs:mb-6">
          <div class="w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <div class="absolute inset-0 w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/10 border-b-white/50 animate-spin" style="animation-delay: 0.5s; animation-direction: reverse" />
        </div>
        <p class="text-white font-medium mb-1.5 xs:mb-2 text-sm xs:text-base">{{ t('general.loading') }}</p>
        <p class="text-gray-500 text-xs xs:text-sm">{{ t('globe.preparingData', { dataset: activeDataset === 'project-grants' ? t('home.projectGrants').toLowerCase() : activeDataset === 'endangered-species' ? t('home.species').toLowerCase() : t('home.observatoryOfVulcan').toLowerCase() }) }}</p>
        <div class="mt-3 xs:mt-4 flex gap-1">
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-1" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-2" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-3" />
        </div>
      </div>
    </Transition>

    <!-- Background effects -->
    <div class="absolute inset-0 bg-black/5 dark:bg-white/5 pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }" />

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
      class="absolute inset-0 pointer-events-none opacity-[0.015]"
      :style="{
        zIndex: 'calc(var(--z-map-effects) + 3)',
        backgroundImage: `image-set(url(${baseURL}scanline.gif) 1x, url(${baseURL}scanline.gif) 2x)`,
        backgroundRepeat: 'repeat',
      }"
    />

    <!-- Vignette -->
    <div aria-hidden="true" class="absolute inset-0 pointer-events-none" :style="{ zIndex: 'var(--z-map-overlays)',     boxShadow: 'inset 0 0 clamp(30px, 8vw, 100px) clamp(5px, 2vw, 15px) rgba(0,0,0,0.5)' }" />

    <!-- Hex grid overlay -->
    <canvas v-if="showHexGrid" ref="hexCanvasRef" aria-hidden="true" class="absolute inset-0 w-full h-full pointer-events-none opacity-20" :style="{ zIndex: 'var(--z-map-hex-grid)' }" />

    <!-- Animated background elements -->
    <div aria-hidden="true" class="absolute inset-0 overflow-hidden pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }">
      <div :class="`absolute top-0 left-0 w-full h-full ${isMobile ? 'opacity-5' : 'opacity-10'}`">
        <div class="absolute top-0 left-0 w-1/3 h-1/3 bg-cyan-500/20 blur-3xl animate-pulse-slow" />
        <template v-if="!isMobile">
          <div class="absolute bottom-0 right-0 w-1/3 h-1/3 bg-purple-500/20 blur-3xl animate-pulse-slow-delay" />
          <div class="absolute top-1/2 right-1/4 w-1/4 h-1/4 bg-pink-500/20 blur-3xl animate-pulse-slow-delay-2" />
        </template>
      </div>
    </div>

    <!-- Earth Guardians Banner - Mobile optimized -->
    <div v-if="isMobile" class="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none px-2 sm:px-3" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[clamp(10rem,24vw,16rem)] object-contain" loading="lazy" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[clamp(10rem,24vw,16rem)] -rotate-90 origin-center" loading="lazy" />
    </div>

    <!-- Map Container -->
    <div ref="mapContainerRef" class="absolute inset-0 w-full h-full" :style="{ zIndex: 'var(--z-map-base)' }" />

    <!-- Custom overlays slot (used by vulcan-observatory) -->
    <slot name="overlays" />

    <!-- Project filter panel -->
    <ProjectFilterPanel
      v-if="activeDataset === 'project-grants' && showFilterPanel"
      :projects="projectsData"
      @filter-change="handleProjectFilterChange"
    />

    <!-- Species filter panel (for endangered species) -->
    <SpeciesFilterPanel
      v-if="activeDataset === 'endangered-species' && showFilterPanel"
      ref="speciesFilterPanelRef"
      :species="speciesIndexData"
      @filter-change="handleFilterChange"
      @group-selection-change="handleSpeciesGroupSelection"
      @close="showFilterPanel = false"
    />

    <!-- Data Bubble: species groups or project stats (hidden for observatory) -->
    <DataBubble
      v-if="activeDataset !== 'vulcan-observatory'"
      :mode="activeDataset === 'endangered-species' ? 'species' : 'projects'"
      :selected-groups="selectedSpeciesGroups"
      :projects="visibleProjects"
      position-top="clamp(16rem, 40vh, 22rem)"
      @toggle-group="toggleLegendGroup"
    />

    <!-- Map Controls (hidden for observatory — uses custom overlays slot) -->
    <MapControls
      v-if="activeDataset !== 'vulcan-observatory'"
      :is-globe-view="false"
      :show-hex-grid="showHexGrid"
      :show-connections="showConnections2D"
      :dataset="activeDataset"
      :projects="activeDataset === 'project-grants' ? visibleProjects : undefined"
      :species="activeDataset === 'endangered-species' ? speciesIndexData : undefined"
      :filter-open="showFilterPanel"
      @toggle-hex-grid="showHexGrid = !showHexGrid"
      @toggle-connections="toggleConnections2D"
      @toggle-filter="showFilterPanel = !showFilterPanel"
      @search-open-change="handleSearchOpenChange"
      @navigate="navigateToLocation"
      :style="{ zIndex: 'var(--z-map-ui-controls)' }"
    />

    <!-- Error state -->
    <Transition name="fade">
      <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[var(--z-map-error-overlay)]">
        <div class="relative mb-6">
          <div class="w-16 h-16 rounded-full bg-[var(--text-primary)]/10 animate-pulse" />
          <iconify-icon icon="lucide:alert-triangle" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[var(--text-primary)]" />
        </div>
        <p class="text-gray-400 mb-4 text-center px-4 max-w-md">{{ errorMessage || t('globe.connectionError') }}</p>
        <button v-if="!noWebglSupport" @click="() => { hasError = false; initMap() }" class="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-medium hover:opacity-80 transition-all duration-300 flex items-center gap-2">
          <iconify-icon icon="lucide:refresh-cw" class="h-4 w-4" />
          {{ t('globe.tryAgain') }}
        </button>
      </div>
    </Transition>

    <!-- Detached fullscreen species popup overlay -->
    <div v-if="showSpeciesOverlay" ref="speciesOverlayRef" class="species-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Species details" @click.self="closeSpeciesOverlay" @keydown.esc="closeSpeciesOverlay">
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
    <div v-if="showProjectOverlay" ref="projectOverlayRef" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Project details" @click.self="closeProjectOverlay" @keydown.esc="closeProjectOverlay">
      <button ref="projectCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeProjectOverlay" aria-label="Close project details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="project-popup-content-fixed" v-html="projectOverlayHTML"></div>
    </div>

    <!-- Detached fullscreen crew popup overlay -->
    <div v-if="showCrewOverlay" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Crew region details" @click.self="closeCrewOverlay" @keydown.esc="closeCrewOverlay">
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
import { useFocusTrap } from '@/composables/useFocusTrap'
import { allProjectsData } from '@/lib/project-data'
import type { ProjectData } from '@/lib/types'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import type { Species } from '@/lib/map-utils'
import { openRareEarthOverlayPopup } from '@/lib/map-utils'
import { detectWebGLSupport, getMapStyle } from '@/composables/useMapLibre'
import { useMapHexGrid } from '@/composables/useMapHexGrid'
import { useSpeciesPopup, useProjectPopup, useCrewPopup } from '@/composables/useMapPopup'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { useRareEarthController } from '@/composables/useRareEarthController'
import { useSpeciesPanel } from '@/composables/useSpeciesPanel'
import { useMapConnections } from '@/composables/useMapConnections'
import { useMapMarkerOrchestrator } from '@/composables/useMapMarkerOrchestrator'

const { t, locale, localeNames } = useI18n()
const speciesPanel = useSpeciesPanel()

const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''
const baseURL = useRuntimeConfig().app.baseURL

const MAP_STYLE = getMapStyle(MAPTILER_API_KEY)

interface Props {
  projects?: ProjectData[]
  species?: Species[]
  speciesIndex?: SpeciesIndexItem[]  // Lightweight index for markers
  defaultDataset?: 'project-grants' | 'endangered-species' | 'vulcan-observatory' | 'active-crews'
  crews?: CrewRegionData[]
  crewLocations?: CrewLocation[]
  // Rare Earth dataset (vulcan-observatory)
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthProtected?: GeoJSON.FeatureCollection
  rareEarthWater?: GeoJSON.FeatureCollection
  rareEarthCultural?: GeoJSON.FeatureCollection
  rareEarthAnalysis?: Record<string, unknown>
  layerVisibility?: Record<string, boolean>  // Controlled by parent for rare earth
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null  // Parent can trigger fly-to
}

const emit = defineEmits<{ mapInit: [map: maplibregl.Map] }>()

const props = withDefaults(defineProps<Props>(), {
  defaultDataset: 'project-grants',
})
const projectsData = computed(() => props.projects || allProjectsData)
const crewsData = computed(() => props.crews || [])
const crewLocationsData = computed(() => props.crewLocations || [])
const speciesData = computed(() => props.species || [])
const speciesIndexData = computed(() => props.speciesIndex || [])
const filteredProjectsList = ref<ProjectData[] | null>(null)
const filteredSpeciesList = ref<SpeciesIndexItem[] | null>(null)
const visibleProjects = computed(() => filteredProjectsList.value ?? projectsData.value)
const visibleSpecies = computed(() => {
  const list = filteredSpeciesList.value ?? (activeDataset.value === 'endangered-species' ? speciesIndexData.value : speciesData.value)
  console.warn(`[UnifiedMap] visibleSpecies: ${list.length} items (dataset=${activeDataset.value}, filtered=${!!filteredSpeciesList.value})`)
  return list
})



const isMobile = useMediaQuery('(max-width: 768px)')
const mapContainerRef = ref<HTMLDivElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
const speciesFilterPanelRef = ref<{ toggleTaxonomicGroup: (_group: string) => void } | null>(null)
const selectedSpeciesGroups = ref<string[]>([])
const showFilterPanel = ref(false)
const activeDataset = ref<'project-grants' | 'endangered-species' | 'vulcan-observatory' | 'active-crews'>(props.defaultDataset)

const connections2D = useMapConnections(
  () => map,
  mapContainerRef as import('vue').Ref<HTMLElement | null>,
  { zIndex: 2 },
)
const { showConnections: showConnections2D, toggleConnections: toggleConnections2D } = connections2D
const hasError = ref(false)
const errorMessage = ref('')
const noWebglSupport = ref(false)
const isLoading = ref(true)
// ── Popup composables (each handles its own state, i18n, and focus) ──
const speciesPopup = useSpeciesPopup(baseURL)
const projectPopup = useProjectPopup()
const crewPopup = useCrewPopup()

// Destructure for template binding (keeps template unchanged)
const {
  showOverlay: showSpeciesOverlay,
  overlayHTML: speciesOverlayHTML,
  popupLocale,
  availableLocales: availablePopupLocales,
  closeBtnRef: speciesCloseBtnRef,
  overlayRef: speciesOverlayRef,
  open: openSpeciesPopup,
  close: closeSpeciesPopup,
  rebuild: rebuildSpeciesPopup,
} = speciesPopup
const {
  showOverlay: showProjectOverlay,
  overlayHTML: projectOverlayHTML,
  closeBtnRef: projectCloseBtnRef,
  overlayRef: projectOverlayRef,
  open: openProjectPopup,
  close: closeProjectPopup,
} = projectPopup
const {
  showOverlay: showCrewOverlay,
  overlayHTML: crewOverlayHTML,
  closeBtnRef: crewCloseBtnRef,
  open: openCrewPopup,
  close: closeCrewPopup,
} = crewPopup

// ── Shared map core (i18n, species helpers, visibility, cluster logic) ──

// ── Hex grid composable ──
const hexGrid = useMapHexGrid(hexCanvasRef)
const { showHexGrid } = hexGrid
const onResize = hexGrid.debouncedSetup

// Wrapper functions for template backward-compat
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
function openCrewOverlay(crew: CrewRegionData) {
  lastFocusedEl = document.activeElement as HTMLElement
  openCrewPopup(crew)
}
function closeCrewOverlay() {
  closeCrewPopup()
  nextTick(() => lastFocusedEl?.focus())
}
function openCrewLocationOverlay(crew: CrewLocation) {
  lastFocusedEl = document.activeElement as HTMLElement
  crewPopup.open(crew)
}
function handleSpeciesSelected(species: SpeciesIndexItem) {
  speciesPanel.closePanel()
  openSpeciesOverlay(species)
}

function openRareEarthOverlay(feature: GeoJSON.Feature) {
  openRareEarthOverlayPopup(map!, feature)
}

let map: maplibregl.Map | null = null
let isMounted = true
let loadingTimeout: ReturnType<typeof setTimeout> | null = null
let pendingVisibilityUpdate = false
let pendingRebuildRAF: number | null = null
let lastFocusedEl: HTMLElement | null = null

const speciesOverlayActive = computed(() => showSpeciesOverlay.value)
const projectOverlayActive = computed(() => showProjectOverlay.value)
useFocusTrap(speciesOverlayRef, { active: speciesOverlayActive })
useFocusTrap(projectOverlayRef, { active: projectOverlayActive })

function toggleLegendGroup(group: string | number) {
  speciesFilterPanelRef.value?.toggleTaxonomicGroup(String(group))
}

function handleSpeciesGroupSelection(groups: string[]) {
  selectedSpeciesGroups.value = groups
}

// Dynamically adjust popup size and position to show fully on screen

const mapRef = computed(() => map)

// ── Marker orchestrator (shared composable) ──
const orchestrator = useMapMarkerOrchestrator({
  map: mapRef as Ref<maplibregl.Map | null>,
  locale,
  isMobile,
  baseURL,
  defaultDataset: props.defaultDataset,
  callbacks: {
    openProjectOverlay: (project: ProjectData) => openProjectOverlay(project),
    openSpeciesOverlay: (species: Species | SpeciesIndexItem) => openSpeciesOverlay(species),
    openCrewOverlay: (crew: CrewRegionData | CrewLocation) => openCrewOverlay(crew as CrewRegionData),
    openCrewLocationOverlay: (crew: CrewLocation) => openCrewLocationOverlay(crew),
    openRareEarthOverlay: (feature: GeoJSON.Feature) => openRareEarthOverlay(feature),
  },
})

const useNativeGeoJSON = orchestrator.useNativeGeoJSON

function handleFilterChange(filtered: SpeciesIndexItem[]) {
  filteredSpeciesList.value = filtered
  syncAfterFilter()
}

function handleProjectFilterChange(filtered: ProjectData[]) {
  filteredProjectsList.value = filtered
  syncAfterFilter()
}

let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null

function syncAfterFilter() {
  if (filterDebounceTimer) clearTimeout(filterDebounceTimer)
  filterDebounceTimer = setTimeout(() => {
    filterDebounceTimer = null
    rebuildMarkers()
    connections2D.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
    if (connections2D.showConnections.value) connections2D.startParticles()
  }, 16)
}

function handleSearchOpenChange(open: boolean) {
  if (open && isMobile.value) {
    showFilterPanel.value = false
  }
}

const geoJSONInitializedFor = computed(() => orchestrator.geoJSONInitializedFor)

function updateGeoJSONMarkerData() {
  if (!map) return
  orchestrator.updateGeoJSONMarkerData(
    activeDataset.value,
    visibleProjects.value,
    speciesIndexData.value,
    speciesData.value,
    selectedSpeciesGroups.value,
  )
}

function setupRareEarthLayers() {
  rareEarthController.setupLayers()
}

const rareEarthController = useRareEarthController({
  map: mapRef as Ref<maplibregl.Map | null>,
  isActive: computed(() => activeDataset.value === 'vulcan-observatory'),
  getProps: () => props,
  popup: {
    t,
    locale,
  },
})

// Fallback rebuildMarkers using DOM markers (for smaller datasets or when GeoJSON isn't available)
function rebuildMarkers() {
  if (!map) return
  console.warn(`[UnifiedMap] rebuildMarkers: dataset=${activeDataset.value}, speciesIndex=${speciesIndexData.value.length}, speciesData=${speciesData.value.length}, projects=${visibleProjects.value.length}`)
  orchestrator.rebuildMarkers(
    activeDataset.value,
    visibleProjects.value,
    speciesIndexData.value,
    speciesData.value,
    crewsData.value,
    crewLocationsData.value,
    selectedSpeciesGroups.value,
    props.rareEarthPoints?.features,
  )
}

function updateMarkerVisibility() {
  orchestrator.updateMarkerVisibility()
}



function navigateToLocation(lat: number, lng: number) {
  if (map) {
    map.flyTo({ center: [lng, lat], zoom: 6, duration: 1500, essential: true })
  }
}

// Hex grid is now handled by useMapHexGrid composable (hexGrid.setupHexGrid / hexGrid.debouncedSetup)

function initMap() {

  if (!mapContainerRef.value) return

  // Detect WebGL support before attempting to create map
  if (!detectWebGLSupport()) {
    noWebglSupport.value = true
    isLoading.value = false
    hasError.value = true
    errorMessage.value = 'WebGL is not supported in your browser. Please use a modern browser that supports WebGL.'
    return
  }

  // Cancel pending RAFs from previous map lifecycle
  if (pendingRebuildRAF) { cancelAnimationFrame(pendingRebuildRAF); pendingRebuildRAF = null }
  pendingVisibilityUpdate = false

  // Clean up existing map if retry
  window.removeEventListener('resize', onResize)
  if (map) {
    orchestrator.cleanup()
    map.remove()
    map = null
  }

  noWebglSupport.value = false
  isLoading.value = true

  try {
    const isRee = activeDataset.value === 'vulcan-observatory'

    map = new maplibregl.Map({
      container: mapContainerRef.value,
      style: MAP_STYLE,
      zoom: isRee ? 9.5 : isMobile.value ? 1.8 : 3,
      center: isRee ? [-46.533, -21.914] : [0, 0],
      attributionControl: false,
      renderWorldCopies: true,
      minZoom: isRee ? 2.5 : isMobile.value ? 0.5 : 1.5,
      maxZoom: isRee ? 16 : 18,
      fadeDuration: 100,
      maxTileCacheSize: 200,
      maxTileCacheZoomLevels: 5,
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

      if (!isMounted) return
      isLoading.value = false
      if (map) emit('mapInit', map)
      if (activeDataset.value === 'vulcan-observatory') {
        setupRareEarthLayers()
      }
      rebuildMarkers()
      if (activeDataset.value !== 'vulcan-observatory') {
        connections2D.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
        connections2D.startParticles()
      }
      hexGrid.setupHexGrid()
    })

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
      const usingNativeGeoJSON = useNativeGeoJSON && activeDataset.value === 'endangered-species' && speciesIndexData.value.length > 500
      if (usingNativeGeoJSON) return
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

    map.on('resize', () => {
      hexGrid.debouncedSetup()
    })

    let errorCount = 0
    let usedFallback = false

    map.on('error', (err) => {
      console.error('[UnifiedMap] MapLibre error:', err)
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
          errorMessage.value = 'Failed to load map tiles. Please check your network connection and try again.'
        }
      }
    })

    // Timeout fallback — show error instead of silently hiding loading
    loadingTimeout = setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false
        if (!hasError.value) {
          hasError.value = true
          errorMessage.value = 'Map tiles took too long to load. Please check your network connection and try again.'
        }
      }
    }, 20000)

    window.addEventListener('resize', onResize)
  } catch (err) {
    console.error('[UnifiedMap] Failed to initialize map:', err)
    isLoading.value = false
    hasError.value = true
  }
}

onMounted(() => {

  showFilterPanel.value = !isMobile.value
  initMap()
})

watch(isMobile, (mobile) => {
  showFilterPanel.value = !mobile
})

watch(locale, () => {
  rebuildMarkers()
})

watch(crewLocationsData, () => {
  if (!map || activeDataset.value !== 'active-crews') return
  rebuildMarkers()
})

// In-place data update when filters change. Avoids the full teardown +
// re-setup cycle (re-fetching the species index, re-installing handlers,
// re-adding the source/layers) by calling setData on the existing source.
// Falls back to rebuildMarkers() if the GeoJSON source isn't ready yet
// (first paint, dataset switch, etc.).
watch([visibleSpecies, visibleProjects, selectedSpeciesGroups, speciesIndexData], () => {
  console.warn(`[UnifiedMap] watch triggered: dataset=${activeDataset.value}, visibleSpecies=${visibleSpecies.value.length}, speciesIndex=${speciesIndexData.value.length}, geoJSONInit=${!!geoJSONInitializedFor.value}`)
  if (!map) return
  if (!useNativeGeoJSON) {
    rebuildMarkers()
    return
  }
  if (geoJSONInitializedFor.value) {
    updateGeoJSONMarkerData()
  } else {
    rebuildMarkers()
  }
})

// Watch rare earth data changes (vulcan-observatory) to rebuild markers
watch(() => [props.rareEarthPoints, props.rareEarthPolygons], () => {
  if (!map || activeDataset.value !== 'vulcan-observatory') return
  setupRareEarthLayers()
  rebuildMarkers()
})

watch(showHexGrid, async (visible) => {
  if (!visible) return
  await nextTick()
  hexGrid.setupHexGrid()
})

watch(connections2D.showConnections, () => {
  connections2D.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
  if (connections2D.showConnections.value) connections2D.startParticles()
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

// Pause particles when overlay is open to save CPU
watch([showSpeciesOverlay, showProjectOverlay, showCrewOverlay], ([speciesOpen, projectOpen, crewOpen]) => {
  if (speciesOpen || projectOpen || crewOpen) {
    connections2D.cleanupParticles()
  } else if (connections2D.showConnections.value) {
    connections2D.startParticles()
  }
})

// Rebuild species overlay when popup language changes
watch(popupLocale, () => {
  if (showSpeciesOverlay.value) rebuildSpeciesOverlay()
})

onUnmounted(() => {
  isMounted = false
  if (loadingTimeout) clearTimeout(loadingTimeout)
  connections2D.cleanup()
  orchestrator.cleanup()
  window.removeEventListener('resize', onResize)
  if (map) {
    map.remove()
    map = null
  }
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

.maplibregl-popup-content {
  background: rgba(0, 0, 0, 0.95) !important;
  border-radius: clamp(0.375rem, 1vw, 0.5rem) !important;
  border: 1px solid rgba(6, 182, 212, 0.4) !important;
  box-shadow: 0 0 30px rgba(6, 182, 212, 0.2), inset 0 0 15px rgba(6, 182, 212, 0.05) !important;
  padding: 0 !important;
  min-width: clamp(14rem, 18vw, 16.25rem);
  max-width: calc(100vw - 2rem) !important;
  max-height: calc(100vh - 2rem) !important;
  overflow: visible !important;
  overflow-y: auto !important;
  word-wrap: break-word !important;
  white-space: normal !important;
}

.maplibregl-popup.cyberpunk-popup {
  z-index: 2147483647 !important;
  pointer-events: auto !important;
}

.maplibregl-popup.cyberpunk-popup .maplibregl-popup-content {
  width: auto !important;
  min-width: clamp(15rem, 22vw, 17.5rem) !important;
  max-width: min(35rem, calc(100vw - 2rem)) !important;
  max-height: calc(100vh - 3.75rem) !important;
  overflow-y: auto !important;
}

.maplibregl-popup-anchor-top .maplibregl-popup-tip {
  bottom: -10px !important;
}

.maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
  top: -10px !important;
}

.maplibregl-marker {
  pointer-events: auto;
  z-index: 10;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  will-change: transform;
}

.maplibregl-popup-tip {
  border-top-color: rgba(6, 182, 212, 0.8) !important;
  border-bottom-color: rgba(6, 182, 212, 0.8) !important;
}

.maplibregl-popup-close-button {
  color: rgba(6, 182, 212, 0.8) !important;
  font-size: clamp(1rem, 1.5vw, 1.125rem) !important;
  padding: 0.25rem 0.5rem !important;
  background: transparent !important;
  border: none !important;
  top: 0.5rem !important;
  right: 0.5rem !important;
}

.maplibregl-popup-close-button:hover {
  background-color: rgba(6, 182, 212, 0.2) !important;
  color: rgba(6, 182, 212, 1) !important;
}

.maplibregl-ctrl-bottom-right {
  margin-bottom: clamp(0.375rem, 1vw, 0.5rem);
  margin-right: clamp(0.375rem, 1vw, 0.5rem);
}

.maplibregl-ctrl-attrib-inner {
  color: rgba(255, 255, 255, 0.7);
  font-size: clamp(0.5625rem, 0.8vw, 0.625rem);
  background-color: rgba(0, 0, 0, 0.6);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}

/* Project Popup Styles */
.project-popup-wrapper {
  padding: clamp(0.75rem, 2vw, 1rem);
  min-width: clamp(14rem, 18vw, 16.25rem);
  width: min(26.25rem, calc(100vw - 2rem));
  max-width: calc(100vw - 2rem);
  word-wrap: break-word;
  white-space: normal;
  overflow: hidden;
}
.project-popup-header {
  position: relative;
  padding-bottom: clamp(0.5rem, 1.5vw, 0.75rem);
  margin-bottom: clamp(0.5rem, 1.5vw, 0.75rem);
}
.project-corner-accent {
  position: absolute;
  width: clamp(0.625rem, 1vw, 0.75rem);
  height: clamp(0.625rem, 1vw, 0.75rem);
  border: 0.125rem solid rgba(6, 182, 212, 0.5);
}
.project-corner-accent.top-left {
  top: -0.25rem;
  left: -0.25rem;
  border-right: none;
  border-bottom: none;
}
.project-corner-accent.top-right {
  top: -0.25rem;
  right: -0.25rem;
  border-left: none;
  border-bottom: none;
}
.project-header-content {
  position: relative;
  z-index: 1;
}
.project-status-bar {
  display: flex;
  align-items: center;
  gap: clamp(0.375rem, 1vw, 0.5rem);
  margin-bottom: clamp(0.375rem, 1vw, 0.5rem);
}
.project-badge {
  font-size: clamp(0.5625rem, 0.8vw, 0.625rem);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(6, 182, 212, 0.9);
  background: rgba(6, 182, 212, 0.1);
  padding: 0.1875rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(6, 182, 212, 0.3);
}
.project-indicator {
  width: clamp(0.375rem, 1vw, 0.5rem);
  height: clamp(0.375rem, 1vw, 0.5rem);
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}
.project-title {
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
  font-weight: 600;
  color: #f0f0f0;
  line-height: 1.4;
  margin: 0;
  overflow-wrap: anywhere;
}
.project-header-line {
  height: 0.0625rem;
  background: var(--border-color);
  margin-top: clamp(0.5rem, 1.5vw, 0.75rem);
}
.project-popup-body {
  padding: 0 0.25rem;
}
.project-stat-row {
  display: flex;
  align-items: flex-start;
  gap: clamp(0.5rem, 1.2vw, 0.625rem);
  margin-bottom: clamp(0.5rem, 1.5vw, 0.75rem);
}
.project-stat-icon {
  color: rgba(6, 182, 212, 0.7);
  margin-top: 0.125rem;
  flex-shrink: 0;
}
.project-stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.project-stat-label {
  font-size: clamp(0.5625rem, 0.8vw, 0.625rem);
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.project-stat-value {
  font-size: clamp(0.6875rem, 1vw, 0.8125rem);
  color: #d1d5db;
}
.project-divider {
  height: 0.0625rem;
  background: rgba(255, 255, 255, 0.1);
  margin: clamp(0.5rem, 1.5vw, 0.75rem) 0;
}
.project-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(0.5rem, 1.5vw, 0.75rem);
}
.project-metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.project-metric-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: clamp(0.5625rem, 0.8vw, 0.625rem);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.project-metric-value {
  font-size: clamp(0.875rem, 1.3vw, 1rem);
  font-weight: 600;
}
.project-metric-value.direct {
  color: #22d3ee;
}
.project-metric-value.indirect {
  color: #a855f7;
}
.project-popup-footer {
  margin-top: clamp(0.5rem, 1.5vw, 0.75rem);
  height: 0.1875rem;
  position: relative;
}
.project-footer-glow {
  height: 100%;
  width: 60%;
  opacity: 0.4;
  filter: blur(0.125rem);
}

/* Species Popup Styles */
.species-popup-wrapper {
  padding: 0;
  width: min(35rem, calc(100vw - 2rem));
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 3.75rem);
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
  white-space: normal;
}
.species-image-frame {
  height: clamp(8rem, 20vw, 11.25rem);
  overflow: hidden;
  border-bottom: 1px solid;
  background: rgba(0, 0, 0, 0.6);
}
.species-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.species-header {
  position: relative;
  padding: clamp(0.75rem, 2vw, 1rem);
  border-bottom: 1px solid;
  background: rgba(0, 0, 0, 0.3);
}
.species-header-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.species-ornament {
  margin-bottom: clamp(0.375rem, 1vw, 0.5rem);
}
.species-ornament.top {
  margin-bottom: clamp(0.5rem, 1.5vw, 0.75rem);
}
.species-ornament.bottom {
  margin-top: clamp(0.5rem, 1.5vw, 0.75rem);
  margin-bottom: 0;
}
.species-badges {
  display: flex;
  gap: clamp(0.375rem, 1vw, 0.5rem);
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.species-category-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: white;
  padding: 3px 10px;
  border-radius: 4px;
}
.species-group-badge {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid;
  background: transparent;
}
.species-common-name {
  font-size: 16px;
  font-weight: 600;
  color: #f5f5f5;
  margin: 0 0 4px 0;
  line-height: 1.3;
  position: relative;
  z-index: 1;
  overflow-wrap: anywhere;
}
.species-scientific-name {
  font-size: 12px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  position: relative;
  z-index: 1;
  overflow-wrap: anywhere;
}
.species-body {
  padding: 14px 16px;
}
.species-description {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 14px 0;
  max-height: none;
  overflow: visible;
  overflow-wrap: anywhere;
  word-break: normal;
}
.species-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.species-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.species-detail-row.endangerment {
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 4px;
}
.species-detail-icon {
  color: rgba(6, 182, 212, 0.8);
  margin-top: 1px;
  flex-shrink: 0;
}
.species-detail-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}
.species-detail-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.species-detail-value {
  font-size: 12px;
  color: #d1d5db;
  overflow-wrap: anywhere;
}
.species-threat-tag {
  display: inline-block;
  font-size: 10px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 4px;
  margin-bottom: 4px;
}
.endangerment-value {
  font-weight: 600;
}
.species-footer {
  padding: 0 16px 12px;
}
.species-footer-line {
  height: 2px;
  opacity: 0.6;
}

@media (max-width: 640px) {
  .project-popup-wrapper,
  .species-popup-wrapper {
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
  }

  .species-image-frame {
    height: 138px;
  }
}

/* Custom scrollbar for popup content */
.project-popup-wrapper::-webkit-scrollbar,
.species-popup-wrapper::-webkit-scrollbar {
  width: 6px;
}

.project-popup-wrapper::-webkit-scrollbar-track,
.species-popup-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.project-popup-wrapper::-webkit-scrollbar-thumb,
.species-popup-wrapper::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.4);
  border-radius: 3px;
}

.project-popup-wrapper::-webkit-scrollbar-thumb:hover,
.species-popup-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.6);
}

/* Fullscreen detached species popup overlay */
.species-popup-overlay-fixed {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: overlayFadeIn 0.2s ease-out;
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.species-popup-close-btn-fixed {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2147483647;
  width: 44px;
  height: 44px;
  border: 2px solid rgba(6, 182, 212, 0.5);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: #06b6d4;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
}

.species-popup-close-btn-fixed:hover {
  background: rgba(6, 182, 212, 0.2);
  border-color: #06b6d4;
  transform: scale(1.1);
}

.species-popup-content-fixed {
  width: 100%;
  max-width: min(700px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 16px;
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(6, 182, 212, 0.2);
  box-shadow: 0 0 60px rgba(6, 182, 212, 0.15), 0 25px 50px rgba(0, 0, 0, 0.5);
  animation: contentSlideIn 0.25s ease-out;
}

@keyframes contentSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
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

@keyframes flyto-pulse {
  0% { transform: scale(0.3); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.6; }
  100% { transform: scale(1); opacity: 0; }
}

.species-popup-content-fixed .species-popup-wrapper {
  width: 100%;
  max-width: 100%;
  max-height: none;
  padding: 0;
}

.species-popup-content-fixed .species-image-frame {
  height: clamp(180px, 30vh, 320px);
  width: 100%;
  border-radius: 16px 16px 0 0;
  border-bottom: 2px solid;
}

.species-popup-content-fixed .species-header {
  padding: clamp(16px, 3vw, 24px);
}

.species-popup-content-fixed .species-common-name {
  font-size: clamp(20px, 3vw, 28px);
}

.species-popup-content-fixed .species-scientific-name {
  font-size: clamp(14px, 2vw, 18px);
}

.species-popup-content-fixed .species-body {
  padding: clamp(16px, 3vw, 24px);
}

.species-popup-content-fixed .species-description {
  font-size: clamp(14px, 2vw, 16px);
  line-height: 1.7;
  max-height: none;
  overflow: visible;
}

.species-popup-content-fixed .species-detail-row {
  gap: 12px;
}

.species-popup-content-fixed .species-detail-icon {
  width: 20px;
  height: 20px;
}

.species-popup-content-fixed .species-detail-icon svg {
  width: 18px;
  height: 18px;
}

.species-popup-content-fixed .species-detail-label {
  font-size: clamp(11px, 1.5vw, 13px);
}

.species-popup-content-fixed .species-detail-value {
  font-size: clamp(13px, 2vw, 15px);
}

.species-popup-content-fixed .species-threat-tag {
  font-size: clamp(11px, 1.5vw, 13px);
  padding: 4px 8px;
}

@media (max-width: 640px) {
  .species-popup-overlay-fixed {
    padding: 0;
  }

  .species-popup-content-fixed {
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
    border: none;
  }

  .species-popup-content-fixed .species-image-frame {
    height: 220px;
    border-radius: 0;
  }

/* Species popup language selector bar */
.species-popup-lang-bar {
  position: absolute;
  top: 68px;
  right: 16px;
  z-index: 2147483647;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 180px;
}

.species-popup-lang-btn {
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.species-popup-lang-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.species-popup-lang-btn.active {
  background: rgba(6, 182, 212, 0.25);
  border-color: rgba(6, 182, 212, 0.5);
  color: #67e8f9;
}

.species-popup-close-btn-fixed {
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
    font-size: 24px;
  }
}

/* Fullscreen detached project popup overlay */
.project-popup-overlay-fixed {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: overlayFadeIn 0.2s ease-out;
}

.project-popup-close-btn-fixed {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2147483647;
  width: 44px;
  height: 44px;
  border: 2px solid rgba(6, 182, 212, 0.5);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: #06b6d4;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
}

.project-popup-close-btn-fixed:hover {
  background: rgba(6, 182, 212, 0.2);
  border-color: #06b6d4;
  transform: scale(1.1);
}

.project-popup-content-fixed {
  width: 100%;
  max-width: min(500px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 16px;
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(6, 182, 212, 0.2);
  box-shadow: 0 0 60px rgba(6, 182, 212, 0.15), 0 25px 50px rgba(0, 0, 0, 0.5);
  animation: contentSlideIn 0.25s ease-out;
}

.project-popup-content-fixed .project-popup-wrapper {
  width: 100%;
  max-width: 100%;
  max-height: none;
  overflow-y: visible;
  padding: clamp(20px, 4vw, 32px);
}

.project-popup-content-fixed .project-title {
  font-size: clamp(18px, 2.5vw, 24px);
  overflow-wrap: anywhere;
}

.project-popup-content-fixed .project-badge {
  font-size: clamp(11px, 1.5vw, 13px);
  padding: 4px 10px;
}

.project-popup-content-fixed .project-stat-label {
  font-size: clamp(11px, 1.5vw, 13px);
}

.project-popup-content-fixed .project-stat-value {
  font-size: clamp(14px, 2vw, 16px);
  overflow-wrap: anywhere;
}

.project-popup-content-fixed .project-metric-header {
  font-size: clamp(11px, 1.5vw, 13px);
}

.project-popup-content-fixed .project-metric-value {
  font-size: clamp(20px, 3vw, 28px);
}

.project-popup-content-fixed .project-popup-footer {
  margin-top: clamp(16px, 3vw, 24px);
  height: 4px;
}

.project-popup-content-fixed .project-footer-glow {
  width: 80%;
  opacity: 0.6;
  filter: blur(3px);
}

.project-popup-content-fixed .project-corner-accent {
  width: clamp(12px, 1.5vw, 16px);
  height: clamp(12px, 1.5vw, 16px);
  border-width: 2px;
}

.project-popup-content-fixed .project-popup-body {
  padding: clamp(8px, 2vw, 16px) 0;
}

@media (max-width: 640px) {
  .project-popup-overlay-fixed {
    padding: 0;
  }

  .project-popup-content-fixed {
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
    border: none;
  }

  .project-popup-close-btn-fixed {
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
    font-size: 24px;
  }
}

.project-popup-content-fixed::-webkit-scrollbar {
  width: 8px;
}

.project-popup-content-fixed::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.4);
}

.project-popup-content-fixed::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.5);
  border-radius: 4px;
}

.project-popup-content-fixed::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.7);
}

/* Custom scrollbar for fullscreen popup */
.species-popup-content-fixed::-webkit-scrollbar {
  width: 8px;
}

.species-popup-content-fixed::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.4);
}

.species-popup-content-fixed::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.5);
  border-radius: 4px;
}

.species-popup-content-fixed::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.7);
}
</style>
