import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { allCrewRegionsData, type CrewLocation } from '../lib/crew-data'
import { buildMapConnectionFeatures } from '../lib/map-effects'
import { buildMapExportCollection } from '../lib/map-export'

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

function crewLocationStatuses(collection: GeoJSON.FeatureCollection): string[] {
  return collection.features
    .filter(feature => feature.properties?.featureType === 'crew-location')
    .map(feature => String(feature.properties?.status ?? 'unknown'))
}

describe('crew map filtered data pipelines', () => {
  const locations = loadCrewLocations()
  const activeLocations = locations.filter(location => location.status === 'active')
  const inactiveLocations = locations.filter(location => location.status === 'inactive')

  it('exports only the currently visible crew-location statuses', () => {
    const activeExport = buildMapExportCollection({ dataset: 'active-crews', crewLocations: activeLocations })
    const inactiveExport = buildMapExportCollection({ dataset: 'active-crews', crewLocations: inactiveLocations })

    expect(crewLocationStatuses(activeExport)).toHaveLength(activeLocations.length)
    expect(crewLocationStatuses(activeExport).every(status => status === 'active')).toBe(true)
    expect(crewLocationStatuses(inactiveExport)).toHaveLength(inactiveLocations.length)
    expect(crewLocationStatuses(inactiveExport).every(status => status === 'inactive')).toBe(true)
  })

  it('builds crew connections from active locations and no inactive-only edges', () => {
    const allConnections = buildMapConnectionFeatures({
      dataset: 'active-crews',
      crewLocations: locations,
      isMobile: false,
    })
    const activeConnections = buildMapConnectionFeatures({
      dataset: 'active-crews',
      crewLocations: activeLocations,
      isMobile: false,
    })
    const inactiveConnections = buildMapConnectionFeatures({
      dataset: 'active-crews',
      crewLocations: inactiveLocations,
      isMobile: false,
    })

    expect(activeConnections.length).toBeGreaterThan(0)
    expect(allConnections).toEqual(activeConnections)
    expect(inactiveConnections).toEqual([])
    expect(activeConnections.every(feature => feature.properties.dataset === 'active-crews')).toBe(true)
  })

  it('keeps regional export data while filtering point records by status', () => {
    const activeExport = buildMapExportCollection({
      dataset: 'active-crews',
      crews: allCrewRegionsData,
      crewLocations: activeLocations,
    })
    const inactiveExport = buildMapExportCollection({
      dataset: 'active-crews',
      crews: allCrewRegionsData,
      crewLocations: inactiveLocations,
    })
    const activeRegions = activeExport.features.filter(feature => feature.properties?.featureType === 'crew-region')
    const inactiveRegions = inactiveExport.features.filter(feature => feature.properties?.featureType === 'crew-region')

    expect(activeRegions).toHaveLength(allCrewRegionsData.length)
    expect(inactiveRegions).toHaveLength(allCrewRegionsData.length)
    expect(crewLocationStatuses(activeExport).every(status => status === 'active')).toBe(true)
    expect(crewLocationStatuses(inactiveExport).every(status => status === 'inactive')).toBe(true)
  })
})
