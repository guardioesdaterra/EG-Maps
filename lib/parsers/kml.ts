/**
 * KML parser for Placemark geometries.
 * Polygon holes are preserved as GeoJSON interior rings, and coordinates are
 * validated before they reach the map layer.
 */
import { MAX_FEATURES, MAX_IMPORT_TEXT_BYTES, emptyImportResult, tooManyFeatures, utf8ByteLength } from './limits'

export interface KMLParseResult {
  features: GeoJSON.Feature[]
  name: string
  count: number
  properties: string[]
  errors: string[]
}

function closeRing(coords: [number, number][]): [number, number][] | null {
  if (coords.length < 3) return null
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push([first[0], first[1]])
  return coords.length >= 4 ? coords : null
}

function parseKMLCoords(text: string): [number, number][] {
  const coords: [number, number][] = []
  const normalized = text.trim()
  if (!normalized) return coords
  for (const pair of normalized.split(/\s+/)) {
    const parts = pair.split(',')
    const lng = Number(parts[0])
    const lat = Number(parts[1])
    if (Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
      coords.push([lng, lat])
    } else {
      return []
    }
  }
  return coords
}

function coordinatesFromRing(ring: Element): [number, number][] | null {
  const text = ring.querySelector('coordinates')?.textContent || ''
  return closeRing(parseKMLCoords(text))
}

function parseKMLGeometry(geomEl: Element): GeoJSON.Geometry | null {
  const polygon = geomEl.querySelector('Polygon')
  if (polygon) {
    const outer = polygon.querySelector('outerBoundaryIs LinearRing')
    const outerCoords = outer ? coordinatesFromRing(outer) : null
    if (!outerCoords) return null
    const holes: [number, number][][] = []
    polygon.querySelectorAll('innerBoundaryIs LinearRing').forEach(ring => {
      const coords = coordinatesFromRing(ring)
      if (coords) holes.push(coords)
    })
    return { type: 'Polygon', coordinates: [outerCoords, ...holes] }
  }

  const point = geomEl.querySelector('Point')
  if (point) {
    const coords = parseKMLCoords(point.querySelector('coordinates')?.textContent || '')[0]
    return coords ? { type: 'Point', coordinates: coords } : null
  }
  const line = geomEl.querySelector('LineString')
  if (line) {
    const coords = parseKMLCoords(line.querySelector('coordinates')?.textContent || '')
    return coords.length >= 2 ? { type: 'LineString', coordinates: coords } : null
  }
  const ring = geomEl.querySelector('LinearRing')
  const ringCoords = ring ? coordinatesFromRing(ring) : null
  return ringCoords ? { type: 'Polygon', coordinates: [ringCoords] } : null
}

function getKMLText(parent: Element, tag: string): string {
  return parent.querySelector(tag)?.textContent?.trim() || ''
}

function parsePlacemark(el: Element, index: number): GeoJSON.Feature | null {
  const geometry = parseKMLGeometry(el)
  if (!geometry) return null
  const props: Record<string, string> = {}
  const name = getKMLText(el, 'name')
  if (name) props.name = name
  const desc = getKMLText(el, 'description')
  if (desc) props.description = desc
  const extData = el.querySelector('ExtendedData')
  extData?.querySelectorAll('Data').forEach(d => {
    const n = d.getAttribute('name') || ''
    const v = d.querySelector('value')?.textContent?.trim() || ''
    if (n) props[n] = v
  })
  return { type: 'Feature', id: index, geometry, properties: props }
}

export function parseKML(text: string, fileName: string): KMLParseResult {
  if (utf8ByteLength(text) > MAX_IMPORT_TEXT_BYTES) {
    return emptyImportResult<KMLParseResult>(fileName, `Import text exceeds the ${MAX_IMPORT_TEXT_BYTES / 1024 / 1024} MiB limit`)
  }
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(text, 'text/xml')
    const parseErr = doc.querySelector('parsererror')
    if (parseErr) return emptyImportResult<KMLParseResult>(fileName, 'Invalid XML: ' + (parseErr.textContent || ''))
  } catch {
    return emptyImportResult<KMLParseResult>(fileName, 'Failed to parse XML')
  }
  const placemarks = doc.querySelectorAll('Placemark')
  if (placemarks.length > MAX_FEATURES) return emptyImportResult<KMLParseResult>(fileName, tooManyFeatures(placemarks.length))
  const features: GeoJSON.Feature[] = []
  placemarks.forEach((pm, i) => {
    const feature = parsePlacemark(pm, i)
    if (feature) features.push(feature)
  })
  const nameEl = doc.querySelector('Document > name, Folder > name, kml > name')
  const name = nameEl?.textContent?.trim() || fileName.replace(/\.[^.]+$/, '')
  const props = new Set<string>()
  for (const feature of features) {
    if (feature.properties) Object.keys(feature.properties).forEach(key => props.add(key))
  }
  return { features, name, count: features.length, properties: [...props], errors: [] }
}
