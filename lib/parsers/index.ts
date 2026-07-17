/**
 * lib/parsers/index.ts
 * @why Parser registry — detects file format by extension, routes to the correct parser (GeoJSON, CSV, KML, KMZ), and returns a unified ImportResult.
 */
import { parseGeoJSON } from './geojson'
import { parseCSV } from './csv'
import { parseKML } from './kml'
import { parseKMZ } from './kmz'

export interface ImportResult {
  features: GeoJSON.Feature[]
  name: string
  count: number
  properties: string[]
  errors: string[]
}

export type ImportFormat = 'geojson' | 'csv' | 'kml' | 'kmz'

const FORMAT_MAP: Record<string, ImportFormat> = {
  '.geojson': 'geojson', '.json': 'geojson',
  '.csv': 'csv', '.tsv': 'csv',
  '.kml': 'kml',
  '.kmz': 'kmz',
}

export function detectFormat(fileName: string): ImportFormat | null {
  const ext = fileName.toLowerCase().replace(/.*\./, '.')
  return FORMAT_MAP[ext] || null
}

export async function parseFile(text: string, data: ArrayBuffer | null, fileName: string): Promise<ImportResult> {
  const format = detectFormat(fileName)
  if (!format) return { features: [], name: fileName, count: 0, properties: [], errors: [`Unsupported format: ${fileName}`] }

  if (format === 'kmz') {
    if (!data) return { features: [], name: fileName, count: 0, properties: [], errors: ['Binary data required for KMZ'] }
    return parseKMZ(data, fileName)
  }

  if (format === 'kml') return parseKML(text, fileName)
  if (format === 'geojson') return parseGeoJSON(text, fileName)
  if (format === 'csv') return parseCSV(text, fileName)

  return { features: [], name: fileName, count: 0, properties: [], errors: [`Unsupported format: ${format}`] }
}
