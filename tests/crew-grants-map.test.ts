/**
 * tests/crew-grants-map.test.ts
 * @why Sync guard — the checked-in lib/crew-grants-map.ts must equal a fresh run
 *  of the matcher over the current data. Fails when data/algo changed without
 *  `pnpm crew-grants:generate` (same check as the GitHub Action --check mode).
 * @deps vitest; ../lib/crew-grants-map; ../lib/crew-grants; ../lib/crew-data; ../lib/project-data
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crewGrantMap, regionGrantMap } from '../lib/crew-grants-map'
import {
  findGrantsForCrewLocation,
  findGrantsForRegion,
  crewLocationKey,
  crewRegionKey,
  projectGrantKey,
} from '../lib/crew-grants'
import { allCrewRegionsData, type CrewLocation } from '../lib/crew-data'
import { allProjectsData } from '../lib/project-data'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadLocations(): CrewLocation[] {
  const raw = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'crews-locations.json'), 'utf8'))
  return raw.features.map((f: { properties?: Record<string, string>; geometry: { coordinates: [number, number] } }) => ({
    name: f.properties?.name ?? '',
    country: f.properties?.country ?? '',
    city: f.properties?.city ?? '',
    state: f.properties?.state ?? '',
    region: f.properties?.region ?? '',
    status: f.properties?.status === 'inactive' ? 'inactive' : 'active',
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  }))
}

describe('crew-grants-map sync', () => {
  it('location map matches a fresh recompute', () => {
    const locations = loadLocations()
    const freshKeys = new Set<string>()
    for (const loc of locations) {
      const key = crewLocationKey(loc)
      freshKeys.add(key)
      const expected = findGrantsForCrewLocation(loc, allProjectsData).map(m => projectGrantKey(m.project))
      const actual = (crewGrantMap[key] ?? []).map(m => m.key)
      expect(actual, `stale map for crew ${loc.name}`).toEqual(expected)
    }
    // No leftover entries for crews that no longer exist
    for (const key of Object.keys(crewGrantMap)) {
      expect(freshKeys.has(key), `orphan map entry ${key}`).toBe(true)
    }
  })

  it('region map matches a fresh recompute', () => {
    const locations = loadLocations()
    for (const region of allCrewRegionsData) {
      const key = crewRegionKey(region)
      const expected = findGrantsForRegion(region, allProjectsData, locations).map(m => projectGrantKey(m.project))
      const actual = (regionGrantMap[key] ?? []).map(m => m.key)
      expect(actual, `stale map for region ${region.region}`).toEqual(expected)
    }
  })
})
