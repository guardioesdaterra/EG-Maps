<template>
  <div class="w-full h-screen relative overflow-hidden bg-black" role="main" aria-label="Interactive Map Visualization">
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
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay: 0ms" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay: 150ms" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay: 300ms" />
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
      class="absolute inset-0 pointer-events-none opacity-[0.015]"
      :style="{
        zIndex: 'calc(var(--z-map-effects) + 3)',
        backgroundImage: `image-set(url(${baseURL}scanline.gif) 1x, url(${baseURL}scanline.gif) 2x)`,
        backgroundRepeat: 'repeat',
      }"
    />

    <!-- Vignette -->
    <div class="absolute inset-0 pointer-events-none" :style="{ zIndex: 'var(--z-map-overlays)', boxShadow: 'inset 0 0 100px 15px rgba(0,0,0,0.5)' }" />

    <!-- Hex grid overlay -->
    <canvas v-if="showHexGrid" ref="hexCanvasRef" class="absolute inset-0 w-full h-full pointer-events-none opacity-20" :style="{ zIndex: 'var(--z-map-hex-grid)' }" />

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

    <!-- Earth Guardians Banner - Mobile optimized -->
    <div v-if="isMobile" class="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none px-2 sm:px-3" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[180px] xs:max-w-[240px] object-contain" loading="lazy" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[180px] -rotate-90 origin-center" loading="lazy" />
    </div>

    <!-- Map Container -->
    <div ref="mapContainerRef" class="absolute inset-0 w-full h-full" />

    <!-- Custom overlays slot (used by observatory-of-vulcan) -->
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
      :species="speciesData"
      @filter-change="handleFilterChange"
      @group-selection-change="handleSpeciesGroupSelection"
      @close="showFilterPanel = false"
    />

    <!-- Data Bubble: species groups or project stats -->
    <DataBubble
      :mode="activeDataset === 'endangered-species' ? 'species' : 'projects'"
      :selected-groups="selectedSpeciesGroups"
      :projects="visibleProjects"
      position-top="clamp(16rem, 40vh, 22rem)"
      @toggle-group="toggleLegendGroup"
    />

    <!-- Map Controls -->
    <MapControls
      :is-globe-view="false"
      :show-hex-grid="showHexGrid"
      :show-connections="showConnections"
      :dataset="activeDataset"
      :projects="activeDataset === 'project-grants' ? visibleProjects : undefined"
      :species="activeDataset === 'endangered-species' ? visibleSpecies : undefined"
      :filter-open="showFilterPanel"
      @toggle-hex-grid="showHexGrid = !showHexGrid"
      @toggle-connections="toggleConnections"
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
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import type { Species } from '@/lib/map-utils'
import { buildProjectPopupHTML, buildSpeciesPopupHTML, buildRareEarthPopupHTML, escapeHtml, isValidCoordinate, GROUP_COLORS, computeClusterBlobPath } from '@/lib/map-utils'
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

const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''
const baseURL = useRuntimeConfig().app.baseURL

const MAP_STYLE = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

// Tile caching for performance - actually stores and returns cached responses
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

interface Props {
  projects?: ProjectData[]
  species?: Species[]
  speciesIndex?: SpeciesIndexItem[]  // Lightweight index for markers
  defaultDataset?: 'project-grants' | 'endangered-species' | 'observatory-of-vulcan'
  // Rare Earth dataset (observatory-of-vulcan)
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthAnalysis?: Record<string, any>
  layerVisibility?: Record<string, boolean>  // Controlled by parent for rare earth
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null  // Parent can trigger fly-to
}

const props = withDefaults(defineProps<Props>(), {
  defaultDataset: 'project-grants',
})
const projectsData = computed(() => props.projects || allProjectsData)
const speciesData = computed(() => props.species || [])
const speciesIndexData = computed(() => props.speciesIndex || [])
const filteredProjectsList = ref<ProjectData[] | null>(null)
const filteredSpeciesList = ref<Species[] | null>(null)
const visibleProjects = computed(() => filteredProjectsList.value ?? projectsData.value)
const visibleSpecies = computed(() => filteredSpeciesList.value ?? speciesData.value)



const isMobile = useMediaQuery('(max-width: 768px)')
const mapContainerRef = ref<HTMLDivElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
const speciesFilterPanelRef = ref<{ toggleTaxonomicGroup: (_group: string) => void } | null>(null)
const selectedSpeciesGroups = ref<string[]>([])
const showHexGrid = ref(true)
const showConnections = ref(true)
const showFilterPanel = ref(false)
const activeDataset = ref<'project-grants' | 'endangered-species' | 'observatory-of-vulcan'>(props.defaultDataset)
const layerVisibilityProp = computed(() => props.layerVisibility || {})
let rareEarthLayersInitialized = false
const hasError = ref(false)
const errorMessage = ref('')
const noWebglSupport = ref(false)
const isLoading = ref(true)
const showSpeciesOverlay = ref(false)
const speciesOverlayHTML = ref('')
const showProjectOverlay = ref(false)
const projectOverlayHTML = ref('')

let map: maplibregl.Map | null = null
let markers: maplibregl.Marker[] = []
let pendingVisibilityUpdate = false
let pendingClusterRebuild = false
let connectionFeatures: MapConnectionFeature[] = []
let particleSystem: MapParticleSystem | null = null
const clusterer = useMapCluster()
const geoJSONMarkers = useGeoJSONMarkers()
let lastClusterZoom = -1
let lastBboxCenter: { lng: number; lat: number } | null = null

const speciesCloseBtnRef = ref<HTMLElement | null>(null)
const projectCloseBtnRef = ref<HTMLElement | null>(null)
let lastFocusedEl: HTMLElement | null = null

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

function taxonomicGroupLabel(group: string) {
  return t(`taxonomy.${group}`)
}

function getTaxonomicGroupLabels() {
  return Object.keys(GROUP_COLORS).reduce<Record<string, string>>((labels, group) => {
    labels[group] = taxonomicGroupLabel(group)
    return labels
  }, {})
}

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

function toggleLegendGroup(group: string | number) {
  speciesFilterPanelRef.value?.toggleTaxonomicGroup(String(group))
}

function handleSpeciesGroupSelection(groups: string[]) {
  selectedSpeciesGroups.value = groups
}

// Dynamically adjust popup size and position to show fully on screen
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function _fitPopupToScreen(popup: maplibregl.Popup) {
  const popupEl = popup.getElement()
  if (!popupEl) return

  // Set ultra-high z-index to be on top of everything
  popupEl.style.zIndex = '2147483647'
  
  const content = popupEl.querySelector('.maplibregl-popup-content') as HTMLElement
  if (!content) return

  const margin = 16
  const maxWidth = window.innerWidth - margin * 2
  const maxHeight = window.innerHeight - margin * 2

  // Set max dimensions
  content.style.maxWidth = `${maxWidth}px`
  content.style.maxHeight = `${maxHeight}px`
  content.style.overflow = 'auto'
  
  // Get actual dimensions after setting max
  requestAnimationFrame(() => {
    const rect = content.getBoundingClientRect()
    
    // Reposition popup to keep it fully on screen
    const offsetElement = popupEl.querySelector('.maplibregl-popup-tip') as HTMLElement
    if (offsetElement) {
      let topOffset = -rect.top + margin
      let leftOffset = -rect.left + margin

      if (rect.right > window.innerWidth - margin) {
        leftOffset = window.innerWidth - rect.width - margin - rect.left
      }

      if (rect.left < margin) {
        leftOffset = margin - rect.left
      }

      if (rect.height > maxHeight) {
        topOffset = margin - rect.top
        content.style.maxHeight = `${maxHeight}px`
        content.style.overflowY = 'auto'
      }

      const tip = offsetElement
      const currentTransform = tip.style.transform || ''
      const translateMatch = currentTransform.match(/translate\(([^)]+)\)/)
      if (translateMatch) {
        const parts = translateMatch[1].split(',').map(s => parseFloat(s.trim()) || 0)
        const adjustedX = parts[0] + leftOffset
        const adjustedY = parts[1] + topOffset
        tip.style.transform = currentTransform.replace(translateMatch[0], `translate(${adjustedX}px, ${adjustedY}px)`)
      }
    }
  })
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function _keepPopupFullyVisible(popup: maplibregl.Popup) {
  if (!map) return

  const popupEl = popup.getElement()
  if (!popupEl) return

  popupEl.style.zIndex = '2147483000'

  const fit = () => {
    const rect = popupEl.getBoundingClientRect()
    const margin = 12
    let panX = 0
    let panY = 0

    if (rect.left < margin) panX = rect.left - margin
    else if (rect.right > window.innerWidth - margin) panX = rect.right - window.innerWidth + margin

    if (rect.top < margin) panY = rect.top - margin
    else if (rect.bottom > window.innerHeight - margin) panY = rect.bottom - window.innerHeight + margin

    if (panX || panY) {
      map?.panBy([panX, panY], { duration: 220 })
    }
  }

  fit()
  window.setTimeout(fit, 260)
}

// Filter species index by selected groups
function applySpeciesFilters(speciesIndex: SpeciesIndexItem[]): SpeciesIndexItem[] {
  // If no groups selected, return all
  if (selectedSpeciesGroups.value.length === 0) {
    return speciesIndex
  }
  
  // Filter by selected taxonomic groups
  return speciesIndex.filter(s => 
    selectedSpeciesGroups.value.includes(s.taxonomicGroup)
  )
}

// Update filter panel when species index changes
watch(speciesIndexData, (newIndex) => {
  if (newIndex.length > 0 && speciesFilterPanelRef.value) {
    // Update filter panel with available groups from index
    const groups = [...new Set(newIndex.map(s => s.taxonomicGroup))].sort()
    // The filter panel will be updated via its internal logic
  }
}, { immediate: true })

function handleFilterChange(filtered: Species[]) {
  filteredSpeciesList.value = filtered
  rebuildMarkers()
  addConnections()
  if (showConnections.value) startParticles()
}

function handleProjectFilterChange(filtered: ProjectData[]) {
  filteredProjectsList.value = filtered
  rebuildMarkers()
  addConnections()
  if (showConnections.value) startParticles()
}

function handleSearchOpenChange(open: boolean) {
  if (open && isMobile.value) {
    showFilterPanel.value = false
  }
}

function toggleConnections() {
  showConnections.value = !showConnections.value
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
  const totalBeneficiaries = project.direct_beneficiaries + project.indirect_beneficiaries
  const beneficiaryFactor = Math.min(Math.max(totalBeneficiaries / 10000, 0.5), 5)
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

    // Rainbow ring (decorative, slightly larger)
    const ringPad = 8
    const ringOuterR = (containerSize + ringPad * 2) / 2
    const ringInnerR = ringOuterR - 2
    const rainbowRing = document.createElement('div')
    rainbowRing.style.position = 'absolute'
    rainbowRing.style.inset = `${-ringPad}px`
    rainbowRing.style.borderRadius = '50%'
    rainbowRing.style.background = 'conic-gradient(from var(--a, 0deg), rgba(255,107,107,0.35), rgba(255,217,61,0.25), rgba(107,203,119,0.25), rgba(77,150,255,0.3), rgba(155,89,182,0.3), rgba(255,107,107,0.35))'
    rainbowRing.style.mask = `radial-gradient(farthest-side, transparent ${ringInnerR}px, #000 ${ringOuterR}px)`
    rainbowRing.style.webkitMask = `radial-gradient(farthest-side, transparent ${ringInnerR}px, #000 ${ringOuterR}px)`
    rainbowRing.style.pointerEvents = 'none'
    rainbowRing.style.animation = 'cluster-rainbow-spin 8s linear infinite'
    clusterInner.appendChild(rainbowRing)

    // Compute orbit positions for blob path
    const angleStep = (Math.PI * 2) / items.length
    const centers: { x: number; y: number }[] = []
    items.forEach((_item, i) => {
      const angle = angleStep * i - Math.PI / 2
      centers.push({ x: Math.cos(angle) * orbitRadius, y: Math.sin(angle) * orbitRadius })
    })

    // SVG blob background — convex hull clipped around the mini circles
    const blobPadding = 5
    const blobPath = computeClusterBlobPath(centers, miniSize / 2, blobPadding)
    const svgSize = containerSize + blobPadding * 4
    const svgOffset = (containerSize - svgSize) / 2

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgEl.setAttribute('width', `${svgSize}px`)
    svgEl.setAttribute('height', `${svgSize}px`)
    svgEl.setAttribute('viewBox', `${svgOffset} ${svgOffset} ${containerSize} ${containerSize}`)
    svgEl.style.position = 'absolute'
    svgEl.style.top = '50%'
    svgEl.style.left = '50%'
    svgEl.style.transform = 'translate(-50%, -50%)'
    svgEl.style.pointerEvents = 'none'
    svgEl.style.overflow = 'visible'

    // Blob fill path
    const blobFill = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    blobFill.setAttribute('d', blobPath)
    blobFill.setAttribute('fill', `rgba(${dr},${dg},${db},0.15)`)
    blobFill.setAttribute('stroke', `rgba(${dr},${dg},${db},0.5)`)
    blobFill.setAttribute('stroke-width', '1.5')
    blobFill.setAttribute('stroke-linejoin', 'round')
    blobFill.style.filter = 'drop-shadow(0 0 6px rgba(0,0,0,0.4))'
    blobFill.style.transition = 'fill 200ms ease, stroke 200ms ease'
    svgEl.appendChild(blobFill)

    // Glow path (larger, blurred)
    const blobGlow = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    blobGlow.setAttribute('d', blobPath)
    blobGlow.setAttribute('fill', 'none')
    blobGlow.setAttribute('stroke', `rgba(${dr},${dg},${db},0.15)`)
    blobGlow.setAttribute('stroke-width', '6')
    blobGlow.setAttribute('stroke-linejoin', 'round')
    blobGlow.setAttribute('opacity', '0.6')
    blobGlow.style.filter = 'blur(3px)'
    svgEl.appendChild(blobGlow)

    clusterInner.appendChild(svgEl)

    // Mini circles at orbit positions
    items.forEach((_item, i) => {
      const { url, color: itemColor } = resolved[i]
      const c = centers[i]
      const mini = document.createElement('div')
      mini.className = 'cluster-mini-hover'
      mini.style.position = 'absolute'
      mini.style.width = `${miniSize}px`
      mini.style.height = `${miniSize}px`
      mini.style.borderRadius = '50%'
      mini.style.background = `url("${url}") center/cover`
      mini.style.border = '1.5px solid rgba(255,255,255,0.85)'
      mini.style.boxShadow = `0 0 7px ${itemColor}, 0 0 1.5px #fff`
      mini.style.top = `calc(50% + ${c.y}px - ${miniSize / 2}px)`
      mini.style.left = `calc(50% + ${c.x}px - ${miniSize / 2}px)`
      mini.style.pointerEvents = 'none'
      mini.style.zIndex = '2'
      clusterInner.appendChild(mini)
    })

    // Count badge
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
      blobFill.setAttribute('fill', `rgba(${dr},${dg},${db},0.25)`)
      blobFill.setAttribute('stroke', `rgba(${dr},${dg},${db},0.8)`)
      blobGlow.setAttribute('stroke', `rgba(${dr},${dg},${db},0.3)`)
      blobGlow.setAttribute('opacity', '0.9')
      rainbowRing.style.opacity = '0.85'
      outer.style.zIndex = '100'
    })
    outer.addEventListener('mouseleave', () => {
      blobFill.setAttribute('fill', `rgba(${dr},${dg},${db},0.15)`)
      blobFill.setAttribute('stroke', `rgba(${dr},${dg},${db},0.5)`)
      blobGlow.setAttribute('stroke', `rgba(${dr},${dg},${db},0.15)`)
      blobGlow.setAttribute('opacity', '0.6')
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

    // Compute blob path for grid layout
    const gridCenters: { x: number; y: number }[] = []
    const maxShow = cols * rows - 1
    for (let i = 0; i < Math.min(resolved.length, maxShow); i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      gridCenters.push({
        x: pad + col * (miniSize + gap) + miniSize / 2,
        y: pad + row * (miniSize + gap) + miniSize / 2,
      })
    }
    if (count > maxShow) {
      const totalSlots = cols * rows
      const lastX = pad + ((totalSlots - 1) % cols) * (miniSize + gap) + miniSize / 2
      const lastY = pad + Math.floor((totalSlots - 1) / cols) * (miniSize + gap) + miniSize / 2
      gridCenters.push({ x: lastX, y: lastY })
    }

    const blobPath = computeClusterBlobPath(gridCenters, miniSize / 2, 4)
    const gridSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    gridSvg.setAttribute('width', '100%')
    gridSvg.setAttribute('height', '100%')
    gridSvg.setAttribute('viewBox', `0 0 ${gridW} ${gridH}`)
    gridSvg.style.position = 'absolute'
    gridSvg.style.inset = '0'
    gridSvg.style.pointerEvents = 'none'
    gridSvg.style.zIndex = '0'

    const gridBlob = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    gridBlob.setAttribute('d', blobPath)
    gridBlob.setAttribute('fill', `rgba(${dr},${dg},${db},0.15)`)
    gridBlob.setAttribute('stroke', `rgba(${dr},${dg},${db},0.5)`)
    gridBlob.setAttribute('stroke-width', '1.5')
    gridBlob.setAttribute('stroke-linejoin', 'round')
    gridBlob.style.filter = 'drop-shadow(0 0 6px rgba(0,0,0,0.4))'
    gridSvg.appendChild(gridBlob)
    grid.appendChild(gridSvg)

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

    grid.appendChild(gridInner)

    outer.addEventListener('mouseenter', () => {
      gridBlob.setAttribute('fill', `rgba(${dr},${dg},${db},0.25)`)
      gridBlob.setAttribute('stroke', `rgba(${dr},${dg},${db},0.8)`)
      grid.style.transform = 'scale(1.1)'
      outer.style.zIndex = '100'
    })
    outer.addEventListener('mouseleave', () => {
      gridBlob.setAttribute('fill', `rgba(${dr},${dg},${db},0.15)`)
      gridBlob.setAttribute('stroke', `rgba(${dr},${dg},${db},0.5)`)
      grid.style.transform = 'scale(1)'
      outer.style.zIndex = '20'
    })
  }

  return outer
}

let useNativeGeoJSON = true
const SOURCE_ID = 'species-markers'

async function setupGeoJSONMarkers() {
  if (!map || !useNativeGeoJSON) return

  // Clean up old DOM markers
  markers.forEach(m => m.remove())
  markers = []
  clusterer.destroy()

  geoJSONMarkers.init(map)

  if (activeDataset.value === 'project-grants') {
    const validProjects = visibleProjects.value.filter(p => isValidCoordinate(p.latitude, p.longitude))
    const geojson = projectsToGeoJSON(validProjects)
    geoJSONMarkers.addGeoJSONSource(SOURCE_ID, geojson, true)
    geoJSONMarkers.addClusterLayers(SOURCE_ID, 'project-grants')
    
    geoJSONMarkers.setupEventHandlers(
      SOURCE_ID,
      'project-grants',
      (props, coords) => {
        // Find the project by coordinates
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
  } else {
    // Use lightweight index if provided, otherwise load it
    let speciesIndex: SpeciesIndexItem[]
    
    if (speciesIndexData.value.length > 0) {
      // Use passed prop
      speciesIndex = speciesIndexData.value
    } else {
      // Fetch lightweight index (3.2MB vs 35MB)
      try {
        const indexRes = await fetch(`${baseURL}data/species/icmbio-brazil-index.json`)
        if (!indexRes.ok) {
          console.error('Failed to load species index')
          return
        }
        speciesIndex = await indexRes.json()
      } catch (e) {
        console.error('Failed to load species index:', e)
        return
      }
    }
    
    // Apply any active filters to the index
    const filteredIndex = applySpeciesFilters(speciesIndex)
    const geojson = speciesIndexToGeoJSON(filteredIndex)
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
          // Fallback: find from index and use basic info
          const indexItem = speciesIndex.find(s => s.id === speciesId)
          if (indexItem) {
            // Create minimal species object from index
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
  }

  // Update last cluster zoom
  lastClusterZoom = Math.floor(map.getZoom())
  const center = map.getCenter()
  lastBboxCenter = { lng: center.lng, lat: center.lat }
}

function setupRareEarthLayers() {
  if (!map) return
  const points = props.rareEarthPoints
  const polys = props.rareEarthPolygons
  if (!points) return

  // Remove any existing layers first (idempotent re-init)
  const allLayerIds = [
    'ree-clusters-glow', 'ree-clusters', 'ree-cluster-count',
    'ree-pt-direct_ree-glow', 'ree-pt-direct_ree',
    'ree-pt-carbonatite_associated-glow', 'ree-pt-carbonatite_associated',
    'ree-pt-pegmatite_associated-glow', 'ree-pt-pegmatite_associated',
    'ree-pt-heavy_mineral_associated-glow', 'ree-pt-heavy_mineral_associated',
    'ree-pt-phosphate_associated-glow', 'ree-pt-phosphate_associated',
    'ree-pt-strategic_associated-glow', 'ree-pt-strategic_associated',
    'ree-poly-glow', 'ree-poly-fill', 'ree-poly-line', 'ree-poly-label',
    'ree-geo-fill', 'ree-geo-aquifer', 'ree-geo-conflict', 'ree-geo-line', 'ree-geo-label',
    'ree-site-glow', 'ree-site-label', 'ree-network-lines',
  ]
  allLayerIds.forEach(id => { try { map!.removeLayer(id) } catch {} })
  try { map!.removeSource('ree-points') } catch {}
  try { map!.removeSource('ree-polys') } catch {}
  try { map!.removeSource('ree-geo') } catch {}
  try { map!.removeSource('ree-sites') } catch {}
  try { map!.removeSource('ree-network') } catch {}

  const catColors: Record<string, string> = {
    direct_ree: '#e74c3c', carbonatite_associated: '#f39c12', pegmatite_associated: '#27ae60',
    heavy_mineral_associated: '#2980b9', phosphate_associated: '#8e44ad', strategic_associated: '#e91e63',
  }
  const categories = Object.keys(catColors)

  // ── Point source with clustering + cluster properties ──
  map!.addSource('ree-points', {
    type: 'geojson', data: points,
    cluster: true, clusterMaxZoom: 11, clusterRadius: 45,
    clusterProperties: {
      dr: ['+', ['case', ['==', ['get', 'c'], 'direct_ree'], 1, 0]],
      ca: ['+', ['case', ['==', ['get', 'c'], 'carbonatite_associated'], 1, 0]],
      pg: ['+', ['case', ['==', ['get', 'c'], 'pegmatite_associated'], 1, 0]],
      hm: ['+', ['case', ['==', ['get', 'c'], 'heavy_mineral_associated'], 1, 0]],
      ph: ['+', ['case', ['==', ['get', 'c'], 'phosphate_associated'], 1, 0]],
      st: ['+', ['case', ['==', ['get', 'c'], 'strategic_associated'], 1, 0]],
      md: ['max', ['get', 'ds']],
    },
  })

  // ── Polygon source ──
  if (polys) {
    map!.addSource('ree-polys', { type: 'geojson', data: polys })
  }

  // ── Cluster layers (glow + core + count) ──
  const clusterRadiusStep: any = ['step', ['get', 'point_count'], 5, 5, 10, 20, 16, 50, 22, 100, 36]
  const dominantCatColor: any = ['case',
    ['all', ['>', ['get', 'dr'], 0], ['>=', ['get', 'dr'], ['get', 'ca']], ['>=', ['get', 'dr'], ['get', 'pg']], ['>=', ['get', 'dr'], ['get', 'hm']], ['>=', ['get', 'dr'], ['get', 'ph']], ['>=', ['get', 'dr'], ['get', 'st']]], '#e74c3c',
    ['all', ['>', ['get', 'ca'], 0], ['>=', ['get', 'ca'], ['get', 'dr']], ['>=', ['get', 'ca'], ['get', 'pg']], ['>=', ['get', 'ca'], ['get', 'hm']], ['>=', ['get', 'ca'], ['get', 'ph']], ['>=', ['get', 'ca'], ['get', 'st']]], '#f39c12',
    ['all', ['>', ['get', 'pg'], 0], ['>=', ['get', 'pg'], ['get', 'dr']], ['>=', ['get', 'pg'], ['get', 'ca']], ['>=', ['get', 'pg'], ['get', 'hm']], ['>=', ['get', 'pg'], ['get', 'ph']], ['>=', ['get', 'pg'], ['get', 'st']]], '#27ae60',
    ['all', ['>', ['get', 'hm'], 0], ['>=', ['get', 'hm'], ['get', 'dr']], ['>=', ['get', 'hm'], ['get', 'ca']], ['>=', ['get', 'hm'], ['get', 'pg']], ['>=', ['get', 'hm'], ['get', 'ph']], ['>=', ['get', 'hm'], ['get', 'st']]], '#2980b9',
    ['all', ['>', ['get', 'ph'], 0], ['>=', ['get', 'ph'], ['get', 'dr']], ['>=', ['get', 'ph'], ['get', 'ca']], ['>=', ['get', 'ph'], ['get', 'pg']], ['>=', ['get', 'ph'], ['get', 'hm']], ['>=', ['get', 'ph'], ['get', 'st']]], '#8e44ad',
    ['all', ['>', ['get', 'st'], 0], ['>=', ['get', 'st'], ['get', 'dr']], ['>=', ['get', 'st'], ['get', 'ca']], ['>=', ['get', 'st'], ['get', 'pg']], ['>=', ['get', 'st'], ['get', 'hm']], ['>=', ['get', 'st'], ['get', 'ph']]], '#e91e63',
    '#c0392b',
  ]
  map!.addLayer({
    id: 'ree-clusters-glow', type: 'circle', source: 'ree-points',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': dominantCatColor,
      'circle-radius': ['step', ['get', 'point_count'], 10, 5, 18, 20, 28, 50, 36, 100, 52],
      'circle-opacity': 0.15,
      'circle-blur': 2.5,
    },
  })
  map!.addLayer({
    id: 'ree-clusters', type: 'circle', source: 'ree-points',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': dominantCatColor,
      'circle-radius': clusterRadiusStep,
      'circle-opacity': 0.55,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': 'rgba(255,255,255,0.15)',
    },
  })
  map!.addLayer({
    id: 'ree-cluster-count', type: 'symbol', source: 'ree-points',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Open Sans Regular'],
      'text-size': ['step', ['get', 'point_count'], 9, 5, 11, 20, 13],
    },
    paint: { 'text-color': '#fff', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.5 },
  })

  // ── Category point layers (each: glow halo + core dot) ──
  const pointRadius: any = ['interpolate', ['linear'], ['zoom'], 4, 2.5, 8, 4, 12, 6, 16, 8]
  categories.forEach(cat => {
    const filter: any = ['all', ['!', ['has', 'point_count']], ['==', ['get', 'c'], cat]]
    const color = catColors[cat]

    map!.addLayer({
      id: `ree-pt-${cat}-glow`, type: 'circle', source: 'ree-points',
      filter,
      paint: {
        'circle-color': color,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 6, 8, 9, 12, 13, 16, 17],
        'circle-opacity': 0.12,
        'circle-blur': 2,
      },
    })
    map!.addLayer({
      id: `ree-pt-${cat}`, type: 'circle', source: 'ree-points',
      filter,
      paint: {
        'circle-color': color,
        'circle-radius': pointRadius,
        'circle-opacity': 0.85,
        'circle-stroke-width': 0.5,
        'circle-stroke-color': 'rgba(255,255,255,0.35)',
      },
    })
  })

  // ── Interactive event handlers (register once per category layer) ──
  categories.forEach(cat => {
    const layerId = `ree-pt-${cat}`
    map!.on('click', layerId, (e: any) => {
      if (!e.features?.length) return
      const p = e.features[0].properties
      const html = buildRareEarthPopupHTML(p)
      new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map!)
    })
    map!.on('mouseenter', layerId, () => { if (map) map.getCanvas().style.cursor = 'pointer' })
    map!.on('mouseleave', layerId, () => { if (map) map.getCanvas().style.cursor = '' })
  })

  // ── Cluster click ──
  map!.on('click', 'ree-clusters', (e: any) => {
    const fs = map!.queryRenderedFeatures(e.point, { layers: ['ree-clusters'] })
    if (!fs.length) return
    const cid = fs[0].properties.cluster_id
    const src = map!.getSource('ree-points') as any
    src?.getClusterExpansionZoom(cid, (_err: any, z: number) => {
      map!.flyTo({ center: (fs[0].geometry as any).coordinates, zoom: Math.min(z, 14), duration: 800 })
    })
  })
  map!.on('mouseenter', 'ree-clusters', () => { if (map) map.getCanvas().style.cursor = 'pointer' })
  map!.on('mouseleave', 'ree-clusters', () => { if (map) map.getCanvas().style.cursor = '' })

  // ── Polygon layers ──
  if (polys) {
    const polyColorMatch: any = ['match', ['get', 'category'],
      'direct_ree', '#e74c3c', 'carbonatite_associated', '#f39c12',
      'pegmatite_associated', '#27ae60', 'heavy_mineral_associated', '#2980b9',
      'phosphate_associated', '#8e44ad', 'strategic_associated', '#e91e63', '#999']

    map!.addLayer({
      id: 'ree-poly-fill', type: 'fill', source: 'ree-polys',
      paint: { 'fill-color': polyColorMatch, 'fill-opacity': 0.08 },
    })
    map!.addLayer({
      id: 'ree-poly-glow', type: 'line', source: 'ree-polys',
      paint: {
        'line-color': polyColorMatch,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 4, 14, 7],
        'line-opacity': 0.08,
        'line-blur': 2,
      },
    })
    map!.addLayer({
      id: 'ree-poly-line', type: 'line', source: 'ree-polys',
      paint: {
        'line-color': polyColorMatch,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 1, 14, 2],
        'line-opacity': 0.4,
      },
    })
    map!.addLayer({
      id: 'ree-poly-label', type: 'symbol', source: 'ree-polys',
      layout: {
        'text-field': ['coalesce', ['get', 'nome'], ['get', 'enterprise'], ''],
        'text-font': ['Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 0, 8, 8, 12, 11],
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#ccc',
        'text-halo-color': 'rgba(0,0,0,0.85)',
        'text-halo-width': 1.5,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 0.8],
      },
    })
    // Polygon click popup
    map!.on('click', 'ree-poly-fill', (e: any) => {
      if (!e.features?.length) return
      const p = e.features[0].properties
      const html = buildRareEarthPopupHTML({
        c: p.category, ds: p.danger_score ?? 5,
        n: p.nome || p.enterprise || 'Polygon',
        s: p.substances || '—', p: p.processo || '—',
        f: p.fase || '—', u: p.uf || '', a: p.area_ha ?? 0,
        net: p.network_id || '',
      })
      new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map!)
    })
  }

  // ── Conflict site markers ──
  addRareEarthConflictSites()

  // ── Water / military / conflict zones ──
  addRareEarthGeoBoundaries()

  // ── Corporate network connection lines ──
  addRareEarthNetworkLines()

  // Apply initial layer visibility from parent
  syncRareEarthLayerVisibility()
  rareEarthLayersInitialized = true
}

function addRareEarthGeoBoundaries() {
  if (!map) return
  const wb: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'São Francisco Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-47, -12], [-44, -12], [-42, -13], [-40, -14], [-39, -15.5], [-39.5, -17], [-40, -18.5], [-42, -19.5], [-44, -20], [-46, -20.5], [-48, -19], [-49, -17], [-48.5, -15], [-47.5, -13.5], [-47, -12]]] } },
      { type: 'Feature', properties: { name: 'Paranaíba Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-49, -17], [-47.5, -17.5], [-46.5, -18.5], [-46, -19.5], [-47, -20.5], [-48.5, -20.5], [-50, -20], [-51.5, -19], [-51, -17.5], [-50, -17], [-49, -17]]] } },
      { type: 'Feature', properties: { name: 'Jequitinhonha Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-42, -15.5], [-40.5, -15.5], [-39.5, -16], [-39.5, -17.5], [-40.5, -18], [-42, -17.5], [-43, -16.5], [-42, -15.5]]] } },
      { type: 'Feature', properties: { name: 'Bambuí Aquifer', type: 'aquifer' }, geometry: { type: 'Polygon', coordinates: [[[-49, -15], [-47, -15], [-45, -16], [-44, -18], [-44.5, -20], [-46, -21], [-48.5, -21], [-50, -20], [-51, -18], [-50.5, -16], [-49, -15]]] } },
      { type: 'Feature', properties: { name: 'Urucuia Aquifer', type: 'aquifer' }, geometry: { type: 'Polygon', coordinates: [[[-46, -13], [-43.5, -13], [-42, -14.5], [-42.5, -16.5], [-44, -17.5], [-46, -17.5], [-47, -16], [-46, -13]]] } },
      { type: 'Feature', properties: { name: 'Poços de Caldas Conflict', type: 'conflict' }, geometry: { type: 'Polygon', coordinates: [[[-47.2, -21.2], [-46, -21.2], [-45.8, -21.8], [-46.2, -22.2], [-47.2, -22.2], [-47.5, -21.8], [-47.2, -21.2]]] } },
      { type: 'Feature', properties: { name: 'INB Caldas Nuclear', type: 'nuclear' }, geometry: { type: 'Polygon', coordinates: [[[-47, -21.4], [-46.3, -21.4], [-46.1, -21.9], [-46.5, -22.1], [-47, -22], [-47.2, -21.7], [-47, -21.4]]] } },
    ],
  }
  map!.addSource('ree-geo', { type: 'geojson', data: wb })
  map!.addLayer({
    id: 'ree-geo-fill', type: 'fill', source: 'ree-geo',
    filter: ['==', ['get', 'type'], 'basin'],
    paint: { 'fill-color': '#3498db', 'fill-opacity': 0.05 },
  })
  map!.addLayer({
    id: 'ree-geo-aquifer', type: 'fill', source: 'ree-geo',
    filter: ['==', ['get', 'type'], 'aquifer'],
    paint: { 'fill-color': '#9b59b6', 'fill-opacity': 0.07 },
  })
  map!.addLayer({
    id: 'ree-geo-conflict', type: 'fill', source: 'ree-geo',
    filter: ['in', ['get', 'type'], ['literal', ['conflict', 'nuclear']]],
    paint: { 'fill-color': '#e74c3c', 'fill-opacity': 0.08 },
  })
  map!.addLayer({
    id: 'ree-geo-line', type: 'line', source: 'ree-geo',
    paint: {
      'line-color': ['match', ['get', 'type'], 'basin', '#3498db', 'aquifer', '#9b59b6', 'conflict', '#e74c3c', 'nuclear', '#c0392b', '#3498db'],
      'line-width': ['match', ['get', 'type'], 'conflict', 2, 'nuclear', 2, 1],
      'line-opacity': 0.4,
      'line-dasharray': ['match', ['get', 'type'], 'conflict', ['literal', [2, 2]], 'nuclear', ['literal', [1, 1]], ['literal', [3, 2]]],
    },
  })
  map!.addLayer({
    id: 'ree-geo-label', type: 'symbol', source: 'ree-geo',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 9,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': ['match', ['get', 'type'], 'basin', '#2980b9', 'aquifer', '#8e44ad', 'conflict', '#c0392b', 'nuclear', '#c0392b', '#2980b9'],
      'text-halo-color': 'rgba(255,255,255,0.9)',
      'text-halo-width': 1.5,
    },
  })
}

function addRareEarthConflictSites() {
  if (!map) return
  const sites: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'Poços de Caldas', danger: 9.5, tag: 'CONFLICT' }, geometry: { type: 'Point', coordinates: [-46.57, -21.55] } },
      { type: 'Feature', properties: { name: 'Araxá', danger: 8.5, tag: 'REE + CBMM' }, geometry: { type: 'Point', coordinates: [-46.94, -19.59] } },
      { type: 'Feature', properties: { name: 'Jequié Corridor', danger: 7.5, tag: 'SPECULATION' }, geometry: { type: 'Point', coordinates: [-40.48, -13.85] } },
      { type: 'Feature', properties: { name: 'Serra Verde', danger: 9, tag: 'US DFC $565M' }, geometry: { type: 'Point', coordinates: [-48.1, -14.25] } },
      { type: 'Feature', properties: { name: 'Aclara Carina', danger: 7, tag: 'State Dept $5M' }, geometry: { type: 'Point', coordinates: [-49.1, -16.7] } },
      { type: 'Feature', properties: { name: 'Bambuí Aquifer', danger: 9, tag: 'CONTAMINATION' }, geometry: { type: 'Point', coordinates: [-47, -17.5] } },
    ],
  }
  map!.addSource('ree-sites', { type: 'geojson', data: sites })
  map!.addLayer({
    id: 'ree-site-glow', type: 'circle', source: 'ree-sites',
    paint: {
      'circle-color': '#c0392b',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8, 10, 14],
      'circle-opacity': 0.12,
      'circle-blur': 3,
    },
  })
  map!.addLayer({
    id: 'ree-site-label', type: 'symbol', source: 'ree-sites',
    layout: {
      'text-field': ['format', ['get', 'name'], { 'font-scale': 1.1 }, ' ', ['get', 'tag'], { 'font-scale': 0.75 }],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 8, 10, 12, 12],
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-anchor': 'bottom',
      'text-offset': [0, 2],
    },
    paint: {
      'text-color': '#c0392b',
      'text-halo-color': 'rgba(0,0,0,0.9)',
      'text-halo-width': 2,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 0.9],
    },
  })
  // Click on site marker opens popup with info
  map!.on('click', 'ree-site-label', (e: any) => {
    if (!e.features?.length) return
    const p = e.features[0].properties
    const dangerColor = (p.danger ?? 5) >= 9 ? '#e74c3c' : (p.danger ?? 5) >= 7 ? '#f39c12' : '#27ae60'
    new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat(e.lngLat)
      .setHTML(`<div style="padding:8px 12px;min-width:160px"><h3 style="margin:0 0 2px;font-size:12px;font-weight:700;color:#e0e0e0">${escapeHtml(p.name)}</h3><div style="font-size:10px;color:#888">${escapeHtml(p.tag || '')}</div><div style="margin-top:4px;display:flex;align-items:center;gap:4px"><span style="font-size:8px;color:rgba(255,255,255,0.35);text-transform:uppercase">Danger</span><span style="font-size:10px;font-weight:700;color:${dangerColor}">${p.danger?.toFixed(1) || '—'}</span></div></div>`)
      .addTo(map!)
  })
  map!.on('mouseenter', 'ree-site-label', () => { if (map) map.getCanvas().style.cursor = 'pointer' })
  map!.on('mouseleave', 'ree-site-label', () => { if (map) map.getCanvas().style.cursor = '' })
}

function addRareEarthNetworkLines() {
  if (!map || !props.rareEarthPoints) return
  const pts: GeoJSON.Feature[] = (props.rareEarthPoints as GeoJSON.FeatureCollection).features
  const byNet: Record<string, { lng: number; lat: number; name: string }[]> = {}
  pts.forEach(f => {
    const net = f.properties?.net || f.properties?.network_id
    if (!net) return
    if (!byNet[net]) byNet[net] = []
    const coords = (f.geometry as GeoJSON.Point).coordinates
    byNet[net].push({ lng: coords[0], lat: coords[1], name: f.properties?.n || '' })
  })
  const lineFeatures: GeoJSON.Feature[] = []
  Object.entries(byNet).forEach(([netId, nodes]) => {
    if (nodes.length < 2) return
    // Connect first to all others (star topology)
    const hub = nodes[0]
    for (let i = 1; i < nodes.length; i++) {
      lineFeatures.push({
        type: 'Feature',
        properties: { network_id: netId, from: hub.name, to: nodes[i].name },
        geometry: { type: 'LineString', coordinates: [[hub.lng, hub.lat], [nodes[i].lng, nodes[i].lat]] },
      })
    }
  })
  if (!lineFeatures.length) return
  try { map!.removeSource('ree-network') } catch {}
  try { map!.removeLayer('ree-network-lines') } catch {}
  map!.addSource('ree-network', { type: 'geojson', data: { type: 'FeatureCollection', features: lineFeatures } })
  map!.addLayer({
    id: 'ree-network-lines', type: 'line', source: 'ree-network',
    paint: {
      'line-color': '#5dade2',
      'line-width': 0.5,
      'line-opacity': 0.25,
      'line-dasharray': [1, 3],
    },
    layout: { visibility: (layerVisibilityProp.value['network'] !== false) ? 'visible' : 'none' },
  })
}

function syncRareEarthLayerVisibility() {
  if (!map || !rareEarthLayersInitialized) return
  const vis = layerVisibilityProp.value
  const catIds = Object.keys({ direct_ree: 1, carbonatite_associated: 1, pegmatite_associated: 1, heavy_mineral_associated: 1, phosphate_associated: 1, strategic_associated: 1 })
  catIds.forEach(cat => {
    const show = vis[cat] !== false
    ;[`ree-pt-${cat}-glow`, `ree-pt-${cat}`].forEach(id => {
      try { map!.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none') } catch {}
    })
  })
  // Polygon layers
  const polyLayers = ['ree-poly-fill','ree-poly-glow','ree-poly-line','ree-poly-label']
  const showPolys = vis['polygons'] !== false
  polyLayers.forEach(id => { try { map!.setLayoutProperty(id, 'visibility', showPolys ? 'visible' : 'none') } catch {} })
  // Geo layers (basins, aquifers, conflict zones)
  const geoFillLayers = ['ree-geo-fill','ree-geo-aquifer','ree-geo-conflict']
  const geoLineLayers = ['ree-geo-line','ree-geo-label']
  const showWater = vis['water'] !== false
  geoFillLayers.forEach(id => { try { map!.setLayoutProperty(id, 'visibility', showWater ? 'visible' : 'none') } catch {} })
  geoLineLayers.forEach(id => { try { map!.setLayoutProperty(id, 'visibility', showWater ? 'visible' : 'none') } catch {} })
  // Conflict site markers
  const siteLayers = ['ree-site-glow','ree-site-label']
  const showSites = vis['sites'] !== false
  siteLayers.forEach(id => { try { map!.setLayoutProperty(id, 'visibility', showSites ? 'visible' : 'none') } catch {} })
  // Network lines
  try { map!.setLayoutProperty('ree-network-lines', 'visibility', vis['network'] !== false ? 'visible' : 'none') } catch {}
}

// Watcher for layer visibility changes from parent
watch(layerVisibilityProp, () => {
  if (activeDataset.value === 'observatory-of-vulcan') {
    syncRareEarthLayerVisibility()
  }
}, { deep: true })

// Watcher for rare earth point data updates (e.g. search filter)
watch(() => props.rareEarthPoints, (newVal) => {
  if (activeDataset.value === 'observatory-of-vulcan' && newVal && map && map.isStyleLoaded()) {
    try {
      const src = map.getSource('ree-points') as maplibregl.GeoJSONSource
      if (src) src.setData(newVal as any)
      // Rebuild network lines when data changes
      addRareEarthNetworkLines()
    } catch {}
  }
})

let flyToHighlightMarker: maplibregl.Marker | null = null
let flyToHighlightTimer: ReturnType<typeof setTimeout> | null = null

function addFlyToHighlight(lng: number, lat: number) {
  if (!map) return
  // Remove existing highlight
  if (flyToHighlightTimer) clearTimeout(flyToHighlightTimer)
  if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }

  const el = document.createElement('div')
  el.style.width = '40px'
  el.style.height = '40px'
  el.style.borderRadius = '50%'
  el.style.background = 'rgba(231,76,60,0.15)'
  el.style.border = '2px solid rgba(231,76,60,0.6)'
  el.style.boxShadow = '0 0 20px rgba(231,76,60,0.3), inset 0 0 12px rgba(231,76,60,0.15)'
  el.style.animation = 'flyto-pulse 1.5s ease-out 3'
  el.style.pointerEvents = 'none'

  flyToHighlightMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
    .setLngLat([lng, lat])
    .addTo(map)

  flyToHighlightTimer = setTimeout(() => {
    if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }
    flyToHighlightTimer = null
  }, 5000)
}

// Watcher for fly-to target from parent
watch(() => props.flyToTarget, (target) => {
  if (!map || !target) return
  map.flyTo({
    center: [target.lng, target.lat],
    zoom: target.zoom ?? 9,
    duration: 1500,
  })
  // Add highlight after fly completes
  map.once('moveend', () => addFlyToHighlight(target.lng, target.lat))
})

// Fallback rebuildMarkers using DOM markers (for smaller datasets or when GeoJSON isn't available)
function rebuildMarkers() {
  if (!map) return

  const currentZoom = map.getZoom()

  // Use native GeoJSON for large datasets (endangered species with 4000+ points)
  if (useNativeGeoJSON && activeDataset.value === 'endangered-species' && visibleSpecies.value.length > 500) {
    setupGeoJSONMarkers()
    return
  }

  // For smaller datasets or project grants, use DOM markers
  markers.forEach(m => m.remove())
  markers = []
  clusterer.destroy()

  if (activeDataset.value === 'project-grants') {
    const projectList = isMobile.value
      ? visibleProjects.value.slice(0, 60)
      : visibleProjects.value
    const validProjects = projectList.filter(p => isValidCoordinate(p.latitude, p.longitude))

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
  } else if (activeDataset.value === 'endangered-species') {
    const speciesList = isMobile.value
      ? visibleSpecies.value.slice(0, 80)
      : visibleSpecies.value
    const speciesToRender = speciesList.filter(s => isValidCoordinate(s.lat, s.lng))
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
    projects: visibleProjects.value,
    species: visibleSpecies.value,
    isMobile: isMobile.value,
  })

  syncMapConnectionLayers(map, connectionFeatures)
}

function cleanupParticles() {
  particleSystem?.stop()
  particleSystem = null
}

function startParticles() {
  if (!showConnections.value || !map || !mapContainerRef.value || !connectionFeatures.length) return

  cleanupParticles()

  particleSystem = createMapParticleSystem({
    map,
    container: mapContainerRef.value,
    getFeatures: () => connectionFeatures,
    isMobile: () => isMobile.value,
    zIndex: 2,
  })
  particleSystem.start()
}

function navigateToLocation(lat: number, lng: number) {
  if (map) {
    map.flyTo({ center: [lng, lat], zoom: 6, duration: 1500, essential: true })
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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

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
  }, 150)
}

function initMap() {
  if (!mapContainerRef.value) return

  // Clean up existing map if retry
  if (map) {
    markers.forEach(m => m.remove())
    markers = []
    if (useNativeGeoJSON) {
      geoJSONMarkers.cleanup()
    }
    map.remove()
    map = null
  }

  noWebglSupport.value = false
  isLoading.value = true

  try {
    const isRee = activeDataset.value === 'observatory-of-vulcan'
    map = new maplibregl.Map({
      container: mapContainerRef.value,
      style: isRee ? {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'carto-light': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png', 'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png', 'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
            tileSize: 256,
            attribution: '© CARTO © OSM',
          },
        },
        layers: [{ id: 'carto', type: 'raster', source: 'carto-light', minzoom: 0, maxzoom: 19 }],
      } : MAP_STYLE,
      zoom: isRee ? 4.2 : isMobile.value ? 1.8 : 3,
      center: isRee ? [-48, -15] : [0, 0],
      attributionControl: false,
      renderWorldCopies: true,
      minZoom: isRee ? 2.5 : isMobile.value ? 0.5 : 1.5,
      maxZoom: isRee ? 16 : isMobile.value ? 8 : 9,
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
      isLoading.value = false
      if (activeDataset.value === 'observatory-of-vulcan') {
        setupRareEarthLayers()
      } else {
        rebuildMarkers()
        addConnections()
        startParticles()
      }
      setupHexGrid()
    })

    map.on('move', () => {
      // Only run visibility update for DOM markers
      if (!useNativeGeoJSON && !pendingVisibilityUpdate) {
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

    map.on('resize', () => {
      debouncedSetupHexGrid()
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

    window.addEventListener('resize', debouncedSetupHexGrid)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize map:', err)
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

watch(showHexGrid, async (visible) => {
  if (!visible) return
  await nextTick()
  setupHexGrid()
})

watch(showConnections, () => {
  addConnections()
  if (showConnections.value) startParticles()
})

// Pause particles when overlay is open to save CPU
watch([showSpeciesOverlay, showProjectOverlay], ([speciesOpen, projectOpen]) => {
  if (speciesOpen || projectOpen) {
    cleanupParticles()
  } else if (showConnections.value) {
    startParticles()
  }
})

onUnmounted(() => {
  if (hexGridDebounceTimer) clearTimeout(hexGridDebounceTimer)
  cleanupParticles()
  markers.forEach(m => m.remove())
  markers = []
  clusterer.destroy()
  if (useNativeGeoJSON) {
    geoJSONMarkers.cleanup()
  }
  clearImageCache()
  window.removeEventListener('resize', debouncedSetupHexGrid)
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
  transition: all 0.2s ease;
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
  transition: all 0.2s ease;
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
