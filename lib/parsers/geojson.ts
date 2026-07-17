/**
 * lib/parsers/geojson.ts
 * @why Validates and parses GeoJSON text — handles FeatureCollection, single Feature, Geometry, and GeometryCollection inputs. Returns typed ParseResult with features, property names, and error list.
 */
export interface ParseResult {
  features: GeoJSON.Feature[]
  name: string
  count: number
  properties: string[]
  errors: string[]
}

export function parseGeoJSON(text: string, fileName: string): ParseResult {
  const errors: string[] = []
  let data: any
  try { data = JSON.parse(text) } catch {
    return { features: [], name: fileName, count: 0, properties: [], errors: ['Invalid JSON syntax'] }
  }
  if (!data || typeof data !== 'object') {
    return { features: [], name: fileName, count: 0, properties: [], errors: ['Not a valid GeoJSON object'] }
  }
  let features: GeoJSON.Feature[] = []
  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    features = data.features.filter((f: GeoJSON.Feature) => f && f.type === 'Feature' && f.geometry)
  } else if (data.type === 'Feature' && data.geometry) {
    features = [data]
  } else if (data.type === 'GeometryCollection' && Array.isArray(data.geometries)) {
    features = data.geometries.map((g: any, i: number) => ({ type: 'Feature', id: i, geometry: g, properties: {} }))
  } else if (['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(data.type)) {
    features = [{ type: 'Feature', geometry: data, properties: {} }]
  } else {
    errors.push('No recognizable GeoJSON structure found')
  }
  const props = new Set<string>()
  for (const f of features) {
    if (f.properties) Object.keys(f.properties).forEach(k => props.add(k))
  }
  const name = data.name || data.metadata?.name || fileName.replace(/\.[^.]+$/, '')
  return { features, name, count: features.length, properties: [...props], errors }
}
