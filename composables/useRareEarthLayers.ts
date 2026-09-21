/**
 * composables/useRareEarthLayers.ts
 * @why Rare earth 3D visualization layers — element spheres, connection lines, annotations
 * @functions cleanupRareEarthLayers, setupRareEarthLayers, syncObservatoryLayers, hasObservatoryLayers, adaptPolygonProps, addRareEarthGeoBoundaries, addRareEarthConflictSites, addRareEarthNetworkLines, addBrazilianCitiesLayer, addProtectedAreasLayer, addPolygonLayersToMap, syncRareEarthLayerVisibility, buildNetworkLinesFromClaims
 * @consts REE_SOURCE_POINTS, REE_SOURCE_POLYS, REE_SOURCE_GEO, REE_SOURCE_SITES, REE_SOURCE_NETWORK, REE_SOURCE_PROTECTED, REE_SOURCE_CITIES, REE_LAYER_IDS, REE_SOURCE_IDS, CAT_COLOR_MATCH, POLY_COLOR_MATCH
 * @interfaces RareEarthLayerOptions
 * @types CleanupFn
 * @deps @/lib/map-utils (buildRareEarthPopupHTML); @/composables/useObservatoryPopup (openRareEarthPopup, openStackedObservatoryPopup); @/lib/brazilian-cities (citiesToGeoJSON); @/lib/rare-earth-geo-data (RARE_EARTH_GEO_BOUNDARIES, RARE_EARTH_CONFLICT_SITES); @/composables/useWaterLayers (WATER_SOURCE, cleanupWaterLayers); @/composables/useCulturalLayers (cleanupCulturalLayers)
 * @connections composables/useRareEarthController.ts
 */
import type { Map as MapLibreMap, MapLayerMouseEvent, DataDrivenPropertyValueSpecification } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { buildRareEarthPopupHTML } from '@/lib/map-utils'
import { openRareEarthPopup, openStackedObservatoryPopup, type StackedHit } from '@/composables/useObservatoryPopup'
import { citiesToGeoJSON } from '@/lib/brazilian-cities'
import { RARE_EARTH_GEO_BOUNDARIES, RARE_EARTH_CONFLICT_SITES } from '@/lib/rare-earth-geo-data'
import { WATER_SOURCE, cleanupWaterLayers, setupWaterLayers } from '@/composables/useWaterLayers'
import { cleanupCulturalLayers, setCulturalLayersVisibility, setupCulturalLayers, updateCulturalData } from '@/composables/useCulturalLayers'

const activePopups = new WeakMap<MapLibreMap, maplibregl.Popup>()

function closeActivePopup(map: MapLibreMap) {
  const popup = activePopups.get(map)
  if (popup) { popup.remove(); activePopups.delete(map) }
}

export const REE_SOURCE_POINTS = 'ree-points'
export const REE_SOURCE_POLYS = 'ree-polys'
export const REE_SOURCE_GEO = 'ree-geo'
export const REE_SOURCE_SITES = 'ree-sites'
export const REE_SOURCE_NETWORK = 'ree-network'
export const REE_SOURCE_PROTECTED = 'ree-protected'
export const REE_SOURCE_CITIES = 'ree-cities'

export const REE_LAYER_IDS = [
  'ree-point-glow', 'ree-point-circle', 'ree-point-hover',
  'ree-foreign-glow',
  'ree-heat-layer',
  'ree-poly-fill', 'ree-poly-glow', 'ree-poly-line', 'ree-poly-label',
  'ree-geo-fill', 'ree-geo-aquifer', 'ree-geo-conflict', 'ree-geo-line', 'ree-geo-label',
  'ree-site-glow', 'ree-site-label',
  'ree-network-lines',
  'ree-protected-ti-fill', 'ree-protected-ti-line', 'ree-protected-ti-label',
  'ree-protected-quilombo-fill', 'ree-protected-quilombo-line', 'ree-protected-quilombo-label',
  'ree-protected-uc-fill', 'ree-protected-uc-line', 'ree-protected-uc-label',
  'ree-protected-buffer-fill', 'ree-protected-buffer-line', 'ree-protected-buffer-label',
  'ree-cities-label',
  'ree-overlap-glow',
] as const

export const REE_SOURCE_IDS = [
  REE_SOURCE_POINTS, REE_SOURCE_POLYS, REE_SOURCE_GEO,
  REE_SOURCE_SITES, REE_SOURCE_NETWORK, REE_SOURCE_PROTECTED,
  REE_SOURCE_CITIES,
  WATER_SOURCE,
] as const

export const CAT_COLOR_MATCH: DataDrivenPropertyValueSpecification<string> = ['match', ['get', 'c'],
  'direct_ree', '#ef4444',
  'carbonatite_associated', '#f97316',
  'pegmatite_associated', '#22c55e',
  'heavy_mineral_associated', '#3b82f6',
  'phosphate_associated', '#a855f7',
  'strategic_associated', '#ec4899',
  '#6b7280']

export const POLY_COLOR_MATCH: DataDrivenPropertyValueSpecification<string> = ['match', ['get', 'category'],
  'direct_ree', '#ef4444', 'carbonatite_associated', '#f97316',
  'pegmatite_associated', '#22c55e', 'heavy_mineral_associated', '#3b82f6',
  'phosphate_associated', '#a855f7', 'strategic_associated', '#ec4899', '#6b7280']

export interface RareEarthLayerOptions {
  points: GeoJSON.FeatureCollection
  polys?: GeoJSON.FeatureCollection | null
  protected?: GeoJSON.FeatureCollection | null
  cultural?: GeoJSON.FeatureCollection | null
  networkFeatures?: GeoJSON.FeatureCollection | null
  onClaimClick?: (_props: Record<string, unknown>, _lngLat: [number, number]) => void
  popup?: {
    t: (_key: string, _params?: Record<string, unknown>) => string
    locale: { value: string }
    onSidebarOpen?: (_payload: { processo: string; nome: string; tab: string; coords: [number, number] }) => void
  }
}

export type CleanupFn = () => void

function safeRemoveLayer(map: MapLibreMap, id: string) {
  try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ }
}
function safeRemoveSource(map: MapLibreMap, id: string) {
  try { if (map.getSource(id)) map.removeSource(id) } catch { /* */ }
}

export function cleanupRareEarthLayers(map: MapLibreMap) {
  REE_LAYER_IDS.forEach(id => safeRemoveLayer(map, id))
  REE_SOURCE_IDS.forEach(id => safeRemoveSource(map, id))
  cleanupWaterLayers(map)
  cleanupCulturalLayers(map)
}

function addPointLayers(map: MapLibreMap, source: string) {
  map.addLayer({
    id: 'ree-point-glow',
    type: 'circle',
    source,
    filter: ['!has', 'point_count'],
    paint: {
      'circle-color': CAT_COLOR_MATCH,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 5, 10, 9, 14, 13, 18, 17],
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.08, 10, 0.12, 14, 0.15],
      'circle-blur': 0.9,
    },
  })

  map.addLayer({
    id: 'ree-point-circle',
    type: 'circle',
    source,
    filter: ['!has', 'point_count'],
    paint: {
      'circle-color': CAT_COLOR_MATCH,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 5, 14, 7, 18, 9],
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 0.8, 14, 0.95],
      'circle-stroke-color': 'rgba(255,255,255,0.35)',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 10, 0.7, 14, 1.2],
    },
  })

  // NOTE: claims render unclustered (one GPU circle per claim). Clustering
  // was removed: with a 50km regional footprint every claim deserves its own
  // marker, and circle layers stay at 60fps without cluster bookkeeping.

  map.addLayer({
    id: 'ree-heat-layer',
    type: 'heatmap',
    source,
    maxzoom: 15,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['zoom'], 0, 0.3, 6, 0.5, 12, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 3, 12, 8],
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)', 0.05, 'rgba(126,34,206,0.05)', 0.15, 'rgba(99,102,241,0.25)',
        0.3, 'rgba(139,92,246,0.45)', 0.5, 'rgba(236,72,153,0.55)', 0.7, 'rgba(239,68,68,0.7)',
        0.85, 'rgba(220,38,38,0.8)', 1, 'rgba(153,27,27,0.9)'],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 6, 12, 12, 20],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 12, 0.3, 15, 0],
    },
  }, 'ree-point-circle')

  map.addLayer({
    id: 'ree-point-hover',
    type: 'circle',
    source,
    filter: ['all', ['!has', 'point_count']],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 5, 10, 8, 14, 10, 18, 14],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0],
      'circle-stroke-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.7, 0],
    },
  })

  // Foreign-held claims halo — reads the numeric `is_foreign` scalar stamped
  // at normalization time (holder joined to the curated enterprise list).
  // NOTE: keep this filter legacy-form (plain string keys). Mixing the
  // legacy `!has` op with `['get', ...]` comparisons trips style-spec
  // validation (`filter[2][1]: string expected, array found`), which fires a
  // map error event per layer and makes `setFilter` silently skip.
  map.addLayer({
    id: 'ree-foreign-glow',
    type: 'circle',
    source,
    filter: ['all', ['!has', 'point_count'], ['==', 'is_foreign', 1]] as unknown as maplibregl.FilterSpecification,
    paint: {
      'circle-color': '#e74c3c',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 11, 10, 15, 14, 19],
      'circle-opacity': 0.22,
      'circle-blur': 0.9,
      'circle-stroke-color': '#e74c3c',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 14, 2],
      'circle-stroke-opacity': 0.65,
    },
  })
}

/** Hover affordances only — clicks are owned by the unified stacked handler. */
function addClickHandlers(map: MapLibreMap, _options: RareEarthLayerOptions, cleanups: Array<() => void>) {
  const onPointEnter = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer'
    if (e.features?.length) {
      try { map.setFeatureState({ source: REE_SOURCE_POINTS, id: e.features[0].id! }, { hover: true }) } catch { /* ignore */ }
    }
  }
  const onPointLeave = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = ''
    if (e.features?.length) {
      try { map.setFeatureState({ source: REE_SOURCE_POINTS, id: e.features[0].id! }, { hover: false }) } catch { /* ignore */ }
    }
  }

  map.on('mouseenter', 'ree-point-circle', onPointEnter)
  map.on('mouseleave', 'ree-point-circle', onPointLeave)
  cleanups.push(() => {
    try {
      map.off('mouseenter', 'ree-point-circle', onPointEnter)
      map.off('mouseleave', 'ree-point-circle', onPointLeave)
    } catch { /* ignore */ }
  })
}

/** No per-layer polygon click — the unified map click queries ree-poly-fill. */
function addPolygonHandlers(_map: MapLibreMap, _options: RareEarthLayerOptions, _cleanups: Array<() => void>) {
}

/** Hover affordances only for conflict-site labels. */
function addSiteHandlers(map: MapLibreMap, cleanups: Array<() => void>) {
  const onSiteEnter = () => { map.getCanvas().style.cursor = 'pointer' }
  const onSiteLeave = () => { map.getCanvas().style.cursor = '' }
  for (const layerId of ['ree-site-label', 'ree-site-glow']) {
    try {
      if (!map.getLayer(layerId)) continue
      map.on('mouseenter', layerId, onSiteEnter)
      map.on('mouseleave', layerId, onSiteLeave)
      cleanups.push(() => {
        try {
          map.off('mouseenter', layerId, onSiteEnter)
          map.off('mouseleave', layerId, onSiteLeave)
        } catch { /* ignore */ }
      })
    } catch { /* ignore */ }
  }
}

/** Hover affordances only for protected-area fills. */
function addProtectedAreaHandlers(map: MapLibreMap, cleanups: Array<() => void>) {
  for (const layerId of ['ree-protected-ti-fill', 'ree-protected-quilombo-fill', 'ree-protected-uc-fill', 'ree-protected-buffer-fill']) {
    const onProtEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onProtLeave = () => { map.getCanvas().style.cursor = '' }
    try {
      if (!map.getLayer(layerId)) continue
      map.on('mouseenter', layerId, onProtEnter)
      map.on('mouseleave', layerId, onProtLeave)
      cleanups.push(() => {
        try {
          map.off('mouseenter', layerId, onProtEnter)
          map.off('mouseleave', layerId, onProtLeave)
        } catch { /* ignore */ }
      })
    } catch { /* ignore */ }
  }
}

function shortName(v: unknown, max = 18): string {
  const s = String(v ?? '').trim()
  if (!s || s === '—') return ''
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/**
 * Single map-level click handler: queries every visible observatory layer
 * around the click point so overlapping markers/polygons/territories open
 * as a tabbed popup instead of only the topmost feature winning.
 */
function addUnifiedObservatoryClick(map: MapLibreMap, options: RareEarthLayerOptions, cleanups: Array<() => void>) {
  const QUERY_GROUPS: Array<{ layers: string[]; kind: StackedHit['kind'] }> = [
    { layers: ['ree-point-circle'], kind: 'claim' },
    { layers: ['ree-poly-fill'], kind: 'boundary' },
    { layers: ['ree-protected-ti-fill', 'ree-protected-quilombo-fill', 'ree-protected-uc-fill', 'ree-protected-buffer-fill'], kind: 'protected' },
    { layers: ['ree-water-poly-fill', 'ree-water-river-line'], kind: 'water' },
    { layers: ['ree-site-glow', 'ree-site-label'], kind: 'site' },
    { layers: ['ree-geo-fill', 'ree-geo-aquifer', 'ree-geo-conflict'], kind: 'geo' },
  ]

  const onMapClick = (e: maplibregl.MapMouseEvent) => {
    try {
      const liveLayers = QUERY_GROUPS.flatMap(g => g.layers).filter((id) => {
        try {
          if (!map.getLayer(id)) return false
          return map.getLayoutProperty(id, 'visibility') !== 'none'
        } catch { return false }
      })
      if (!liveLayers.length) return
      const r = 8
      const bbox: [[number, number], [number, number]] = [[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]]
      let rendered: maplibregl.MapGeoJSONFeature[] = []
      try {
        rendered = map.queryRenderedFeatures(bbox, { layers: liveLayers })
      } catch { rendered = [] }
      if (!rendered.length) {
        closeActivePopup(map)
        return
      }

      const seen = new Set<string>()
      const hits: StackedHit[] = []
      const push = (kind: StackedHit['kind'], label: string, props: Record<string, unknown>, layerId: string, dedupeKey: string) => {
        if (seen.has(dedupeKey)) return
        seen.add(dedupeKey)
        hits.push({ kind, label, props, layerId })
      }

      let claimCount = 0
      let boundaryCount = 0
      for (const f of rendered) {
        const layerId = (f.layer as { id?: string } | undefined)?.id ?? String(f.layer ?? '')
        const group = QUERY_GROUPS.find(g => g.layers.includes(layerId))
        if (!group) continue
        const props = (f.properties ?? {}) as Record<string, unknown>
        if (group.kind === 'claim') {
          if (claimCount >= 8) continue
          const proc = String(props.processo ?? props.p ?? props.id ?? '')
          const nome = shortName(props.nome ?? props.n ?? props.NOME)
          const label = nome ? `⛏ ${nome}` : `⛏ ${proc.slice(-6) || 'claim'}`
          push('claim', label, props, layerId, `claim::${proc || JSON.stringify(props).slice(0, 80)}`)
          claimCount++
        } else if (group.kind === 'boundary') {
          if (boundaryCount >= 4) continue
          const proc = String(props.PROCESSO ?? props.processo ?? props.p ?? '')
          const nome = shortName(props.NOME ?? props.nome ?? props.n ?? props.enterprise)
          const label = nome ? `◈ ${nome}` : `◈ ${proc.slice(-6) || 'boundary'}`
          push('boundary', label, props, layerId, `boundary::${proc || nome || JSON.stringify(props).slice(0, 80)}`)
          boundaryCount++
        } else if (group.kind === 'protected') {
          const name = String(props.name ?? 'Protected area')
          push('protected', `🛡 ${shortName(name)}`, props, layerId, `protected::${props.kind ?? ''}::${name}`)
        } else if (group.kind === 'water') {
          const name = String(props.name ?? 'Water body')
          push('water', `💧 ${shortName(name)}`, props, layerId, `water::${name}::${String(props.osm_id ?? props.water_type ?? '')}`)
        } else if (group.kind === 'site') {
          const name = String(props.name ?? 'Conflict zone')
          push('site', `⚠ ${shortName(name, 22)}`, props, layerId, `site::${name}`)
        } else {
          const name = String(props.name ?? 'Geological area')
          push('geo', `🌍 ${shortName(name)}`, props, layerId, `geo::${String(props.type ?? '')}::${name}`)
        }
        if (hits.length >= 12) break
      }

      if (!hits.length) {
        closeActivePopup(map)
        return
      }

      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      closeActivePopup(map)

      // Embed override: forward the top claim instead of opening a popup.
      if (options.onClaimClick) {
        const firstClaim = hits.find(h => h.kind === 'claim' || h.kind === 'boundary')
        if (firstClaim) {
          const adapted = firstClaim.kind === 'boundary' ? adaptPolygonProps(firstClaim.props) : firstClaim.props
          options.onClaimClick(adapted, lngLat)
          return
        }
      }

      if (hits.length === 1) {
        const only = hits[0]
        if (only.kind === 'claim' || only.kind === 'boundary') {
          const adapted = only.kind === 'boundary' ? adaptPolygonProps(only.props) : only.props
          if (options.popup) {
            activePopups.set(map, openRareEarthPopup(map, adapted, lngLat, { onSidebarOpen: options.popup.onSidebarOpen }, options.popup.t, options.popup.locale))
            return
          }
          const html = buildRareEarthPopupHTML(adapted)
          activePopups.set(map, new maplibregl.Popup({ offset: 12, closeButton: true, className: 'cyberpunk-popup' }).setLngLat(e.lngLat).setHTML(html).setMaxWidth('420px').addTo(map))
          return
        }
      }

      if (options.popup) {
        const popup = openStackedObservatoryPopup(map, hits, lngLat, {
          t: options.popup.t,
          locale: options.popup.locale,
          onSidebarOpen: options.popup.onSidebarOpen,
        })
        if (popup) activePopups.set(map, popup)
        return
      }
      // No i18n popup config (fallback path): show the top hit only.
      const first = hits[0]
      const adapted = first.kind === 'boundary' ? adaptPolygonProps(first.props) : first.props
      const html = buildRareEarthPopupHTML(adapted)
      activePopups.set(map, new maplibregl.Popup({ offset: 12, closeButton: true, className: 'cyberpunk-popup' }).setLngLat(e.lngLat).setHTML(html).setMaxWidth('420px').addTo(map))
    } catch {
      /* fail-soft: a bad query must never break map clicks */
    }
  }

  map.on('click', onMapClick)
  cleanups.push(() => {
    try { map.off('click', onMapClick) } catch { /* ignore */ }
  })
}

export interface ObservatorySyncInput {
  points?: GeoJSON.FeatureCollection | null
  polys?: GeoJSON.FeatureCollection | null
  protected?: GeoJSON.FeatureCollection | null
  water?: GeoJSON.FeatureCollection | null
  /** Cultural agents overlay (Mapa Cultura + Floresta Ativista + curated spaces). */
  cultural?: GeoJSON.FeatureCollection | null
  networkFeatures?: GeoJSON.FeatureCollection | null
  visibility?: Record<string, boolean>
  popup?: RareEarthLayerOptions['popup']
  onClaimClick?: RareEarthLayerOptions['onClaimClick']
}

function setSourceData(map: MapLibreMap, sourceId: string, data: GeoJSON.FeatureCollection): boolean {
  try {
    const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
    if (!src || typeof (src as { setData?: unknown }).setData !== 'function') return false
    ;(src as maplibregl.GeoJSONSource).setData(data)
    return true
  } catch { return false }
}

/**
 * Reconcile every observatory source with the latest data WITHOUT tearing
 * down the whole stack. Sources that exist are updated in place (`setData`,
 * no flicker); sources missing after a style switch are re-created with
 * their layers and handlers. This single entry point replaces the previous
 * five independent watchers that could each silently drop an update when
 * the style was mid-reload (`isStyleLoaded() === false` → early return)
 * and leave a layer — typically polygons — permanently blank.
 */
export function syncObservatoryLayers(map: MapLibreMap, input: ObservatorySyncInput): boolean {
  if (!map || !map.isStyleLoaded()) return false
  const { points, polys, protected: protectedAreas, water, cultural, networkFeatures, visibility, popup, onClaimClick } = input
  // Proceed when ANY layer has data. Gating everything on filtered points
  // alone left the map permanently blank whenever the point set was momentarily
  // empty (initial empty FC, strict filters) while polygons/protected/water
  // were already available.
  const hasAnyData = Boolean(
    points?.features?.length || polys?.features?.length
    || protectedAreas?.features?.length || water?.features?.length
    || cultural?.features?.length,
  )
  if (!hasAnyData && !map.getSource(REE_SOURCE_POINTS)) return false

  if (!map.getSource(REE_SOURCE_POINTS)) {
    // Nothing set up yet (first load after style ready) — full bootstrap.
    // An empty point set still creates the source so later setData fills it.
    setupRareEarthLayers(map, {
      points: points ?? { type: 'FeatureCollection', features: [] },
      polys: polys ?? null,
      protected: protectedAreas ?? null,
      cultural: cultural ?? null,
      networkFeatures: networkFeatures ?? null,
      popup,
      onClaimClick,
    })
  } else {
    if (points?.features?.length) setSourceData(map, REE_SOURCE_POINTS, points)
    if (polys?.features?.length) {
      if (map.getSource(REE_SOURCE_POLYS)) setSourceData(map, REE_SOURCE_POLYS, polys)
      else addPolygonLayersToMap(map, polys, popup)
    }
    if (protectedAreas?.features?.length && !map.getSource(REE_SOURCE_PROTECTED)) {
      // Late protected arrival: full bootstrap re-attaches layers; clicks
      // stay owned by the unified map handler regardless of arrival order.
      setupRareEarthLayers(map, {
        points: points ?? { type: 'FeatureCollection', features: [] },
        polys: polys ?? null,
        protected: protectedAreas,
        cultural: cultural ?? null,
        networkFeatures: networkFeatures ?? null,
        popup,
        onClaimClick,
      })
    } else if (protectedAreas?.features?.length) {
      setSourceData(map, REE_SOURCE_PROTECTED, protectedAreas)
    }
    // undefined = throttled, skip (keep on-map lines); empty FC = clear.
    if (networkFeatures !== undefined) {
      if (networkFeatures?.features?.length) {
        if (!setSourceData(map, REE_SOURCE_NETWORK, networkFeatures)) {
          addRareEarthNetworkLines(map, networkFeatures)
        }
      } else if (map.getSource(REE_SOURCE_NETWORK) && networkFeatures) {
        setSourceData(map, REE_SOURCE_NETWORK, networkFeatures)
      }
    }
    if (water?.features?.length && !setSourceData(map, WATER_SOURCE, water)) {
      // Clicks are owned by the unified stacked handler — water skips its
      // own popup so overlapping water + claim clicks show tabs, not races.
      setupWaterLayers(map, water, { attachClickHandlers: false })
    }
    if (cultural?.features?.length) {
      // Cultural agents arrive late (sidebar fetch after first paint) — set
      // data in place when the source exists, otherwise create the clustered
      // agent layers (with their own popups) without touching claim layers.
      if (!updateCulturalData(map, cultural)) {
        setupCulturalLayers(map, cultural)
      }
    } else if (cultural && cultural.features?.length === 0 && map.getSource('ree-cultural')) {
      updateCulturalData(map, cultural)
    }
  }
  // Water needs ensuring on the bootstrap path too (the bootstrap above only
  // wires points/polys/protected/network). Setup fns no-op when their source
  // already exists.
  if (!map.getSource(REE_SOURCE_POINTS)) {
    if (water?.features?.length) setupWaterLayers(map, water, { attachClickHandlers: false })
  }
  if (cultural?.features?.length && !map.getSource('ree-cultural')) {
    setupCulturalLayers(map, cultural)
  }

  syncRareEarthLayerVisibility(map, visibility || {})
  return true
}

/** True when the core observatory claim layers exist on the map. */
export function hasObservatoryLayers(map: MapLibreMap): boolean {
  try {
    return Boolean(map.getSource(REE_SOURCE_POINTS))
  } catch { return false }
}

export function setupRareEarthLayers(
  map: MapLibreMap,
  options: RareEarthLayerOptions,
): CleanupFn {
  const { points, polys, protected: protectedAreas } = options
  const cleanups: Array<() => void> = []
  if (!points) return () => {}
  // NOTE: no `isStyleLoaded()` gate here on purpose — see the same note in
  // `setupCulturalLayers`. `isStyleLoaded()` is false whenever sources were
  // just mutated in the same tick, and this bootstrap also runs mid-`sync`
  // (late protected-area arrival) right after `setData` calls. Load-gating
  // with retry lives at the entry points (`useRareEarthController`
  // `setupLayers`, `syncObservatoryLayers`, style.load handlers).

  cleanupRareEarthLayers(map)

  map.addSource(REE_SOURCE_POINTS, {
    type: 'geojson',
    data: points,
    // Stable feature ids from the ANM processo property (stamped at
    // normalization time). Ids survive setData across filter changes, so
    // hover feature-state stays consistent instead of reshuffling.
    promoteId: 'processo',
    // Unclustered by design: every claim renders its own GPU circle marker.
    // (Clustering was removed — regional footprint is small enough that all
    // 284 claims + full-Brazil sets render at 60fps without it.)
    cluster: false,
  })

  addPointLayers(map, REE_SOURCE_POINTS)
  addClickHandlers(map, options, cleanups)

  if (polys) {
    map.addSource(REE_SOURCE_POLYS, { type: 'geojson', data: polys })
    addPolygonLayers(map)
    addPolygonHandlers(map, options, cleanups)
  }

  addRareEarthGeoBoundaries(map)
  addRareEarthConflictSites(map)
  addSiteHandlers(map, cleanups)
  addBrazilianCitiesLayer(map)

  if (options.networkFeatures) {
    addRareEarthNetworkLines(map, options.networkFeatures)
  }

  if (protectedAreas) {
    addProtectedAreasLayer(map, protectedAreas)
    addProtectedAreaHandlers(map, cleanups)
  }

  if (options.cultural?.features?.length) {
    const cleanupCultural = setupCulturalLayers(map, options.cultural)
    cleanups.push(cleanupCultural)
  }

  // One map-level click owns ALL popups: overlapping markers, boundaries,
  // protected areas, water and sites resolve to a tabbed popup instead of
  // only the topmost layer winning.
  addUnifiedObservatoryClick(map, options, cleanups)

  return () => {
    cleanups.forEach(fn => fn())
    cleanupRareEarthLayers(map)
  }
}

function addPolygonLayers(map: MapLibreMap) {
  // Claim boundaries must read at every zoom: small concessions are only a
  // few pixels wide, so the fill/outline carry real opacity (the old 0.1
  // fill + hairline outline rendered as "0 polygons" on dark basemaps).
  map.addLayer({
    id: 'ree-poly-fill', type: 'fill', source: REE_SOURCE_POLYS,
    paint: {
      'fill-color': POLY_COLOR_MATCH,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.32, 10, 0.28, 14, 0.22],
      'fill-antialias': true,
    },
  })
  map.addLayer({
    id: 'ree-poly-glow', type: 'line', source: REE_SOURCE_POLYS,
    paint: { 'line-color': POLY_COLOR_MATCH, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 4, 10, 7, 14, 11], 'line-opacity': 0.28, 'line-blur': 3 },
  })
  map.addLayer({
    id: 'ree-poly-line', type: 'line', source: REE_SOURCE_POLYS,
    paint: { 'line-color': POLY_COLOR_MATCH, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.2, 10, 2, 14, 3], 'line-opacity': 0.9 },
  })
  map.addLayer({
    id: 'ree-poly-label', type: 'symbol', source: REE_SOURCE_POLYS,
    layout: {
      'text-field': ['coalesce', ['get', 'nome'], ['get', 'NOME'], ['get', 'enterprise'], ''],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 0, 8, 8, 12, 11],
      'text-allow-overlap': false, 'text-ignore-placement': false, 'text-anchor': 'center',
    },
    paint: { 'text-color': '#ccc', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.5, 'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 0.8] },
  })
}

export function adaptPolygonProps(p: Record<string, unknown>): Record<string, unknown> {
  return {
    c: p.category, ds: p.ds ?? p.danger_score ?? 5,
    n: p.NOME || p.nome || p.enterprise || 'Polygon',
    s: p.SUBS || p.substances || '—', p: p.PROCESSO || p.processo || '—',
    f: p.FASE || p.fase || '—', u: p.UF || p.uf || '',
    a: p.AREA_HA ?? p.area_ha ?? 0, net: p.network_id || '',
    ev: p.ULT_EVENTO || '', ano: p.ANO ?? p.ano ?? 0,
    numero: p.NUMERO ?? p.numero ?? 0,
  }
}

export function addRareEarthGeoBoundaries(map: MapLibreMap) {
  if (map.getSource(REE_SOURCE_GEO)) return
  map.addSource(REE_SOURCE_GEO, { type: 'geojson', data: RARE_EARTH_GEO_BOUNDARIES })
  map.addLayer({
    id: 'ree-geo-fill', type: 'fill', source: REE_SOURCE_GEO,
    filter: ['==', ['get', 'type'], 'basin'],
    paint: { 'fill-color': '#3498db', 'fill-opacity': 0.05 },
  })
  map.addLayer({
    id: 'ree-geo-aquifer', type: 'fill', source: REE_SOURCE_GEO,
    filter: ['==', ['get', 'type'], 'aquifer'],
    paint: { 'fill-color': '#9b59b6', 'fill-opacity': 0.07 },
  })
  map.addLayer({
    id: 'ree-geo-conflict', type: 'fill', source: REE_SOURCE_GEO,
    filter: ['in', ['get', 'type'], ['literal', ['conflict', 'nuclear', 'nuclear_buffer']]],
    paint: {
      'fill-color': ['match', ['get', 'type'], 'nuclear_buffer', '#f87171', '#e74c3c'],
      'fill-opacity': ['match', ['get', 'type'], 'nuclear_buffer', 0.06, 0.08],
    },
  })
  map.addLayer({
    id: 'ree-geo-line', type: 'line', source: REE_SOURCE_GEO,
    paint: {
      'line-color': ['match', ['get', 'type'], 'basin', '#3b82f6', 'aquifer', '#a855f7', 'conflict', '#ef4444', 'nuclear', '#dc2626', 'nuclear_buffer', '#f87171', '#3b82f6'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 10, 1.2, 14, 2],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 14, 0.5],
      'line-dasharray': ['match', ['get', 'type'], 'conflict', ['literal', [2, 2]], 'nuclear', ['literal', [1, 1]], 'nuclear_buffer', ['literal', [5, 3]], ['literal', [3, 2]]],
    },
  })
  map.addLayer({
    id: 'ree-geo-label', type: 'symbol', source: REE_SOURCE_GEO,
    layout: {
      'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 8, 12, 10],
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': ['match', ['get', 'type'], 'basin', '#3b82f6', 'aquifer', '#a855f7', 'conflict', '#ef4444', 'nuclear', '#dc2626', 'nuclear_buffer', '#f87171', '#3b82f6'],
      'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.5,
    },
  })
}

export function addRareEarthConflictSites(map: MapLibreMap) {
  if (map.getSource(REE_SOURCE_SITES)) return
  map.addSource(REE_SOURCE_SITES, { type: 'geojson', data: RARE_EARTH_CONFLICT_SITES })
  map.addLayer({
    id: 'ree-site-glow', type: 'circle', source: REE_SOURCE_SITES,
    paint: { 'circle-color': '#ef4444', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 14, 14, 18], 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.15, 14, 0.25], 'circle-blur': 0.9 },
  })
  map.addLayer({
    id: 'ree-site-label', type: 'symbol', source: REE_SOURCE_SITES,
    layout: {
      'text-field': ['format', ['get', 'name'], { 'font-scale': 1.1 }, ' ', ['get', 'tag'], { 'font-scale': 0.75 }],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 8, 10, 12, 12],
      'text-allow-overlap': false, 'text-ignore-placement': false,
      'text-anchor': 'bottom', 'text-offset': [0, 2],
    },
    paint: { 'text-color': '#c0392b', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 2, 'text-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 0.9] },
  })
}

export function addRareEarthNetworkLines(map: MapLibreMap, networkFeatures: GeoJSON.FeatureCollection) {
  if (!networkFeatures?.features?.length || map.getSource(REE_SOURCE_NETWORK)) return
  map.addSource(REE_SOURCE_NETWORK, { type: 'geojson', data: networkFeatures })
  map.addLayer({
    id: 'ree-network-lines', type: 'line', source: REE_SOURCE_NETWORK,
    paint: {
      'line-color': ['coalesce', ['get', 'color'], '#5dade2'],
      'line-width': ['case', ['==', ['get', 'connectionType'], 'corporate'], ['coalesce', ['get', 'lineWidth'], 1.5], ['==', ['get', 'connectionType'], 'enterprise_to_claim'], 0.6, 0.5],
      'line-opacity': ['case', ['==', ['get', 'connectionType'], 'corporate'], ['coalesce', ['get', 'lineOpacity'], 0.6], ['==', ['get', 'connectionType'], 'enterprise_to_claim'], 0.25, 0.4],
      'line-dasharray': ['case',
        ['==', ['get', 'corporateType'], 'subsidiary'], ['literal', []],
        ['==', ['get', 'corporateType'], 'shareholding'], ['literal', [6, 3]],
        ['==', ['get', 'corporateType'], 'joint_venture'], ['literal', [4, 4]],
        ['==', ['get', 'corporateType'], 'board_overlap'], ['literal', [2, 4]],
        ['==', ['get', 'corporateType'], 'partnership'], ['literal', [8, 4]],
        ['==', ['get', 'connectionType'], 'enterprise_to_claim'], ['literal', [1, 3]],
        ['literal', [2, 2]]],
    },
  })
  map.on('mouseenter', 'ree-network-lines', () => { map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', 'ree-network-lines', () => { map.getCanvas().style.cursor = '' })
}

export function addBrazilianCitiesLayer(map: MapLibreMap) {
  if (map.getSource(REE_SOURCE_CITIES)) return
  const cityData = citiesToGeoJSON()
  map.addSource(REE_SOURCE_CITIES, { type: 'geojson', data: cityData })
  map.addLayer({
    id: 'ree-cities-label', type: 'symbol', source: REE_SOURCE_CITIES,
    layout: {
      'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 4, 0, 7, 8, 10, 11, 14, 13],
      'text-allow-overlap': false, 'text-ignore-placement': false,
      'text-anchor': 'bottom', 'text-offset': [0, 1.5],
    },
    paint: { 'text-color': '#e8e8e8', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 2, 'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 7, 0.7, 10, 0.9] },
  })
}

export function addProtectedAreasLayer(map: MapLibreMap, protectedAreas: GeoJSON.FeatureCollection) {
  if (!protectedAreas?.features?.length || map.getSource(REE_SOURCE_PROTECTED)) return
  map.addSource(REE_SOURCE_PROTECTED, { type: 'geojson', data: protectedAreas })

  map.addLayer({
    id: 'ree-protected-ti-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'ti'],
    paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.15 },
  })
  map.addLayer({
    id: 'ree-protected-ti-line', type: 'line', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'ti'],
    paint: { 'line-color': '#dc2626', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 10, 2, 14, 3], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 14, 0.8], 'line-dasharray': [4, 3] },
  })
  map.addLayer({
    id: 'ree-protected-ti-label', type: 'symbol', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'ti'],
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 9, 10, 11], 'text-allow-overlap': false },
    paint: { 'text-color': '#dc2626', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
  })

  map.addLayer({
    id: 'ree-protected-quilombo-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'quilombo'],
    paint: { 'fill-color': '#d97706', 'fill-opacity': 0.12 },
  })
  map.addLayer({
    id: 'ree-protected-quilombo-line', type: 'line', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'quilombo'],
    paint: { 'line-color': '#d97706', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 10, 2, 14, 3], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 14, 0.8], 'line-dasharray': [3, 3] },
  })
  map.addLayer({
    id: 'ree-protected-quilombo-label', type: 'symbol', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'quilombo'],
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 9, 10, 11], 'text-allow-overlap': false },
    paint: { 'text-color': '#d97706', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
  })

  // Conservation units (APAs, RESEX, parks…) — green. `kind` is canonicalized
  // to 'uc' at load (see useRareEarthData), so one filter covers every UC.
  map.addLayer({
    id: 'ree-protected-uc-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'uc'],
    paint: { 'fill-color': '#27ae60', 'fill-opacity': 0.12 },
  })
  map.addLayer({
    id: 'ree-protected-uc-line', type: 'line', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'uc'],
    paint: { 'line-color': '#27ae60', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 10, 2, 14, 3], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 14, 0.8] },
  })
  map.addLayer({
    id: 'ree-protected-uc-label', type: 'symbol', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'uc'],
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 9, 10, 11], 'text-allow-overlap': false },
    paint: { 'text-color': '#27ae60', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
  })

  // Zonas de amortecimento — teal dashed halo (canonical kind 'buffer').
  map.addLayer({
    id: 'ree-protected-buffer-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'buffer'],
    paint: { 'fill-color': '#2dd4bf', 'fill-opacity': 0.06 },
  })
  map.addLayer({
    id: 'ree-protected-buffer-line', type: 'line', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'buffer'],
    paint: { 'line-color': '#2dd4bf', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 1.5, 14, 2.5], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 14, 0.8], 'line-dasharray': [5, 3] },
  })
  map.addLayer({
    id: 'ree-protected-buffer-label', type: 'symbol', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'buffer'],
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 9, 10, 11], 'text-allow-overlap': false },
    paint: { 'text-color': '#2dd4bf', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
  })

  // Territory-overlap halo. Reads the precomputed numeric `overlaps_count`
  // scalar — MapLibre expressions cannot evaluate object values, so the raw
  // `ov` overlap array is never embedded in layer properties (the old
  // `['length', ['get', 'ov']]` branch errored and blanked this layer).
  map.addLayer({
    id: 'ree-overlap-glow', type: 'circle', source: REE_SOURCE_POINTS,
    filter: ['all', ['!has', 'point_count'], ['>', 'overlaps_count', 0]] as unknown as maplibregl.FilterSpecification,
    paint: { 'circle-color': '#f59e0b', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 14, 14, 18], 'circle-opacity': 0.25, 'circle-blur': 0.9, 'circle-stroke-color': '#f59e0b', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 14, 2], 'circle-stroke-opacity': 0.5 },
  })
}

const polyHandlerMap = new WeakMap<MapLibreMap, boolean>()

export function addPolygonLayersToMap(
  map: MapLibreMap,
  polys: GeoJSON.FeatureCollection,
  _popup?: RareEarthLayerOptions['popup'],
): (() => void) | null {
  if (!polys?.features?.length) return null
  if (map.getSource(REE_SOURCE_POLYS)) return null

  map.addSource(REE_SOURCE_POLYS, { type: 'geojson', data: polys })
  addPolygonLayers(map)
  // No per-layer click: the unified map click (added at bootstrap) queries
  // ree-poly-fill alongside points/protected/water and opens tabbed popups.
  polyHandlerMap.set(map, true)

  return () => {
    polyHandlerMap.delete(map)
    safeRemoveLayer(map, 'ree-poly-fill')
    safeRemoveLayer(map, 'ree-poly-glow')
    safeRemoveLayer(map, 'ree-poly-line')
    safeRemoveLayer(map, 'ree-poly-label')
    safeRemoveSource(map, REE_SOURCE_POLYS)
  }
}

export function syncRareEarthLayerVisibility(map: MapLibreMap, vis: Record<string, boolean>) {
  if (!map || !map.isStyleLoaded()) return

  const setVis = (id: string, show: boolean) => {
    try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none') } catch { /* */ }
  }

  const showPoints = vis['points'] !== false
  ;['ree-point-glow', 'ree-point-circle', 'ree-point-hover'].forEach(id => setVis(id, showPoints))

  setVis('ree-overlap-glow', vis['overlaps'] !== false)

  setVis('ree-foreign-glow', vis['foreign'] !== false)

  setVis('ree-heat-layer', vis['heatmap'] !== false)

  const showPolys = vis['polygons'] !== false
  ;['ree-poly-fill', 'ree-poly-glow', 'ree-poly-line', 'ree-poly-label'].forEach(id => setVis(id, showPolys))

  const showWater = vis['water'] !== false
  ;['ree-geo-fill', 'ree-geo-aquifer', 'ree-geo-conflict', 'ree-geo-line', 'ree-geo-label'].forEach(id => setVis(id, showWater))
  ;['ree-water-poly-fill', 'ree-water-poly-line', 'ree-water-poly-label', 'ree-water-river-line', 'ree-water-river-label'].forEach(id => setVis(id, showWater))

  const showSites = vis['sites'] !== false
  ;['ree-site-glow', 'ree-site-label'].forEach(id => setVis(id, showSites))

  setVis('ree-network-lines', vis['network'] !== false)

  ;['ree-protected-ti-fill', 'ree-protected-ti-line', 'ree-protected-ti-label'].forEach(id => setVis(id, vis['protected_ti'] !== false))
  ;['ree-protected-quilombo-fill', 'ree-protected-quilombo-line', 'ree-protected-quilombo-label'].forEach(id => setVis(id, vis['protected_quilombo'] !== false))
  ;['ree-protected-uc-fill', 'ree-protected-uc-line', 'ree-protected-uc-label'].forEach(id => setVis(id, vis['protected_uc'] !== false))
  ;['ree-protected-buffer-fill', 'ree-protected-buffer-line', 'ree-protected-buffer-label'].forEach(id => setVis(id, vis['protected_buffer'] !== false))

  setVis('ree-cities-label', vis['cities'] !== false)

  // Cultural agents overlay — visible by default, toggle via `cultural` key.
  setCulturalLayersVisibility(map, vis['cultural'] !== false)

}

export function buildNetworkLinesFromClaims(points: GeoJSON.FeatureCollection, maxPerGroup = 200): GeoJSON.FeatureCollection {
  const byNet: Record<string, { lng: number; lat: number; name: string }[]> = {}
  for (const f of points.features) {
    const props: Record<string, unknown> = (f.properties || {}) as Record<string, unknown>
    const net = props.net || props.network_id
    if (!net) continue
    const netKey = String(net)
    if (!byNet[netKey]) byNet[netKey] = []
    if (byNet[netKey].length >= maxPerGroup) continue
    const coords = (f.geometry as GeoJSON.Point)?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) continue
    byNet[netKey].push({ lng: coords[0] as number, lat: coords[1] as number, name: String(props.n || props.nome || '') })
  }
  const features: GeoJSON.Feature[] = []
  for (const [netId, nodes] of Object.entries(byNet)) {
    if (nodes.length < 2) continue
    const hub = nodes[0]
    for (let i = 1; i < nodes.length; i++) {
      features.push({
        type: 'Feature',
        properties: { network_id: netId, from: hub.name, to: nodes[i].name },
        geometry: { type: 'LineString', coordinates: [[hub.lng, hub.lat], [nodes[i].lng, nodes[i].lat]] },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}
