/**
 * Regression coverage for active/inactive crew status in the shared map renderer.
 * The checked-in GeoJSON fixture drives the counts so both default visibility
 * and explicit filtering are protected against data-pipeline regressions.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCrewStatusGeoJSON } from '../composables/useMapMarker'
import { allCrewRegionsData, crewOverallStats, type CrewLocation } from '../lib/crew-data'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOCATION_FIXTURE = join(ROOT, 'public', 'data', 'crews-locations.json')

function loadCrewLocations(): CrewLocation[] {
  const collection = JSON.parse(readFileSync(LOCATION_FIXTURE, 'utf8')) as {
    features: Array<{
      properties?: Record<string, string>
      geometry: { coordinates: [number, number] }
    }>
  }
  return collection.features.map(feature => ({
    name: feature.properties?.name ?? '',
    country: feature.properties?.country ?? '',
    city: feature.properties?.city ?? '',
    state: feature.properties?.state ?? '',
    region: feature.properties?.region ?? '',
    status: feature.properties?.status === 'inactive' ? 'inactive' : 'active',
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
  }))
}

function locationFeatures(collection: GeoJSON.FeatureCollection) {
  return collection.features.filter(feature => feature.properties?._type === 'crewLocation')
}

function regionFeatures(collection: GeoJSON.FeatureCollection) {
  return collection.features.filter(feature => feature.properties?._type === 'crewRegion')
}

function statusCounts(features: GeoJSON.Feature[]) {
  return features.reduce((counts, feature) => {
    const status = String(feature.properties?.status ?? 'unknown')
    counts[status] = (counts[status] ?? 0) + 1
    return counts
  }, {} as Record<string, number>)
}

describe('crew map status rendering', () => {
  const locations = loadCrewLocations()

  it('shows all 169 real location records by default with status colors preserved', () => {
    const rendered = buildCrewStatusGeoJSON(allCrewRegionsData, locations)
    const points = locationFeatures(rendered)

    expect(points).toHaveLength(169)
    expect(statusCounts(points)).toEqual({ active: 142, inactive: 27 })
    expect(points.find(feature => feature.properties?.status === 'active')?.properties?.color).toBe('#22c55e')
    expect(points.find(feature => feature.properties?.status === 'inactive')?.properties?.color).toBe('#f59e0b')
  })

  it('keeps the homepage crew total and status counts synchronized with the location dataset', () => {
    const active = locations.filter(location => location.status === 'active').length
    const inactive = locations.filter(location => location.status === 'inactive').length

    expect(crewOverallStats.totalCrews).toBe(locations.length)
    expect(crewOverallStats.totalActiveCrews).toBe(active)
    expect(crewOverallStats.totalInactiveCrews).toBe(inactive)
  })

  it('signals inactive crews at regional zoom using the existing amber marker color', () => {
    const rendered = buildCrewStatusGeoJSON(allCrewRegionsData, locations)
    const mixedRegion = regionFeatures(rendered).filter(feature => feature.properties?.id === 'south-america')
    const inactiveIndicators = mixedRegion.filter(feature => feature.properties?._status === 'inactive')

    expect(mixedRegion).toHaveLength(6)
    expect(inactiveIndicators).toHaveLength(1)
    expect(inactiveIndicators[0].properties?.inactiveCrews).toBe(1)
  })

  it('filters locations and regional markers by status without changing the default', () => {
    const activeOnly = buildCrewStatusGeoJSON(allCrewRegionsData, locations, ['active'])
    const inactiveOnly = buildCrewStatusGeoJSON(allCrewRegionsData, locations, ['inactive'])

    expect(statusCounts(locationFeatures(activeOnly))).toEqual({ active: 142 })
    expect(regionFeatures(activeOnly).every(feature => feature.properties?.inactiveCrews === 0)).toBe(true)
    expect(regionFeatures(activeOnly).some(feature => feature.properties?._status === 'inactive')).toBe(false)

    expect(statusCounts(locationFeatures(inactiveOnly))).toEqual({ inactive: 27 })
    expect(locationFeatures(inactiveOnly).every(feature => feature.properties?.color === '#f59e0b')).toBe(true)
    expect(regionFeatures(inactiveOnly).every(feature => feature.properties?._status === 'inactive')).toBe(true)
  })
})
