#!/usr/bin/env node
/**
 * scripts/compute-overlaps.mjs
 * @why Overlap analyzer — computes TRUE geographic overlap between mining
 *      claims and protected areas (point-in-polygon / boundary intersection),
 *      plus a tight NEAR_KM proximity buffer for early warning. An overlap
 *      entry means the claim touches the territory (distance 0) or sits
 *      within NEAR_KM of its edge — never "within 50km of the centroid",
 *      which annotated nearly every regional claim (e.g. 197 bogus links to
 *      a single quilombo) and made the Territory tab counts meaningless.
 * @deps node:fs (readFileSync, writeFileSync); node:path (resolve, dirname); node:url (fileURLToPath)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const POINTS = resolve(ROOT, 'public/data/rare-earth/points.geojson')
const POLYGONS = resolve(ROOT, 'public/data/rare-earth/polygons.geojson')
const PROTECTED = resolve(ROOT, 'public/data/rare-earth/protected-areas.geojson')
const OUT = resolve(ROOT, 'public/data/rare-earth/points_with_overlaps.geojson')

/** Claims past this distance from a territory edge are NOT linked. */
const NEAR_KM = 2
const EARTH_KM = 6371
const DEG_LAT_KM = 110.57

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

function exteriorRings(geom) {
  if (!geom) return []
  if (geom.type === 'Polygon') return [geom.coordinates[0]].filter(Boolean)
  if (geom.type === 'MultiPolygon') return geom.coordinates.map(p => p[0]).filter(Boolean)
  return []
}

function ringBbox(ring) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const c of ring) {
    if (c[0] < x0) x0 = c[0]
    if (c[1] < y0) y0 = c[1]
    if (c[0] > x1) x1 = c[0]
    if (c[1] > y1) y1 = c[1]
  }
  return [x0, y0, x1, y1]
}

function pointInRing(p, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function segInt(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0])
  if (!d) return false
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/** Equirectangular km distance from point p to segment a-b. */
function ptSegKm(p, a, b, kx) {
  const px = p[0] * kx, py = p[1] * DEG_LAT_KM
  const ax = a[0] * kx, ay = a[1] * DEG_LAT_KM
  const bx = b[0] * kx, by = b[1] * DEG_LAT_KM
  const dx = bx - ax, dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function ringDistKm(p, ring, kx) {
  let best = Infinity
  for (let i = 0; i < ring.length; i++) {
    const d = ptSegKm(p, ring[i], ring[(i + 1) % ring.length], kx)
    if (d < best) best = d
  }
  return best
}

function ringsDistKm(r1, r2, kx) {
  let best = Infinity
  for (const p of r1) {
    const d = ringDistKm(p, r2, kx)
    if (d < best) best = d
  }
  for (const p of r2) {
    const d = ringDistKm(p, r1, kx)
    if (d < best) best = d
  }
  return best
}

console.log('Loading points.geojson …')
const points = JSON.parse(readFileSync(POINTS, 'utf-8'))
console.log(`  ${points.features.length} features`)

const polysByProcesso = new Map()
try {
  const polys = JSON.parse(readFileSync(POLYGONS, 'utf-8'))
  for (const f of polys.features || []) {
    const key = String(f.properties?.PROCESSO ?? f.properties?.processo ?? '')
    if (key) polysByProcesso.set(key, exteriorRings(f.geometry))
  }
  console.log(`  ${polysByProcesso.size} claim boundaries indexed`)
} catch {
  console.log('  (no polygons file — centroid-only mode)')
}

console.log('Loading protected-areas.geojson …')
const protectedAreas = JSON.parse(readFileSync(PROTECTED, 'utf-8'))
console.log(`  ${protectedAreas.features.length} features`)

const areas = []
for (const f of protectedAreas.features) {
  const rings = exteriorRings(f.geometry)
  if (!rings.length) continue
  const bboxes = rings.map(ringBbox)
  areas.push({ name: f.properties.name, kind: f.properties.kind, rings, bboxes })
}
console.log(`  ${areas.length} protected-area geometries ready`)

const MARGIN_DEG = NEAR_KM / 111.2 + 0.02
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
  const proc = String(f.properties?.processo ?? f.properties?.PROCESSO ?? '')
  const claimRings = polysByProcesso.get(proc) || []
  const kx = Math.cos((point[1] * Math.PI) / 180) * 111.32
  const overlaps = []
  for (const a of areas) {
    // Bbox prefilter with margin.
    let maybe = false
    for (const b of a.bboxes) {
      if (point[0] >= b[0] - MARGIN_DEG && point[0] <= b[2] + MARGIN_DEG && point[1] >= b[1] - MARGIN_DEG && point[1] <= b[3] + MARGIN_DEG) {
        maybe = true
        break
      }
    }
    if (!maybe) continue
    let touches = false
    for (const ring of a.rings) {
      if (pointInRing(point, ring)) { touches = true; break }
      // Boundary-ring intersection (claim edge crosses territory edge).
      let crossed = false
      for (const cr of claimRings) {
        for (let s = 0; s < cr.length && !crossed; s++) {
          const c1 = cr[s], c2 = cr[(s + 1) % cr.length]
          for (let q = 0; q < ring.length; q++) {
            if (segInt(c1, c2, ring[q], ring[(q + 1) % ring.length])) { crossed = true; break }
          }
        }
        if (crossed) break
      }
      if (crossed) { touches = true; break }
      // Claim-boundary vertices inside the territory.
      if (claimRings.some(cr => cr.some(v => pointInRing(v, ring)))) { touches = true; break }
      // Territory vertices inside a claim boundary.
      if (claimRings.some(cr => ring.some(v => pointInRing(v, cr)))) { touches = true; break }
    }
    if (touches) {
      overlaps.push({ name: a.name, kind: a.kind, distance_km: 0 })
      continue
    }
    // Near-miss buffer: closest edge distance.
    let best = Infinity
    for (const ring of a.rings) {
      const d = ringDistKm(point, ring, kx)
      if (d < best) best = d
    }
    if (best <= NEAR_KM) {
      overlaps.push({ name: a.name, kind: a.kind, distance_km: Math.round(best * 10) / 10 })
    }
  }
  if (overlaps.length > 0) {
    withOverlap++
    f.properties = f.properties || {}
    f.properties.overlaps = overlaps
    f.properties.has_overlap = true
  } else if (f.properties) {
    delete f.properties.overlaps
    delete f.properties.has_overlap
  }
  newFeatures[i] = f
  if ((i + 1) % 2000 === 0) console.log(`  …processed ${i + 1}`)
}

points.features = newFeatures
writeFileSync(OUT, JSON.stringify(points))
console.log(`\nWrote ${OUT}`)
console.log(`  ${withOverlap.toLocaleString()} features touch a protected area (or sit within ${NEAR_KM} km)`)
