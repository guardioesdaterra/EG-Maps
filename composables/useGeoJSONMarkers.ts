/**
 * High-performance marker rendering using MapLibre's native GeoJSON clustering.
 * 
 * This approach uses GPU-accelerated vector rendering instead of DOM-based markers,
 * which can handle 10,000+ points smoothly compared to the 100-200 limit of DOM markers.
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import type { ProjectData, Species } from '@/lib/types'
import { GROUP_COLORS } from '@/lib/map-utils'

export interface GeoJSONMarkerOptions {
  map: MapLibreMap
  sourceId: string
  clusterLayerId: string
  clusterCountLayerId: string
  pointLayerId: string
}

const GROUP_COLORS_HEX: Record<string, string> = GROUP_COLORS

// Convert species data to GeoJSON FeatureCollection
export function speciesToGeoJSON(species: Species[], filterFn?: (s: Species) => boolean): GeoJSON.FeatureCollection {
  const filtered = filterFn ? species.filter(filterFn) : species
  
  return {
    type: 'FeatureCollection',
    features: filtered
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
export function projectsToGeoJSON(projects: ProjectData[]): GeoJSON.FeatureCollection {
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
  if (totalBeneficiaries >= 50000) return '#06b6d4' // cyan-500
  if (totalBeneficiaries >= 25000) return '#22c55e' // green-500
  if (totalBeneficiaries >= 10000) return '#eab308' // yellow-500
  if (totalBeneficiaries >= 5000) return '#f97316'  // orange-500
  return '#ef4444' // red-500
}

export function useGeoJSONMarkers() {
  let map: MapLibreMap | null = null
  let currentSourceId: string | null = null
  let currentDataset: 'project-grants' | 'endangered-species' | null = null

  function init(mapInstance: MapLibreMap) {
    map = mapInstance
  }

  function addGeoJSONSource(sourceId: string, data: GeoJSON.FeatureCollection, clustering: boolean = true) {
    if (!map) return

    // Remove existing source and layers if switching datasets
    if (currentSourceId && currentSourceId !== sourceId) {
      removeLayersAndSource()
    }

    // Remove existing source if it exists
    if (map.getSource(sourceId)) {
      map.removeLayer(`${sourceId}-clusters`)
      map.removeLayer(`${sourceId}-cluster-count`)
      map.removeLayer(`${sourceId}-points`)
      map.removeSource(sourceId)
    }

    currentSourceId = sourceId

    // Add the GeoJSON source with clustering configuration
    map.addSource(sourceId, {
      type: 'geojson',
      data,
      cluster: clustering,
      clusterMaxZoom: 14,  // Cluster until zoom level 14
      clusterRadius: 50,   // Cluster points within 50 pixels
    })
  }

  function addClusterLayers(sourceId: string, dataset: 'project-grants' | 'endangered-species') {
    if (!map) return
    currentDataset = dataset

    // Cluster circles layer
    map.addLayer({
      id: `${sourceId}-clusters`,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        // Color by cluster size - use dataset-appropriate colors
        'circle-color': dataset === 'endangered-species'
          ? [
              'step',
              ['get', 'point_count'],
              '#06b6d4',   // < 10: cyan
              10, '#3b82f6', // 10-50: blue
              50, '#8b5cf6', // 50-100: purple
              100, '#ec4899' // 100+: pink
            ]
          : [
              'step',
              ['get', 'point_count'],
              '#06b6d4',   // < 10: cyan
              10, '#22c55e', // 10-50: green
              50, '#eab308', // 50-100: yellow
              100, '#ef4444' // 100+: red
            ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          18,   // < 10 points
          10, 24,  // 10-50 points
          50, 30,  // 50-100 points
          100, 38  // 100+ points
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255, 255, 255, 0.8)',
        'circle-opacity': 0.9,
      }
    })

    // Cluster count label layer
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
      }
    })

    // Individual points layer
    map.addLayer({
      id: `${sourceId}-points`,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': [
          'case',
          ['get', 'hasImage'], 8,  // Species with images
          6                       // Species without images / projects
        ],
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

  function setupEventHandlers(
    sourceId: string,
    dataset: 'project-grants' | 'endangered-species',
    onFeatureClick: (properties: Record<string, unknown>, coords: [number, number]) => void,
    onClusterClick: (clusterId: number, coords: [number, number]) => void
  ) {
    if (!map) return

    // Click handler for clusters
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

    // Click handler for individual points
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

    // Remove layers first
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

    // Remove source
    if (map.getSource(currentSourceId)) {
      map.removeSource(currentSourceId)
    }

    currentSourceId = null
    currentDataset = null
  }

  function cleanup() {
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

// Utility: Convert hex color to RGB for MapLibre expressions
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [182, 64, 50] // Default red
}