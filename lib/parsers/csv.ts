/**
 * lib/parsers/csv.ts
 * @why CSV parser with auto-delimiter detection (comma, semicolon, tab) and auto-column mapping for lat/lng, name, title, description, and image_url fields. Returns GeoJSON FeatureCollection of Point features.
 */
export interface CSVParseResult {
  features: GeoJSON.Feature[]
  name: string
  count: number
  properties: string[]
  errors: string[]
}

function detectDelimiter(header: string): string {
  const semicolons = (header.match(/;/g) || []).length
  const commas = (header.match(/,/g) || []).length
  const tabs = (header.match(/\t/g) || []).length
  if (semicolons > commas && semicolons > tabs) return ';'
  if (tabs > commas && tabs > semicolons) return '\t'
  return ','
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
}

function detectLatColumn(cols: string[]): string | null {
  const latKeywords = ['lat', 'latitude', 'latitud', 'ycoord', 'y_coord', 'y']
  for (const col of cols) {
    const n = normalizeName(col)
    if (latKeywords.includes(n)) return col
  }
  for (const col of cols) {
    const n = normalizeName(col)
    if (n.startsWith('lat')) return col
  }
  return null
}

function detectLngColumn(cols: string[]): string | null {
  const lngKeywords = ['lng', 'lon', 'long', 'longitude', 'xcoord', 'x_coord', 'x']
  for (const col of cols) {
    const n = normalizeName(col)
    if (lngKeywords.includes(n)) return col
  }
  for (const col of cols) {
    const n = normalizeName(col)
    if (n.startsWith('lng') || n.startsWith('lon')) return col
  }
  return null
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export function parseCSV(text: string, fileName: string): CSVParseResult {
  const errors: string[] = []
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) {
    return { features: [], name: fileName, count: 0, properties: [], errors: ['CSV must have a header row and at least one data row'] }
  }
  const delimiter = detectDelimiter(lines[0])
  const headers = parseCSVLine(lines[0], delimiter).map(h => h.replace(/^["']|["']$/g, ''))
  const latCol = detectLatColumn(headers)
  const lngCol = detectLngColumn(headers)
  if (!latCol || !lngCol) {
    errors.push(`Could not detect latitude/longitude columns. Found: ${headers.join(', ')}`)
    return { features: [], name: fileName, count: 0, properties: headers, errors }
  }
  const features: GeoJSON.Feature[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter).map(v => v.replace(/^["']|["']$/g, ''))
    if (values.length === 0) continue
    const props: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      if (j < values.length) props[headers[j]] = values[j]
    }
    const lat = parseFloat(props[latCol])
    const lng = parseFloat(props[lngCol])
    if (isNaN(lat) || isNaN(lng)) {
      errors.push(`Row ${i + 1}: invalid coordinates (${props[latCol]}, ${props[lngCol]})`)
      continue
    }
    features.push({
      type: 'Feature',
      properties: props,
      geometry: { type: 'Point', coordinates: [lng, lat] },
    })
  }
  const name = fileName.replace(/\.[^.]+$/, '')
  return { features, name, count: features.length, properties: headers, errors }
}
