import { ref, computed, nextTick, type Ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useMapHexGrid } from '@/composables/useMapHexGrid'
import { useSpeciesPopup, useProjectPopup, useCrewPopup } from '@/composables/useMapPopup'
import { useMapConnections } from '@/composables/useMapConnections'
import { useMapMarkerOrchestrator } from '@/composables/useMapMarkerOrchestrator'
import { useRareEarthController } from '@/composables/useRareEarthController'
import { useSpeciesPanel } from '@/composables/useSpeciesPanel'
import { allProjectsData } from '@/lib/project-data'
import { openRareEarthOverlayPopup } from '@/lib/map-utils'
import { getMapStyle } from '@/composables/useMapLibre'
import type { ProjectData } from '@/lib/types'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import type { Species } from '@/lib/map-utils'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import type { Map as MapLibreMap } from 'maplibre-gl'

export interface MapBaseProps {
  projects?: ProjectData[]
  species?: Species[]
  speciesIndex?: SpeciesIndexItem[]
  crews?: CrewRegionData[]
  crewLocations?: CrewLocation[]
  defaultDataset?: 'project-grants' | 'endangered-species' | 'vulcan-observatory' | 'active-crews'
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthProtected?: GeoJSON.FeatureCollection
  rareEarthWater?: GeoJSON.FeatureCollection | null
  rareEarthCultural?: GeoJSON.FeatureCollection | null
  rareEarthAnalysis?: Record<string, unknown>
  layerVisibility?: Record<string, boolean>
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null
}

export function useMapBase(
  mapRef: Ref<MapLibreMap | null>,
  mapContainerRef: Ref<HTMLElement | null>,
  hexCanvasRef: Ref<HTMLCanvasElement | null>,
  isGlobe: boolean,
  props: MapBaseProps,
) {
  const { t, locale, localeNames } = useI18n()
  const speciesPanel = useSpeciesPanel()
  const baseURL = useRuntimeConfig().app.baseURL
  const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''
  const MAP_STYLE = getMapStyle(MAPTILER_API_KEY)

  // ── Shared state ──
  const projectsData = computed(() => props.projects || allProjectsData)
  const speciesData = computed(() => props.species || [])
  const speciesIndexData = computed(() => props.speciesIndex || [])
  const crewsData = computed(() => props.crews || [])
  const crewLocationsData = computed(() => props.crewLocations || [])
  const activeDataset = ref<'project-grants' | 'endangered-species' | 'vulcan-observatory' | 'active-crews'>(props.defaultDataset || 'project-grants')
  const selectedSpeciesGroups = ref<string[]>([])
  const hasError = ref(false)
  const errorMessage = ref('')
  const noWebglSupport = ref(false)
  const isLoading = ref(true)
  const showHexGrid = ref(true)
  const showFilterPanel = ref(false)

  // ── Connections ──
  const connections = useMapConnections(
    () => mapRef.value,
    mapContainerRef,
    { zIndex: isGlobe ? 30 : 2 },
  )
  const { showConnections, toggleConnections } = connections

  // ── Hex grid ──
  const hexGrid = useMapHexGrid(hexCanvasRef)

  // ── Popup composables ──
  const speciesPopup = useSpeciesPopup(baseURL)
  const projectPopup = useProjectPopup()
  const crewPopup = useCrewPopup()

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

  const speciesOverlayActive = computed(() => showSpeciesOverlay.value)
  const projectOverlayActive = computed(() => showProjectOverlay.value)
  useFocusTrap(speciesOverlayRef, { active: speciesOverlayActive })
  useFocusTrap(projectOverlayRef, { active: projectOverlayActive })

  let lastFocusedEl: HTMLElement | null = null

  function openSpeciesOverlay(species: Species | SpeciesIndexItem) {
    lastFocusedEl = document.activeElement as HTMLElement
    openSpeciesPopup(species)
  }
  function closeSpeciesOverlay() {
    closeSpeciesPopup()
    nextTick(() => lastFocusedEl?.focus())
  }
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
  function openRareEarthOverlay(feature: GeoJSON.Feature) {
    if (mapRef.value) openRareEarthOverlayPopup(mapRef.value, feature)
  }

  // ── Marker orchestrator ──
  const orchestrator = useMapMarkerOrchestrator({
    map: mapRef,
    locale,
    isMobile: useMediaQuery('(max-width: 768px)'),
    baseURL,
    defaultDataset: props.defaultDataset || 'project-grants',
    isGlobe,
    callbacks: {
      openProjectOverlay,
      openSpeciesOverlay,
      openCrewOverlay: (crew: CrewRegionData | CrewLocation) => openCrewOverlay(crew),
      openCrewLocationOverlay: (crew: CrewLocation) => openCrewOverlay(crew),
      openRareEarthOverlay: (feature: GeoJSON.Feature) => openRareEarthOverlay(feature),
    },
  })

  const { useNativeGeoJSON } = orchestrator

  // ── Rare Earth controller ──
  const rareEarthController = useRareEarthController({
    map: mapRef,
    isActive: computed(() => activeDataset.value === 'vulcan-observatory'),
    getProps: () => props,
    popup: { t, locale },
  })

  function setupRareEarthLayers() {
    rareEarthController.setupLayers()
  }

  function rebuildMarkers(
    visibleProjects: ProjectData[],
    visibleSpecies: SpeciesIndexItem[],
  ) {
    orchestrator.rebuildMarkers(
      activeDataset.value, visibleProjects, speciesIndexData.value, speciesData.value,
      crewsData.value, crewLocationsData.value, selectedSpeciesGroups.value,
      (props.rareEarthPoints as GeoJSON.FeatureCollection | undefined)?.features,
    )
  }

  function updateMarkerVisibility() {
    orchestrator.updateMarkerVisibility()
  }

  function navigateToLocation(lat: number, lng: number) {
    if (mapRef.value) {
      mapRef.value.flyTo({ center: [lng, lat], zoom: 6, duration: 1500, essential: true })
    }
  }

  return {
    t, locale, localeNames, baseURL, MAP_STYLE, MAPTILER_API_KEY,
    speciesPanel,
    projectsData, speciesData, speciesIndexData, crewsData, crewLocationsData,
    activeDataset, selectedSpeciesGroups,
    hasError, errorMessage, noWebglSupport, isLoading,
    showHexGrid, showFilterPanel, connections, showConnections, toggleConnections,
    hexGrid,
    orchestrator, useNativeGeoJSON, updateMarkerVisibility, rebuildMarkers, navigateToLocation,
    setupRareEarthLayers, rareEarthController,
    showSpeciesOverlay, speciesOverlayHTML, projectOverlayHTML, crewOverlayHTML,
    popupLocale, availablePopupLocales,
    speciesCloseBtnRef, speciesOverlayRef, projectCloseBtnRef, projectOverlayRef, crewCloseBtnRef,
    openSpeciesOverlay, closeSpeciesOverlay,
    openProjectOverlay, closeProjectOverlay,
    openCrewOverlay, closeCrewOverlay,
    handleSpeciesSelected, openRareEarthOverlay,
  }
}

// Need to import useMediaQuery here
import { useMediaQuery } from '@/composables/useMediaQuery'
