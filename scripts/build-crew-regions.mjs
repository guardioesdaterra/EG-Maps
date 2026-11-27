/**
 * scripts/build-crew-regions.mjs
 * @why Region area builder — groups Natural Earth countries into the 7 crew
 *       regions (lib/crew-data.ts) so the map can render hoverable/clickable
 *       region polygons instead of tiny mosaic dots.
 * @deps fs (readFileSync, writeFileSync)
 * @out public/data/crew-regions.geojson
 *
 * Re-run after editing grouping rules or the land-110m source:
 *   node scripts/build-crew-regions.mjs
 */
import { readFileSync, writeFileSync } from 'fs'

const SRC = './public/data/embed/land-110m.geojson'
const OUT = './public/data/crew-regions.geojson'

/** Must match allCrewRegionsData ids in lib/crew-data.ts */
const REGION_META = {
  'north-america': { region: 'North America' },
  'south-america': { region: 'South America' },
  'europe': { region: 'Europe' },
  'africa': { region: 'Africa' },
  'east-asia': { region: 'East Asia' },
  'south-asia': { region: 'South Asia' },
  'oceania': { region: 'Oceania' },
}

/**
 * Country → region id.
 * Natural Earth CONTINENT/SUBREGION drive most of it; a few ISO overrides
 * align with how crew locations are tagged in crews-locations.json
 * (Turkey + Azerbaijan crews are "Europe"; Indonesia crew is "South Asia").
 */
function countryRegion(props) {
  const iso = props.ADM0_A3 || props.ISO_A3 || ''
  const continent = props.CONTINENT || ''
  const subregion = props.SUBREGION || ''

  if (iso === 'TUR' || iso === 'AZE') return 'europe'
  if (continent === 'North America') return 'north-america'
  if (continent === 'South America') return 'south-america'
  if (continent === 'Africa') return 'africa'
  if (continent === 'Oceania') return 'oceania'
  if (continent === 'Europe') return 'europe'
  if (continent === 'Asia') {
    if (subregion === 'Eastern Asia') return 'east-asia'
    // Southern + South-Eastern + Central + Western Asia → south-asia
    // (Middle East has no dedicated crew region; Iran is Southern Asia in NE).
    return 'south-asia'
  }
  return null // Antarctica, Seven seas (open ocean)
}

function polygonsOf(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  return []
}

function ringCentroid(ring) {
  let x = 0
  let y = 0
  const n = ring.length - 1 // drop duplicate closing vertex
  for (let i = 0; i < n; i++) {
    x += ring[i][0]
    y += ring[i][1]
  }
  return n > 0 ? [x / n, y / n] : [0, 0]
}

function partCentroid(polygon) {
  // Exterior ring only — good enough for dateline/region splits.
  return ringCentroid(polygon[0])
}

/**
 * Split a country's polygons across two regions when one Admin-0 feature
 * straddles them (Russia: Europe west of the Urals / East Asia beyond;
 * France: metropolitan Europe / French Guiana in South America).
 */
function splitRegion(iso, polygons) {
  if (iso === 'RUS') {
    const west = []
    const east = []
    for (const poly of polygons) {
      const [lng] = partCentroid(poly)
      // Chukotka wraps the dateline (centroid near ±180) — treat as East Asia.
      if (lng > 60 || lng < -160) east.push(poly)
      else west.push(poly)
    }
    return [
      { regionId: 'europe', polygons: west },
      { regionId: 'east-asia', polygons: east },
    ]
  }
  if (iso === 'FRA') {
    const metro = []
    const overseas = []
    for (const poly of polygons) {
      const [lng, lat] = partCentroid(poly)
      // French Guiana + any Caribbean overseas collectivity at 110m.
      if (lng < -30 || lat < 25 && lng < -10) overseas.push(poly)
      else metro.push(poly)
    }
    return [
      { regionId: 'europe', polygons: metro },
      { regionId: 'south-america', polygons: overseas },
    ]
  }
  return null
}

const source = JSON.parse(readFileSync(SRC, 'utf8'))
const buckets = new Map(Object.keys(REGION_META).map(id => [id, []]))
let skipped = 0
let splitCount = 0

for (const feature of source.features) {
  const props = feature.properties || {}
  const iso = props.ADM0_A3 || props.ISO_A3 || ''
  const polygons = polygonsOf(feature.geometry)
  if (!polygons.length) continue

  const split = splitRegion(iso, polygons)
  if (split) {
    splitCount++
    for (const { regionId, polygons: parts } of split) {
      if (parts.length && buckets.has(regionId)) buckets.get(regionId).push(...parts)
    }
    continue
  }

  const regionId = countryRegion(props)
  if (!regionId) {
    skipped++
    continue
  }
  buckets.get(regionId).push(...polygons)
}

const features = []
for (const [id, polygons] of buckets) {
  if (!polygons.length) {
    console.warn(`[build-crew-regions] warning: region "${id}" has no polygons`)
    continue
  }
  features.push({
    type: 'Feature',
    id,
    properties: { id, region: REGION_META[id].region },
    geometry: { type: 'MultiPolygon', coordinates: polygons },
  })
}

const out = { type: 'FeatureCollection', features }
writeFileSync(OUT, JSON.stringify(out))

const sizeKB = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0)
console.log(`[build-crew-regions] ${features.length} regions → ${OUT} (${sizeKB} KB)`)
for (const f of features) {
  const parts = f.geometry.coordinates.length
  console.log(`  ${f.properties.id}: ${parts} polygon part(s)`)
}
console.log(`  split countries: ${splitCount}, skipped (no crew region): ${skipped}`)
