/**
 * lib/parsers/kml.ts
 * @why KML parser using browser DOMParser — extracts Placemarks with name, description, ExtendedData, and Point/LineString/Polygon geometries. Returns typed ParseResult.
 */
export interface KMLParseResult {
  features: GeoJSON.Feature[]
  name: string
  count: number
  properties: string[]
  errors: string[]
}

function parseKMLCoords(text: string): [number, number][] {
  const coords: [number, number][] = []
  const pairs = text.trim().split(/\s+/)
  for (let i = 0; i < pairs.length; i++) {
    const parts = pairs[i].split(',')
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0])
      const lat = parseFloat(parts[1])
      if (!isNaN(lat) && !isNaN(lng)) coords.push([lng, lat])
    }
  }
  return coords
}

function parseKMLGeometry(geomEl: Element): GeoJSON.Geometry | null {
  const point = geomEl.querySelector('Point')
  if (point) {
    const coordsEl = point.querySelector('coordinates')
    if (coordsEl?.textContent) {
      const c = parseKMLCoords(coordsEl.textContent)[0]
      if (c) return { type: 'Point', coordinates: c }
    }
  }
  const line = geomEl.querySelector('LineString')
  if (line) {
    const coordsEl = line.querySelector('coordinates')
    if (coordsEl?.textContent) {
      const c = parseKMLCoords(coordsEl.textContent)
      if (c.length > 0) return { type: 'LineString', coordinates: c }
    }
  }
  const ring = geomEl.querySelector('LinearRing')
  if (ring) {
    const coordsEl = ring.querySelector('coordinates')
    if (coordsEl?.textContent) {
      const c = parseKMLCoords(coordsEl.textContent)
      if (c.length > 0) return { type: 'Polygon', coordinates: [c] }
    }
  }
  const polygon = geomEl.querySelector('Polygon')
  if (polygon) {
    const ring = polygon.querySelector('outerBoundaryIs LinearRing')
    if (ring) {
      const coordsEl = ring.querySelector('coordinates')
      if (coordsEl?.textContent) {
        const c = parseKMLCoords(coordsEl.textContent)
        if (c.length > 0) return { type: 'Polygon', coordinates: [c] }
      }
    }
  }
  return null
}

function getKMLText(parent: Element, tag: string): string {
  const el = parent.querySelector(tag)
  return el?.textContent?.trim() || ''
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
  if (extData) {
    const dataEls = extData.querySelectorAll('Data')
    dataEls.forEach(d => {
      const n = d.getAttribute('name') || ''
      const v = d.querySelector('value')?.textContent?.trim() || ''
      if (n) props[n] = v
    })
  }
  return { type: 'Feature', id: index, geometry, properties: props }
}

export function parseKML(text: string, fileName: string): KMLParseResult {
  const errors: string[] = []
  let doc: Document
  try {
    const parser = new DOMParser()
    doc = parser.parseFromString(text, 'text/xml')
    const parseErr = doc.querySelector('parsererror')
    if (parseErr) {
      return { features: [], name: fileName, count: 0, properties: [], errors: ['Invalid XML: ' + (parseErr.textContent || '')] }
    }
  } catch {
    return { features: [], name: fileName, count: 0, properties: [], errors: ['Failed to parse XML'] }
  }
  const placemarks = doc.querySelectorAll('Placemark')
  const features: GeoJSON.Feature[] = []
  placemarks.forEach((pm, i) => {
    const f = parsePlacemark(pm, i)
    if (f) features.push(f)
  })
  const nameEl = doc.querySelector('Document > name, Folder > name, kml > name')
  const name = nameEl?.textContent?.trim() || fileName.replace(/\.[^.]+$/, '')
  const props = new Set<string>()
  for (const f of features) {
    if (f.properties) Object.keys(f.properties).forEach(k => props.add(k))
  }
  return { features, name, count: features.length, properties: [...props], errors }
}
