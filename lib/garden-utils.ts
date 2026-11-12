/**
 * lib/garden-utils.ts
 * @why Geospatial utilities for the Agroecological Garden Tool — no external deps.
 * Haversine distance, spherical polygon area, bounding box, GeoJSON helpers.
 * @connections lib/garden-types.ts
 */
import type { MeasurementResult, GardenFeature, GardenLocation } from './garden-types'

const EARTH_RADIUS_M = 6371000
const EARTH_RADIUS_FT = 20902260

function toRad(deg: number): number {
  return deg * Math.PI / 180
}

function toDeg(rad: number): number {
  return rad * 180 / Math.PI
}

/**
 * Haversine distance between two [lng, lat] points in meters.
 */
export function haversineDistance(
  a: [number, number],
  b: [number, number]
): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const cosLat1 = Math.cos(toRad(lat1))
  const cosLat2 = Math.cos(toRad(lat2))
  const a2 = sinDLat * sinDLat + cosLat1 * cosLat2 * sinDLng * sinDLng
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a2)))
}

/**
 * Spherical polygon area (meters²) using spherical excess (Girard's theorem).
 * Coordinates are [lng, lat] rings (outer ring only, no holes for now).
 */
export function sphericalPolygonArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0
  let sum = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i]
    const [lng2, lat2] = coords[i + 1]
    const dLng = toRad(lng2 - lng1)
    const sinLat1 = Math.sin(toRad(lat1))
    const sinLat2 = Math.sin(toRad(lat2))
    const cosLat1 = Math.cos(toRad(lat1))
    const cosLat2 = Math.cos(toRad(lat2))
    sum += dLng * (sinLat1 + sinLat2)
  }
  // Close the ring if not already closed
  const [lngLast, latLast] = coords[coords.length - 1]
  const [lngFirst, latFirst] = coords[0]
  if (lngLast !== lngFirst || latLast !== latFirst) {
    const dLng = toRad(lngFirst - lngLast)
    const sinLatLast = Math.sin(toRad(latLast))
    const sinLatFirst = Math.sin(toRad(latFirst))
    sum += dLng * (sinLatLast + sinLatFirst)
  }
  return Math.abs(sum / 2) * EARTH_RADIUS_M * EARTH_RADIUS_M
}

/**
 * Polygon perimeter in meters.
 */
export function polygonPerimeter(coords: [number, number][]): number {
  if (coords.length < 2) return 0
  let dist = 0
  for (let i = 0; i < coords.length - 1; i++) {
    dist += haversineDistance(coords[i], coords[i + 1])
  }
  // Close ring
  const last = coords[coords.length - 1]
  const first = coords[0]
  if (last[0] !== first[0] || last[1] !== first[1]) {
    dist += haversineDistance(last, first)
  }
  return dist
}

/**
 * LineString length in meters.
 */
export function lineStringLength(coords: [number, number][]): number {
  if (coords.length < 2) return 0
  let dist = 0
  for (let i = 0; i < coords.length - 1; i++) {
    dist += haversineDistance(coords[i], coords[i + 1])
  }
  return dist
}

/**
 * Format distance with metric/imperial units.
 */
export function formatDistance(meters: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'metric') {
    if (meters < 1000) return `${meters.toFixed(1)} m`
    return `${(meters / 1000).toFixed(2)} km`
  }
  const feet = meters * 3.28084
  if (feet < 5280) return `${feet.toFixed(1)} ft`
  return `${(feet / 5280).toFixed(2)} mi`
}

/**
 * Format area with metric/imperial units.
 */
export function formatArea(sqMeters: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'metric') {
    if (sqMeters < 10000) return `${sqMeters.toFixed(1)} m²`
    return `${(sqMeters / 10000).toFixed(3)} ha`
  }
  const sqFeet = sqMeters * 10.7639
  if (sqFeet < 43560) return `${sqFeet.toFixed(1)} ft²`
  return `${(sqFeet / 43560).toFixed(3)} ac`
}

/**
 * Create a MeasurementResult for a distance measurement.
 */
export function createDistanceMeasurement(
  coords: [number, number][],
  unit: 'metric' | 'imperial' = 'metric'
): MeasurementResult {
  const meters = lineStringLength(coords)
  return {
    type: 'distance',
    value: unit === 'metric' ? meters : meters * 3.28084,
    unit: unit === 'metric' ? 'm' : 'ft',
    label: formatDistance(meters, unit),
    coordinates: coords,
  }
}

/**
 * Create a MeasurementResult for an area/perimeter measurement.
 */
export function createAreaMeasurement(
  coords: [number, number][],
  unit: 'metric' | 'imperial' = 'metric'
): MeasurementResult {
  const sqMeters = sphericalPolygonArea(coords)
  const perimeterM = polygonPerimeter(coords)
  return {
    type: 'area',
    value: unit === 'metric' ? sqMeters : sqMeters * 10.7639,
    unit: unit === 'metric' ? 'ha' : 'ac',
    label: `${formatArea(sqMeters, unit)} · ${formatDistance(perimeterM, unit)}`,
    coordinates: coords,
  }
}

/**
 * Compute bounding box of features: [[minLng, minLat], [maxLng, maxLat]].
 */
export function computeBounds(features: GardenFeature[]): [[number, number], [number, number]] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  for (const f of features) {
    const coords = extractCoords(f.geometry)
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng
      if (lat < minLat) minLat = lat
      if (lng > maxLng) maxLng = lng
      if (lat > maxLat) maxLat = lat
    }
  }
  if (minLng === Infinity) return [[0, 0], [0, 0]]
  return [[minLng, minLat], [maxLng, maxLat]]
}

function extractCoords(geom: GardenFeature['geometry']): [number, number][] {
  if (geom.type === 'Point') return [geom.coordinates as [number, number]]
  if (geom.type === 'LineString') return geom.coordinates as [number, number][]
  if (geom.type === 'Polygon') return geom.coordinates[0] as [number, number][]
  return []
}

/**
 * Generate a short unique ID.
 */
export function generateId(prefix = 'garden'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Fit map bounds to features with padding.
 */
export function fitBounds(
  features: GardenFeature[],
  padding = 50
): { center: [number, number]; zoom: number } {
  if (features.length === 0) {
    return { center: [-47.9292, -15.7801], zoom: 16 }
  }
  const bounds = computeBounds(features)
  const [[minLng, minLat], [maxLng, maxLat]] = bounds
  const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
  // Estimate zoom from lat span (crude but works)
  const latSpan = maxLat - minLat
  const lngSpan = maxLng - minLng
  const maxSpan = Math.max(latSpan, lngSpan)
  let zoom = 16
  if (maxSpan > 0.01) zoom = 14
  if (maxSpan > 0.05) zoom = 12
  if (maxSpan > 0.2) zoom = 10
  return { center, zoom }
}

/**
 * Deep clone a GardenProject (for localStorage serialization).
 */
export function cloneProject(project: import('./garden-types').GardenProject): import('./garden-types').GardenProject {
  return JSON.parse(JSON.stringify(project))
}

/**
 * Validate project structure before save.
 */
export function validateProject(project: unknown): project is import('./garden-types').GardenProject {
  if (!project || typeof project !== 'object') return false
  const p = project as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.description === 'string' &&
    typeof p.location === 'object' &&
    p.location !== null &&
    Array.isArray(p.layers)
  )
}

/**
 * Get hemisphere from latitude.
 */
export function getHemisphere(lat: number): 'north' | 'south' {
  return lat >= 0 ? 'north' : 'south'
}

/**
 * Default location for a hemisphere (Brasília for south, London for north).
 */
export function defaultLocationForHemisphere(hemisphere: 'north' | 'south'): GardenLocation {
  if (hemisphere === 'south') return { lat: -15.7801, lng: -47.9292, zoom: 16 }
  return { lat: 51.5074, lng: -0.1278, zoom: 16 }
}