/**
 * High-performance marker rendering using MapLibre's native GeoJSON clustering.
 *
 * This approach uses GPU-accelerated vector rendering instead of DOM-based markers,
 * which can handle 10,000+ points smoothly compared to the 100-200 limit of DOM markers.
 */

import type { Map as MapLibreMap, GeoJSONSource, MapLayerEventType } from 'maplibre-gl'
import { GROUP_COLORS } from '@/lib/map-utils'
import { getProjectColorByBeneficiaries } from '@/lib/colors'

export interface SpeciesIndexItem {
  id: string
  commonName: string
  scientificName: string
  taxonomicGroup: string
  category: string
  lat: number
  lng: number
  imageUrl: string | null
  // description/endangerment/threatTypes are NOT in the index — loaded on-demand from full dataset
}

const GROUP_COLORS_HEX: Record<string, string> = GROUP_COLORS

// WeakMap-based cache so entries are GC'd when the source array is dropped
const speciesGeoCache = new WeakMap<SpeciesIndexItem[], GeoJSON.FeatureCollection>()
const projectsGeoCache = new WeakMap<object[], GeoJSON.FeatureCollection>()

// Lightweight index for markers - only 3.2MB vs 35MB full data
export function speciesIndexToGeoJSON(species: SpeciesIndexItem[]): GeoJSON.FeatureCollection {

  const cached = speciesGeoCache.get(species)
  if (cached) return cached

  const result: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: species
      .filter(s => s.lat != null && s.lng != null && isFinite(s.lat) && isFinite(s.lng))
      .map(s => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [s.lng, s.lat]
        },
        properties: {
          id: s.id,
          commonName: s.commonName,
          scientificName: s.scientificName,
          taxonomicGroup: s.taxonomicGroup,
          category: s.category,
          color: GROUP_COLORS_HEX[s.taxonomicGroup] ?? '#B64032',
          hasImage: !!s.imageUrl,
          threatCount: ((s as unknown as Record<string, unknown>).threatTypes as string[] | undefined)?.length ?? 0,
        }
      }))
  }

  speciesGeoCache.set(species, result)
  return result
}

// Convert project data to GeoJSON FeatureCollection
export function projectsToGeoJSON(projects: { latitude: number; longitude: number; project_title: string; country_province: string; direct_beneficiaries: number; indirect_beneficiaries: number }[]): GeoJSON.FeatureCollection {
  const cached = projectsGeoCache.get(projects)
  if (cached) return cached

  const result: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: projects
      .filter(p => p.latitude != null && p.longitude != null && isFinite(p.latitude) && isFinite(p.longitude))
      .map(p => {
        const total = p.direct_beneficiaries + p.indirect_beneficiaries
        const color = getProjectColorByBeneficiaries(p.direct_beneficiaries, p.indirect_beneficiaries)
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude, p.latitude]
          },
          properties: {
            id: p.project_title,
            title: p.project_title,
            location: p.country_province,
            directBeneficiaries: p.direct_beneficiaries,
            indirectBeneficiaries: p.indirect_beneficiaries,
            totalBeneficiaries: total,
            color,
          }
        }
      })
  }

  projectsGeoCache.set(projects, result)
  return result
}

// Clear caches when data changes
export function clearGeoJSONCache() {
  // WeakMap clears automatically when keys are GC'd
}

export function useGeoJSONMarkers() {
  let map: MapLibreMap | null = null
  let currentSourceId: string | null = null

  // Track installed event handlers so they can be removed on re-setup/cleanup
  type MapEventHandler = (_e: maplibregl.MapLayerMouseEvent | maplibregl.MapLayerTouchEvent) => void | Promise<void>
  type InstalledHandler = {
    id: string
    evt: keyof MapLayerEventType
    handler: MapEventHandler
  }
  const installedHandlers: InstalledHandler[] = []

  function init(mapInstance: MapLibreMap) {
    map = mapInstance
  }

  function addGeoJSONSource(sourceId: string, data: GeoJSON.FeatureCollection, clustering: boolean = true) {
    if (!map) return
    if (!map.isStyleLoaded()) return

    if (currentSourceId && currentSourceId !== sourceId) {
      removeLayersAndSource()
    }

    if (map.getSource(sourceId)) {
      for (const id of [`${sourceId}-clusters-glow`, `${sourceId}-clusters-ring`, `${sourceId}-clusters`, `${sourceId}-cluster-count`, `${sourceId}-points-glow`, `${sourceId}-points`]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      map.removeSource(sourceId)
    }

    currentSourceId = sourceId

    map.addSource(sourceId, {
      type: 'geojson',
      data,
      cluster: clustering,
      clusterMaxZoom: 16,
      clusterRadius: 50,
    })
  }

  function addClusterLayers(sourceId: string, dataset: 'project-grants' | 'endangered-species') {
    if (!map) return
    if (!map.isStyleLoaded()) return

    const clusterColors = dataset === 'endangered-species'
      ? ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
      : ['#06b6d4', '#22c55e', '#eab308', '#ef4444']

    const zf = ['interpolate', ['linear'], ['zoom'], 6, 0.7, 10, 0.9, 14, 1.15] as unknown as number
    const zfGlow = ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 0.85, 14, 1.2] as unknown as number
    const zfLabel = ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 10, 14, 13] as unknown as number

    // Cluster glow — soft halo behind the main circle
    map.addLayer({
      id: `${sourceId}-clusters-glow`,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'],
          clusterColors[0], 10, clusterColors[1], 50, clusterColors[2], 100, clusterColors[3]],
        'circle-radius': ['*', ['step', ['get', 'point_count'], 28, 10, 36, 50, 44, 100, 54], zfGlow],
        'circle-blur': 0.9,
        'circle-opacity': 0.25,
      }
    })

    // Cluster main circle — solid core with crisp edge
    map.addLayer({
      id: `${sourceId}-clusters`,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'],
          clusterColors[0], 10, clusterColors[1], 50, clusterColors[2], 100, clusterColors[3]],
        'circle-radius': ['*', ['step', ['get', 'point_count'], 16, 10, 22, 50, 28, 100, 36], zf],
        'circle-stroke-width': ['*', 2.5, zf],
        'circle-stroke-color': 'rgba(255, 255, 255, 0.85)',
        'circle-opacity': 0.92,
      }
    })

    // Cluster inner ring — subtle lighter inset for depth
    map.addLayer({
      id: `${sourceId}-clusters-ring`,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'rgba(255, 255, 255, 0.18)',
        'circle-radius': ['*', ['step', ['get', 'point_count'], 8, 10, 10, 50, 12, 100, 14], zf],
        'circle-opacity': 0.6,
      }
    })

    // Cluster count label
    map.addLayer({
      id: `${sourceId}-cluster-count`,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Arial Unicode MS Bold', 'DejaVu Sans Bold'],
        'text-size': zfLabel,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0, 0, 0, 0.35)',
        'text-halo-width': ['*', 1.5, zf],
      }
    })

    // Individual point glow — subtle halo
    map.addLayer({
      id: `${sourceId}-points-glow`,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['*', ['case',
          ['get', 'hasImage'], 13,
          ['step', ['get', 'threatCount'], 7, 2, 10, 4, 13]
        ], zfGlow],
        'circle-blur': 0.8,
        'circle-opacity': 0.2,
      }
    })

    // Individual points — crisp dot
    map.addLayer({
      id: `${sourceId}-points`,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['*', ['case',
          ['get', 'hasImage'], 7,
          ['step', ['get', 'threatCount'], 5, 2, 7, 4, 9]
        ], zf],
        'circle-stroke-width': ['*', 1.5, zf],
        'circle-stroke-color': 'rgba(255, 255, 255, 0.85)',
        'circle-opacity': 0.95,
      }
    })
  }

  async function getClusterExpansionZoom(sourceId: string, clusterId: number): Promise<number> {
    if (!map) return 10
    const source = map.getSource(sourceId) as GeoJSONSource
    if (!source || typeof source.getClusterExpansionZoom !== 'function') return 10
    return await source.getClusterExpansionZoom(clusterId)
  }

  function setupEventHandlers(
    sourceId: string,
    _dataset: 'project-grants' | 'endangered-species',
    onFeatureClick: (_properties: Record<string, unknown>, _coords: [number, number]) => void,
    onClusterClick?: (_clusterId: number, _coords: [number, number]) => void
  ) {
    if (!map) return

    // Remove any previous handlers we installed (e.g., on re-init) to avoid duplicates
    detachHandlers()

    const clusterLayerId = `${sourceId}-clusters`
    const clusterRingId = `${sourceId}-clusters-ring`
    const pointsLayerId = `${sourceId}-points`

    const clusterClick: MapEventHandler = async (e) => {
      if (!map || !e.features?.[0]) return

      const feature = e.features[0]
      const clusterId = feature.properties?.cluster_id as number
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]

      if (clusterId !== undefined) {
        const expansionZoom = await getClusterExpansionZoom(sourceId, clusterId)
        // Cap at the map's allowed max so co-located points can fully split.
        const maxZoom = map.getMaxZoom()
        const targetZoom = Math.min(Math.max(expansionZoom, map.getZoom() + 1), maxZoom)

        map.flyTo({
          center: coords,
          zoom: targetZoom,
          duration: 600,
          essential: true,
        })

        onClusterClick?.(clusterId, coords)
      }
    }

    const pointClick: MapEventHandler = (e) => {
      if (!e.features?.[0]) return

      const feature = e.features[0]
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
      const properties = feature.properties || {}

      onFeatureClick(properties, coords)
    }

    const enterPointer: MapEventHandler = () => { if (map) map.getCanvas().style.cursor = 'pointer' }
    const leavePointer: MapEventHandler = () => { if (map) map.getCanvas().style.cursor = '' }

    const register = (id: string, evt: keyof MapLayerEventType, handler: MapEventHandler) => {
      map!.on(evt, id, handler)
      installedHandlers.push({ id, evt, handler })
    }

    register(clusterLayerId, 'click', clusterClick)
    register(clusterRingId, 'click', clusterClick)
    register(pointsLayerId, 'click', pointClick)
    register(clusterLayerId, 'mouseenter', enterPointer)
    register(clusterLayerId, 'mouseleave', leavePointer)
    register(clusterRingId, 'mouseenter', enterPointer)
    register(clusterRingId, 'mouseleave', leavePointer)
    register(pointsLayerId, 'mouseenter', enterPointer)
    register(pointsLayerId, 'mouseleave', leavePointer)
  }

  function detachHandlers() {
    if (!map) return
    for (const { id, evt, handler } of installedHandlers) {
      map.off(evt, id, handler)
    }
    installedHandlers.length = 0
  }

  function updateData(sourceId: string, data: GeoJSON.FeatureCollection) {
    if (!map) return
    const source = map.getSource(sourceId) as GeoJSONSource
    if (source) {
      source.setData(data)
    }
  }

  function removeLayersAndSource() {
    if (!map || !currentSourceId) return

    const layersToRemove = [
      `${currentSourceId}-clusters-glow`,
      `${currentSourceId}-clusters-ring`,
      `${currentSourceId}-clusters`,
      `${currentSourceId}-cluster-count`,
      `${currentSourceId}-points-glow`,
      `${currentSourceId}-points`
    ]

    for (const layerId of layersToRemove) {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
    }

    if (map.getSource(currentSourceId)) {
      map.removeSource(currentSourceId)
    }

    currentSourceId = null
  }

  function cleanup() {
    detachHandlers()
    removeLayersAndSource()
    map = null
  }

  return {
    init,
    addGeoJSONSource,
    addClusterLayers,
    getClusterExpansionZoom,
    setupEventHandlers,
    updateData,
    removeLayersAndSource,
    cleanup,
    clearCache: clearGeoJSONCache,
  }
}