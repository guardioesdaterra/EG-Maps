/**
 * tests/crew-region-popup.test.ts
 * @why Regression tests for the regional marker detail-popup crash
 *  (South America / Europe "expand details" threw on `.map()`/`.find()` because
 *  the `history` array stored on GeoJSON feature properties is mangled by the
 *  MapLibre vector-tile round-trip) and for the paginated crews-in-region list.
 * @deps vitest (describe, it, expect); ../lib/crew-grants; ../lib/crew-data
 */
import { describe, it, expect } from 'vitest'
import {
  parseCrewHistory,
  resolveCrewRegion,
  isCrewLocationInRegion,
  filterCrewLocationsByRegion,
} from '../lib/crew-grants'
import { allCrewRegionsData, type CrewLocation } from '../lib/crew-data'

function loc(partial: Partial<CrewLocation>): CrewLocation {
  return {
    name: '', country: '', city: '', state: '', region: '',
    status: 'active', lat: 0, lng: 0, ...partial,
  }
}

describe('parseCrewHistory', () => {
  it('passes a real history array through', () => {
    const southAmerica = allCrewRegionsData.find(r => r.id === 'south-america')!
    const parsed = parseCrewHistory(southAmerica.history)
    expect(parsed).toHaveLength(5)
    expect(parsed[0]).toMatchObject({ year: 2022, activeCrews: 4 })
  })

  it('recovers a JSON-stringified history (tile round-trip shape)', () => {
    const europe = allCrewRegionsData.find(r => r.id === 'europe')!
    const stringified = JSON.stringify(europe.history)
    const parsed = parseCrewHistory(stringified)
    expect(parsed).toHaveLength(5)
    // The popup code path (.find/.map) must work on the result
    expect(parsed.find(h => h.year === 2022)?.activeCrews).toBe(2)
    expect(parsed.map(h => h.year)).toEqual([2022, 2023, 2024, 2025, 2026])
  })

  it('returns [] for missing / garbage history instead of crashing', () => {
    expect(parseCrewHistory(undefined)).toEqual([])
    expect(parseCrewHistory(null)).toEqual([])
    expect(parseCrewHistory('[object Object]')).toEqual([])
    expect(parseCrewHistory('not json')).toEqual([])
    expect(parseCrewHistory([{ nope: true }])).toEqual([])
  })
})

describe('resolveCrewRegion', () => {
  it('resolves South America to the full record via the lookup map', () => {
    // Feature props as they arrive from a click: primitives only, no history.
    const featureProps = {
      id: 'south-america', region: 'South America',
      _origLat: -15, _origLng: -60,
      activeCrews: 7, inactiveCrews: 1, totalMembers: 55, countries: 4,
    }
    const crew = resolveCrewRegion(featureProps, allCrewRegionsData)
    expect(crew.region).toBe('South America')
    expect(crew.history).toHaveLength(5)
    expect(() => crew.history.map(h => h.year)).not.toThrow()
    expect(() => crew.history.find(h => h.year === 2022)).not.toThrow()
  })

  it('resolves Europe via a Map lookup and keeps history usable', () => {
    const lookup = new Map(allCrewRegionsData.map(r => [r.id, r]))
    const crew = resolveCrewRegion({ id: 'europe', region: 'Europe' }, lookup)
    expect(crew.totalMembers).toBe(87)
    expect(crew.history.map(h => h.activeCrews)).toContain(8)
  })

  it('falls back crash-safe when the region is missing from the lookup', () => {
    const crew = resolveCrewRegion(
      { id: 'south-america', region: 'South America', history: '[object Object]' },
      [],
    )
    expect(crew.region).toBe('South America')
    expect(crew.history).toEqual([])
    expect(() => crew.history.map(h => h.year)).not.toThrow()
  })
})

describe('filterCrewLocationsByRegion', () => {
  const locations: CrewLocation[] = [
    loc({ name: 'Poços de Caldas', country: 'Brazil', city: 'Poços de Caldas', region: 'South America', status: 'active', lat: -21.79, lng: -46.56 }),
    loc({ name: 'EG Jaraguá', country: 'Brazil', city: 'São Paulo', region: 'South America', status: 'inactive', lat: -23.44, lng: -46.73 }),
    loc({ name: 'Puyo', country: 'Ecuador', city: 'Puyo', region: 'South America', status: 'active', lat: -1.48, lng: -77.99 }),
    loc({ name: 'İzmir', country: 'Turkey', city: 'İzmir', region: 'Europe', status: 'active', lat: 38.41, lng: 27.12 }),
    loc({ name: 'Malta', country: 'Malta', city: '', region: 'Europe', status: 'inactive', lat: 35.93, lng: 14.39 }),
  ]

  it('lists all crews of South America (active first, then alphabetical)', () => {
    const region = allCrewRegionsData.find(r => r.id === 'south-america')!
    const crews = filterCrewLocationsByRegion(locations, region)
    expect(crews.map(c => c.name)).toEqual(['Poços de Caldas', 'Puyo', 'EG Jaraguá'])
  })

  it('lists all crews of Europe', () => {
    const region = allCrewRegionsData.find(r => r.id === 'europe')!
    const crews = filterCrewLocationsByRegion(locations, region)
    expect(crews.map(c => c.name)).toEqual(['İzmir', 'Malta'])
  })

  it('matches regions case- and accent-insensitively', () => {
    const region = allCrewRegionsData.find(r => r.id === 'south-america')!
    expect(isCrewLocationInRegion(
      loc({ name: 'x', region: 'south AMERICA' }), region,
    )).toBe(true)
    expect(isCrewLocationInRegion(
      loc({ name: 'x', region: 'Africa' }), region,
    )).toBe(false)
  })
})
