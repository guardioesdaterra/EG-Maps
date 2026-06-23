/**
 * High-performance marker rendering using MapLibre's native GeoJSON clustering.
 *
 * This approach uses GPU-accelerated vector rendering instead of DOM-based markers,
 * which can handle 10,000+ points smoothly compared to the 100-200 limit of DOM markers.
 */

import type { Map as MapLibreMap, GeoJSONSource, MapLayerMouseEvent, MapLayerEventType } from 'maplibre-gl'
import { GROUP_COLORS } from '@/lib/map-utils'

export interface SpeciesIndexItem {
  id: string
  commonName: string
  scientificName: string
  taxonomicGroup: string
  category: string
  lat: number
  lng: number
  imageUrl: string | null
  description: string
  endangerment: string
  threatTypes: string[]
}

const GROUP_COLORS_HEX: Record<string, string> = GROUP_COLORS

// Cache for speciesIndexToGeoJSON to avoid recalculating on every rebuild
let _geoJSONCacheInput: SpeciesIndexItem[] | null = null
let _geoJSONCacheOutput: GeoJSON.FeatureCollection | null = null

// Lightweight index for markers - only 3.2MB vs 35MB full data
export function speciesIndexToGeoJSON(species: SpeciesIndexItem[]): GeoJSON.FeatureCollection {
  if (_geoJSONCacheInput === species && _geoJSONCacheOutput) return _geoJSONCacheOutput

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
        }
      }))
  }

  _geoJSONCacheInput = species
  _geoJSONCacheOutput = result
  return result
}

// Convert project data to GeoJSON FeatureCollection
export function projectsToGeoJSON(projects: { latitude: number; longitude: number; project_title: string; country_province: string; direct_beneficiaries: number; indirect_beneficiaries: number }[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: projects
      .filter(p => p.latitude != null && p.longitude != null && isFinite(p.latitude) && isFinite(p.longitude))
      .map(p => {
        const total = p.direct_beneficiaries + p.indirect_beneficiaries
        const color = getProjectColor(total)
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
}

function getProjectColor(totalBeneficiaries: number): string {
  if (totalBeneficiaries >= 50000) return '#06b6d4'
  if (totalBeneficiaries >= 25000) return '#22c55e'
  if (totalBeneficiaries >= 10000) return '#eab308'
  if (totalBeneficiaries >= 5000) return '#f97316'
  return '#ef4444'
}

export function useGeoJSONMarkers() {
  let map: MapLibreMap | null = null
  let currentSourceId: string | null = null

  // Track installed event handlers so they can be removed on re-setup/cleanup
  type InstalledHandler = {
    id: string
    evt: keyof MapLayerEventType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (...args: any[]) => void
  }
  const installedHandlers: InstalledHandler[] = []

  function init(mapInstance: MapLibreMap) {
    map = mapInstance
  }

  function addGeoJSONSource(sourceId: string, data: GeoJSON.FeatureCollection, clustering: boolean = true) {
    if (!map) return

    if (currentSourceId && currentSourceId !== sourceId) {
      removeLayersAndSource()
    }

    if (map.getSource(sourceId)) {
      map.removeLayer(`${sourceId}-clusters-glow`)
      map.removeLayer(`${sourceId}-clusters-ring`)
      map.removeLayer(`${sourceId}-clusters`)
      map.removeLayer(`${sourceId}-cluster-count`)
      map.removeLayer(`${sourceId}-points-glow`)
      map.removeLayer(`${sourceId}-points`)
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

    const clusterColors = dataset === 'endangered-species'
      ? ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
      : ['#06b6d4', '#22c55e', '#eab308', '#ef4444']

    // Cluster glow — soft halo behind the main circle
    map.addLayer({
      id: `${sourceId}-clusters-glow`,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'],
          clusterColors[0], 10, clusterColors[1], 50, clusterColors[2], 100, clusterColors[3]],
        'circle-radius': ['step', ['get', 'point_count'], 28, 10, 36, 50, 44, 100, 54],
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
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28, 100, 36],
        'circle-stroke-width': 2.5,
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
        'circle-radius': ['step', ['get', 'point_count'], 8, 10, 10, 50, 12, 100, 14],
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
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0, 0, 0, 0.35)',
        'text-halo-width': 1.5,
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
        'circle-radius': ['case', ['get', 'hasImage'], 13, 10],
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
        'circle-radius': ['case', ['get', 'hasImage'], 7, 5],
        'circle-stroke-width': 1.5,
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
    onFeatureClick: (properties: Record<string, unknown>, coords: [number, number]) => void,
    onClusterClick?: (clusterId: number, coords: [number, number]) => void
  ) {
    if (!map) return

    // Remove any previous handlers we installed (e.g., on re-init) to avoid duplicates
    detachHandlers()

    const clusterLayerId = `${sourceId}-clusters`
    const clusterRingId = `${sourceId}-clusters-ring`
    const pointsLayerId = `${sourceId}-points`

    const clusterClick = async (e: MapLayerMouseEvent) => {
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

    const pointClick = (e: MapLayerMouseEvent) => {
      if (!e.features?.[0]) return

      const feature = e.features[0]
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
      const properties = feature.properties || {}

      onFeatureClick(properties, coords)
    }

    const enterPointer = () => { if (map) map.getCanvas().style.cursor = 'pointer' }
    const leavePointer = () => { if (map) map.getCanvas().style.cursor = '' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const register = (id: string, evt: keyof MapLayerEventType, handler: any) => {
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
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [182, 64, 50]
}