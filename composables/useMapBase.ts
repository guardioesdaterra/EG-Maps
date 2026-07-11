import { ref, computed, nextTick, onMounted, onUnmounted, watch, type Ref } from 'vue'
import maplibregl from 'maplibre-gl'
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
import { allProjectsData } from '@/lib/project-data'
import { openRareEarthOverlayPopup } from '@/lib/map-utils'
import { detectWebGLSupport, getMapStyle } from '@/composables/useMapLibre'
import { HEX_GRID } from '@/lib/constants'
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
  const speciesPanel = useSpeciesPanel()
  const baseURL = useRuntimeConfig().app.baseURL
  const isMobile = useMediaQuery('(max-width: 768px)')
  const MAPTILER_API_KEY = useRuntimeConfig().public.maptilerApiKey || ''
  const MAP_STYLE = getMapStyle(MAPTILER_API_KEY)

  const projectsData = computed(() => props.projects || allProjectsData)
  const speciesData = computed(() => props.species || [])
  const speciesIndexData = ref<SpeciesIndexItem[]>(props.speciesIndex || [])
  const crewsData = computed(() => props.crews || [])
  const crewLocationsData = computed(() => props.crewLocations || [])
  const filteredProjectsList = ref<ProjectData[] | null>(null)
  const filteredSpeciesList = ref<SpeciesIndexItem[] | null>(null)
  const visibleProjects = computed(() => filteredProjectsList.value ?? projectsData.value)
  const visibleSpecies = computed(() => {
    return filteredSpeciesList.value ?? (activeDataset.value === 'endangered-species' ? speciesIndexData.value : speciesData.value)
  })
  const activeDataset = ref<MapBaseProps['defaultDataset']>(props.defaultDataset || 'project-grants')
  const selectedSpeciesGroups = ref<string[]>([])
  const hasError = ref(false)
  const errorMessage = ref('')
  const noWebglSupport = ref(false)
  const isLoading = ref(true)
  const showHexGrid = ref(true)
  const showFilterPanel = ref(false)
  const speciesFilterPanelRef = ref<{ toggleTaxonomicGroup: (_group: string) => void } | null>(null)

  const isEmbed = computed(() => {
    if (import.meta.server) return false
    return new URLSearchParams(window.location.search).get('embed') === 'true'
  })

  const noControl = computed(() => {
    if (import.meta.server) return false
    const params = new URLSearchParams(window.location.search)
    return params.get('no-control') === 'true'
  })

  const hideAll = computed(() => {
    if (import.meta.server) return false
    const params = new URLSearchParams(window.location.search)
    return params.get('hideAll') === 'true'
  })

  const controlsForced = computed(() => {
    if (import.meta.server) return false
    const params = new URLSearchParams(window.location.search)
    return params.get('controls') === 'true'
  })

  const isSmallViewport = ref(false)
  function checkViewportSize() {
    if (import.meta.server) return
    const w = window.innerWidth
    const h = window.innerHeight
    isSmallViewport.value = w < 400 || h < 300 || (w < 500 && h < 500 && Math.abs(w - h) < 150)
  }
  const hideControls = computed(() => {
    if (controlsForced.value) return false
    return isEmbed.value || noControl.value || isSmallViewport.value
  })

  const hexGrid = useMapHexGrid(hexCanvasRef, isGlobe ? {
    mobileSize: HEX_GRID.mobileSizeGlobe,
    desktopSize: HEX_GRID.desktopSizeGlobe,
    strokeColor: HEX_GRID.strokeColorGlobe,
    lineWidth: HEX_GRID.lineWidthGlobe,
  } : undefined)
  const onResize = hexGrid.debouncedSetup

  const connections = useMapConnections(
    () => map,
    mapContainerRef,
    { zIndex: isGlobe ? 30 : 2 },
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
  let isMounted = true
  let loadingTimeout: ReturnType<typeof setTimeout> | null = null
  let lastFocusedEl: HTMLElement | null = null
  let rebuildPending = false

  const mapRef = computed(() => map)

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

  /* ── marker system (replaces orchestrator) ─────────────────────────── */

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
  })

  const rareEarthController = useRareEarthController({
    map: mapRef,
    isActive: computed(() => activeDataset.value === 'vulcan-observatory'),
    getProps: () => ({
      rareEarthPoints: props.rareEarthFiltered ?? props.rareEarthPoints,
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

  /* ── marker rebuild (single entry-point for all datasets) ──────────── */

  function rebuildMarkers() {
    if (!map) return
    const isRee = activeDataset.value === 'vulcan-observatory'
    marker.rebuild({
      dataset: activeDataset.value!,
      projects: isRee ? [] : visibleProjects.value,
      speciesIndex: isRee ? [] : speciesIndexData.value,
      species: isRee ? [] : speciesData.value,
      crews: isRee ? [] : crewsData.value,
      crewLocations: isRee ? [] : crewLocationsData.value,
      selectedSpeciesGroups: isRee ? [] : selectedSpeciesGroups.value,
      rareEarthFeatures: isRee ? [] : (props.rareEarthFiltered ?? props.rareEarthPoints)?.features,
      culturalFeatures: isRee ? (props.rareEarthCultural?.features ?? []) : undefined,
    })
  }

  function updateMarkerData() {
    if (!map) return
    const isRee = activeDataset.value === 'vulcan-observatory'
    marker.update({
      dataset: activeDataset.value!,
      projects: isRee ? [] : visibleProjects.value,
      speciesIndex: isRee ? [] : speciesIndexData.value,
      species: isRee ? [] : speciesData.value,
      crews: isRee ? [] : crewsData.value,
      crewLocations: isRee ? [] : crewLocationsData.value,
      selectedSpeciesGroups: isRee ? [] : selectedSpeciesGroups.value,
      rareEarthFeatures: isRee ? [] : (props.rareEarthFiltered ?? props.rareEarthPoints)?.features,
      culturalFeatures: isRee ? (props.rareEarthCultural?.features ?? []) : undefined,
    })
  }

  function navigateToLocation(lat: number, lng: number) {
    if (map) {
      map.flyTo({ center: [lng, lat], zoom: isMobile.value ? (isGlobe ? 3 : 6) : (isGlobe ? 4 : 6), duration: 1500, essential: true })
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

  /* ── map init ─────────────────────────────────────────────────────── */

  function initMap() {
    if (!mapContainerRef.value) return

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
      marker.cleanup()
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
        zoom: isRee ? (isGlobe ? 4.2 : 9.5) : isMobile.value ? (isGlobe ? 1.5 : 1.8) : (isGlobe ? 2.5 : 3),
        center: isRee ? (isGlobe ? [-48, -15] : [-46.533, -21.914]) : (isGlobe ? [0, 20] : [0, 0]),
        attributionControl: false,
        renderWorldCopies: !isGlobe,
        fadeDuration: 100,
        maxTileCacheSize: 200,
        maxTileCacheZoomLevels: 5,
      } as maplibregl.MapOptions & { antialias?: boolean })

      map.addControl(
        new maplibregl.AttributionControl({
          customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`
        })
      )

      if (!isGlobe && !isMobile.value) {
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
      }

      map.on('style.load', () => {
        onStyleLoad?.(map!)
      })

      map.on('load', () => {
        if (!isMounted) return
        if (import.meta.dev) console.warn(`[useMapBase] map.on('load'): dataset=${activeDataset.value}`)
        isLoading.value = false
        if (loadingTimeout) { clearTimeout(loadingTimeout); loadingTimeout = null }
        marker.init(map!)
        if (activeDataset.value === 'vulcan-observatory') {
          setupRareEarthLayers()
        }
        rebuildMarkers()
        if (activeDataset.value !== 'vulcan-observatory') {
          if (activeDataset.value === 'active-crews') {
            connections.addConnections('active-crews', [], [], crewLocationsData.value)
          } else {
            connections.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
          }
          connections.startParticles()
        }
        hexGrid.setupHexGrid()
        onMapReady?.(map!)
      })

      /* no move/moveend handlers needed — GeoJSON layers auto-reposition */

      map.on('resize', () => {
        hexGrid.debouncedSetup()
      })

      let errorCount = 0
      let usedFallback = false
      const DEMOTILES_STYLE = 'https://demotiles.maplibre.org/style.json'

      function tryFallback() {
        if (usedFallback || !map) return
        if (!MAP_STYLE.includes('maptiler.com')) return
        usedFallback = true
        console.warn('MapTiler style failed, falling back to demotiles style')
        map.setStyle(DEMOTILES_STYLE)
      }

      map.on('error', (err) => {
        console.error(`[${isGlobe ? 'MapView3D' : 'MapView2D'}] MapLibre error:`, err)
        errorCount++
        if (errorCount >= 2) {
          tryFallback()
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
            errorMessage.value = `Failed to load ${isGlobe ? 'globe' : 'map'} tiles. Please check your network connection and try again.`
          }
        }
      })

      loadingTimeout = setTimeout(() => {
        if (isLoading.value) {
          tryFallback()
          if (usedFallback) return
          isLoading.value = false
          if (!hasError.value) {
            hasError.value = true
            errorMessage.value = `${isGlobe ? 'Globe' : 'Map'} tiles took too long to load. Your MapTiler API key may be invalid, expired, or rate-limited. You can also check your network connection.`
          }
        }
      }, 30000)

      window.addEventListener('resize', onResize)
    } catch (err) {
      console.error(`[${isGlobe ? 'MapView3D' : 'MapView2D'}] Failed to initialize map:`, err)
      isLoading.value = false
      hasError.value = true
    }
  }

  /* ── lifecycle ────────────────────────────────────────────────────── */

  onMounted(() => {
    checkViewportSize()
    window.addEventListener('resize', checkViewportSize)
    showFilterPanel.value = false
    initMap()
  })

  onUnmounted(() => {
    isMounted = false
    onBeforeCleanup?.()
    if (loadingTimeout) clearTimeout(loadingTimeout)
    connections.cleanup()
    previewCard.close()
    marker.cleanup()
    window.removeEventListener('resize', onResize)
    window.removeEventListener('resize', checkViewportSize)
    if (map) {
      map.remove()
      map = null
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
    if (connections.showConnections.value) connections.startParticles()
  })

  watch([visibleSpecies, visibleProjects, selectedSpeciesGroups, speciesIndexData], () => {
    if (!map || rebuildPending) return
    rebuildPending = true
    nextTick(() => {
      rebuildPending = false
      rebuildMarkers()
    })
  })

  watch([visibleSpecies, visibleProjects], () => {
    if (!map || activeDataset.value === 'vulcan-observatory') return
    if (activeDataset.value === 'active-crews') {
      connections.addConnections('active-crews', [], [], crewLocationsData.value)
    } else {
      connections.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
    }
    if (connections.showConnections.value) connections.startParticles()
  })

  watch(() => [props.rareEarthPoints, props.rareEarthPolygons], () => {
    if (!map || activeDataset.value !== 'vulcan-observatory') return
    setupRareEarthLayers()
  })

  watch(() => props.rareEarthCultural, () => {
    if (!map || activeDataset.value !== 'vulcan-observatory') return
    rebuildMarkers()
  }, { deep: false })

  watch(showHexGrid, async (visible) => {
    if (!visible) return
    await nextTick()
    hexGrid.setupHexGrid()
  })

  watch(connections.showConnections, () => {
    if (activeDataset.value === 'active-crews') {
      connections.addConnections('active-crews', [], [], crewLocationsData.value)
    } else {
      connections.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', visibleProjects.value, visibleSpecies.value)
    }
    if (connections.showConnections.value) connections.startParticles()
  })

  watch(() => props.flyToTarget, (target) => {
    if (!target || !map) return
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
    } else if (connections.showConnections.value) {
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
    initMap, map, mapRef,
    isMounted,
  }
}
