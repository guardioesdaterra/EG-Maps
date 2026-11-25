/**
 * composables/useMapMarker.ts
 * @why Individual map marker factory — creates and styles a single DOM marker element
 * @functions useMapMarker
 * @interfaces MarkerCallbacks, RebuildArgs
 * @types MarkerDataset
 * @deps @/lib/map-utils (GROUP_COLORS, MAP_GROUP_COLORS, isValidCoordinate, getGroupMapColor); @/lib/colors (getProjectColorByBeneficiaries, getProjectMapColorFromProject); @/lib/utils (formatCompact); @/lib/species-utils (findSpeciesAtCoord); @/lib/constants (SPECIES_COORD_TOLERANCE)
 * @connections composables/useMapBase.ts
 */
import type { Map as MapLibreMap, GeoJSONSource, ExpressionSpecification, FilterSpecification, MapLayerMouseEvent, MapLayerEventType } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { GROUP_COLORS, MAP_GROUP_COLORS, isValidCoordinate, getGroupMapColor, buildCrewRegionTooltipHTML, buildGenericRegionTooltipHTML, lngLatToRegionId } from '@/lib/map-utils'
import type { Species } from '@/lib/map-utils'
import { getProjectColorByBeneficiaries, getProjectMapColorFromProject } from '@/lib/colors'
import { formatCompact } from '@/lib/utils'
import { withMapPopupSafeArea } from '@/lib/map-popup-safe-area'
import { useI18n } from '@/composables/useI18n'
import { findSpeciesAtCoord as _findSpeciesAtCoord } from '@/lib/species-utils'
import { SPECIES_COORD_TOLERANCE } from '@/lib/constants'
import { CULTURAL_FAMILY_STYLES, getCulturalFamily } from '@/lib/cultural-marker-taxonomy'
import type { ProjectData } from '@/lib/types'
import type { CrewRegionData, CrewLocation, CrewStatus } from '@/lib/crew-data'
import { resolveCrewRegion } from '@/lib/crew-grants'
import { allCrewRegionsData } from '@/lib/crew-data'
import { STANDARD_MAP_MARKER_SIZE } from '@/composables/useGeoJSONMarkers'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'

/* ══════════════════════════════════════════════════════════════════════════
   🏠 SWARM 1 · TYPES + CONSTANTS (8)
   ══════════════════════════════════════════════════════════════════════════ */

export type MarkerDataset = 'project-grants' | 'endangered-species' | 'active-crews' | 'vulcan-observatory'

export interface MarkerCallbacks {
  openProjectOverlay:    (p: ProjectData) => void
  openSpeciesOverlay:    (s: Species | SpeciesIndexItem) => void
  openCrewOverlay:       (c: CrewRegionData | CrewLocation) => void
  openCrewLocationOverlay?: (c: CrewLocation) => void
  openRareEarthOverlay?:    (f: GeoJSON.Feature) => void
  openCulturalOverlay?:     (f: GeoJSON.Feature) => void
  openProjectPreview?:   (p: ProjectData) => void
  openSpeciesPreview?:   (s: Species | SpeciesIndexItem) => void
  openCrewPreview?:      (c: CrewRegionData | CrewLocation) => void
  openCluster?:          (payload: { dataset: MarkerDataset; coordinates: [number, number]; featureIds: string[] }) => void
}

export interface RebuildArgs {
  dataset:              string
  projects:             ProjectData[]
  speciesIndex:         SpeciesIndexItem[]
  species:              Species[]
  crews:                CrewRegionData[]
  crewLocations:        CrewLocation[]
  crewStatuses?:        CrewStatus[]
  selectedSpeciesGroups: string[]
  rareEarthFeatures?:   GeoJSON.Feature[]
  culturalFeatures?:   GeoJSON.Feature[]
}

const SOURCE = 'markers'

// Region areas are a separate source: polygon geometry, independent lifecycle
// (fetched async), and they must render below the marker layers.
const REGION_SOURCE = 'crew-regions'
const REGION_FILL_LAYER = 'crew-regions-fill'
const REGION_LINE_LAYER = 'crew-regions-line'

const LAYER_SUFFIXES = ['_cg', '_c', '_cc', '_cn', '_pg', '_p', '_pc', '_pl', '_ml'] as const

const CLUSTER_PALETTES: Record<MarkerDataset, readonly [string, string, string, string]> = {
  'project-grants':       ['#06b6d4', '#22c55e', '#eab308', '#ef4444'],
  'endangered-species':   ['#22c55e', '#3b82f6', '#a855f7', '#ec4899'],
  'active-crews':         ['#22c55e', '#3b82f6', '#a855f7', '#ec4899'],
  'vulcan-observatory':   ['#22c55e', '#f59e0b', '#ef4444', '#dc2626'],
}

const CLUSTERED_DATASETS = new Set<MarkerDataset>(['endangered-species', 'vulcan-observatory'])
// NOTE: 'project-grants' intentionally shares the active-crews system — an
// unclustered source with same-coordinate overlap spreading + the shared
// ClusterResultsPanel for disambiguation — instead of native GeoJSON clustering.

const CREW_MOSAIC_RADIUS_DEG = 0.045
const CREW_MOSAIC_ZOOM_MIN = 2
const CREW_MOSAIC_ZOOM_MAX = 7
const MAX_CREW_BUBBLES: number = 5

/* ══════════════════════════════════════════════════════════════════════════
   🏠 SWARM 2 · COMPOSABLE STATE + LIFECYCLE (8)
   ══════════════════════════════════════════════════════════════════════════ */

export function useMapMarker(callbacks: MarkerCallbacks) {
  const { t } = useI18n()
  const baseURL = (useRuntimeConfig().app?.baseURL as string) || '/'

  let map: MapLibreMap | null = null
  let currentDataset: MarkerDataset | null = null
  let speciesIndexCache: SpeciesIndexItem[] | null = null
  let projectMap: Map<string, ProjectData> | null = null
  let speciesMap: Map<string, SpeciesIndexItem> | null = null
  let fullSpeciesMap: Map<string, Species> | null = null
  let crewRegionMap: Map<string, CrewRegionData> | null = null
  let lastProjectsRef: ProjectData[] | null = null
  let lastSpeciesIdxRef: SpeciesIndexItem[] | null = null
  let lastSpeciesRef: Species[] | null = null
  let lastCrewsRef: CrewRegionData[] | null = null
  let latestArgs: RebuildArgs | null = null

  const handlers: Array<{ id: string; evt: keyof MapLayerEventType; fn: (e: MapLayerMouseEvent) => void }> = []
  // Region-area handlers live in their own list: they are bound when the async
  // polygon source lands and must survive marker detach() across rebuilds of
  // the same dataset (style reloads re-add layers under the same ids).
  const regionHandlers: Array<{ id: string; evt: keyof MapLayerEventType; fn: (e: MapLayerMouseEvent) => void }> = []
  let regionDataPromise: Promise<GeoJSON.FeatureCollection> | null = null
  let regionTip: maplibregl.Popup | null = null
  let regionHoverId: string | number | null = null

  function init(m: MapLibreMap) { map = m }

  function cleanup() {
    detach()
    detachRegionEvents()
    removeRegionLayers()
    if (map) removeSource(SOURCE)
    currentDataset = null
    speciesIndexCache = null
    projectMap = null
    speciesMap = null
    fullSpeciesMap = null
    crewRegionMap = null
    lastProjectsRef = null
    lastSpeciesIdxRef = null
    lastSpeciesRef = null
    lastCrewsRef = null
    latestArgs = null
    map = null
  }

  /* ── 🏠 SWARM 3 · DATA + SOURCE MANAGEMENT (6) ───────────────────── */

  function rebuild(a: RebuildArgs) {
    latestArgs = a
    const m = map
    if (!m || !m.isStyleLoaded()) return
    const ds = a.dataset as MarkerDataset
    speciesIndexCache = null
    if (currentDataset && currentDataset !== ds) {
      removeSource(SOURCE)
      removeRegionLayers()
      currentDataset = null
    }
    const geojson = toGeoJSON(ds, a)
    if (!geojson.features.length || tryFastPath(ds, geojson, m, a)) return
    fullSetup(ds, geojson, a)
  }

  function update(a: RebuildArgs) {
    latestArgs = a
    const m = map
    if (!m || currentDataset !== a.dataset || !m.getSource(SOURCE)) {
      rebuild(a)
      return
    }
    speciesIndexCache = null
    buildLookupMaps(a.dataset as MarkerDataset, a)
    updateData(SOURCE, toGeoJSON(a.dataset as MarkerDataset, a))
  }

  function tryFastPath(ds: MarkerDataset, geojson: GeoJSON.FeatureCollection, m: MapLibreMap, a: RebuildArgs): boolean {
    if (currentDataset !== ds || !m.getSource(SOURCE)) return false
    updateData(SOURCE, geojson)
    buildLookupMaps(ds, a)
    if (ds !== 'vulcan-observatory' && !m.getSource(REGION_SOURCE)) void syncRegionAreas()
    return true
  }

  function fullSetup(ds: MarkerDataset, geojson: GeoJSON.FeatureCollection, a: RebuildArgs) {
    detach()
    addSource(SOURCE, geojson, ds)
    addLayers(SOURCE, ds)
    setupEvents(SOURCE, ds, a)
    buildLookupMaps(ds, a)
    currentDataset = ds
    if (ds !== 'vulcan-observatory') void syncRegionAreas()
    else removeRegionLayers()
  }

  function buildLookupMaps(ds: MarkerDataset, a: RebuildArgs) {
    if (ds === 'project-grants') {
      if (projectMap && lastProjectsRef === a.projects) return
      projectMap = new Map(a.projects.map(p => [p.project_title, p]))
      lastProjectsRef = a.projects
    } else {
      projectMap = null
      lastProjectsRef = null
    }
    if (ds === 'endangered-species') {
      const speciesIdx = resolveSpeciesIndex(a)
      if (speciesMap && lastSpeciesIdxRef === speciesIdx && lastSpeciesRef === a.species) {
        return
      }
      speciesMap = new Map(speciesIdx.map(s => [s.id, s]))
      fullSpeciesMap = new Map(a.species.map(s => [s.id, s]))
      lastSpeciesIdxRef = speciesIdx
      lastSpeciesRef = a.species
    } else {
      speciesMap = null
      fullSpeciesMap = null
      lastSpeciesIdxRef = null
      lastSpeciesRef = null
    }
    if (ds === 'active-crews') {
      // Authoritative region records: feature properties cross a vector-tile
      // round-trip that mangles non-primitive values (the `history` array came
      // back stringified/dropped and crashed regional detail popups on
      // `.map()`/`.find()`). Click dispatch resolves regions through this map.
      if (crewRegionMap && lastCrewsRef === a.crews) return
      crewRegionMap = new Map(a.crews.map(c => [c.id, c]))
      lastCrewsRef = a.crews
    } else {
      crewRegionMap = null
      lastCrewsRef = null
    }
  }

  /* ── source CRUD ──────────────────────────────────────────────────── */

  function addSource(id: string, data: GeoJSON.FeatureCollection, ds: MarkerDataset) {
    if (!map) return
    removeSource(id)
    const isClustered = CLUSTERED_DATASETS.has(ds)
    map.addSource(id, {
      type: 'geojson', data,
      cluster: isClustered,
      clusterRadius: isClustered ? 50 : undefined,
      clusterMaxZoom: isClustered ? 16 : undefined,
    })
  }

  function updateData(id: string, data: GeoJSON.FeatureCollection) {
    if (!map) return
    const s = map.getSource(id) as GeoJSONSource | undefined
    if (s && typeof s.setData === 'function') s.setData(data)
  }

  function removeSource(id: string) {
    if (!map) return
    for (const suffix of LAYER_SUFFIXES) {
      const lid = id + suffix
      if (map.getLayer(lid)) map.removeLayer(lid)
    }
    if (map.getSource(id)) map.removeSource(id)
  }

  /* ── 🏠 SWARM 4 · LAYERS (3) ─────────────────────────────────────── */

  function addLayers(id: string, ds: MarkerDataset) {
    if (!map) return
    if (ds === 'active-crews') {
      const layerGroups: Array<[string, () => void]> = [
        ['crew mosaic', () => addCrewMosaicLayers(id)],
        ['crew locations', () => addCrewLocationLayers(id)],
      ]
      for (const [group, add] of layerGroups) {
        try {
          add()
        } catch (error) {
          console.error('[EG Maps] marker layer group failed', { group, error })
        }
      }
    } else {
      const isClustered = CLUSTERED_DATASETS.has(ds)
      if (isClustered) addClusterLayers(id, CLUSTER_PALETTES[ds])
      const pf = isClustered ? ['!has', 'point_count'] as FilterSpecification : undefined
      addPointLayers(id, pf)
    }
  }

  function addClusterLayers(id: string, palette: readonly [string, string, string, string]) {
    if (!map) return
    const pal = [...palette]
    map.addLayer({ id: `${id}_cg`, type: 'circle', source: id, filter: ['has', 'point_count'], paint: {
      'circle-color': stepExpr(pal), 'circle-radius': radExpr(1.55),
      'circle-blur': 0.88, 'circle-opacity': 0.22 } })
    map.addLayer({ id: `${id}_c`, type: 'circle', source: id, filter: ['has', 'point_count'], paint: {
      'circle-color': 'rgba(5, 12, 20, 0.96)', 'circle-radius': radExpr(0.92),
      'circle-stroke-color': stepExpr(pal), 'circle-stroke-width': 2.5, 'circle-opacity': 0.98 } })
    map.addLayer({ id: `${id}_cc`, type: 'circle', source: id, filter: ['has', 'point_count'], paint: {
      'circle-color': stepExpr(pal), 'circle-radius': radExpr(0.34), 'circle-opacity': 0.98 } })
    map.addLayer({ id: `${id}_cn`, type: 'symbol', source: id, filter: ['has', 'point_count'], layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Arial Unicode MS Bold', 'DejaVu Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 2, 0, 6, 10, 10, 12, 16, 14],
      'text-allow-overlap': true, 'text-ignore-placement': true }, paint: {
      'text-color': '#f8fafc', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 2.5 } })
  }

  function addCrewMosaicLayers(id: string) {
    if (!map) return

    const primaryFilter = ['all',
      ['!has', 'point_count'],
      ['==', '_type', 'crewRegion'],
      ['==', '_isPrimary', true],
    ] as FilterSpecification

    // Region label only — the old white mosaic dots (_mg/_mm) were replaced by
    // the hoverable region area polygons (REGION_FILL_LAYER / REGION_LINE_LAYER).
    map.addLayer({
      id: `${id}_ml`, type: 'symbol', source: id,
      filter: primaryFilter, layout: {
        'text-field': ['get', '_regionLabel'],
        'text-font': ['Arial Unicode MS Bold', 'DejaVu Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], CREW_MOSAIC_ZOOM_MIN, 9, CREW_MOSAIC_ZOOM_MAX, 11],
        'text-offset': [0, 1.9],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      }, paint: {
        'text-color': '#fff',
        'text-halo-color': 'rgba(3, 8, 14, 0.95)',
        'text-halo-width': 2,
        'text-opacity': 1,
      },
    })
  }

  function addCrewLocationLayers(id: string) {
    if (!map) return
    const locationFilter = ['all', ['!has', 'point_count'], ['==', '_type', 'crewLocation']] as FilterSpecification
    // Species, project and crew-location points share one circle-marker recipe;
    // only their data color/label varies by dataset.
    addPointLayers(id, locationFilter, 8)
  }

  function addPointLayers(id: string, filter?: FilterSpecification, labelMinZoom = 12) {
    if (!map) return
    const opts = filter ? { filter } : {}
    map.addLayer({ id: `${id}_pg`, type: 'circle', source: id, ...opts, paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['*', ['coalesce', ['get', 'size'], 6], 1.8],
      'circle-blur': 0.6, 'circle-opacity': 0.30 } })
    map.addLayer({ id: `${id}_p`, type: 'circle', source: id, ...opts, paint: {
      'circle-color': 'rgba(5, 12, 20, 0.96)',
      'circle-radius': ['coalesce', ['get', 'size'], 6],
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': 2.25, 'circle-opacity': 0.98 } })
    map.addLayer({ id: `${id}_pc`, type: 'circle', source: id, ...opts, paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['*', ['coalesce', ['get', 'size'], 6], 0.38],
      'circle-opacity': 1 } })
    map.addLayer({ id: `${id}_pl`, type: 'symbol', source: id, ...opts,
      // Point labels are the dominant symbol cost with thousands of markers:
      // collide-detect them only at street zoom where they are readable.
      minzoom: labelMinZoom, layout: {
      'text-field': ['coalesce', ['get', 'label'], ''],
      'text-font': ['Arial Unicode MS Bold', 'DejaVu Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], labelMinZoom, 7, 14, 10],
      'text-offset': [0, 1.75],
      'text-allow-overlap': false, 'text-ignore-placement': false }, paint: {
      'text-color': '#f8fafc', 'text-halo-color': 'rgba(0,0,0,0.88)', 'text-halo-width': 2,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], labelMinZoom, 0, labelMinZoom + 0.5, 1] } })
  }

  /* ── 🏠 SWARM 5 · EVENTS (7) ─────────────────────────────────────── */

  function setupEvents(id: string, ds: MarkerDataset, a: RebuildArgs) {
    if (!map) return
    detach()
    if (ds === 'active-crews') {
      reg(`${id}_ml`, 'click', onPoint(ds, a))
      reg(`${id}_ml`, 'mouseenter', ptr)
      reg(`${id}_ml`, 'mouseleave', nop)
      reg(`${id}_p`, 'click', onPoint(ds, a))
      reg(`${id}_p`, 'mouseenter', ptr)
      reg(`${id}_p`, 'mouseleave', nop)
      reg(`${id}_pc`, 'click', onPoint(ds, a))
      reg(`${id}_pc`, 'mouseenter', ptr)
      reg(`${id}_pc`, 'mouseleave', nop)
      reg(`${id}_pl`, 'click', onPoint(ds, a))
      reg(`${id}_pl`, 'mouseenter', ptr)
      reg(`${id}_pl`, 'mouseleave', nop)
    } else {
      const pL = `${id}_p`
      const plL = `${id}_pl`
      const pgL = `${id}_pg`
      const cL = `${id}_c`
      reg(pL, 'click', onPoint(ds, a))
      reg(plL, 'click', onPoint(ds, a))
      reg(pgL, 'click', onPoint(ds, a))
      // Only clustered datasets (endangered-species, vulcan-observatory) have
      // cluster layers — project-grants shares the active-crews unclustered
      // system and disambiguates stacked points via dispatchProject instead.
      if (CLUSTERED_DATASETS.has(ds)) {
        reg(cL, 'click', onCluster(id))
        reg(cL, 'mouseenter', ptr)
        reg(cL, 'mouseleave', nop)
      }
      reg(pL, 'mouseenter', ptr)
      reg(pL, 'mouseleave', nop)
      reg(plL, 'mouseenter', ptr)
      reg(plL, 'mouseleave', nop)
      reg(pgL, 'mouseenter', ptr)
      reg(pgL, 'mouseleave', nop)
      reg(`${id}_pc`, 'click', onPoint(ds, a))
      reg(`${id}_pc`, 'mouseenter', ptr)
      reg(`${id}_pc`, 'mouseleave', nop)
    }
  }

  let _lastPointClick = 0
  function onPoint(ds: MarkerDataset, a: RebuildArgs) {
    return (e: MapLayerMouseEvent) => {
      if (!e.features?.[0]) return
      const now = Date.now()
      if (now - _lastPointClick < 80) return
      _lastPointClick = now
      const f = e.features[0]
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      dispatchPoint(ds, f, coords, latestArgs ?? a)
    }
  }

  function onCluster(id: string) {
    return async (e: MapLayerMouseEvent) => {
      if (!map || !e.features?.[0]) return
      const f = e.features[0]
      const cid = f.properties?.cluster_id as number
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      if (cid == null) return
      const src = map.getSource(id) as GeoJSONSource | undefined
      if (src && typeof src.getClusterLeaves === 'function') {
        const leaves = await src.getClusterLeaves(cid, 1000, 0)
        callbacks.openCluster?.({
          dataset: currentDataset ?? 'project-grants',
          coordinates: coords,
          featureIds: leaves.map((leaf) => String(leaf.properties?.id ?? '')).filter(Boolean),
        })
      }
      if (src && typeof src.getClusterExpansionZoom === 'function') {
        const z = await src.getClusterExpansionZoom(cid)
        map.flyTo({ center: coords, zoom: Math.min(Math.max(z, map.getZoom() + 1), map.getMaxZoom()), duration: 600, essential: true })
      }
    }
  }

  const ptr = () => { if (map) map.getCanvas().style.cursor = 'pointer' }

  const nop = () => { if (map) map.getCanvas().style.cursor = '' }

  /* ── region areas (hover highlight · tooltip · click) ───────────────── */

  function loadCrewRegionGeoJSON(): Promise<GeoJSON.FeatureCollection> {
    if (!regionDataPromise) {
      regionDataPromise = fetch(`${baseURL}data/crew-regions.geojson`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json() as Promise<GeoJSON.FeatureCollection>
        })
        .catch((error) => {
          console.warn('[EG Maps] crew region areas failed to load', error)
          regionDataPromise = null
          return { type: 'FeatureCollection', features: [] } satisfies GeoJSON.FeatureCollection
        })
    }
    return regionDataPromise
  }

  /** Fetch (once) and mount the region polygon source/layers + their events. */
  async function syncRegionAreas(): Promise<void> {
    if (!map) return
    const data = await loadCrewRegionGeoJSON()
    // Show region overlay for active-crews, project-grants, and endangered-species
    // (not vulcan-observatory which has its own geographic layers)
    const regionDatasets = new Set(['active-crews', 'project-grants', 'endangered-species'])
    if (!map || !regionDatasets.has(currentDataset ?? '') || !data.features.length) return

    const existing = map.getSource(REGION_SOURCE) as GeoJSONSource | undefined
    if (existing && typeof existing.setData === 'function') {
      existing.setData(data)
      // Style reloads wipe layers but keep delegated listeners keyed by layer
      // id — only re-add the layers (and events on first mount).
      if (!map.getLayer(REGION_FILL_LAYER)) addRegionLayers()
      return
    }
    map.addSource(REGION_SOURCE, { type: 'geojson', data, promoteId: 'id' })
    addRegionLayers()
  }

  function addRegionLayers() {
    if (!map) return

    const hover = ['boolean', ['feature-state', 'hover'], false] as unknown as ExpressionSpecification
    // Base colors mirror the old mosaic scale (crews > 20 green, > 5 blue, else purple).
    const colorExpr = ['match', ['get', 'id'],
      'north-america', '#22c55e',
      'south-america', '#3b82f6',
      'europe', '#3b82f6',
      'africa', '#22c55e',
      'east-asia', '#a855f7',
      'south-asia', '#3b82f6',
      'oceania', '#a855f7',
      '#3b82f6'] as unknown as ExpressionSpecification

    map.addLayer({
      id: REGION_FILL_LAYER, type: 'fill', source: REGION_SOURCE,
      paint: {
        'fill-color': colorExpr,
        'fill-opacity': ['case', hover, 0.38, 0.12] as unknown as ExpressionSpecification,
        'fill-opacity-transition': { duration: 80, delay: 0 },
      },
    })
    map.addLayer({
      id: REGION_LINE_LAYER, type: 'line', source: REGION_SOURCE,
      paint: {
        'line-color': colorExpr,
        'line-opacity': ['case', hover, 0.95, 0.4] as unknown as ExpressionSpecification,
        'line-width': ['case', hover, 2.25, 1] as unknown as ExpressionSpecification,
        'line-opacity-transition': { duration: 80, delay: 0 },
        'line-width-transition': { duration: 80, delay: 0 },
      },
    })

    // Regions are geography — they must sit under every marker layer.
    const markerFirst = LAYER_SUFFIXES
      .map(suffix => SOURCE + suffix)
      .find(lid => map!.getLayer(lid))
    if (markerFirst) {
      map.moveLayer(REGION_FILL_LAYER, markerFirst)
      map.moveLayer(REGION_LINE_LAYER, markerFirst)
    }

    regRegion(REGION_FILL_LAYER, 'click', onRegionAreaClick)
    regRegion(REGION_FILL_LAYER, 'mouseenter', onRegionAreaEnter)
    regRegion(REGION_FILL_LAYER, 'mousemove', onRegionAreaMove)
    regRegion(REGION_FILL_LAYER, 'mouseleave', onRegionAreaLeave)
  }

  function setRegionHover(id: string | number | null) {
    if (!map || regionHoverId === id) return
    // Clear previous hover state
    if (regionHoverId != null) {
      try {
        map.setFeatureState({ source: REGION_SOURCE, id: regionHoverId }, { hover: false })
      } catch (e) {
        // Ignore invalid feature state errors
      }
    }
    // Set new hover state
    if (id != null) {
      try {
        map.setFeatureState({ source: REGION_SOURCE, id }, { hover: true })
      } catch (e) {
        // Ignore invalid feature state errors
      }
    }
    regionHoverId = id
  }

  /** Resolve region data for crew mode, or compute counts for other datasets */
  interface RegionCountResult {
    id: string
    name: string
    count: number
    otherCount?: number
    label: string
    otherLabel?: string
  }

  function computeRegionCounts(regionId: string): RegionCountResult | null {
    // For active-crews, use the crew region data
    const crewRegion = crewRegionMap?.get(regionId) ?? (latestArgs?.crews ?? []).find(r => r.id === regionId)
    if (crewRegion) {
      const statuses = latestArgs?.crewStatuses
      const active = !statuses || statuses.includes('active') ? crewRegion.activeCrews : 0
      const inactive = !statuses || statuses.includes('inactive') ? crewRegion.inactiveCrews : 0
      return {
        id: regionId,
        name: crewRegion.region,
        count: active,
        otherCount: inactive,
        label: t('crews.activeCrews') || 'Active Crews',
        otherLabel: t('crews.inactiveCrews') || 'Inactive Crews',
      }
    }

    // For project-grants, count projects per region
    if (latestArgs?.projects && latestArgs.projects.length > 0) {
      const regionProjectCount = latestArgs.projects.filter(p => {
        return lngLatToRegionId(p.latitude, p.longitude) === regionId
      }).length
      const region = allCrewRegionsData.find(r => r.id === regionId)
      if (region) {
        return {
          id: regionId,
          name: region.region,
          count: regionProjectCount,
          label: t('home.projectGrants') || 'Projects',
        }
      }
    }

    // For endangered-species, count species per region
    if (latestArgs?.speciesIndex && latestArgs.speciesIndex.length > 0) {
      const regionSpeciesCount = latestArgs.speciesIndex.filter(s => {
        return lngLatToRegionId(s.lat, s.lng) === regionId
      }).length
      const region = allCrewRegionsData.find(r => r.id === regionId)
      if (region) {
        return {
          id: regionId,
          name: region.region,
          count: regionSpeciesCount,
          label: t('nav.endangeredSpecies') || 'Species',
        }
      }
    }

    return null
  }

  function resolveRegionById(id: string): CrewRegionData | null {
    return crewRegionMap?.get(id)
      ?? (latestArgs?.crews ?? []).find(r => r.id === id)
      ?? null
  }

  function hideRegionTip() {
    if (regionTip) {
      regionTip.remove()
      regionTip = null
    }
  }

  function showRegionTipById(regionId: string, lngLat: [number, number]) {
    if (!map) return
    const regionData = computeRegionCounts(regionId)
    if (!regionData) return

    // Only show the "expand" click-through hint for active-crews — the other
    // datasets show counts on hover but have no region-level overlay to open.
    const html = buildGenericRegionTooltipHTML(regionData, {
      items: regionData.label,
      otherItems: regionData.otherLabel,
      expand: currentDataset === 'active-crews' ? (t('preview.expand') || 'View details') : '',
    })

    if (!regionTip) {
      regionTip = new maplibregl.Popup(withMapPopupSafeArea({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: true,
        offset: 14,
        maxWidth: '260px',
        className: 'region-hover-tip',
      }, map.getContainer()))
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map)
      regionTip.getElement().style.pointerEvents = 'none'
    } else {
      regionTip.setLngLat(lngLat).setHTML(html)
    }
  }

  function onRegionAreaEnter(e: MapLayerMouseEvent) {
    if (!map) return
    map.getCanvas().style.cursor = 'pointer'
    updateRegionHover(e)
  }

  function onRegionAreaMove(e: MapLayerMouseEvent) {
    updateRegionHover(e)
  }

  /** Track current feature and update hover state instantly */
  function updateRegionHover(e: MapLayerMouseEvent) {
    const f = e.features?.[0]
    if (!f) {
      // No feature under cursor - we're leaving all regions
      if (regionHoverId !== null) {
        if (map) map.getCanvas().style.cursor = ''
        setRegionHover(null)
        hideRegionTip()
      }
      return
    }
    // Feature id comes from promoteId in source, or fall back to properties.id
    const id = f.properties?.id ?? f.id
    if (id == null || id === regionHoverId) {
      // Same region, just update tooltip position
      if (regionTip) regionTip.setLngLat([e.lngLat.lng, e.lngLat.lat])
      return
    }
    // Different region - instant switch
    setRegionHover(id)
    showRegionTipById(String(id), [e.lngLat.lng, e.lngLat.lat])
  }

  function onRegionAreaLeave() {
    // Handled in updateRegionHover via features check
    if (regionHoverId === null && map) map.getCanvas().style.cursor = ''
  }

  /** True when a crew/project marker feature sits under the point — the
   *  marker's own click handler owns that hit, not the region area. */
  function markerHitAt(point: { x: number; y: number }): boolean {
    if (!map) return false
    const layers = ['_p', '_pc', '_pl', '_ml', '_c', '_cc', '_cn', '_cg']
      .map(suffix => SOURCE + suffix)
      .filter(lid => map!.getLayer(lid))
    if (!layers.length) return false
    try {
      return map.queryRenderedFeatures([point.x, point.y], { layers }).length > 0
    } catch {
      return false
    }
  }

  function onRegionAreaClick(e: MapLayerMouseEvent) {
    if (!map || !e.features?.[0]) return
    if (markerHitAt(e.point)) return
    if (Date.now() - _lastPointClick < 80) return
    // Only active-crews has a region-level overlay to open on click.
    // For project-grants / endangered-species the hover tooltip is the
    // only interaction; clicking the polygon background does nothing.
    if (currentDataset !== 'active-crews') return
    const f = e.features[0]
    const regionId = String(f.properties?.id ?? f.id ?? '')
    const region = resolveRegionById(regionId)
    if (!region) return
    _lastPointClick = Date.now()
    hideRegionTip()
    setRegionHover(null)
    const cb = callbacks.openCrewPreview ?? callbacks.openCrewOverlay
    cb(region)
  }

  function removeRegionLayers() {
    hideRegionTip()
    if (map) {
      setRegionHover(null)
      for (const lid of [REGION_LINE_LAYER, REGION_FILL_LAYER]) {
        if (map.getLayer(lid)) map.removeLayer(lid)
      }
      if (map.getSource(REGION_SOURCE)) map.removeSource(REGION_SOURCE)
    }
    detachRegionEvents()
    regionHoverId = null
  }

  function regRegion(lid: string, evt: keyof MapLayerEventType, fn: (e: MapLayerMouseEvent) => void) {
    if (!map?.getLayer(lid)) return
    // Idempotent: a style reload re-adds layers without re-binding twice.
    if (regionHandlers.some(h => h.id === lid && h.evt === evt)) return
    map.on(evt, lid, fn as (ev: MapLayerEventType[typeof evt] & object) => void)
    regionHandlers.push({ id: lid, evt, fn })
  }

  function detachRegionEvents() {
    if (!map) {
      regionHandlers.length = 0
      return
    }
    for (const { id, evt, fn } of regionHandlers) {
      map.off(evt, id, fn as (ev: MapLayerEventType[typeof evt] & object) => void)
    }
    regionHandlers.length = 0
  }

  function reg(lid: string, evt: keyof MapLayerEventType, fn: (e: MapLayerMouseEvent) => void) {
    if (!map?.getLayer(lid)) {
      console.warn('[EG Maps] skipped event registration for missing layer', { layer: lid, event: evt })
      return
    }
    map.on(evt, lid, fn as (ev: MapLayerEventType[typeof evt] & object) => void)
    handlers.push({ id: lid, evt, fn })
  }

  function detach() {
    if (!map) return
    for (const { id, evt, fn } of handlers) map.off(evt, id, fn as (ev: MapLayerEventType[typeof evt] & object) => void)
    handlers.length = 0
  }

  /* ── 🏠 SWARM 6 · CLICK DISPATCH (8) ─────────────────────────────── */

  function dispatchPoint(ds: MarkerDataset, f: GeoJSON.Feature, coords: [number, number], a: RebuildArgs) {
    const p = f.properties ?? {}
    switch (ds) {
      case 'project-grants':   return dispatchProject(p, coords, a)
      case 'endangered-species': return dispatchSpecies(p, coords, a)
      case 'active-crews':     return dispatchCrew(p, coords, a)
      case 'vulcan-observatory': return dispatchRareEarth(p, coords)
    }
  }

  function dispatchProject(p: Record<string, unknown>, coords: [number, number], a: RebuildArgs) {
    // Stacked grants (same coordinates) can't be tapped apart — like stacked
    // active-crews locations, open the disambiguation panel instead of a
    // single preview. Picking an item opens its popup.
    if (p._projectGroup != null && callbacks.openCluster) {
      const origLat = (p._origLat as number) ?? coords[1]
      const origLng = (p._origLng as number) ?? coords[0]
      // Fast path: siblings resolved live via the coordinate key (no
      // per-feature serialized id arrays in the source).
      const key = `${origLat.toFixed(3)},${origLng.toFixed(3)}`
      const siblings = (a.projects ?? []).filter(
        g => `${g.latitude.toFixed(3)},${g.longitude.toFixed(3)}` === key,
      )
      const groupIds = siblings.length > 1
        ? siblings.map(g => g.project_title)
        : legacyGroupIds(p)
      if (groupIds.length > 1) {
        callbacks.openCluster({
          dataset: 'project-grants',
          coordinates: [origLng, origLat],
          featureIds: groupIds,
        })
        return
      }
    }
    const proj = projectMap?.get(p.id as string)
    if (!proj) return
    const cb = callbacks.openProjectPreview ?? callbacks.openProjectOverlay
    cb(proj)
  }

  /** Back-compat fallback for features stamped with the old `_groupIds` JSON. */
  function legacyGroupIds(p: Record<string, unknown>): string[] {
    try {
      const parsed: unknown = JSON.parse(String(p._groupIds ?? '[]'))
      if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string')
    } catch { /* ignore malformed group */ }
    return []
  }

  function dispatchSpecies(p: Record<string, unknown>, coords: [number, number], a: RebuildArgs) {
    const idx = resolveSpeciesIndex(a)
    const [, lat] = coords
    const matches = _findSpeciesAtCoord(lat, coords[0], idx, SPECIES_COORD_TOLERANCE)
    if (matches.length > 1) {
      const full = fullSpeciesMap?.get(matches[0].id) ?? matches[0]
      callbacks.openSpeciesOverlay(full)
      return
    }
    const item = speciesMap?.get(p.id as string)
    if (!item) return
    const full = fullSpeciesMap?.get(item.id) ?? item
    const cb = callbacks.openSpeciesPreview ?? callbacks.openSpeciesOverlay
    cb(full)
  }

  function dispatchCrew(p: Record<string, unknown>, coords: [number, number], a: RebuildArgs) {
    switch (p._type) {
      case 'crewLocation': return dispatchCrewLocation(p, coords, a)
      case 'crewRegion':   return dispatchCrewRegion(p, coords, a)
    }
  }

  function dispatchCrewLocation(p: Record<string, unknown>, coords: [number, number], a: RebuildArgs) {
    const origLat = (p._origLat as number) ?? coords[1]
    const origLng = (p._origLng as number) ?? coords[0]
    const loc: CrewLocation = {
      name: p.name as string, country: p.country as string, city: p.city as string,
      state: p.state as string, region: p.region as string,
      status: (p.status as 'active' | 'inactive') ?? 'active',
      lat: origLat, lng: origLng,
    }

    // Stacked crews (same coordinates) can't be tapped apart and the preview
    // popup closes on map movement, so zoom-to-separate never shows details.
    // Open the disambiguation panel instead — picking an item opens its popup.
    if (p._crewGroup != null && callbacks.openCluster) {
      const key = `${origLat.toFixed(3)},${origLng.toFixed(3)}`
      const siblings = (a.crewLocations ?? []).filter(
        l => `${l.lat.toFixed(3)},${l.lng.toFixed(3)}` === key,
      )
      if (siblings.length > 1) {
        callbacks.openCluster({
          dataset: 'active-crews',
          coordinates: [origLng, origLat],
          featureIds: siblings.map(l => `${l.name}-${l.lat}-${l.lng}`),
        })
        return
      }
    }

    const cb = callbacks.openCrewPreview ?? callbacks.openCrewLocationOverlay ?? callbacks.openCrewOverlay
    cb(loc)
  }

  function dispatchCrewRegion(p: Record<string, unknown>, coords: [number, number], a: RebuildArgs) {
    const origLat = (p._origLat as number) ?? coords[1]
    const origLng = (p._origLng as number) ?? coords[0]
    // Never trust the feature's own props for complex fields — resolve the
    // full record (real `history` array) via the lookup map, with a coerced
    // crash-safe fallback when the region isn't in the map.
    const crew = resolveCrewRegion({ ...p, _origLat: origLat, _origLng: origLng }, crewRegionMap ?? a.crews ?? [])
    const cb = callbacks.openCrewPreview ?? callbacks.openCrewOverlay
    cb(crew)
  }

  function dispatchRareEarth(p: Record<string, unknown>, coords: [number, number]) {
    if (p._markerType === 'cultural') {
      callbacks.openCulturalOverlay?.({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: p as Record<string, unknown>,
      })
      return
    }
    callbacks.openRareEarthOverlay?.({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: p as Record<string, unknown>,
    })
  }

  /* ── 🏠 SWARM 7 · SPECIES INDEX (1) ──────────────────────────────── */

  function resolveSpeciesIndex(a: RebuildArgs): SpeciesIndexItem[] {
    if (speciesIndexCache) return speciesIndexCache
    speciesIndexCache = buildSpeciesIndex(a.speciesIndex, a.species)
    return speciesIndexCache
  }

  /* ── public API ─────────────────────────────────────────────────────── */

  return { init, rebuild, update, cleanup }
}

/* ══════════════════════════════════════════════════════════════════════════
   🏠 SWARM 8 · DATA CONVERTERS (8) — the honeycomb cells
   ══════════════════════════════════════════════════════════════════════════ */

const GEOJSON_CONVERTERS: Record<MarkerDataset, (a: RebuildArgs) => GeoJSON.FeatureCollection> = {
  'project-grants':       a => toProjectGeoJSON(a.projects),
  'endangered-species':   a => toSpeciesGeoJSON(a.speciesIndex, a.species, a.selectedSpeciesGroups),
  'active-crews':         a => buildCrewStatusGeoJSON(a.crews, a.crewLocations, a.crewStatuses),
  'vulcan-observatory':   a => toRareEarthGeoJSON(a.rareEarthFeatures ?? [], a.culturalFeatures ?? []),
}

function toGeoJSON(ds: MarkerDataset, a: RebuildArgs): GeoJSON.FeatureCollection {
  return GEOJSON_CONVERTERS[ds](a)
}

function toProjectGeoJSON(projects: ProjectData[]): GeoJSON.FeatureCollection {
  // Same overlap system as active-crews crew locations: grants sharing an
  // exact coordinate are spread on a small circle so each marker stays
  // tappable; clicking one opens the shared disambiguation panel.
  const valid = projects.filter(p => isValidCoordinate(p.latitude, p.longitude))
  const groups = new Map<string, ProjectData[]>()
  for (const p of valid) {
    const key = `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  const features: GeoJSON.Feature[] = []
  for (const [groupKey, group] of groups) {
    const isMulti = group.length > 1
    group.forEach((p, i) => {
      let offsetLng = 0
      let offsetLat = 0
      if (isMulti) {
        const angle = (i / group.length) * Math.PI * 2
        const radius = 0.008
        const latRad = p.latitude * Math.PI / 180
        const lngScale = Math.max(Math.cos(latRad), 0.1)
        offsetLng = Math.cos(angle) * radius / lngScale
        offsetLat = Math.sin(angle) * radius
      }
      const total = p.direct_beneficiaries + p.indirect_beneficiaries
      const f = Math.min(Math.max(total / 10000, 0.5), 5)
      features.push({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.longitude + offsetLng, p.latitude + offsetLat] },
        properties: {
          ...(p as unknown as Record<string, unknown>),
          id: p.project_title,
          color: getProjectMapColorFromProject(p),
          size: 5 + f * 3,
          label: formatCompact(total),
          _projectGroup: isMulti ? groupKey : undefined,
          // Scalar group size only — siblings resolve at click time via the
          // coordinate key (same as crews). The old per-feature serialized
          // id array cost O(N²) bytes in the GeoJSON source for large stacks.
          _groupSize: group.length,
          _origLat: p.latitude,
          _origLng: p.longitude,
        },
      })
    })
  }
  return { type: 'FeatureCollection', features }
}

const speciesGeoCache = new Map<string, GeoJSON.FeatureCollection>()
const SPECIES_GEO_CACHE_MAX = 20

function speciesCacheKey(index: SpeciesIndexItem[], raw: Species[], groups: string[]): string {
  // Length-only keys collided across different datasets with equal sizes and
  // served stale markers. Hash a sample of stable ids + quantized coords so
  // the key changes when the underlying data changes.
  const sample = (arr: Array<{ id?: string; lat?: number; lng?: number }>) => {
    let h = 0
    const n = Math.min(arr.length, 64)
    for (let i = 0; i < n; i++) {
      const s = arr[(i * 7) % arr.length]
      const str = `${s.id ?? ''}:${Math.round((s.lat ?? 0) * 100)}:${Math.round((s.lng ?? 0) * 100)}`
      for (let j = 0; j < str.length; j++) h = ((h << 5) - h + str.charCodeAt(j)) | 0
    }
    return h
  }
  return `${index.length}:${raw.length}:${sample(index)}:${sample(raw)}:${[...groups].sort().join(',')}`
}

export function toSpeciesGeoJSON(index: SpeciesIndexItem[], raw: Species[], groups: string[]): GeoJSON.FeatureCollection {
  const cacheKey = speciesCacheKey(index, raw, groups)
  const cached = speciesGeoCache.get(cacheKey)
  if (cached) return cached
  const idx = filterByGroups(buildSpeciesIndex(index, raw), groups)
  const validCoords = idx.filter(s => isValidCoordinate(s.lat, s.lng))
  const features: GeoJSON.Feature[] = new Array(validCoords.length)
  for (let i = 0; i < validCoords.length; i++) {
    const s = validCoords[i]
    features[i] = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id,
        color: getGroupMapColor(s.taxonomicGroup ?? ''),
        size: STANDARD_MAP_MARKER_SIZE,
        label: '1',
      },
    }
  }
  const result = { type: 'FeatureCollection' as const, features }
  if (speciesGeoCache.size >= SPECIES_GEO_CACHE_MAX) {
    const first = speciesGeoCache.keys().next().value
    if (first) speciesGeoCache.delete(first)
  }
  speciesGeoCache.set(cacheKey, result)
  return result
}

export function buildCrewStatusGeoJSON(
  regions: CrewRegionData[],
  locations: CrewLocation[],
  statuses: readonly CrewStatus[] = ['active', 'inactive'],
): GeoJSON.FeatureCollection {
  const activeSelected = statuses.includes('active')
  const inactiveSelected = statuses.includes('inactive')
  const visibleRegions = regions.map(region => ({
    ...region,
    activeCrews: activeSelected ? region.activeCrews : 0,
    inactiveCrews: inactiveSelected ? region.inactiveCrews : 0,
  }))

  return {
    type: 'FeatureCollection',
    features: [
      ...buildCrewRegionMarkers(visibleRegions),
      ...buildCrewLocationPoints(locations, statuses),
    ],
  }
}

function buildCrewRegionMarkers(regions: CrewRegionData[]): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = []
  for (const r of regions) {
    if ((r.activeCrews === 0 && r.inactiveCrews === 0) || !isValidCoordinate(r.latitude, r.longitude)) continue
    const showActive = r.activeCrews > 0
    const showInactive = r.inactiveCrews > 0
    const activeBubbles = showActive ? MAX_CREW_BUBBLES : 0
    const inactiveBubbles = showInactive ? (showActive ? 1 : MAX_CREW_BUBBLES) : 0
    const bubbles = activeBubbles + inactiveBubbles
    const positions = computeCrewMosaicPositions(bubbles, r.latitude, r.longitude)
    const scaleCount = r.activeCrews || r.inactiveCrews
    const color = scaleCount > 20 ? '#22c55e' : scaleCount > 5 ? '#3b82f6' : '#a855f7'
    const bubbleRadius = bubbles === 1 ? 7 : bubbles <= 3 ? 5.5 : bubbles <= 6 ? 4.5 : 4

    for (let i = 0; i < bubbles; i++) {
      const pos = positions[i]
      const isPrimary = i === 0
      const isInactive = !showActive || i >= activeBubbles
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] },
        properties: {
          id: r.id, _type: 'crewRegion',
          _bubbleIndex: Math.min(i, MAX_CREW_BUBBLES - 1), _isPrimary: isPrimary,
          _status: isInactive ? 'inactive' : 'active',
          _origLat: r.latitude, _origLng: r.longitude,
          _mosaicLat: pos.lat, _mosaicLng: pos.lng,
          _mosaicRadius: pos.radius, _bubbleRadius: bubbleRadius,
          color, size: bubbleRadius * 2, label: '',
          _regionLabel: isPrimary ? `${r.region} · ${r.activeCrews || r.inactiveCrews}` : '',
          region: r.region, activeCrews: r.activeCrews, inactiveCrews: r.inactiveCrews,
          totalMembers: r.totalMembers, countries: r.countries,
          // NOTE: `history` (array) is deliberately NOT stored here — only
          // primitive props survive the vector-tile round-trip, and a mangled
          // history crashed regional detail popups. dispatchCrewRegion resolves
          // the full record via crewRegionMap instead.
        },
      })
    }
  }
  return features
}

function buildCrewLocationPoints(locations: CrewLocation[], statuses: readonly CrewStatus[]): GeoJSON.Feature[] {
  const valid = locations.filter(l => statuses.includes(normalizeCrewStatus(l.status)) && isValidCoordinate(l.lat, l.lng))
  const groups = groupCrewsByCoord(valid)

  const features: GeoJSON.Feature[] = []
  for (const group of groups) {
    const [baseLat, baseLng] = [group[0].lat, group[0].lng]
    const groupKey = `${baseLat.toFixed(3)},${baseLng.toFixed(3)}`
    const isMulti = group.length > 1

    group.forEach((loc, i) => {
      const status = normalizeCrewStatus(loc.status)
      let offsetLng = 0
      let offsetLat = 0
      if (isMulti) {
        const angle = (i / group.length) * Math.PI * 2
        const radius = 0.008
        const latRad = baseLat * Math.PI / 180
        const lngScale = Math.max(Math.cos(latRad), 0.1)
        offsetLng = Math.cos(angle) * radius / lngScale
        offsetLat = Math.sin(angle) * radius
      }

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [baseLng + offsetLng, baseLat + offsetLat] },
        properties: {
          id: `${loc.name}-${loc.lat}-${loc.lng}`,
          _type: 'crewLocation',
          _crewGroup: isMulti ? groupKey : undefined,
          _origLat: loc.lat, _origLng: loc.lng,
          color: status === 'active' ? '#22c55e' : '#f59e0b',
          size: STANDARD_MAP_MARKER_SIZE, label: '',
          name: loc.name, country: loc.country, city: loc.city,
          state: loc.state, region: loc.region, status,
          lat: loc.lat, lng: loc.lng,
        },
      })
    })
  }
  return features
}

function normalizeCrewStatus(status: CrewStatus | undefined): CrewStatus {
  return status === 'inactive' ? 'inactive' : 'active'
}

function groupCrewsByCoord(locations: CrewLocation[]): CrewLocation[][] {
  const map = new Map<string, CrewLocation[]>()
  for (const loc of locations) {
    const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(loc)
  }
  return [...map.values()]
}

function computeCrewMosaicPositions(count: number, centerLat: number, centerLng: number) {
  const latRad = centerLat * Math.PI / 180
  const lngScale = Math.max(Math.cos(latRad), 0.1)
  const positions: Array<{ lat: number; lng: number; radius: number }> = []

  if (count === 1) {
    positions.push({ lat: centerLat, lng: centerLng, radius: 7 })
    return positions
  }

  positions.push({ lat: centerLat, lng: centerLng, radius: 5.5 })

  if (count <= 7) {
    for (let i = 0; i < count - 1; i++) {
      const angle = (i / (count - 1)) * Math.PI * 2 - Math.PI / 2
      const lat = centerLat + Math.sin(angle) * CREW_MOSAIC_RADIUS_DEG
      const lng = centerLng + Math.cos(angle) * CREW_MOSAIC_RADIUS_DEG / lngScale
      positions.push({ lat, lng, radius: 4 })
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
      const lat = centerLat + Math.sin(angle) * CREW_MOSAIC_RADIUS_DEG
      const lng = centerLng + Math.cos(angle) * CREW_MOSAIC_RADIUS_DEG / lngScale
      positions.push({ lat, lng, radius: 4 })
    }
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2 + Math.PI / 4
      const lat = centerLat + Math.sin(angle) * CREW_MOSAIC_RADIUS_DEG * 1.65
      const lng = centerLng + Math.cos(angle) * CREW_MOSAIC_RADIUS_DEG * 1.65 / lngScale
      positions.push({ lat, lng, radius: 3.5 })
    }
  }

  return positions
}

/**
 * Cultural marker taxonomy for the Vulcan observatory path.
 * ONE unified style for Cultural Agents (Mapa Cultura + Floresta Ativista),
 * distinct bigger styles for curated Cultural Spaces and for Indigenous &
 * Original Peoples (biggest — protection priority). Single source of truth
 * lives in `@/lib/cultural-marker-taxonomy`; the maps below mirror it so
 * this GeoJSON path and the `ree-cultural` layers always agree.
 */
const CULTURAL_FAMILY_COLORS: Record<string, string> = {
  agents: CULTURAL_FAMILY_STYLES.agents.color,
  spaces: CULTURAL_FAMILY_STYLES.spaces.color,
  indigenous: CULTURAL_FAMILY_STYLES.indigenous.color,
}

const CULTURAL_FAMILY_SIZES: Record<string, number> = {
  agents: CULTURAL_FAMILY_STYLES.agents.baseSize + 2,
  spaces: CULTURAL_FAMILY_STYLES.spaces.baseSize + 2.5,
  indigenous: CULTURAL_FAMILY_STYLES.indigenous.baseSize + 2.5,
}

function toRareEarthGeoJSON(rareEarthFeatures: GeoJSON.Feature[], culturalFeatures: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  const mining = rareEarthFeatures.map(f => {
    const p = (f.properties ?? {}) as Record<string, unknown>
    const ds = Number(p.ds ?? p.danger_score ?? 5)
    return {
      type: 'Feature' as const, geometry: f.geometry,
      properties: {
        id: (p.n as string) ?? 'unknown',
        color: ds >= 8 ? '#e74c3c' : ds >= 6 ? '#f39c12' : '#27ae60',
        size: 10, label: '', dangerScore: ds, category: p.c, ...p,
      },
    }
  })

  const cultural = culturalFeatures.map((f, i) => {
    const p = (f.properties ?? {}) as Record<string, unknown>
    const family = getCulturalFamily(f)
    const color = CULTURAL_FAMILY_COLORS[family] ?? CULTURAL_FAMILY_STYLES.agents.color
    const size = CULTURAL_FAMILY_SIZES[family] ?? 9
    const coords = (f.geometry as GeoJSON.Point | undefined)?.coordinates
    const key = Array.isArray(coords) && coords.length >= 2
      ? `${String(p.source ?? 'curated')}|${String(p.source_id ?? p.name ?? `idx-${i}`)}|${Number(coords[0]).toFixed(5)},${Number(coords[1]).toFixed(5)}`
      : `cultural-${i}`
    return {
      type: 'Feature' as const, geometry: f.geometry,
      properties: {
        id: (p.name as string) ?? (p.source_id as string) ?? key,
        _markerType: 'cultural',
        _family: family,
        _color: color,
        _major: family !== 'agents',
        color, size, label: '',
        ...p,
      },
    }
  })

  return {
    type: 'FeatureCollection',
    features: [...mining, ...cultural],
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   🏠 SWARM 8 · STYLE HELPERS + SHARED UTILITIES (4)
   ══════════════════════════════════════════════════════════════════════════ */

function stepExpr(c: string[]): ExpressionSpecification {
  return ['step', ['get', 'point_count'], c[0], 10, c[1], 50, c[2], 100, c[3]] as unknown as ExpressionSpecification
}

function radExpr(s: number): ExpressionSpecification {
  return ['*', ['interpolate', ['linear'], ['get', 'point_count'], 0, 14, 10, 20, 50, 26, 100, 34], s] as unknown as ExpressionSpecification
}

function buildSpeciesIndex(index: SpeciesIndexItem[], raw: Species[]): SpeciesIndexItem[] {
  if (index.length > 0) return index
  return raw
    .filter(s => isValidCoordinate(s.lat, s.lng))
    .map(s => ({
      id: s.id, commonName: s.commonName, scientificName: s.scientificName,
      taxonomicGroup: s.taxonomicGroup, category: s.category,
      lat: s.lat, lng: s.lng, imageUrl: s.imageUrl || null,
    }))
}

function filterByGroups(idx: SpeciesIndexItem[], groups: string[]): SpeciesIndexItem[] {
  return groups.length === 0 ? idx : idx.filter(s => groups.includes(s.taxonomicGroup))
}
