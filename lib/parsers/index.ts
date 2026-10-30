/**
 * Parser registry and bounded import entry point.
 */
import { parseGeoJSON } from './geojson'
import { parseCSV } from './csv'
import { parseKML } from './kml'
import { parseKMZ } from './kmz'
import { MAX_IMPORT_TEXT_BYTES, MAX_KMZ_ARCHIVE_BYTES, emptyImportResult, utf8ByteLength } from './limits'

export interface ImportResult {
  features: GeoJSON.Feature[]
  name: string
  count: number
  properties: string[]
  errors: string[]
}

export type ImportFormat = 'geojson' | 'csv' | 'kml' | 'kmz'

const FORMAT_MAP: Record<string, ImportFormat> = {
  '.geojson': 'geojson', '.json': 'geojson', '.csv': 'csv', '.tsv': 'csv', '.kml': 'kml', '.kmz': 'kmz',
}

export function detectFormat(fileName: string): ImportFormat | null {
  const ext = fileName.toLowerCase().replace(/.*\./, '.')
  return FORMAT_MAP[ext] || null
}

export async function parseFile(text: string, data: ArrayBuffer | null, fileName: string): Promise<ImportResult> {
  const format = detectFormat(fileName)
  if (!format) return emptyImportResult<ImportResult>(fileName, `Unsupported format: ${fileName}`)
  if (format === 'kmz') {
    if (!data) return emptyImportResult<ImportResult>(fileName, 'Binary data required for KMZ')
    if (data.byteLength > MAX_KMZ_ARCHIVE_BYTES) return emptyImportResult<ImportResult>(fileName, `KMZ archive exceeds the ${MAX_KMZ_ARCHIVE_BYTES / 1024 / 1024} MiB limit`)
    return parseKMZ(data, fileName)
  }
  if (utf8ByteLength(text) > MAX_IMPORT_TEXT_BYTES) return emptyImportResult<ImportResult>(fileName, `Import text exceeds the ${MAX_IMPORT_TEXT_BYTES / 1024 / 1024} MiB limit`)
  if (format === 'kml') return parseKML(text, fileName)
  if (format === 'geojson') return parseGeoJSON(text, fileName)
  if (format === 'csv') return parseCSV(text, fileName)
  return emptyImportResult<ImportResult>(fileName, `Unsupported format: ${format}`)
}
