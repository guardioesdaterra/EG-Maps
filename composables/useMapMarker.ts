/**
 * Unified marker system — single source of truth for all map datasets.
 *
 * • GPU-accelerated vector rendering via MapLibre GeoJSON source/layers
 * • Dark-circle + colored-border + glow aesthetic (matches old DOM markers)
 * • Automatic repositioning on pan/zoom — no manual moveend rebuilds
 * • Replaces: useMapMarkers.ts, useGeoJSONMarkers.ts, useMapCluster.ts,
 *             useMapMarkerOrchestrator.ts
 */

import type { Map as MapLibreMap, GeoJSONSource, ExpressionSpecification, FilterSpecification, MapLayerMouseEvent, MapLayerEventType } from 'maplibre-gl'
import { GROUP_COLORS, isValidCoordinate } from '@/lib/map-utils'
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import { formatCompact } from '@/lib/utils'
import { findSpeciesAtCoord as _findSpeciesAtCoord } from '@/lib/species-utils'
import type { ProjectData } from '@/lib/types'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import type { Species } from '@/lib/map-utils'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'

/* ══════════════════════════════════════════════════════════════════════════
   🏠 TYPES — the front door
   ══════════════════════════════════════════════════════════════════════════ */

export type MarkerDataset = 'project-grants' | 'endangered-species' | 'active-crews' | 'vulcan-observatory'

export interface MarkerCallbacks {
  openProjectOverlay:    (p: ProjectData) => void
  openSpeciesOverlay:    (s: Species | SpeciesIndexItem) => void
  openCrewOverlay:       (c: CrewRegionData | CrewLocation) => void
  openCrewLocationOverlay?: (c: CrewLocation) => void
  openRareEarthOverlay?:    (f: GeoJSON.Feature) => void
  openProjectPreview?:   (p: ProjectData) => void
  openSpeciesPreview?:   (s: Species | SpeciesIndexItem) => void
  openCrewPreview?:      (c: CrewRegionData | CrewLocation) => void
}

export interface RebuildArgs {
  dataset:              string
  projects:             ProjectData[]
  speciesIndex:         SpeciesIndexItem[]
  species:              Species[]
  crews:                CrewRegionData[]
  crewLocations:        CrewLocation[]
  selectedSpeciesGroups: string[]
  rareEarthFeatures?:   GeoJSON.Feature[]
}

/* ══════════════════════════════════════════════════════════════════════════
   🏠 CONSTANTS — the foundation stones
   ══════════════════════════════════════════════════════════════════════════ */

const SOURCE = 'markers'

/** All layer suffixes in render order: cluster glow → cluster → cluster count
 *  → point glow → point → point label */
const LAYER_SUFFIXES = ['_cg', '_c', '_cn', '_pg', '_p', '_pl'] as const

const SPECIES_COORD_TOLERANCE = 0.5

/* ══════════════════════════════════════════════════════════════════════════
   🏠 COMPOSABLE — the hive mind
   ══════════════════════════════════════════════════════════════════════════ */

export function useMapMarker(callbacks: MarkerCallbacks) {

  /* ── state ──────────────────────────────────────────────────────────── */

  let map: MapLibreMap | null = null
  let currentDataset: MarkerDataset | null = null
  let speciesIndexCache: SpeciesIndexItem[] | null = null
  const handlers: Array<{ id: string; evt: keyof MapLayerEventType; fn: (e: MapLayerMouseEvent) => void }> = []

  /* ── 🏠 cell 1 · init / cleanup ────────────────────────────────────── */

  function init(m: MapLibreMap) { map = m }

  function cleanup() {
    detach()
    if (map) { removeSource(SOURCE) }
    currentDataset = null
    speciesIndexCache = null
    map = null
  }

  /* ── 🏠 cell 2 · rebuild / update ──────────────────────────────────── */

  function rebuild(a: RebuildArgs) {
    const m = map
    if (!m || !m.isStyleLoaded()) return

    const ds = a.dataset as MarkerDataset

    if (currentDataset && currentDataset !== ds) {
      removeSource(SOURCE)
      currentDataset = null
    }

    const geojson = toGeoJSON(ds, a)
    if (!geojson.features.length) return

    if (currentDataset === ds && m.getSource(SOURCE)) {
      updateData(SOURCE, geojson)
      return
    }

    detach()
    addSource(SOURCE, geojson, ds)
    addLayers(SOURCE, ds)
    setupEvents(SOURCE, ds, a)
    currentDataset = ds
  }

  function update(a: RebuildArgs) {
    const m = map
    if (!m || currentDataset !== a.dataset || !m.getSource(SOURCE)) {
      rebuild(a)
      return
    }
    updateData(SOURCE, toGeoJSON(a.dataset as MarkerDataset, a))
  }

  /* ── 🏠 cell 3 · source CRUD ───────────────────────────────────────── */

  function addSource(id: string, data: GeoJSON.FeatureCollection, ds: MarkerDataset) {
    if (!map) return
    removeSource(id)
    const useClustering = ds !== 'active-crews'
    map.addSource(id, {
      type: 'geojson',
      data,
      cluster: useClustering,
      clusterRadius: useClustering ? 50 : undefined,
      clusterMaxZoom: useClustering ? 16 : undefined,
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

  /* ── 🏠 cell 4 · cluster layers (glow + ring + count) ─────────────── */

  function addClusterLayers(id: string, cc: string[]) {
    if (!map) return
    map.addLayer({ id: `${id}_cg`, type: 'circle', source: id, filter: ['has', 'point_count'], paint: {
      'circle-color': stepExpr(cc), 'circle-radius': radExpr(1.2), 'circle-blur': 0.9, 'circle-opacity': 0.25 } })
    map.addLayer({ id: `${id}_c`, type: 'circle', source: id, filter: ['has', 'point_count'], paint: {
      'circle-color': 'rgba(0,0,0,0.82)', 'circle-radius': radExpr(0.8),
      'circle-stroke-color': stepExpr(cc), 'circle-stroke-width': 2, 'circle-opacity': 0.92 } })
    map.addLayer({ id: `${id}_cn`, type: 'symbol', source: id, filter: ['has', 'point_count'], layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Arial Unicode MS Bold', 'DejaVu Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 9, 14, 11],
      'text-allow-overlap': true, 'text-ignore-placement': true }, paint: {
      'text-color': '#fff', 'text-halo-color': 'rgba(0,0,0,0.35)', 'text-halo-width': 1.5 } })
  }

  /* ── 🏠 cell 5 · point layers (glow + ring + label) ────────────────── */

  function addPointLayers(id: string, filter?: FilterSpecification) {
    if (!map) return
    const opts = filter ? { filter } : {}

    map.addLayer({ id: `${id}_pg`, type: 'circle', source: id, ...opts, paint: {
      'circle-color': ['get', 'color'], 'circle-radius': ['*', ['coalesce', ['get', 'size'], 7], 1.4],
      'circle-blur': 0.8, 'circle-opacity': 0.25 } })
    map.addLayer({ id: `${id}_p`, type: 'circle', source: id, ...opts, paint: {
      'circle-color': 'rgba(0,0,0,0.82)', 'circle-radius': ['coalesce', ['get', 'size'], 7],
      'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-opacity': 0.95 } })
    map.addLayer({ id: `${id}_pl`, type: 'symbol', source: id, ...opts, layout: {
      'text-field': ['coalesce', ['get', 'label'], ''],
      'text-font': ['Arial Unicode MS Bold', 'DejaVu Sans Bold'],
      'text-size': 8, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: {
      'text-color': '#fff', 'text-halo-color': 'rgba(0,0,0,0.5)', 'text-halo-width': 1 } })
  }

  /* ── 🏠 cell 5b · layer orchestrator ───────────────────────────────── */

  function addLayers(id: string, ds: MarkerDataset) {
    if (!map) return
    const useClustering = ds !== 'active-crews'
    if (useClustering) addClusterLayers(id, clusterPalette(ds))
    const pointFilter = useClustering ? ['!', ['has', 'point_count']] as FilterSpecification : undefined
    addPointLayers(id, pointFilter)
  }

  /* ── 🏠 cell 6 · event wiring ──────────────────────────────────────── */

  function setupEvents(id: string, ds: MarkerDataset, a: RebuildArgs) {
    if (!map) return
    detach()
    const pL = `${id}_p`
    const cL = `${id}_c`

    const onPoint = (e: MapLayerMouseEvent) => {
      if (!e.features?.[0]) return
      const f = e.features[0]
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      dispatchPoint(ds, f, coords, a)
    }

    const onCluster = async (e: MapLayerMouseEvent) => {
      if (!map || !e.features?.[0]) return
      const f = e.features[0]
      const cid = f.properties?.cluster_id as number
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      if (cid == null) return
      const src = map.getSource(id) as GeoJSONSource | undefined
      if (src && typeof src.getClusterExpansionZoom === 'function') {
        const z = await src.getClusterExpansionZoom(cid)
        map.flyTo({ center: coords, zoom: Math.min(Math.max(z, map.getZoom() + 1), map.getMaxZoom()), duration: 600, essential: true })
      }
    }

    const ptr  = () => { if (map) map.getCanvas().style.cursor = 'pointer' }
    const nop  = () => { if (map) map.getCanvas().style.cursor = '' }

    const reg = (lid: string, evt: keyof MapLayerEventType, fn: (e: MapLayerMouseEvent) => void) => {
      map!.on(evt, lid, fn as (ev: MapLayerEventType[typeof evt] & object) => void); handlers.push({ id: lid, evt, fn })
    }
    reg(pL, 'click', onPoint)
    if (ds !== 'active-crews') {
      reg(cL, 'click', onCluster)
      reg(cL, 'mouseenter', ptr)
      reg(cL, 'mouseleave', nop)
    }
    reg(pL, 'mouseenter', ptr)
    reg(pL, 'mouseleave', nop)
  }

  function detach() {
    if (!map) return
    for (const { id, evt, fn } of handlers) map.off(evt, id, fn as (ev: MapLayerEventType[typeof evt] & object) => void)
    handlers.length = 0
  }

  /* ── 🏠 cell 7 · click dispatch ────────────────────────────────────── */

  function dispatchPoint(ds: MarkerDataset, f: GeoJSON.Feature, coords: [number, number], a: RebuildArgs) {
    const p = f.properties ?? {}
    switch (ds) {
      case 'project-grants':   return dispatchProject(p, a)
      case 'endangered-species': return dispatchSpecies(p, coords, a)
      case 'active-crews':     return dispatchCrew(p, coords)
      case 'vulcan-observatory': return dispatchRareEarth(p, coords)
    }
  }

  function dispatchProject(p: Record<string, unknown>, a: RebuildArgs) {
    const proj = a.projects.find(pr => pr.project_title === p.id)
    if (!proj) return
    if (callbacks.openProjectPreview) callbacks.openProjectPreview(proj)
    else callbacks.openProjectOverlay(proj)
  }

  function dispatchSpecies(p: Record<string, unknown>, coords: [number, number], a: RebuildArgs) {
    const idx = resolveSpeciesIndex(a)
    const [, lat] = coords
    const matches = _findSpeciesAtCoord(lat, coords[0], idx, SPECIES_COORD_TOLERANCE)
    if (matches.length > 1) { callbacks.openSpeciesOverlay(matches[0]); return }
    const item = idx.find(s => s.id === p.id)
    if (!item) return
    if (callbacks.openSpeciesPreview) callbacks.openSpeciesPreview(item)
    else callbacks.openSpeciesOverlay(item)
  }

  function dispatchCrew(p: Record<string, unknown>, coords: [number, number]) {
    const t = p._type
    if (t === 'crewLocation') return dispatchCrewLocation(p, coords)
    if (t === 'crewBubble') return dispatchCrewBubble(p)
    return dispatchCrewRegion(p, coords)
  }

  function dispatchCrewLocation(p: Record<string, unknown>, coords: [number, number]) {
    const loc: CrewLocation = {
      name: p.name as string, country: p.country as string, city: p.city as string,
      state: p.state as string, region: p.region as string,
      status: (p.status as 'active' | 'inactive') ?? 'active',
      lat: coords[1], lng: coords[0],
    }
    if (callbacks.openCrewLocationOverlay) callbacks.openCrewLocationOverlay(loc)
    else callbacks.openCrewOverlay(loc)
  }

  function dispatchCrewBubble(p: Record<string, unknown>) {
    const locations = (p.locations as Array<{ name: string; country: string; city: string; state: string; region: string; status: 'active' | 'inactive'; lat: number; lng: number }>) ?? []
    if (locations.length === 0) return
    const loc: CrewLocation = { ...locations[0] }
    if (callbacks.openCrewLocationOverlay) callbacks.openCrewLocationOverlay(loc)
    else callbacks.openCrewOverlay(loc)
  }

  function dispatchCrewRegion(p: Record<string, unknown>, coords: [number, number]) {
    const crew: CrewRegionData = {
      id: p.id as string, region: p.region as string,
      latitude: coords[1], longitude: coords[0],
      activeCrews: p.activeCrews as number, inactiveCrews: p.inactiveCrews as number,
      totalMembers: p.totalMembers as number, countries: p.countries as number,
      history: p.history as CrewRegionData['history'],
    }
    if (callbacks.openCrewPreview) callbacks.openCrewPreview(crew)
    else callbacks.openCrewOverlay(crew)
  }

  function dispatchRareEarth(p: Record<string, unknown>, coords: [number, number]) {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: p as Record<string, unknown>,
    }
    callbacks.openRareEarthOverlay?.(feature)
  }

  /* ── 🏠 cell 8 · species index resolution ──────────────────────────── */

  function resolveSpeciesIndex(a: RebuildArgs): SpeciesIndexItem[] {
    if (speciesIndexCache) return speciesIndexCache
    speciesIndexCache = buildSpeciesIndex(a.speciesIndex, a.species)
    return speciesIndexCache
  }

  /* ── public API ─────────────────────────────────────────────────────── */

  return { init, rebuild, update, cleanup }
}

/* ══════════════════════════════════════════════════════════════════════════
   🏠 DATA CONVERTERS — the honeycomb cells
   ══════════════════════════════════════════════════════════════════════════ */

function toGeoJSON(ds: MarkerDataset, a: RebuildArgs): GeoJSON.FeatureCollection {
  switch (ds) {
    case 'project-grants':     return toProjectGeoJSON(a.projects)
    case 'endangered-species': return toSpeciesGeoJSON(a.speciesIndex, a.species, a.selectedSpeciesGroups)
    case 'active-crews':       return toCrewGeoJSON(a.crews, a.crewLocations)
    case 'vulcan-observatory': return toRareEarthGeoJSON(a.rareEarthFeatures ?? [])
  }
}

/* ── 🏠 cell A · project grants ────────────────────────────────────── */

function toProjectGeoJSON(projects: ProjectData[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: projects
      .filter(p => isValidCoordinate(p.latitude, p.longitude))
      .map(p => {
        const total = p.direct_beneficiaries + p.indirect_beneficiaries
        const f = Math.min(Math.max(total / 10000, 0.5), 5)
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
          properties: {
            id: p.project_title,
            color: getProjectColorByBeneficiaries(p.direct_beneficiaries, p.indirect_beneficiaries),
            size: 5 + f * 3,
            label: formatCompact(total),
            ...p as unknown as Record<string, unknown>,
          },
        }
      }),
  }
}

/* ── 🏠 cell B · endangered species ────────────────────────────────── */

function toSpeciesGeoJSON(
  index: SpeciesIndexItem[],
  raw: Species[],
  groups: string[],
): GeoJSON.FeatureCollection {
  const idx = filterByGroups(buildSpeciesIndex(index, raw), groups)

  return {
    type: 'FeatureCollection',
    features: idx
      .filter(s => isValidCoordinate(s.lat, s.lng))
      .map(s => {
        const cat = (s.category ?? '').toUpperCase()
        const cf = cat === 'CR' ? 5 : cat === 'EN' ? 3.5 : cat === 'VU' ? 2 : 1
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: {
            id: s.id,
            color: GROUP_COLORS[s.taxonomicGroup ?? ''] ?? '#B64032',
            size: 5 + cf * 2,
            label: '1',
            ...s as unknown as Record<string, unknown>,
          },
        }
      }),
  }
}

/* ── 🏠 cell C · active crews ──────────────────────────────────────── */

function toCrewGeoJSON(regions: CrewRegionData[], locations: CrewLocation[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      ...buildCrewRegionMarkers(regions),
      ...buildCrewBubbles(locations),
    ],
  }
}

function buildCrewRegionMarkers(regions: CrewRegionData[]): GeoJSON.Feature[] {
  const feats: GeoJSON.Feature[] = []
  for (const r of regions) {
    if (r.activeCrews === 0 && r.inactiveCrews === 0) continue
    if (!isValidCoordinate(r.latitude, r.longitude)) continue
    const mf = Math.min(Math.max(r.totalMembers / 200, 0.5), 5)
    feats.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
      properties: {
        id: r.id, _type: 'crewRegion',
        color: r.activeCrews > 20 ? '#22c55e' : r.activeCrews > 5 ? '#3b82f6' : '#a855f7',
        size: 5 + mf * 3, label: String(r.activeCrews),
        region: r.region, activeCrews: r.activeCrews, inactiveCrews: r.inactiveCrews,
        totalMembers: r.totalMembers, countries: r.countries, history: r.history,
      },
    })
  }
  return feats
}

function buildCrewBubbles(locations: CrewLocation[]): GeoJSON.Feature[] {
  const validLocs = locations.filter(l => isValidCoordinate(l.lat, l.lng))
  if (validLocs.length === 0) return []

  const BUBBLE_COUNT = 5
  const sorted = [...validLocs].sort((a, b) => a.lng - b.lng)
  const chunkSize = Math.ceil(sorted.length / BUBBLE_COUNT)
  const feats: GeoJSON.Feature[] = []

  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const chunk = sorted.slice(i * chunkSize, (i + 1) * chunkSize)
    if (chunk.length === 0) continue

    const avgLng = chunk.reduce((sum, l) => sum + l.lng, 0) / chunk.length
    const avgLat = chunk.reduce((sum, l) => sum + l.lat, 0) / chunk.length
    const activeCount = chunk.filter(l => l.status === 'active').length
    const inactiveCount = chunk.filter(l => l.status === 'inactive').length

    feats.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [avgLng, avgLat] },
      properties: {
        id: `crew-bubble-${i}`, _type: 'crewBubble',
        color: activeCount > inactiveCount ? '#22c55e' : '#f59e0b',
        size: 5 + Math.min(chunk.length / 10, 5),
        label: String(chunk.length),
        locationCount: chunk.length,
        activeCount,
        inactiveCount,
        locations: chunk.map(l => ({
          name: l.name, country: l.country, city: l.city,
          state: l.state, region: l.region, status: l.status,
          lat: l.lat, lng: l.lng,
        })),
      },
    })
  }
  return feats
}

/* ── 🏠 cell D · vulcan observatory ────────────────────────────────── */

function toRareEarthGeoJSON(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map(f => {
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
    }),
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   🏠 STYLE HELPERS — the decorative trim
   ══════════════════════════════════════════════════════════════════════════ */

function clusterPalette(ds: MarkerDataset): string[] {
  switch (ds) {
    case 'project-grants':    return ['#06b6d4', '#22c55e', '#eab308', '#ef4444']
    case 'endangered-species': return ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    case 'active-crews':      return ['#22c55e', '#3b82f6', '#a855f7', '#ec4899']
    case 'vulcan-observatory': return ['#22c55e', '#f59e0b', '#ef4444', '#dc2626']
  }
}

function stepExpr(c: string[]): ExpressionSpecification {
  return ['step', ['get', 'point_count'], c[0], 10, c[1], 50, c[2], 100, c[3]] as unknown as ExpressionSpecification
}

function radExpr(s: number): ExpressionSpecification {
  return ['*', ['interpolate', ['linear'], ['get', 'point_count'], 0, 12, 10, 16, 50, 20, 100, 26], s] as unknown as ExpressionSpecification
}

/* ══════════════════════════════════════════════════════════════════════════
   🏠 SHARED UTILITIES — the common room
   ══════════════════════════════════════════════════════════════════════════ */

function buildSpeciesIndex(
  index: SpeciesIndexItem[],
  raw: Species[],
): SpeciesIndexItem[] {
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
