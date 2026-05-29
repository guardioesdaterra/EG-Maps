/**
 * High-performance marker rendering using MapLibre's native GeoJSON clustering.
 * 
 * This approach uses GPU-accelerated vector rendering instead of DOM-based markers,
 * which can handle 10,000+ points smoothly compared to the 100-200 limit of DOM markers.
 */

import type { Map as MapLibreMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl'
import type { Species } from '@/lib/types'
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

// Lightweight index for markers - only 3.2MB vs 35MB full data
export function speciesIndexToGeoJSON(species: SpeciesIndexItem[]): GeoJSON.FeatureCollection {
  return {
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
  
  // Cache for full species data loaded on demand
  const speciesCache = new Map<string, Species>()

  function init(mapInstance: MapLibreMap) {
    map = mapInstance
  }

  function addGeoJSONSource(sourceId: string, data: GeoJSON.FeatureCollection, clustering: boolean = true) {
    if (!map) return

    if (currentSourceId && currentSourceId !== sourceId) {
      removeLayersAndSource()
    }

    if (map.getSource(sourceId)) {
      map.removeLayer(`${sourceId}-clusters`)
      map.removeLayer(`${sourceId}-cluster-count`)
      map.removeLayer(`${sourceId}-points`)
      map.removeSource(sourceId)
    }

    currentSourceId = sourceId

    map.addSource(sourceId, {
      type: 'geojson',
      data,
      cluster: clustering,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    })
  }

  function addClusterLayers(sourceId: string, dataset: 'project-grants' | 'endangered-species') {
    if (!map) return

    // Cluster circles layer
    map.addLayer({
      id: `${sourceId}-clusters`,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': dataset === 'endangered-species'
          ? ['step', ['get', 'point_count'], '#06b6d4', 10, '#3b82f6', 50, '#8b5cf6', 100, '#ec4899']
          : ['step', ['get', 'point_count'], '#06b6d4', 10, '#22c55e', 50, '#eab308', 100, '#ef4444'],
        'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30, 100, 38],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255, 255, 255, 0.8)',
        'circle-opacity': 0.9,
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
      paint: { 'text-color': '#ffffff' }
    })

    // Individual points
    map.addLayer({
      id: `${sourceId}-points`,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['case', ['get', 'hasImage'], 8, 6],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255, 255, 255, 0.9)',
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

  // Load full species data on demand (only when user clicks)
  async function loadFullSpeciesData(speciesId: string, baseURL: string): Promise<Species | null> {
    if (speciesCache.has(speciesId)) {
      return speciesCache.get(speciesId)!
    }

    try {
      // Try loading from full dataset first
      const res = await fetch(`${baseURL}data/species/icmbio-brazil.json`)
      if (res.ok) {
        const allSpecies: Species[] = await res.json()
        const species = allSpecies.find(s => s.id === speciesId)
        if (species) {
          speciesCache.set(speciesId, species)
          return species
        }
      }
    } catch {
      // Silently fail
    }

    return null
  }

  function setupEventHandlers(
    sourceId: string,
    dataset: 'project-grants' | 'endangered-species',
    onFeatureClick: (properties: Record<string, unknown>, coords: [number, number]) => void,
    onClusterClick: (clusterId: number, coords: [number, number]) => void
  ) {
    if (!map) return

    map.on('click', `${sourceId}-clusters`, async (e: MapLayerMouseEvent) => {
      if (!map || !e.features?.[0]) return

      const feature = e.features[0]
      const clusterId = feature.properties?.cluster_id as number
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]

      if (clusterId !== undefined) {
        const expansionZoom = await getClusterExpansionZoom(sourceId, clusterId)
        
        map.easeTo({
          center: coords,
          zoom: Math.min(expansionZoom, 16),
          duration: 500
        })
        
        onClusterClick(clusterId, coords)
      }
    })

    map.on('click', `${sourceId}-points`, (e: MapLayerMouseEvent) => {
      if (!e.features?.[0]) return

      const feature = e.features[0]
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
      const properties = feature.properties || {}

      onFeatureClick(properties, coords)
    })

    // Cursor change on hover
    map.on('mouseenter', `${sourceId}-clusters`, () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', `${sourceId}-clusters`, () => {
      if (map) map.getCanvas().style.cursor = ''
    })
    map.on('mouseenter', `${sourceId}-points`, () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', `${sourceId}-points`, () => {
      if (map) map.getCanvas().style.cursor = ''
    })
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
      `${currentSourceId}-clusters`,
      `${currentSourceId}-cluster-count`,
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
    removeLayersAndSource()
    speciesCache.clear()
    map = null
  }

  return {
    init,
    addGeoJSONSource,
    addClusterLayers,
    getClusterExpansionZoom,
    setupEventHandlers,
    updateData,
    loadFullSpeciesData,
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