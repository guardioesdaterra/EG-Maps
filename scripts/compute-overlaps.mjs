#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const POINTS = resolve(ROOT, 'public/data/rare-earth/points.geojson')
const PROTECTED = resolve(ROOT, 'public/data/rare-earth/protected-areas.geojson')
const OUT = resolve(ROOT, 'public/data/rare-earth/points_with_overlaps.geojson')

const RADIUS_KM = 50
const EARTH_KM = 6371

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

function centroidOf(geom) {
  if (geom.type === 'Point') return geom.coordinates
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0]
    let sx = 0, sy = 0
    for (const c of ring) { sx += c[0]; sy += c[1] }
    return [sx / ring.length, sy / ring.length]
  }
  if (geom.type === 'MultiPolygon') {
    const ring = geom.coordinates[0][0]
    let sx = 0, sy = 0
    for (const c of ring) { sx += c[0]; sy += c[1] }
    return [sx / ring.length, sy / ring.length]
  }
  return null
}

console.log('Loading points.geojson …')
const points = JSON.parse(readFileSync(POINTS, 'utf-8'))
console.log(`  ${points.features.length} features`)

console.log('Loading protected-areas.geojson …')
const protectedAreas = JSON.parse(readFileSync(PROTECTED, 'utf-8'))
console.log(`  ${protectedAreas.features.length} features`)

const areaCentroids = []
for (const f of protectedAreas.features) {
  const c = centroidOf(f.geometry)
  if (!c) continue
  areaCentroids.push({
    name: f.properties.name,
    kind: f.properties.kind,
    centroid: c,
  })
}
console.log(`  ${areaCentroids.length} protected-area centroids ready`)

let updated = 0
let withOverlap = 0
const newFeatures = new Array(points.features.length)
for (let i = 0; i < points.features.length; i++) {
  const f = points.features[i]
  const coords = f.geometry?.coordinates
  if (!coords || coords.length < 2) {
    newFeatures[i] = f
    continue
  }
  const point = [coords[0], coords[1]]
  const overlaps = []
  for (const a of areaCentroids) {
    const d = haversineKm(point, a.centroid)
    if (d <= RADIUS_KM) {
      overlaps.push({ name: a.name, kind: a.kind, distance_km: Math.round(d * 10) / 10 })
    }
  }
  if (overlaps.length > 0) {
    withOverlap++
    f.properties = f.properties || {}
    f.properties.overlaps = overlaps
    f.properties.has_overlap = true
    updated++
  }
  newFeatures[i] = f
  if ((i + 1) % 2000 === 0) console.log(`  …processed ${i + 1}`)
}

points.features = newFeatures
writeFileSync(OUT, JSON.stringify(points))
console.log(`\nWrote ${OUT}`)
console.log(`  ${updated.toLocaleString()} features annotated (${withOverlap.toLocaleString()} overlap a protected area within ${RADIUS_KM} km)`)
