/**
 * GeoJSON converter utilities for marker data.
 * Transforms SpeciesIndexItem[] and ProjectData[] into GeoJSON FeatureCollections
 * for MapLibre's native clustering renderer.
 */

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
  region?: string
  ecosystem?: string
  threatTypes?: string[]
}

const GROUP_COLORS_HEX: Record<string, string> = GROUP_COLORS

// Content-hash cache so filter changes with same data hit the cache
const speciesGeoCache = new Map<string, GeoJSON.FeatureCollection>()
const projectsGeoCache = new Map<string, GeoJSON.FeatureCollection>()
const MAX_CACHE_SIZE = 20

function hashSpeciesIndex(items: SpeciesIndexItem[]): string {
  if (items.length === 0) return 'empty'
  let h = 0
  const len = Math.min(items.length, 200)
  for (let i = 0; i < len; i++) {
    const s = items[i]
    h = ((h << 5) - h + s.lat * 1000 + s.lng * 1000 + (s.taxonomicGroup?.length ?? 0)) | 0
  }
  return `${h}:${items.length}`
}

function hashProjects(projects: { latitude: number; longitude: number; project_title: string }[]): string {
  if (projects.length === 0) return 'empty'
  let h = 0
  const len = Math.min(projects.length, 200)
  for (let i = 0; i < len; i++) {
    const p = projects[i]
    h = ((h << 5) - h + p.latitude * 1000 + p.longitude * 1000) | 0
  }
  return `${h}:${projects.length}`
}

function evictOldest(cache: Map<string, GeoJSON.FeatureCollection>) {
  if (cache.size > MAX_CACHE_SIZE) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
}

// Lightweight index for markers - only 3.2MB vs 35MB full data
export function speciesIndexToGeoJSON(species: SpeciesIndexItem[]): GeoJSON.FeatureCollection {

  const key = hashSpeciesIndex(species)
  const cached = speciesGeoCache.get(key)
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
          threatCount: s.threatTypes?.length ?? 0,
        }
      }))
  }

  evictOldest(speciesGeoCache)
  speciesGeoCache.set(key, result)
  return result
}

// Convert project data to GeoJSON FeatureCollection
export function projectsToGeoJSON(projects: { latitude: number; longitude: number; project_title: string; country_province: string; direct_beneficiaries: number; indirect_beneficiaries: number }[]): GeoJSON.FeatureCollection {
  const key = hashProjects(projects)
  const cached = projectsGeoCache.get(key)
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

  evictOldest(projectsGeoCache)
  projectsGeoCache.set(key, result)
  return result
}

// Clear caches when data changes
export function clearGeoJSONCache() {
  speciesGeoCache.clear()
  projectsGeoCache.clear()
}