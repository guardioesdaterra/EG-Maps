/**
 * Validates and parses GeoJSON text with bounded input and feature counts.
 */
import { MAX_FEATURES, MAX_IMPORT_TEXT_BYTES, emptyImportResult, tooManyFeatures, utf8ByteLength } from './limits'

export interface ParseResult {
  features: GeoJSON.Feature[]
  name: string
  count: number
  properties: string[]
  errors: string[]
}

const GEOMETRY_TYPES = new Set(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'])

function validPosition(value: unknown): boolean {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]) && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90
}

function validGeometry(value: unknown): value is GeoJSON.Geometry {
  if (!value || typeof value !== 'object' || !GEOMETRY_TYPES.has((value as { type?: unknown }).type as string)) return false
  const geometry = value as { type: string; coordinates?: unknown; geometries?: unknown }
  if (geometry.type === 'GeometryCollection') return Array.isArray(geometry.geometries) && geometry.geometries.every(validGeometry)
  const coords = geometry.coordinates
  if (geometry.type === 'Point') return validPosition(coords)
  if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') return Array.isArray(coords) && coords.length >= 2 && coords.every(validPosition)
  if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') return Array.isArray(coords) && coords.length > 0 && coords.every((ring: unknown) => Array.isArray(ring) && ring.length >= 2 && ring.every(validPosition))
  return Array.isArray(coords) && coords.length > 0 && coords.every((polygon: unknown) => Array.isArray(polygon) && polygon.length > 0 && polygon.every((ring: unknown) => Array.isArray(ring) && ring.length >= 2 && ring.every(validPosition)))
}

export function parseGeoJSON(text: string, fileName: string): ParseResult {
  if (utf8ByteLength(text) > MAX_IMPORT_TEXT_BYTES) return emptyImportResult<ParseResult>(fileName, `Import text exceeds the ${MAX_IMPORT_TEXT_BYTES / 1024 / 1024} MiB limit`)
  let data: Record<string, unknown>
  try { data = JSON.parse(text) } catch { return emptyImportResult<ParseResult>(fileName, 'Invalid JSON syntax') }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyImportResult<ParseResult>(fileName, 'Not a valid GeoJSON object')

  const errors: string[] = []
  let features: GeoJSON.Feature[] = []
  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    if (data.features.length > MAX_FEATURES) return emptyImportResult<ParseResult>(fileName, tooManyFeatures(data.features.length))
    features = data.features.filter((f: unknown): f is GeoJSON.Feature => {
      if (!f || typeof f !== 'object' || (f as { type?: unknown }).type !== 'Feature' || !validGeometry((f as { geometry?: unknown }).geometry)) {
        errors.push('FeatureCollection contains an invalid feature or geometry')
        return false
      }
      return true
    })
  } else if (data.type === 'Feature' && validGeometry(data.geometry)) {
    features = [data as unknown as GeoJSON.Feature]
  } else if (data.type === 'GeometryCollection' && Array.isArray(data.geometries)) {
    if (data.geometries.length > MAX_FEATURES) return emptyImportResult<ParseResult>(fileName, tooManyFeatures(data.geometries.length))
    features = (data.geometries as unknown[]).filter(validGeometry).map((g, i) => ({ type: 'Feature' as const, id: i, geometry: g as GeoJSON.Geometry, properties: {} }))
    if (features.length !== data.geometries.length) errors.push('GeometryCollection contains invalid geometry')
  } else if (typeof data.type === 'string' && GEOMETRY_TYPES.has(data.type) && validGeometry(data)) {
    features = [{ type: 'Feature' as const, geometry: data as unknown as GeoJSON.Geometry, properties: {} }]
  } else {
    errors.push('No recognizable GeoJSON structure found')
  }
  const props = new Set<string>()
  for (const f of features) if (f.properties && typeof f.properties === 'object') Object.keys(f.properties).forEach(k => props.add(k))
  const metadata = data.metadata as Record<string, unknown> | undefined
  const name = typeof data.name === 'string' ? data.name : (typeof metadata?.name === 'string' ? metadata.name : fileName.replace(/\.[^.]+$/, ''))
  return { features, name, count: features.length, properties: [...props], errors }
}
