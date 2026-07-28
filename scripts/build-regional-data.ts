#!/usr/bin/env npx tsx
/**
 * scripts/build-regional-data.ts
 * @why Regional data builder — processes raw species data into region-split JSON files
 * @deps fs (readFileSync, writeFileSync, mkdirSync, existsSync); path (join)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Build regional data subsets for Poços de Caldas Vulcan Alkaline Plateau.
 *
 * Reads the national-level GeoJSON files and filters to features within
 * 100km of the center point. Also splits into 25km/50km zones.
 *
 * Usage:
 *   npx tsx scripts/build-regional-data.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const CENTER = { lat: -21.914138005195028, lng: -46.53311955736603 }

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getCentroid(geometry: any): { lat: number; lng: number } | null {
  if (!geometry) return null
  if (geometry.type === 'Point') {
    return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] }
  }
  let pts: number[][]
  if (geometry.type === 'Polygon') {
    pts = geometry.coordinates[0]
  } else if (geometry.type === 'MultiPolygon') {
    pts = geometry.coordinates[0][0]
  } else {
    return null
  }
  if (!pts || !pts.length) return null
  const lats = pts.map((p: number[]) => p[1])
  const lngs = pts.map((p: number[]) => p[0])
  return { lat: lats.reduce((a: number, b: number) => a + b, 0) / lats.length, lng: lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length }
}

function filterByRadius(features: any[], radiusKm: number) {
  return features.filter(f => {
    let lat: number, lng: number
    const centroid = getCentroid(f.geometry)
    if (centroid) {
      lat = centroid.lat
      lng = centroid.lng
    } else if (f.properties?.lat != null && f.properties?.lon != null) {
      lat = f.properties.lat
      lng = f.properties.lon
    } else if (f.properties?.la != null && f.properties?.lo != null) {
      lat = f.properties.la
      lng = f.properties.lo
    } else {
      return false
    }
    return haversine(CENTER.lat, CENTER.lng, lat, lng) <= radiusKm
  })
}

const PUBLIC = join(import.meta.dirname, '..', 'public', 'data', 'rare-earth')
const OUTPUT = join(PUBLIC, 'pococaldas')
if (!existsSync(OUTPUT)) mkdirSync(OUTPUT, { recursive: true })

console.log(`Center: ${CENTER.lat}, ${CENTER.lng}`)

console.log('\n--- Points ---')
const pointsRaw = JSON.parse(readFileSync(join(PUBLIC, 'points.geojson'), 'utf8'))
console.log(`Total features: ${pointsRaw.features.length}`)

const points100 = filterByRadius(pointsRaw.features, 100)
console.log(`Within 100km: ${points100.length}`)
writeFileSync(join(OUTPUT, 'points.geojson'), JSON.stringify({ type: 'FeatureCollection', features: points100 }, null, 2))

const points50 = filterByRadius(pointsRaw.features, 50)
const points25 = filterByRadius(pointsRaw.features, 25)
console.log(`Within 50km: ${points50.length}`)
console.log(`Within 25km: ${points25.length}`)

console.log('\n--- Overlaps ---')
const overlapsPath = join(PUBLIC, 'points_with_overlaps.geojson')
if (existsSync(overlapsPath)) {
  const overlapsRaw = JSON.parse(readFileSync(overlapsPath, 'utf8'))
  const overlaps100 = filterByRadius(overlapsRaw.features, 100)
  console.log(`Overlaps within 100km: ${overlaps100.length}`)
  writeFileSync(join(OUTPUT, 'points_overlaps.geojson'), JSON.stringify({ type: 'FeatureCollection', features: overlaps100 }, null, 2))
} else {
  console.log('Skipping overlaps (file not found)')
}

console.log('\n--- Polygons ---')
const polysPath = join(PUBLIC, 'polygons.geojson')
if (existsSync(polysPath)) {
  const polysRaw = JSON.parse(readFileSync(polysPath, 'utf8'))
  console.log(`Total polygons: ${polysRaw.features.length}`)
  const polys100 = filterByRadius(polysRaw.features, 100)
  console.log(`Polygons within 100km: ${polys100.length}`)
  writeFileSync(join(OUTPUT, 'polygons.geojson'), JSON.stringify({ type: 'FeatureCollection', features: polys100 }, null, 2))
} else {
  console.log('Skipping polygons (file not found)')
}

console.log('\n--- Protected Areas ---')
const protectedPath = join(PUBLIC, 'protected-areas.geojson')
if (existsSync(protectedPath)) {
  const protectedRaw = JSON.parse(readFileSync(protectedPath, 'utf8'))
  console.log(`Total protected: ${protectedRaw.features.length}`)
  const protected100 = filterByRadius(protectedRaw.features, 100)
  console.log(`Protected within 100km: ${protected100.length}`)
  writeFileSync(join(OUTPUT, 'protected-areas.geojson'), JSON.stringify({ type: 'FeatureCollection', features: protected100 }, null, 2))
} else {
  console.log('Skipping protected areas (file not found)')
}

console.log('\n--- Deep Analysis ---')
const analysisPath = join(PUBLIC, 'deep_analysis.json')
if (existsSync(analysisPath)) {
  const analysis = JSON.parse(readFileSync(analysisPath, 'utf8'))
  const regionalAnalysis = {
    ...analysis,
    regional: {
      center: [CENTER.lng, CENTER.lat],
      radius_km: 100,
      total_claims_100km: points100.length,
      total_claims_50km: points50.length,
      total_claims_25km: points25.length,
      total_area_ha: points100.reduce((sum: number, f: any) => sum + (f.properties?.area_ha || f.a || 0), 0),
    },
    generated: new Date().toISOString(),
  }
  writeFileSync(join(OUTPUT, 'deep_analysis.json'), JSON.stringify(regionalAnalysis, null, 2))
  console.log(`Regional analysis written`)
}

console.log('\n=== Summary ===')
const files = [
  'points.geojson',
  'points_overlaps.geojson',
  'polygons.geojson',
  'protected-areas.geojson',
  'deep_analysis.json',
]
for (const f of files) {
  const fp = join(OUTPUT, f)
  if (existsSync(fp)) {
    const stat = { size: readFileSync(fp).length }
    console.log(`${f}: ${(stat.size / 1024).toFixed(1)} KB`)
  }
}
