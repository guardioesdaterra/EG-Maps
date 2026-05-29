import Supercluster from 'supercluster'
import type { PointFeature } from 'supercluster'

export interface ClusterItem {
  lng: number
  lat: number
  type: 'project' | 'species'
  index: number
}

export interface ClusterResult {
  type: 'cluster'
  lng: number
  lat: number
  count: number
  clusterId: number
  items: ClusterItem[]
}

export interface PointResult {
  type: 'point'
  lng: number
  lat: number
  sourceIndex: number
}

export type ClusterPoint = ClusterResult | PointResult

export const MAX_CLUSTER_SIZE = 5

interface GeoJsonProperties {
  cluster?: boolean
  cluster_id?: number
  point_count?: number
  point_count_abbreviated?: number | string
  sourceIndex?: number
  type?: 'project' | 'species'
}

export function useMapCluster() {
  let index: Supercluster<GeoJsonProperties, GeoJsonProperties> | null = null

  function load(data: ClusterItem[]) {
    const features: PointFeature<GeoJsonProperties>[] = data.map((item) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.lng, item.lat],
      },
      properties: {
        sourceIndex: item.index,
        type: item.type,
      },
    }))

    index = new Supercluster<GeoJsonProperties, GeoJsonProperties>({
      radius: 40,
      maxZoom: 14,
      minZoom: 0,
      extent: 512,
      nodeSize: 64,
    })

    index.load(features)
  }

  function getClusters(bbox: [number, number, number, number], zoom: number): ClusterPoint[] {
    if (!index) return []

    const rawClusters = index.getClusters(bbox, Math.floor(zoom))

    const result: ClusterPoint[] = []

    for (const feature of rawClusters) {
      if (feature.properties.cluster) {
        const count = feature.properties.point_count ?? 0
        const clusterId = feature.properties.cluster_id!

        const leaves = index.getLeaves(clusterId, Infinity)

        if (count <= MAX_CLUSTER_SIZE) {
          result.push({
            type: 'cluster',
            lng: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
            count,
            clusterId,
            items: leaves.map(l => ({
              lng: l.geometry.coordinates[0],
              lat: l.geometry.coordinates[1],
              type: l.properties.type ?? 'species',
              index: l.properties.sourceIndex ?? 0,
            })),
          })
        } else {
          const groups = splitIntoGroups(leaves, MAX_CLUSTER_SIZE)
          for (const group of groups) {
            if (group.length === 1) {
              result.push({
                type: 'point',
                lng: group[0].geometry.coordinates[0],
                lat: group[0].geometry.coordinates[1],
                sourceIndex: group[0].properties.sourceIndex ?? 0,
              })
            } else {
              const lng = group.reduce((s, l) => s + l.geometry.coordinates[0], 0) / group.length
              const lat = group.reduce((s, l) => s + l.geometry.coordinates[1], 0) / group.length
              result.push({
                type: 'cluster',
                lng,
                lat,
                count: group.length,
                clusterId,
                items: group.map(l => ({
                  lng: l.geometry.coordinates[0],
                  lat: l.geometry.coordinates[1],
                  type: l.properties.type ?? 'species',
                  index: l.properties.sourceIndex ?? 0,
                })),
              })
            }
          }
        }
      } else {
        result.push({
          type: 'point',
          lng: feature.geometry.coordinates[0],
          lat: feature.geometry.coordinates[1],
          sourceIndex: feature.properties.sourceIndex ?? 0,
        })
      }
    }

    return result
  }

  function getClusterExpansionZoom(clusterId: number): number {
    if (!index) return 10
    return index.getClusterExpansionZoom(clusterId)
  }

  function destroy() {
    index = null
  }

  return { load, getClusters, getClusterExpansionZoom, destroy }
}

function splitIntoGroups(arr: PointFeature<GeoJsonProperties>[], maxSize: number): PointFeature<GeoJsonProperties>[][] {
  if (arr.length <= maxSize) return [[...arr]]

  const groups: PointFeature<GeoJsonProperties>[][] = []
  const remaining = [...arr]

  while (remaining.length > 0) {
    const group: PointFeature<GeoJsonProperties>[] = [remaining.shift()!]
    const centerLng = group[0].geometry.coordinates[0]
    const centerLat = group[0].geometry.coordinates[1]

    while (group.length < maxSize && remaining.length > 0) {
      let closestIdx = 0
      let closestDist = Infinity
      for (let i = 0; i < remaining.length; i++) {
        const dx = remaining[i].geometry.coordinates[0] - centerLng
        const dy = remaining[i].geometry.coordinates[1] - centerLat
        const dist = dx * dx + dy * dy
        if (dist < closestDist) {
          closestDist = dist
          closestIdx = i
        }
      }
      group.push(remaining.splice(closestIdx, 1)[0])
    }
    groups.push(group)
  }

  return groups
}
