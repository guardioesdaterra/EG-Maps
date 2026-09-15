/**
 * composables/useMapBase.ts
 * @why Shared map initialization logic — tile auth, layer setup, common event handlers
 * @functions useMapBase
 * @interfaces MapBaseProps, MapBaseConfig
 * @deps vue (ref, computed, nextTick, onMounted, onUnmounted, watch, type Ref); @/composables/useMediaQuery (useMediaQuery); @/composables/useI18n (useI18n); @/composables/useFocusTrap (useFocusTrap); @/composables/useMapHexGrid (useMapHexGrid); @/composables/useMapPopup (useSpeciesPopup, useProjectPopup, useCrewPopup, usePreviewCard); @/composables/useMapConnections (useMapConnections); @/composables/useMapMarker (useMapMarker); @/composables/useRareEarthController (useRareEarthController); @/composables/useCulturalLayers (getPopupContent); @/composables/useVulcanCircles (VULCAN_CENTER); @/composables/useSpeciesPanel (useSpeciesPanel); @/composables/useAdaptiveQuality (useAdaptiveQuality); @/lib/project-data (allProjectsData); @/lib/map-utils (openRareEarthOverlayPopup); @/composables/useMapLibre (detectWebGLSupport, getMapStyle); @/lib/constants (HEX_GRID)
 * @connections components/MapView2D.vue, components/MapView3D.vue
 */
import { ref, shallowRef, computed, nextTick, onMounted, onUnmounted, watch, type Ref } from 'vue'
import maplibregl from 'maplibre-gl'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useI18n } from '@/composables/useI18n'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useMapHexGrid } from '@/composables/useMapHexGrid'
import { useSpeciesPopup, useProjectPopup, useCrewPopup, usePreviewCard } from '@/composables/useMapPopup'
import { useMapConnections } from '@/composables/useMapConnections'
import { useMapMarker } from '@/composables/useMapMarker'
import { useRareEarthController } from '@/composables/useRareEarthController'
import { getPopupContent } from '@/composables/useCulturalLayers'
import { useSpeciesPanel } from '@/composables/useSpeciesPanel'
import { useAdaptiveQuality } from '@/composables/useAdaptiveQuality'
import { useMapTileProvider } from '@/composables/useMapTileProvider'
import { usePerformance } from '@/composables/usePerformance'
import { allProjectsData } from '@/lib/project-data'
import { openRareEarthOverlayPopup } from '@/lib/map-utils'
import { detectWebGLSupport, getMapStyle } from '@/composables/useMapLibre'
import { HEX_GRID } from '@/lib/constants'
import { VULCAN_CENTER } from '@/composables/useVulcanCircles'
import type { ProjectData } from '@/lib/types'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import type { Species } from '@/lib/map-utils'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ParticleQualityConfig } from '@/lib/map-effects'
import { useAppRuntime } from '@/composables/useAppRuntime'

export interface ClusterResultItem {
  id: string
  title: string
  subtitle: string
  color?: string
  coordinates: [number, number]
}

/**
 * Vulcan observatory viewport lock: the 2D map is constrained to ~100km
 * around the plateau center (the "Regional Zone" circle) so users can't
 * drift out to far-field context. minZoom 8 ≈ a 100km-radius view at this
 * latitude; maxBounds hard-clamps panning. Lifted when the full-Brazil
 * dataset loads (see useVulcanObservatoryPage's isRegional watcher).
 */
export const VULCAN_MAX_BOUNDS: [[number, number], [number, number]] = [
  [VULCAN_CENTER[0] - 0.97, VULCAN_CENTER[1] - 0.9],
  [VULCAN_CENTER[0] + 0.97, VULCAN_CENTER[1] + 0.9],
]
export const VULCAN_MIN_ZOOM_2D = 8
export const VULCAN_MIN_ZOOM_GLOBE = 4

// Module-level perf-timer registry. console.time labels are global: when init
// runs more than once per page (retry button, HMR, ClientOnly remount) while
// an earlier attempt's timer never ended, re-timing the same label warns
// "Timer already exists". The guard makes repeat timings no-ops.
const activeTimers = new Set<string>()
function tStart(label: string) {
  if (activeTimers.has(label)) return
  activeTimers.add(label)
  console.time(label)
}
function tEnd(label: string) {
  if (!activeTimers.has(label)) return
  activeTimers.delete(label)
  try { console.timeEnd(label) } catch { /* already cleared */ }
}

export interface MapBaseProps {
  projects?: ProjectData[]
  species?: Species[]
  speciesIndex?: SpeciesIndexItem[]
  crews?: CrewRegionData[]
  crewLocations?: CrewLocation[]
  defaultDataset?: 'project-grants' | 'endangered-species' | 'vulcan-observatory' | 'active-crews'
  /** Override hideAll from postMessage (when embedded in Squarespace iframe). */
  hideAll?: boolean
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthFiltered?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthProtected?: GeoJSON.FeatureCollection
  rareEarthWater?: GeoJSON.FeatureCollection | null
  rareEarthCultural?: GeoJSON.FeatureCollection | null
  rareEarthAnalysis?: Record<string, unknown>
  layerVisibility?: Record<string, boolean>
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null
}

export interface MapBaseConfig {
  isGlobe: boolean
  props: MapBaseProps
  mapContainerRef: Ref<HTMLElement | null>
  hexCanvasRef: Ref<HTMLCanvasElement | null>
  onStyleLoad?: (_map: maplibregl.Map) => void
  onMapReady?: (_map: maplibregl.Map) => void
  onBeforeCleanup?: () => void
}

export function useMapBase(config: MapBaseConfig) {
  const { isGlobe, props, mapContainerRef, hexCanvasRef, onStyleLoad, onMapReady, onBeforeCleanup } = config

  const { t, locale, localeNames } = useI18n()
  const route = useRoute()
  const speciesPanel = useSpeciesPanel()
  const baseURL = useRuntimeConfig().app.baseURL
  const isMobile = useMediaQuery('(max-width: 768px)')
  const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''

  const quality = useAdaptiveQuality()
  const runtime = useAppRuntime()
  const tileProvider = useMapTileProvider()
  const perf = usePerformance()

  const particleQuality = computed<ParticleQualityConfig>(() => ({
    particleMaxCount: quality.settings.value.particleMaxCount,
    particleFps: quality.settings.value.particleFps,
    particleTrailLength: quality.settings.value.particleTrailLength,
    particleShadowBlur: quality.settings.value.particleShadowBlur,
    particleSpawnRate: quality.settings.value.particleSpawnRate,
  }))

  const connectionBlur = computed(() => quality.settings.value.connectionLineBlur)

  const projectsData = computed(() => props.projects || allProjectsData)
  const speciesData = computed(() => props.species || [])
  const speciesIndexData = ref<SpeciesIndexItem[]>(props.speciesIndex || [])
  watch(() => props.speciesIndex, (val) => {
    if (val) speciesIndexData.value = val
  }, { immediate: false })
  const crewsData = computed(() => props.crews || [])
  const crewLocationsData = computed(() => props.crewLocations || [])
  const filteredProjectsList = ref<ProjectData[] | null>(null)
  const filteredSpeciesList = ref<SpeciesIndexItem[] | null>(null)
  const visibleProjects = computed(() => filteredProjectsList.value ?? projectsData.value)
  const visibleSpecies = computed(() => {
    return filteredSpeciesList.value ?? (activeDataset.value === 'endangered-species' ? speciesIndexData.value : speciesData.value)
  })
  const activeDataset = ref<'project-grants' | 'endangered-species' | 'vulcan-observatory' | 'active-crews'>(props.defaultDataset || 'project-grants')
  const selectedSpeciesGroups = ref<string[]>([])
  const clusterPanelItems = ref<ClusterResultItem[]>([])
  const clusterPanelDataset = ref('Cluster results')
  const clusterPanelOpen = ref(false)
  const hasError = ref(false)
  const errorMessage = ref('')
  const noWebglSupport = ref(false)
  const isLoading = ref(true)
  const showHexGrid = runtime.hexGridPreference
  const showFilterPanel = ref(false)
  const speciesFilterPanelRef = ref<{ toggleTaxonomicGroup: (_group: string) => void } | null>(null)

  const isEmbed = computed(() => {
    if (import.meta.server) return false
    return route.query.embed === 'true'
  })

  const noControl = computed(() => {
    if (import.meta.server) return false
    return route.query['no-control'] === 'true'
  })

  const hideAll = computed(() => {
    if (props.hideAll !== undefined) return props.hideAll
    if (import.meta.server) return false
    return route.query.hideAll === 'true'
  })

  const controlsForced = computed(() => {
    if (import.meta.server) return false
    return route.query.controls === 'true'
  })

  const isSmallViewport = ref(false)
  let viewportResizeFrame: number | null = null
  function checkViewportSize() {
    if (import.meta.server) return
    const w = window.innerWidth
    const h = window.innerHeight
    isSmallViewport.value = w < 400 || h < 300 || (w < 500 && h < 500 && Math.abs(w - h) < 150)
  }
  function scheduleViewportCheck() {
    if (viewportResizeFrame !== null) return
    viewportResizeFrame = window.requestAnimationFrame(() => {
      viewportResizeFrame = null
      checkViewportSize()
    })
  }
  const hideControls = computed(() => {
    if (controlsForced.value) return false
    return isEmbed.value || noControl.value || isSmallViewport.value
  })

  const hexGrid = useMapHexGrid(hexCanvasRef, {
    ...(isGlobe ? {
      mobileSize: HEX_GRID.mobileSizeGlobe,
      desktopSize: HEX_GRID.desktopSizeGlobe,
      strokeColor: HEX_GRID.strokeColorGlobe,
      lineWidth: HEX_GRID.lineWidthGlobe,
    } : {}),
    qualityScale: quality.settings.value.hexGridScale,
  })
  const onResize = hexGrid.debouncedSetup

  watch(() => quality.settings.value.hexGridScale, (newScale) => {
    hexGrid.updateQualityScale(newScale)
  })

  const connections = useMapConnections(
    () => map,
    mapContainerRef,
    {
      zIndex: isGlobe ? 30 : 2,
      qualityRef: particleQuality,
      qualityBlur: connectionBlur,
      initialShowConnections: runtime.connectionsPreference.value,
    },
  )
  const { showConnections, toggleConnections } = connections

  const speciesPopup = useSpeciesPopup()
  const projectPopup = useProjectPopup()
  const crewPopup = useCrewPopup()
  const previewCard = usePreviewCard(baseURL)

  const {
    showOverlay: showSpeciesOverlay,
    species: selectedSpeciesData,
    popupLocale,
    availableLocales: availablePopupLocales,
    closeBtnRef: speciesCloseBtnRef,
    overlayRef: speciesOverlayRef,
    open: openSpeciesPopup,
    close: closeSpeciesPopup,
  } = speciesPopup
  const {
    showOverlay: showProjectOverlay,
    project: selectedProjectData,
    closeBtnRef: projectCloseBtnRef,
    overlayRef: projectOverlayRef,
    open: openProjectPopup,
    close: closeProjectPopup,
  } = projectPopup
  const {
    showOverlay: showCrewOverlay,
    crew: selectedCrewData,
    isCrewLocation: isCrewLocationData,
    closeBtnRef: crewCloseBtnRef,
    overlayRef: crewOverlayRef,
    open: openCrewPopup,
    close: closeCrewPopup,
  } = crewPopup

  const speciesOverlayActive = computed(() => showSpeciesOverlay.value)
  const projectOverlayActive = computed(() => showProjectOverlay.value)
  const crewOverlayActive = computed(() => showCrewOverlay.value)
  useFocusTrap(speciesOverlayRef, { active: speciesOverlayActive })
  useFocusTrap(projectOverlayRef, { active: projectOverlayActive })
  useFocusTrap(crewOverlayRef, { active: crewOverlayActive })

  let map: maplibregl.Map | null = null
  // Which tile provider the live map style corresponds to. Guards the
  // provider watcher + applyProviderStyle against redundant setStyle calls.
  let lastAppliedProvider: string | null = null
  // Reactive mirror of `map` — `computed(() => map)` never updates because
  // `map` is a plain closure variable. The rare-earth controller and custom
  // layer hooks depend on a reactive ref, so keep them in sync on every
  // assignment/removal (see initMap / onUnmounted).
  const mapRef = shallowRef<maplibregl.Map | null>(null)
  function setMapInstance(next: maplibregl.Map | null) {
    map = next
    mapRef.value = next
    // Flush any fly-to target that arrived before the map existed.
    if (next && pendingFlyToTarget) {
      const target = pendingFlyToTarget
      pendingFlyToTarget = null
      next.flyTo({
        center: [target.lng, target.lat],
        zoom: target.zoom ?? 5,
        duration: 1500,
        essential: true,
      })
    }
  }
  // Fly-to requested before map creation (restored hash, sidebar jumps).
  // Stored here and flushed in setMapInstance + style/load handlers.
  let pendingFlyToTarget: { lng: number; lat: number; zoom?: number } | null = props.flyToTarget ?? null
  let isMounted = false
  let loadingTimeout: ReturnType<typeof setTimeout> | null = null
  let lastFocusedEl: HTMLElement | null = null
  let rebuildPending = false
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null
  let initialRebuildDone = false
  let isInitializing = false
  let mapCanvas: HTMLCanvasElement | null = null
  const onWebglContextLost = (event: Event) => {
    event.preventDefault()
    console.error('[EG Maps] WebGL context lost during map rendering')
    isLoading.value = false
    hasError.value = true
    errorMessage.value = 'The browser lost the map graphics context. Try reloading the page or disabling hardware-intensive browser extensions.'
  }

  /* ── overlay helpers ───────────────────────────────────────────────── */

  function openSpeciesOverlay(species: Species | SpeciesIndexItem) {
    previewCard.close()
    lastFocusedEl = document.activeElement as HTMLElement
    openSpeciesPopup(species)
  }
  function closeSpeciesOverlay() {
    closeSpeciesPopup()
    nextTick(() => lastFocusedEl?.focus())
  }
  function openProjectOverlay(project: ProjectData) {
    previewCard.close()
    lastFocusedEl = document.activeElement as HTMLElement
    openProjectPopup(project)
  }
  function closeProjectOverlay() {
    closeProjectPopup()
    nextTick(() => lastFocusedEl?.focus())
  }
  function openCrewOverlay(crew: CrewRegionData | CrewLocation) {
    previewCard.close()
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
  function openClusterPanel(payload: { dataset: string; coordinates: [number, number]; featureIds: string[] }) {
    const ids = new Set(payload.featureIds)
    const items: ClusterResultItem[] = []
    if (payload.dataset === 'project-grants') {
      for (const project of projectsData.value) if (ids.has(project.project_title)) items.push({ id: project.project_title, title: project.project_title, subtitle: project.country_province, color: '#22d3ee', coordinates: [project.longitude, project.latitude] })
      clusterPanelDataset.value = 'Project grants'
    } else if (payload.dataset === 'active-crews') {
      for (const crew of crewsData.value) if (ids.has(crew.id)) items.push({ id: crew.id, title: crew.region, subtitle: `${crew.activeCrews} active crews · ${crew.countries} countries`, color: '#22c55e', coordinates: [crew.longitude, crew.latitude] })
      for (const location of crewLocationsData.value) {
        const id = `${location.name}-${location.lat}-${location.lng}`
        if (ids.has(id)) items.push({ id, title: location.name, subtitle: `${location.city}, ${location.country}`, color: location.status === 'active' ? '#22c55e' : '#f59e0b', coordinates: [location.lng, location.lat] })
      }
      clusterPanelDataset.value = 'Active crews'
    } else if (payload.dataset === 'endangered-species') {
      for (const species of visibleSpecies.value) if (ids.has(species.id)) items.push({ id: species.id, title: species.commonName || species.scientificName, subtitle: species.scientificName, color: '#a855f7', coordinates: [species.lng, species.lat] })
      clusterPanelDataset.value = 'Endangered species'
    } else {
      clusterPanelDataset.value = 'Observatory results'
    }
    clusterPanelItems.value = items
    clusterPanelOpen.value = items.length > 0
    if (items.length > 0) runtime.emit({ type: 'cluster:open', dataset: payload.dataset, count: items.length })
  }
  function closeClusterPanel() {
    clusterPanelOpen.value = false
    clusterPanelItems.value = []
  }
  function handleSpeciesSelected(species: SpeciesIndexItem) {
    speciesPanel.closePanel()
    const full = speciesData.value.find(s => s.id === species.id) ?? species
    openSpeciesOverlay(full)
  }
  function openRareEarthOverlay(feature: GeoJSON.Feature) {
    if (map) openRareEarthOverlayPopup(map, feature)
  }

  function openProjectPreview(project: ProjectData) {
    if (!map) return
    previewCard.openProject(project, map, {
      expandProject: (p) => openProjectOverlay(p),
      expandSpecies: () => {},
      expandCrew: () => {},
    })
  }
  function openSpeciesPreview(species: Species | SpeciesIndexItem) {
    if (!map) return
    const full = 'content' in species ? species : speciesData.value.find(s => s.id === species.id) ?? species
    previewCard.openSpecies(full, map, {
      expandProject: () => {},
      expandSpecies: (s) => openSpeciesOverlay(s),
      expandCrew: () => {},
    })
  }
  function openCrewPreview(crew: CrewRegionData | CrewLocation) {
    if (!map) return
    previewCard.openCrew(crew, map, {
      expandProject: () => {},
      expandSpecies: () => {},
      expandCrew: (c) => openCrewOverlay(c),
    })
  }

  /* ── marker system ─────────────────────────────────────────────────── */

  let culturalPopup: maplibregl.Popup | null = null

  function openCulturalOverlay(feature: GeoJSON.Feature) {
    if (!map) return
    culturalPopup?.remove()
    const p = (feature.properties ?? {}) as Record<string, unknown>
    const html = getPopupContent(p)
    const coords = (feature.geometry as GeoJSON.Point).coordinates
    culturalPopup = new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat([coords[0] as number, coords[1] as number])
      .setHTML(html)
      .setMaxWidth('none')
      .addTo(map)
  }

  const marker = useMapMarker({
    openProjectOverlay,
    openSpeciesOverlay,
    openCrewOverlay,
    openCrewLocationOverlay,
    openRareEarthOverlay,
    openCulturalOverlay,
    openProjectPreview,
    openSpeciesPreview,
    openCrewPreview,
    openCluster: openClusterPanel,
  })

  const rareEarthController = useRareEarthController({
    map: mapRef,
    isActive: computed(() => activeDataset.value === 'vulcan-observatory'),
    getProps: () => ({
      rareEarthPoints: props.rareEarthPoints,
      rareEarthFiltered: props.rareEarthFiltered,
      rareEarthPolygons: props.rareEarthPolygons,
      rareEarthProtected: props.rareEarthProtected,
      rareEarthWater: props.rareEarthWater ?? undefined,
      rareEarthCultural: props.rareEarthCultural ?? undefined,
      layerVisibility: props.layerVisibility,
      flyToTarget: props.flyToTarget,
    }),
    popup: { t, locale },
  })

  function setupRareEarthLayers() {
    rareEarthController.setupLayers()
  }

  /* ── marker rebuild ────────────────────────────────────────────────── */

  function rebuildMarkers() {
    if (!map) {
      console.warn('[perf] rebuildMarkers skipped — map not ready')
      return
    }
    if (activeDataset.value === 'vulcan-observatory') return
    console.time(`[perf] rebuildMarkers ${activeDataset.value}`)
    const isRee = false
    try {
      console.log('[EG Maps] marker placement start', {
        dataset: activeDataset.value,
        projects: visibleProjects.value.length,
        species: visibleSpecies.value.length,
        crews: crewsData.value.length,
        crewLocations: crewLocationsData.value.length,
      })
      marker.rebuild({
        dataset: activeDataset.value!,
        projects: isRee ? [] : visibleProjects.value,
        speciesIndex: isRee ? [] : visibleSpecies.value,
        species: isRee ? [] : speciesData.value,
        crews: isRee ? [] : crewsData.value,
        crewLocations: isRee ? [] : crewLocationsData.value,
        selectedSpeciesGroups: isRee ? [] : selectedSpeciesGroups.value,
        rareEarthFeatures: isRee
          ? (props.rareEarthFiltered?.features?.length
            ? props.rareEarthFiltered.features
            : props.rareEarthPoints?.features)
          : undefined,
        culturalFeatures: isRee
          ? props.rareEarthCultural?.features
          : undefined,
      })
      console.log('[EG Maps] marker placement complete', { dataset: activeDataset.value })
    } catch (error) {
      console.error('[EG Maps] marker placement failed', error)
      isLoading.value = false
      hasError.value = true
      errorMessage.value = `Could not render map markers: ${error instanceof Error ? error.message : String(error)}`
    }
    console.timeEnd(`[perf] rebuildMarkers ${activeDataset.value}`)
  }

  function updateMarkerData() {
    if (!map) return
    if (activeDataset.value === 'vulcan-observatory') return
    console.time(`[perf] updateMarkerData ${activeDataset.value}`)
    const isRee = false
    marker.update({
      dataset: activeDataset.value!,
      projects: isRee ? [] : visibleProjects.value,
      speciesIndex: isRee ? [] : visibleSpecies.value,
      species: isRee ? [] : speciesData.value,
      crews: isRee ? [] : crewsData.value,
      crewLocations: isRee ? [] : crewLocationsData.value,
      selectedSpeciesGroups: isRee ? [] : selectedSpeciesGroups.value,
      rareEarthFeatures: isRee
        ? (props.rareEarthFiltered?.features?.length
          ? props.rareEarthFiltered.features
          : props.rareEarthPoints?.features)
        : undefined,
      culturalFeatures: isRee
        ? props.rareEarthCultural?.features
        : undefined,
    })
    console.timeEnd(`[perf] updateMarkerData ${activeDataset.value}`)
  }

  function navigateToLocation(lat: number, lng: number) {
    if (map) {
      map.flyTo({ center: [lng, lat], zoom: isMobile.value ? (isGlobe ? 3 : 6) : (isGlobe ? 4 : 6), duration: runtime.reducedMotion.value ? 0 : 1500, essential: true })
    }
  }

  function handleFilterChange(filtered: SpeciesIndexItem[]) {
    filteredSpeciesList.value = filtered
  }

  function handleProjectFilterChange(filtered: ProjectData[]) {
    filteredProjectsList.value = filtered
  }

  function handleSearchOpenChange(open: boolean) {
    if (open && isMobile.value) {
      showFilterPanel.value = false
    }
  }

  function toggleLegendGroup(group: string | number) {
    if (speciesFilterPanelRef.value) {
      speciesFilterPanelRef.value.toggleTaxonomicGroup(String(group))
    } else {
      const g = String(group)
      const idx = selectedSpeciesGroups.value.indexOf(g)
      if (idx === -1) {
        selectedSpeciesGroups.value = [...selectedSpeciesGroups.value, g]
      } else {
        selectedSpeciesGroups.value = selectedSpeciesGroups.value.filter(x => x !== g)
      }
    }
  }

  function handleSpeciesGroupSelection(groups: string[]) {
    selectedSpeciesGroups.value = groups
  }

  /* ── tile provider (MapTiler #1, local fallback on poor health) ────── */

  /** Resolve the MapLibre style for the current effective tile provider. */
  function currentStyle(): string | Record<string, unknown> {
    const qs = quality.settings.value
    if (tileProvider.effectiveProvider.value === 'fallback' || !MAPTILER_API_KEY) {
      return getMapStyle('', undefined, baseURL)
    }
    return getMapStyle(MAPTILER_API_KEY, qs.tileResolution, baseURL)
  }

  function applyProviderStyle(expected?: string) {
    if (!map) return
    const target = expected ?? tileProvider.effectiveProvider.value
    // Style already matches the target — setStyle would wipe all data
    // layers and reload tiles for no reason (reads as a provider flap).
    if (target === lastAppliedProvider && map.isStyleLoaded()) return
    lastAppliedProvider = target
    tileProvider.noteStyleStart()
    hasError.value = false
    errorMessage.value = ''
    isLoading.value = true
    try {
      map.setStyle(currentStyle() as maplibregl.StyleSpecification | string)
    } catch (err) {
      console.error('[EG Maps] failed to switch tile provider style', err)
      isLoading.value = false
    }
  }

  let fpsReportTimer: ReturnType<typeof setInterval> | null = null
  function startFpsReporting() {
    stopFpsReporting()
    fpsReportTimer = setInterval(() => {
      if (!map || !isMounted) return
      tileProvider.reportFps(perf.fps.value)
    }, 2000)
  }
  function stopFpsReporting() {
    if (fpsReportTimer) { clearInterval(fpsReportTimer); fpsReportTimer = null }
  }

  /** Re-attach data layers wiped by a style switch (provider toggle). */
  function resyncLayersAfterStyle() {
    if (!map) return
    if (activeDataset.value === 'vulcan-observatory') {
      setupRareEarthLayers()
      return
    }
    const qNow = quality.settings.value
    if (qNow.showConnections && connections.showConnections.value) {
      if (activeDataset.value === 'active-crews') {
        connections.addConnections('active-crews', [], [], crewLocationsData.value)
      } else {
        connections.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
      }
      if (qNow.showParticles) connections.startParticles()
    }
  }

  /* ── map init ─────────────────────────────────────────────────────── */

  function initMap(force = false) {
    // Error-overlay retries pass force=true: the previous attempt is
    // discarded (its flags may be stuck, e.g. isInitializing left true by
    // the load-timeout path), so clear them before re-running.
    if (force) isInitializing = false
    if (isInitializing) {
      console.warn('[EG Maps] initMap skipped — initialization already in progress')
      return
    }
    // A live map instance means init already ran for this mount. Without
    // this guard a second call (double onMounted, reactive re-trigger)
    // tears down the healthy map and builds a duplicate ("duplicated init").
    // Error-overlay retries pass force=true after the old map was removed.
    if (map && !force) {
      console.log('[EG Maps] initMap skipped — map instance already exists')
      return
    }
    if (!mapContainerRef.value) return

    tStart('[perf] initMap total')
    tStart('[perf] initMap → MapLibre constructor')

    if (!detectWebGLSupport()) {
      noWebglSupport.value = true
      isLoading.value = false
      hasError.value = true
      errorMessage.value = 'WebGL is not supported in your browser. Please use a modern browser that supports WebGL.'
      return
    }

    window.removeEventListener('resize', onResize)
    if (map) {
      onBeforeCleanup?.()
      connections.cleanup()
      marker.cleanup()
      stopFpsReporting()
      try { (map as unknown as { __stopProviderWatch?: () => void }).__stopProviderWatch?.() } catch { /* ignore */ }
      try { map.remove() } catch { /* ignore */ }
      setMapInstance(null)
    }

    noWebglSupport.value = false
    isLoading.value = true
    isInitializing = true

    try {
      const isRee = activeDataset.value === 'vulcan-observatory'
      const qs = quality.settings.value

      // MapTiler is the default; the provider only resolves to fallback on
      // explicit choice, missing key, or poor network/health signals.
      // NOTE: SSG bakes NUXT_PUBLIC_MAPTILER_API_KEY at build time — a key
      // added only to the deploy environment after `nuxt generate` will NOT
      // reach the client bundle (it stays '' and the local fallback wins).
      tileProvider.evaluateNetworkHints(MAPTILER_API_KEY)
      if (!MAPTILER_API_KEY && import.meta.dev) {
        console.warn('[tile-provider] no MapTiler API key — using local fallback style. Set NUXT_PUBLIC_MAPTILER_API_KEY (or MAPTILER_API_KEY) before building.')
      }
      const mapStyle = currentStyle()
      const isMapTilerStyle = typeof mapStyle === 'string' && mapStyle.includes('maptiler.com')
      tileProvider.noteStyleStart()
      const tileMaxZoom = qs.tileResolution === 'low' ? 14 : qs.tileResolution === 'medium' ? 17 : 22

      // Read zoom param: 0..1 maps linearly to minZoom..maxZoom
      let initialZoom = isRee ? (isGlobe ? 4.2 : 9.5) : isMobile.value ? (isGlobe ? 1.0 : 1.2) : (isGlobe ? 1.8 : 2)
      if (!import.meta.server) {
        const urlZoom = route.query.zoom
        if (urlZoom != null) {
          const t = Math.max(0, Math.min(1, parseFloat(String(urlZoom)) || 0))
          initialZoom = t * tileMaxZoom
        }
      }

      const created = new maplibregl.Map({
        container: mapContainerRef.value,
        style: mapStyle,
        zoom: initialZoom,
        center: isRee ? (isGlobe ? [-48, -15] : [-46.533, -21.914]) : (isGlobe ? [0, 20] : [0, 0]),
        attributionControl: false,
        renderWorldCopies: !isGlobe,
        fadeDuration: 100,
        minZoom: isRee ? (isGlobe ? VULCAN_MIN_ZOOM_GLOBE : VULCAN_MIN_ZOOM_2D) : undefined,
        maxBounds: isRee && !isGlobe ? VULCAN_MAX_BOUNDS : undefined,
        maxZoom: tileMaxZoom,
        maxTileCacheSize: qs.maxTileCacheSize,
        maxTileCacheZoomLevels: qs.maxTileCacheZoomLevels,
        antialias: qs.antialiasing,
        preferCanvas: true,
        crossSourceCollisions: false,
        maxPitch: qs.antialiasing ? 60 : 45,
      } as maplibregl.MapOptions & { antialias?: boolean; preferCanvas?: boolean; crossSourceCollisions?: boolean; maxPitch?: number })
      setMapInstance(created)
      mapCanvas = map!.getCanvas()
      mapCanvas.addEventListener('webglcontextlost', onWebglContextLost, { passive: false })

      tEnd('[perf] initMap → MapLibre constructor')
      tStart('[perf] initMap → style.load')
      tStart('[perf] initMap → map.load (tiles)')

      created.addControl(
        new maplibregl.AttributionControl({
          customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`
        })
      )

      if (!isGlobe && !isMobile.value && !hideAll.value) {
        created.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
      }

      let styleLoadFired = false
      // The watcher skips echoes of the applied style so a single toggle
      // can't ping-pong maptiler → fallback → maptiler.
      lastAppliedProvider = tileProvider.effectiveProvider.value
      // Watch for manual header toggles / auto-degradation while this map lives.
      const stopProviderWatch = watch(() => tileProvider.effectiveProvider.value, (next, prev) => {
        if (!created || !isMounted || next === prev) return
        // Initial style still loading: the constructor style already targets
        // the current provider — swapping now would restart the load and
        // read as a provider flap.
        if (isInitializing && !created.loaded()) return
        if (next === lastAppliedProvider) return
        console.warn(`[tile-provider] switching style ${prev} → ${next}`)
        applyProviderStyle(next)
      })
      // Owned here (not onUnmounted) so re-init doesn't leak watchers.
      ;(created as unknown as { __stopProviderWatch?: () => void }).__stopProviderWatch = stopProviderWatch
      startFpsReporting()
      created.on('style.load', () => {
        if (!styleLoadFired) {
          styleLoadFired = true
          tEnd('[perf] initMap → style.load')
        }
        onStyleLoad?.(map!)
        if (activeDataset.value === 'vulcan-observatory') {
          setupRareEarthLayers()
        } else if (initialRebuildDone) {
          // Provider style switch wiped sources — re-attach connection lines.
          resyncLayersAfterStyle()
        }
      })

      let idleReported = false
      created.on('idle', () => {
        if (!idleReported) {
          idleReported = true
          tileProvider.noteStyleReady()
        }
      })

      created.on('load', () => {
        if (!isMounted) return
        isInitializing = false
        tEnd('[perf] initMap → map.load (tiles)')
        tStart('[perf] initMap → rebuildMarkers')
        if (import.meta.dev) console.warn(`[useMapBase] map.on('load'): dataset=${activeDataset.value}`)
        isLoading.value = false
        if (loadingTimeout) { clearTimeout(loadingTimeout); loadingTimeout = null }
        marker.init(map!)
        if (activeDataset.value === 'vulcan-observatory') {
          setupRareEarthLayers()
        }
        const shouldRebuild = activeDataset.value !== 'endangered-species' || speciesIndexData.value.length > 0
        if (shouldRebuild) {
          rebuildMarkers()
        }
        initialRebuildDone = true
        tEnd('[perf] initMap → rebuildMarkers')
        tStart('[perf] initMap → connections+hexGrid')
        const qNow = quality.settings.value
        if (activeDataset.value !== 'vulcan-observatory') {
          if (qNow.showConnections) {
            if (activeDataset.value === 'active-crews') {
              connections.addConnections('active-crews', [], [], crewLocationsData.value)
            } else {
              connections.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
            }
            if (qNow.showParticles) {
              connections.startParticles()
            }
          }
        }
        if (qNow.showHexGrid) {
          hexGrid.setupHexGrid()
        }
        tEnd('[perf] initMap → connections+hexGrid')
        tEnd('[perf] initMap total')
        onMapReady?.(map!)
      })

      created.on('resize', () => {
        hexGrid.debouncedSetup()
      })

      let errorCount = 0

      created.on('error', (err) => {
        console.error(`[${isGlobe ? 'MapView3D' : 'MapView2D'}] MapLibre error:`, err)
        errorCount++
        // Only pre-load errors count toward auto-degradation. Once the map
        // is loaded, transient tile failures (a single 404/403 tile, glyph
        // fetch hiccup) are normal — yanking the whole basemap to the
        // fallback over them is what produced the maptiler ⇄ fallback flap.
        if (!created.loaded()) tileProvider.noteTileError()
        // Auto-degradation to the local fallback may have engaged above; the
        // provider watcher swaps the style without a full re-init.
        if (tileProvider.effectiveProvider.value === 'fallback' && isMapTilerStyle) return
        if (errorCount >= 2 && !created.loaded() && isMapTilerStyle && tileProvider.preference.value === 'auto') {
          tileProvider.forceAutoFallback('tile-errors')
          return
        }
        if (!created.loaded()) {
          isInitializing = false
          isLoading.value = false
          hasError.value = true
          const errObj = err as { error?: { status?: number; message?: string } }
          if (errObj?.error?.status === 403) {
            errorMessage.value = 'MapTiler API key is invalid or restricted. Please update your API key in the .env file.'
          } else if (errObj?.error?.message) {
            errorMessage.value = errObj.error.message
          } else {
            errorMessage.value = `Failed to load ${isGlobe ? 'globe' : 'map'} tiles. Please check your network connection and try again.`
          }
        }
      })

      loadingTimeout = setTimeout(() => {
        if (isLoading.value) {
          // Tiles/style never became ready — degrade to the local fallback in
          // auto mode (MapTiler stays the default everywhere else). Only when
          // the map never loaded: a working MapTiler map must not be yanked
          // because the loading flag got stuck for another reason.
          if (!created.loaded() && isMapTilerStyle && tileProvider.preference.value === 'auto' && tileProvider.effectiveProvider.value === 'maptiler') {
            console.warn('[tile-provider] style load timeout — switching to fallback')
            tileProvider.forceAutoFallback('slow-style-load')
            return
          }
          isLoading.value = false
          if (!hasError.value) {
            hasError.value = true
            errorMessage.value = `${isGlobe ? 'Globe' : 'Map'} tiles took too long to load. Your MapTiler API key may be invalid, expired, or rate-limited. You can also check your network connection.`
          }
          // Release the init gate so the error-overlay retry can re-run.
          isInitializing = false
        }
      }, 30000)

      window.addEventListener('resize', onResize)
    } catch (err) {
      isInitializing = false
      tEnd('[perf] initMap → MapLibre constructor')
      tEnd('[perf] initMap → style.load')
      tEnd('[perf] initMap → map.load (tiles)')
      tEnd('[perf] initMap → rebuildMarkers')
      tEnd('[perf] initMap → connections+hexGrid')
      tEnd('[perf] initMap total')
      console.error(`[${isGlobe ? 'MapView3D' : 'MapView2D'}] Failed to initialize map:`, err)
      isLoading.value = false
      hasError.value = true
    }
  }

  /* ── lifecycle ────────────────────────────────────────────────────── */

  onMounted(() => {
    isMounted = true
    checkViewportSize()
    window.addEventListener('resize', scheduleViewportCheck, { passive: true })
    showFilterPanel.value = false
    initMap()
  })

  onUnmounted(() => {
    isMounted = false
    isInitializing = false
    onBeforeCleanup?.()
    if (loadingTimeout) clearTimeout(loadingTimeout)
    if (rebuildTimer) { clearTimeout(rebuildTimer); rebuildTimer = null }
    stopFpsReporting()
    connections.cleanup()
    previewCard.close()
    marker.cleanup()
    window.removeEventListener('resize', onResize)
    window.removeEventListener('resize', scheduleViewportCheck)
    if (viewportResizeFrame !== null) {
      window.cancelAnimationFrame(viewportResizeFrame)
      viewportResizeFrame = null
    }
    if (map) {
      mapCanvas?.removeEventListener('webglcontextlost', onWebglContextLost)
      mapCanvas = null
      try { (map as unknown as { __stopProviderWatch?: () => void }).__stopProviderWatch?.() } catch { /* ignore */ }
      try { map.remove() } catch { /* ignore */ }
      setMapInstance(null)
    }
  })

  /* ── watchers ─────────────────────────────────────────────────────── */

  watch(locale, () => {
    updateMarkerData()
  })

  watch(crewLocationsData, () => {
    if (!map || activeDataset.value !== 'active-crews') return
    rebuildMarkers()
    connections.addConnections('active-crews', [], [], crewLocationsData.value)
    if (connections.showConnections.value && quality.settings.value.showParticles) connections.startParticles()
  })

  watch([visibleSpecies, visibleProjects, selectedSpeciesGroups, speciesIndexData], () => {
    if (!map) return
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildPending = true
    rebuildTimer = setTimeout(() => {
      rebuildPending = false
      rebuildTimer = null
      rebuildMarkers()
    }, 60)
  })

  watch([visibleSpecies, visibleProjects], () => {
    if (!map || activeDataset.value === 'vulcan-observatory') return
    if (activeDataset.value === 'active-crews') {
      connections.addConnections('active-crews', [], [], crewLocationsData.value)
    } else {
      connections.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
    }
    if (connections.showConnections.value && quality.settings.value.showParticles) connections.startParticles()
  })

  // Structural REE inputs only — filtered-points updates use the cheap
  // setData path inside useRareEarthController (no full teardown/flicker).
  watch(() => [props.rareEarthPoints, props.rareEarthPolygons, props.rareEarthProtected, props.rareEarthWater, props.rareEarthCultural], () => {
    if (!map || activeDataset.value !== 'vulcan-observatory') return
    setupRareEarthLayers()
  })

  watch(showHexGrid, async (visible) => {
    runtime.hexGridPreference.value = visible
    if (!visible) return
    await nextTick()
    hexGrid.setupHexGrid()
  })

  watch(connections.showConnections, () => {
    runtime.connectionsPreference.value = connections.showConnections.value
    if (activeDataset.value === 'active-crews') {
      connections.addConnections('active-crews', [], [], crewLocationsData.value)
    } else {
      connections.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
    }
    if (connections.showConnections.value && quality.settings.value.showParticles) connections.startParticles()
  })

  watch(() => props.flyToTarget, (target) => {
    if (!target) return
    if (!map) {
      // Map not ready yet (restored hash / early sidebar jump) — flush on creation.
      pendingFlyToTarget = target
      return
    }
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: target.zoom ?? 5,
      duration: 1500,
      essential: true,
    })
  })

  watch([showSpeciesOverlay, showProjectOverlay, showCrewOverlay], ([speciesOpen, projectOpen, crewOpen]) => {
    if (speciesOpen || projectOpen || crewOpen) {
      connections.cleanupParticles()
    } else if (connections.showConnections.value && quality.settings.value.showParticles) {
      connections.startParticles()
    }
  })

  /* ── return ───────────────────────────────────────────────────────── */

  return {
    t, locale, localeNames, baseURL, isMobile, isEmbed, hideControls, noControl, hideAll,
    speciesPanel,
    projectsData, speciesIndexData, crewsData, crewLocationsData,
    filteredProjectsList, filteredSpeciesList, visibleProjects, visibleSpecies,
    activeDataset, selectedSpeciesGroups,
    hasError, errorMessage, noWebglSupport, isLoading,
    clusterPanelItems, clusterPanelDataset, clusterPanelOpen, closeClusterPanel,
    showHexGrid, showFilterPanel, speciesFilterPanelRef,
    connections, showConnections, toggleConnections,
    hexGrid, onResize,
    rebuildMarkers, updateMarkerData, navigateToLocation,
    rareEarthController, setupRareEarthLayers,
    showSpeciesOverlay, showProjectOverlay, showCrewOverlay,
    speciesData: selectedSpeciesData, projectData: selectedProjectData, crewData: selectedCrewData, isCrewLocationData,
    popupLocale, availablePopupLocales,
    speciesCloseBtnRef, speciesOverlayRef,
    projectCloseBtnRef, projectOverlayRef,
    crewCloseBtnRef, crewOverlayRef,
    openSpeciesOverlay, closeSpeciesOverlay,
    openProjectOverlay, closeProjectOverlay,
    openCrewOverlay, closeCrewOverlay, openCrewLocationOverlay,
    handleSpeciesSelected, openRareEarthOverlay,
    handleFilterChange, handleProjectFilterChange,
    handleSearchOpenChange, handleSpeciesGroupSelection, toggleLegendGroup,
    initMap, mapRef,
    // Back-compat: `map` was a null snapshot. Expose a live getter.
    get map() { return mapRef.value },
    isMounted,
    quality,
    tileProvider,
  }
}
