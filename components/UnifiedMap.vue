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
    <div aria-hidden="true" class="absolute inset-0 pointer-events-none" :style="{ zIndex: 'var(--z-map-overlays)', boxShadow: 'inset 0 0 100px 15px rgba(0,0,0,0.5)' }" />

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
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[180px] xs:max-w-[240px] object-contain" loading="lazy" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[180px] -rotate-90 origin-center" loading="lazy" />
    </div>

    <!-- Map Container -->
    <div ref="mapContainerRef" class="absolute inset-0 w-full h-full" :style="{ zIndex: 'var(--z-map-base)' }" />

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
import type { CrewRegionData } from '@/lib/crew-data'
import type { Species } from '@/lib/map-utils'
import { buildProjectPopupHTML, buildSpeciesPopupHTML, buildRareEarthPopupHTML, buildCrewPopupHTML, isValidCoordinate, GROUP_COLORS } from '@/lib/map-utils'
import type { GeoJSONSource } from 'maplibre-gl'
import {
  preloadSpeciesImages,
} from '@/lib/image-utils'
import { useMapCluster } from '@/composables/useMapCluster'
import type { ClusterPoint, ClusterItem } from '@/composables/useMapCluster'
import {
  createProjectMarkerElement,
  createSpeciesMarkerElement,
  createRareEarthMarkerElement,
  createCrewMarkerElement,
  createClusterMarkerElement,
} from '@/composables/useMapMarkers'
import {
  useGeoJSONMarkers,
  speciesIndexToGeoJSON,
  projectsToGeoJSON,
  type SpeciesIndexItem,
} from '@/composables/useGeoJSONMarkers'
import { useRareEarthController } from '@/composables/useRareEarthController'
import { useSpeciesPanel } from '@/composables/useSpeciesPanel'
import { useMapConnections } from '@/composables/useMapConnections'

const { t, locale, localeNames } = useI18n()
const speciesPanel = useSpeciesPanel()

const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''
const baseURL = useRuntimeConfig().app.baseURL

const MAP_STYLE = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_API_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

function transformRequest(url: string, _resourceType?: string) {
  return { url }
}

interface Props {
  projects?: ProjectData[]
  species?: Species[]
  speciesIndex?: SpeciesIndexItem[]  // Lightweight index for markers
  defaultDataset?: 'project-grants' | 'endangered-species' | 'observatory-of-vulcan' | 'active-crews'
  crews?: CrewRegionData[]
  // Rare Earth dataset (observatory-of-vulcan)
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthProtected?: GeoJSON.FeatureCollection
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
const showFilterPanel = ref(false)
const activeDataset = ref<'project-grants' | 'endangered-species' | 'observatory-of-vulcan' | 'active-crews'>(props.defaultDataset)

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
const showCrewOverlay = ref(false)
const crewOverlayHTML = ref('')

let map: maplibregl.Map | null = null
let markers: maplibregl.Marker[] = []
let isMounted = true
let pendingVisibilityUpdate = false
let pendingClusterRebuild = false
const clusterer = useMapCluster()
const geoJSONMarkers = useGeoJSONMarkers()
let lastClusterZoom = -1
let lastBboxCenter: { lng: number; lat: number } | null = null

const speciesCloseBtnRef = ref<HTMLElement | null>(null)
const projectCloseBtnRef = ref<HTMLElement | null>(null)
const crewCloseBtnRef = ref<HTMLElement | null>(null)
const speciesOverlayRef = ref<HTMLElement | null>(null)
const projectOverlayRef = ref<HTMLElement | null>(null)
let lastFocusedEl: HTMLElement | null = null

const speciesOverlayActive = computed(() => showSpeciesOverlay.value)
const projectOverlayActive = computed(() => showProjectOverlay.value)
useFocusTrap(speciesOverlayRef, { active: speciesOverlayActive })
useFocusTrap(projectOverlayRef, { active: projectOverlayActive })

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

function openCrewOverlay(crew: CrewRegionData) {
  const crewPopupTranslations = {
    activeCrews: t('crews.activeCrews'),
    inactiveCrews: t('crews.inactiveCrews'),
    totalMembers: t('crews.totalMembers'),
    countries: t('crews.countries'),
    region: t('crews.region'),
    growthSince2022: t('crews.growthSince2022'),
  }
  crewOverlayHTML.value = buildCrewPopupHTML(crew, crewPopupTranslations)
  showCrewOverlay.value = true
  lastFocusedEl = document.activeElement as HTMLElement
  nextTick(() => crewCloseBtnRef.value?.focus())
}

function openRareEarthOverlay(feature: GeoJSON.Feature) {
  const props = feature.properties as Record<string, any> || {}
  const html = buildRareEarthPopupHTML(props)
  new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
    .setLngLat([(feature.geometry as any).coordinates[0], (feature.geometry as any).coordinates[1]])
    .setHTML(html)
    .setMaxWidth('none')
    .addTo(map!)
}

function closeProjectOverlay() {
  showProjectOverlay.value = false
  projectOverlayHTML.value = ''
  nextTick(() => lastFocusedEl?.focus())
}

function closeCrewOverlay() {
  showCrewOverlay.value = false
  crewOverlayHTML.value = ''
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
    let topOffset = 0
    let leftOffset = 0

    if (rect.right > window.innerWidth - margin) {
      leftOffset = window.innerWidth - rect.width - margin - rect.left
    }

    if (rect.left < margin) {
      leftOffset = margin - rect.left
    }

    if (rect.top < margin) {
      topOffset = margin - rect.top
    }

    if (rect.bottom > window.innerHeight - margin) {
      topOffset = window.innerHeight - rect.height - margin - rect.top
    }

    if (rect.height > maxHeight) {
      topOffset = margin - rect.top
      content.style.maxHeight = `${maxHeight}px`
      content.style.overflowY = 'auto'
    }

    if (topOffset !== 0 || leftOffset !== 0) {
      const tip = popupEl.querySelector('.maplibregl-popup-tip') as HTMLElement | null
      const currentTransform = tip?.style.transform || content.style.transform || ''
      const translateMatch = currentTransform.match(/translate\(([^)]+)\)/)
      let baseX = 0
      let baseY = 0
      if (translateMatch) {
        const parts = translateMatch[1].split(',').map(s => parseFloat(s.trim()) || 0)
        baseX = parts[0] || 0
        baseY = parts[1] || 0
      }
      const adjustedX = baseX + leftOffset
      const adjustedY = baseY + topOffset
      const newTransform = `translate(${adjustedX}px, ${adjustedY}px)`
      if (translateMatch) {
        if (tip) tip.style.transform = currentTransform.replace(translateMatch[0], newTransform)
        else content.style.transform = newTransform
      } else {
        if (tip) tip.style.transform = newTransform
        else content.style.transform = newTransform
      }
    }
  })
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

function handleFilterChange(filtered: Species[]) {
  filteredSpeciesList.value = filtered
  rebuildMarkers()
  connections2D.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
  if (connections2D.showConnections.value) connections2D.startParticles()
}

function handleProjectFilterChange(filtered: ProjectData[]) {
  filteredProjectsList.value = filtered
  rebuildMarkers()
  connections2D.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
  if (connections2D.showConnections.value) connections2D.startParticles()
}

function handleSearchOpenChange(open: boolean) {
  if (open && isMobile.value) {
    showFilterPanel.value = false
  }
}






const useNativeGeoJSON = true
const SOURCE_ID = 'species-markers'

// Tracks which dataset the GeoJSON source was last initialized for so we can
// avoid the full teardown/add cycle on subsequent rebuildMarkers() calls (e.g.
// from map.on('moveend')) when only viewport or filter data changed.
let geoJSONInitializedFor: 'project-grants' | 'endangered-species' | null = null
let geoJSONSpeciesIndex: SpeciesIndexItem[] | null = null

async function setupGeoJSONMarkers(forceReinit = false) {
  if (!map || !useNativeGeoJSON) return

  const dataset = activeDataset.value === 'project-grants' ? 'project-grants' : 'endangered-species'

  if (!forceReinit && geoJSONInitializedFor === dataset) {
    // Source/layers already exist for this dataset. Refresh the data in place
    // and bail out so we don't re-fetch the index and re-install handlers.
    updateGeoJSONMarkerData()
    return
  }

  // Clean up old DOM markers
  markers.forEach(m => m.remove())
  markers = []
  clusterer.destroy()

  geoJSONMarkers.init(map)

  if (dataset === 'project-grants') {
    const validProjects = visibleProjects.value.filter(p => isValidCoordinate(p.latitude, p.longitude))
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
      () => { /* flyTo handled inside setupEventHandlers */ }
    )
    geoJSONInitializedFor = 'project-grants'
  } else {
    // Use lightweight index if provided, otherwise load it
    let speciesIndex: SpeciesIndexItem[]

    if (geoJSONSpeciesIndex) {
      speciesIndex = geoJSONSpeciesIndex
    } else if (speciesIndexData.value.length > 0) {
      speciesIndex = speciesIndexData.value
      geoJSONSpeciesIndex = speciesIndex
    } else {
      // Fetch lightweight index for all datasets
      try {
        const [icmbioRes, iucnRes] = await Promise.all([
          fetch(`${baseURL}data/species/icmbio-brazil-index.json`),
          fetch(`${baseURL}data/species/iucn-index.json`),
        ])
        const icmbio = icmbioRes.ok ? await icmbioRes.json() : []
        const iucn = iucnRes.ok ? await iucnRes.json() : []
        speciesIndex = [...icmbio, ...iucn]
        geoJSONSpeciesIndex = speciesIndex
      } catch {
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
      (props, coords) => {
        const [lng, lat] = coords
        const matches = findSpeciesAtCoord(lat, lng, speciesIndex)
        if (matches.length > 1) {
          speciesPanel.openPanel(matches, { lat, lng })
        } else {
          const speciesId = props.id as string
          const indexItem = speciesIndex.find(s => s.id === speciesId)
          if (indexItem) openSpeciesOverlay(indexItem)
        }
      },
      (_, coords) => {
        const [lng, lat] = coords
        const matches = findSpeciesAtCoord(lat, lng, speciesIndex)
        if (matches.length > 1) {
          speciesPanel.openPanel(matches, { lat, lng })
        }
      }
    )
    geoJSONInitializedFor = 'endangered-species'
  }

  // Update last cluster zoom
  lastClusterZoom = Math.floor(map.getZoom())
  const center = map.getCenter()
  lastBboxCenter = { lng: center.lng, lat: center.lat }
}

function updateGeoJSONMarkerData() {
  if (!map || !geoJSONInitializedFor) return
  if (geoJSONInitializedFor === 'project-grants') {
    const validProjects = visibleProjects.value.filter(p => isValidCoordinate(p.latitude, p.longitude))
    geoJSONMarkers.updateData(SOURCE_ID, projectsToGeoJSON(validProjects))
  } else if (geoJSONSpeciesIndex) {
    const filteredIndex = applySpeciesFilters(geoJSONSpeciesIndex)
    geoJSONMarkers.updateData(SOURCE_ID, speciesIndexToGeoJSON(filteredIndex))
  }
}

function setupRareEarthLayers() {
  rareEarthController.setupLayers()
}

const rareEarthController = useRareEarthController({
  map: computed(() => map),
  isActive: computed(() => activeDataset.value === 'observatory-of-vulcan'),
  getProps: () => props,
})

// Fallback rebuildMarkers using DOM markers (for smaller datasets or when GeoJSON isn't available)
function rebuildMarkers() {
  if (!map) return

  const currentZoom = map.getZoom()

  // Always use DOM markers for all datasets (consistent marker style)
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
          const project = visibleProjects.value[item.index]
          if (project) openProjectOverlay(project)
        }
        const el = createClusterMarkerElement(activeDataset.value, cp.count, cp.items, onItemClick, validProjects)
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} projects`)
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
  } else if (activeDataset.value === 'observatory-of-vulcan' && props.rareEarthPoints?.features?.length) {
    const features = props.rareEarthPoints.features

    const clusterItems = features.map((f, i) => ({
      lng: (f.geometry as any).coordinates[0],
      lat: (f.geometry as any).coordinates[1],
      type: 'rareEarth' as const,
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
          const feature = features[item.index]
          if (feature) openRareEarthOverlay(feature)
        }
        const el = createClusterMarkerElement(activeDataset.value, cp.count, cp.items, onItemClick, undefined, undefined, features)
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} rare earth claims`)
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
        const feature = features[cp.sourceIndex]
        if (!feature) return
        const el = createRareEarthMarkerElement(feature)
        el.style.cursor = 'pointer'
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', feature.properties?.n || 'Rare Earth claim')
        el.addEventListener('click', () => { openRareEarthOverlay(feature) })
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRareEarthOverlay(feature) }
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([(feature.geometry as any).coordinates[0], (feature.geometry as any).coordinates[1]])
          .addTo(map!)
        markers.push(marker)
      }
    })
  } else if (activeDataset.value === 'active-crews') {
    const validCrews = crewsData.value.filter(c => isValidCoordinate(c.latitude, c.longitude))

    const clusterItems = validCrews.map((c, i) => ({
      lng: c.longitude,
      lat: c.latitude,
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
          const crew = validCrews[item.index]
          if (crew) openCrewOverlay(crew)
        }
        const el = createClusterMarkerElement(activeDataset.value, cp.count, cp.items, onItemClick, undefined, undefined, undefined, validCrews.map(c => ({ lng: c.longitude, lat: c.latitude })))
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Cluster of ${cp.count} crew regions`)
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
        const crew = validCrews[cp.sourceIndex]
        if (!crew) return
        const el = createCrewMarkerElement(crew)
        el.style.cursor = 'pointer'
        el.setAttribute('tabindex', '0')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `${crew.region} - ${crew.activeCrews} active crews`)
        el.addEventListener('click', () => { openCrewOverlay(crew) })
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCrewOverlay(crew) }
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([crew.longitude, crew.latitude])
          .addTo(map!)
        markers.push(marker)
      }
    })
  } else if (activeDataset.value === 'endangered-species' && speciesIndexData.value.length) {
    const speciesList = isMobile.value
      ? speciesIndexData.value.slice(0, 80)
      : speciesIndexData.value
    const speciesToRender = speciesList.filter(s => isValidCoordinate(s.lat, s.lng))
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
let hexGridRafId: number | null = null

function debouncedSetupHexGrid() {
  if (hexGridDebounceTimer) clearTimeout(hexGridDebounceTimer)
  if (hexGridRafId) cancelAnimationFrame(hexGridRafId)
  hexGridDebounceTimer = setTimeout(() => {
    hexGridRafId = requestAnimationFrame(() => {
      setupHexGrid()
      hexGridRafId = null
    })
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
    geoJSONInitializedFor = null
    geoJSONSpeciesIndex = null
    map.remove()
    map = null
  }

  noWebglSupport.value = false
  isLoading.value = true

  try {
    const isRee = activeDataset.value === 'observatory-of-vulcan'
    map = new maplibregl.Map({
      container: mapContainerRef.value,
      style: MAP_STYLE,
      zoom: isRee ? 4.2 : isMobile.value ? 1.8 : 3,
      center: isRee ? [-48, -15] : [0, 0],
      attributionControl: false,
      renderWorldCopies: true,
      minZoom: isRee ? 2.5 : isMobile.value ? 0.5 : 1.5,
      maxZoom: isRee ? 16 : 18,
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
      if (!isMounted) return
      isLoading.value = false
      if (map) emit('mapInit', map)
      if (activeDataset.value === 'observatory-of-vulcan') {
        setupRareEarthLayers()
      }
      rebuildMarkers()
      if (activeDataset.value !== 'observatory-of-vulcan') {
        connections2D.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
        connections2D.startParticles()
      }
      setupHexGrid()
    })

    map.on('move', () => {
      // Only run visibility update for DOM markers (not native GeoJSON)
      const usingNativeGeoJSON = useNativeGeoJSON && activeDataset.value === 'endangered-species' && speciesIndexData.value.length > 500
      if (!usingNativeGeoJSON && !pendingVisibilityUpdate) {
        pendingVisibilityUpdate = true
        requestAnimationFrame(() => {
          updateMarkerVisibility()
          pendingVisibilityUpdate = false
        })
      }
      if (!pendingClusterRebuild && map) {
        // Skip cluster rebuilds for GeoJSON path — MapLibre handles viewport natively
        if (usingNativeGeoJSON) return
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
        } else if (errObj?.error?.message) {
          errorMessage.value = errObj.error.message
        } else {
          errorMessage.value = 'Failed to load map tiles. Please check your network connection and try again.'
        }
      }
    })

    // Timeout fallback — show error instead of silently hiding loading
    setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false
        if (!hasError.value) {
          hasError.value = true
          errorMessage.value = 'Map tiles took too long to load. Please check your network connection and try again.'
        }
      }
    }, 20000)

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

// In-place data update when filters change. Avoids the full teardown +
// re-setup cycle (re-fetching the species index, re-installing handlers,
// re-adding the source/layers) by calling setData on the existing source.
// Falls back to rebuildMarkers() if the GeoJSON source isn't ready yet
// (first paint, dataset switch, etc.).
watch([visibleSpecies, visibleProjects, selectedSpeciesGroups, speciesIndexData], () => {
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

// Watch rare earth data changes (observatory-of-vulcan) to rebuild markers
watch(() => [props.rareEarthPoints, props.rareEarthPolygons], () => {
  if (!map || activeDataset.value !== 'observatory-of-vulcan') return
  setupRareEarthLayers()
  rebuildMarkers()
}, { deep: true })

watch(showHexGrid, async (visible) => {
  if (!visible) return
  await nextTick()
  setupHexGrid()
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
  if (hexGridDebounceTimer) clearTimeout(hexGridDebounceTimer)
  if (hexGridRafId) cancelAnimationFrame(hexGridRafId)
  connections2D.cleanup()
  markers.forEach(m => m.remove())
  markers = []
  clusterer.destroy()
  if (useNativeGeoJSON) {
    geoJSONMarkers.cleanup()
  }
  geoJSONInitializedFor = null
  geoJSONSpeciesIndex = null
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
