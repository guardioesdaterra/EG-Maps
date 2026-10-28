import { describe, expect, it } from 'vitest'
import { buildMapShareUrl, parseMapCameraState, parseMapShareState, serializeMapCameraState } from '@/lib/map-state'
import { buildMapExportCollection, mapExportFilename, serializeMapExport } from '@/lib/map-export'

describe('map camera URL state', () => {
  it('round-trips a camera and preserves existing route query/hash values', () => {
    const state = { center: [-46.63, -23.55] as [number, number], zoom: 8.25, bearing: 27.2, pitch: 40 }
    const href = buildMapShareUrl('https://example.test/maps?embed=true&zoom=0.4#pin=here', state)
    const url = new URL(href)
    expect(url.searchParams.get('embed')).toBe('true')
    expect(url.searchParams.get('zoom')).toBe('0.4')
    expect(url.hash).toBe('#pin=here')
    expect(parseMapCameraState(Object.fromEntries(url.searchParams))).toEqual({
      center: [-46.63, -23.55], zoom: 8.25, bearing: 27.2, pitch: 40,
    })
  })

  it('ignores invalid camera fields instead of accepting unsafe coordinates', () => {
    expect(parseMapCameraState({ mapLng: '181', mapLat: '0', mapZoom: '100', mapBearing: 'NaN', mapPitch: '-1' })).toEqual({})
    expect(parseMapCameraState({ mapLng: '10', mapLat: '91', mapZoom: '3' })).toEqual({ zoom: 3 })
    expect(serializeMapCameraState({ center: [0, 0], zoom: 1, bearing: 0, pitch: 0 }).mapZoom).toBe('1.00')
  })

  it('shares layer visibility and only whitelisted species groups', () => {
    const state = { center: [1, 2] as [number, number], zoom: 4, bearing: 0, pitch: 0, showHexGrid: false, showConnections: true, selectedSpeciesGroups: ['Mammal', 'Unknown', 'Fish'] }
    const url = new URL(buildMapShareUrl('https://example.test/map', state))
    expect(url.searchParams.get('mapHex')).toBe('0')
    expect(url.searchParams.get('mapConnections')).toBe('1')
    expect(url.searchParams.get('mapGroups')).toBe('Mammal,Fish')
    expect(parseMapShareState(Object.fromEntries(url.searchParams))).toMatchObject({
      showHexGrid: false, showConnections: true, selectedSpeciesGroups: ['Mammal', 'Fish'],
    })
  })
})

describe('visible map GeoJSON export', () => {
  it('exports only valid project points and their useful properties', () => {
    const collection = buildMapExportCollection({
      dataset: 'project-grants',
      projects: [
        { project_title: 'Forest', country_province: 'Brazil', longitude: -45, latitude: -20, direct_beneficiaries: 4, indirect_beneficiaries: 8 },
        { project_title: 'Bad', country_province: '', longitude: 999, latitude: 0, direct_beneficiaries: 0, indirect_beneficiaries: 0 },
      ],
    })
    expect(collection.features).toHaveLength(1)
    expect(collection.features[0]?.geometry).toEqual({ type: 'Point', coordinates: [-45, -20] })
    expect(collection.features[0]?.properties).toMatchObject({ title: 'Forest', directBeneficiaries: 4 })
    expect(JSON.parse(serializeMapExport(collection))).toEqual(collection)
  })

  it('exports both crew locations and aggregate regions without private histories', () => {
    const collection = buildMapExportCollection({
      dataset: 'active-crews',
      crewLocations: [{ name: 'Crew A', country: 'Brazil', city: 'Recife', state: 'PE', region: 'South America', status: 'active', lat: -8, lng: -34 }],
      crews: [{ id: 'south', region: 'South America', latitude: -15, longitude: -60, activeCrews: 3, inactiveCrews: 1, totalMembers: 20, countries: 2, history: [] }],
    })
    expect(collection.features).toHaveLength(2)
    expect(collection.features.map(f => f.properties?.featureType)).toEqual(['crew-location', 'crew-region'])
    expect(collection.features[1]?.properties).not.toHaveProperty('history')
  })

  it('uses a stable, date-stamped filename', () => {
    expect(mapExportFilename('endangered-species', new Date('2026-10-27T12:00:00Z'))).toBe('eg-maps-endangered-species-2026-10-27.geojson')
  })
})
