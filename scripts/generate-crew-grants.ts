#!/usr/bin/env node
/**
 * scripts/generate-crew-grants.ts
 * @why Precompute crew ↔ project-grant matches into lib/crew-grants-map.ts.
 *  The map is STATIC and human-reviewed (see tests/crew-grants.test.ts) — the
 *  app never rematches at runtime; it only looks up keys and intersects them
 *  with the (possibly filtered) project list.
 *  Run manually after editing lib/crew-grants.ts, lib/project-data.ts or
 *  public/data/crews-locations.json — or via the "Regenerate crew grants map"
 *  GitHub Action (workflow_dispatch).
 * @usage node scripts/generate-crew-grants.ts [--check]
 *  --check: exit 1 if the checked-in map differs (CI drift guard)
 * @deps node:fs, node:path, node:url; ../lib/crew-grants.ts; ../lib/crew-data.ts; ../lib/project-data.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  findGrantsForCrewLocation,
  findGrantsForRegion,
  crewLocationKey,
  crewRegionKey,
  projectGrantKey,
  CREW_GRANT_MAX_DISTANCE_KM,
} from '../lib/crew-grants'
import { allCrewRegionsData } from '../lib/crew-data'
import { allProjectsData } from '../lib/project-data'
import type { CrewLocation } from '../lib/crew-data'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'lib', 'crew-grants-map.ts')
const CHECK = process.argv.includes('--check')

interface StoredMatch {
  key: string
  reason: 'crew-name' | 'city' | 'country' | 'nearby'
  distanceKm: number | null
}

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

function build(): { body: string; stats: { crews: number; crewsWith: number; grants: number; grantsWith: number; orphans: string[] } } {
  const locations = loadLocations()
  const locLines: string[] = []
  let crewsWith = 0
  for (const loc of locations) {
    const matches = findGrantsForCrewLocation(loc, allProjectsData)
    if (matches.length > 0) crewsWith++
    const stored: StoredMatch[] = matches.map(m => ({
      key: projectGrantKey(m.project),
      reason: m.reason,
      distanceKm: m.distanceKm === null ? null : Math.round(m.distanceKm * 10) / 10,
    }))
    locLines.push(`  ${JSON.stringify(crewLocationKey(loc))}: ${JSON.stringify(stored)},`)
  }

  const regionLines: string[] = []
  for (const region of allCrewRegionsData) {
    const matches = findGrantsForRegion(region, allProjectsData, locations)
    const stored: StoredMatch[] = matches.map(m => ({
      key: projectGrantKey(m.project),
      reason: m.reason,
      distanceKm: m.distanceKm === null ? null : Math.round(m.distanceKm * 10) / 10,
    }))
    regionLines.push(`  ${JSON.stringify(crewRegionKey(region))}: ${JSON.stringify(stored)},`)
  }

  const matchedGrantKeys = new Set<string>()
  for (const loc of locations) {
    for (const m of findGrantsForCrewLocation(loc, allProjectsData)) matchedGrantKeys.add(projectGrantKey(m.project))
  }
  const orphans = allProjectsData
    .filter(p => !matchedGrantKeys.has(projectGrantKey(p)))
    .map(p => `${p.country_province} :: ${p.project_title}`)

  const generatedAt = new Date().toISOString().slice(0, 10)
  const body = `/**
 * lib/crew-grants-map.ts
 * @why PRECOMPUTED crew ↔ project-grant map — DO NOT EDIT BY HAND.
 *  Generated ${generatedAt} by scripts/generate-crew-grants.ts
 *  (${locations.length} crew locations × ${allProjectsData.length} grants, maxDistanceKm=${CREW_GRANT_MAX_DISTANCE_KM}).
 *  Regenerate after touching lib/crew-grants.ts, lib/project-data.ts or
 *  public/data/crews-locations.json: \`pnpm crew-grants:generate\`
 *  (or the "Regenerate crew grants map" GitHub Action).
 *  Stats: ${crewsWith}/${locations.length} crews with grants, ${matchedGrantKeys.size}/${allProjectsData.length} grants with crews.
 *  Orphan grants (no crew — verified crew-less countries): ${orphans.length === 0 ? 'none' : ''}
${orphans.map(o => ` *    - ${o}`).join('\n')}
 */
import type { CrewGrantMatchReason } from './crew-grants.ts'

export interface StoredCrewGrantMatch {
  /** projectGrantKey() of the grant in lib/project-data.ts */
  key: string
  reason: CrewGrantMatchReason
  distanceKm: number | null
}

/** Crew-location key (crewLocationKey) → grants shown in its details popup */
export const crewGrantMap: Record<string, StoredCrewGrantMatch[]> = {
${locLines.join('\n')}
}

/** Crew-region key (crewRegionKey) → grants shown in the aggregate region popup */
export const regionGrantMap: Record<string, StoredCrewGrantMatch[]> = {
${regionLines.join('\n')}
}
`
  return {
    body,
    stats: {
      crews: locations.length,
      crewsWith,
      grants: allProjectsData.length,
      grantsWith: matchedGrantKeys.size,
      orphans,
    },
  }
}

const { body, stats } = build()
if (CHECK) {
  const current = readFileSync(OUT, 'utf8')
  if (current !== body) {
    console.error('[crew-grants] map is stale — run `pnpm crew-grants:generate` and commit lib/crew-grants-map.ts')
    process.exit(1)
  }
  console.log('[crew-grants] map is in sync ✓')
} else {
  writeFileSync(OUT, body)
  console.log(`[crew-grants] wrote lib/crew-grants-map.ts — ${stats.crewsWith}/${stats.crews} crews, ${stats.grantsWith}/${stats.grants} grants`)
  if (stats.orphans.length > 0) {
    console.log('[crew-grants] orphan grants (verified, no crew):')
    for (const o of stats.orphans) console.log(`  - ${o}`)
  }
}
