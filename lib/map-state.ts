/**
 * Map view state encoded in namespaced query parameters for shareable map URLs.
 * The existing route's `zoom` parameter remains untouched for compatibility.
 */
export interface MapCameraState {
  center: [longitude: number, latitude: number]
  zoom: number
  bearing: number
  pitch: number
}

export interface MapShareState extends MapCameraState {
  showHexGrid?: boolean
  showConnections?: boolean
  selectedSpeciesGroups?: string[]
}

export const MAP_CAMERA_QUERY_KEYS = {
  longitude: 'mapLng',
  latitude: 'mapLat',
  zoom: 'mapZoom',
  bearing: 'mapBearing',
  pitch: 'mapPitch',
} as const

export const MAP_VIEW_QUERY_KEYS = {
  hexGrid: 'mapHex',
  connections: 'mapConnections',
  speciesGroups: 'mapGroups',
} as const

const MAX_MERCATOR_LATITUDE = 85.051129
const MAX_MAP_ZOOM = 24
const MAX_MAP_PITCH = 60
const VALID_SPECIES_GROUPS = new Set(['Mammal', 'Bird', 'Amphibian', 'Reptile', 'Fish', 'Plant', 'Invertebrate'])

function firstValue(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value
  if (candidate === null || candidate === undefined) return null
  if (typeof candidate !== 'string' && typeof candidate !== 'number') return null
  return String(candidate)
}

function parseFinite(value: unknown): number | null {
  const raw = firstValue(value)
  if (raw === null || raw.trim() === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function parseBoolean(value: unknown): boolean | undefined {
  const raw = firstValue(value)?.toLowerCase()
  if (raw === '1' || raw === 'true') return true
  if (raw === '0' || raw === 'false') return false
  return undefined
}

export function parseMapCameraState(query: Record<string, unknown>): Partial<MapCameraState> {
  const lng = parseFinite(query[MAP_CAMERA_QUERY_KEYS.longitude])
  const lat = parseFinite(query[MAP_CAMERA_QUERY_KEYS.latitude])
  const zoom = parseFinite(query[MAP_CAMERA_QUERY_KEYS.zoom])
  const bearing = parseFinite(query[MAP_CAMERA_QUERY_KEYS.bearing])
  const pitch = parseFinite(query[MAP_CAMERA_QUERY_KEYS.pitch])
  const result: Partial<MapCameraState> = {}

  if (lng !== null && lat !== null && lng >= -180 && lng <= 180 && lat >= -MAX_MERCATOR_LATITUDE && lat <= MAX_MERCATOR_LATITUDE) {
    result.center = [lng, lat]
  }
  if (zoom !== null && zoom >= 0 && zoom <= MAX_MAP_ZOOM) result.zoom = zoom
  if (bearing !== null && bearing >= -360 && bearing <= 360) result.bearing = bearing
  if (pitch !== null && pitch >= 0 && pitch <= MAX_MAP_PITCH) result.pitch = pitch
  return result
}

export function parseMapShareState(query: Record<string, unknown>): Partial<MapShareState> {
  const result: Partial<MapShareState> = { ...parseMapCameraState(query) }
  const hexGrid = parseBoolean(query[MAP_VIEW_QUERY_KEYS.hexGrid])
  const connections = parseBoolean(query[MAP_VIEW_QUERY_KEYS.connections])
  if (hexGrid !== undefined) result.showHexGrid = hexGrid
  if (connections !== undefined) result.showConnections = connections
  const groupText = firstValue(query[MAP_VIEW_QUERY_KEYS.speciesGroups])
  if (groupText !== null) {
    result.selectedSpeciesGroups = [...new Set(groupText.split(',').map(group => group.trim()).filter(group => VALID_SPECIES_GROUPS.has(group)))].slice(0, VALID_SPECIES_GROUPS.size)
  }
  return result
}

export function serializeMapCameraState(state: MapCameraState): Record<string, string> {
  const [longitude, latitude] = state.center
  return {
    [MAP_CAMERA_QUERY_KEYS.longitude]: longitude.toFixed(5),
    [MAP_CAMERA_QUERY_KEYS.latitude]: latitude.toFixed(5),
    [MAP_CAMERA_QUERY_KEYS.zoom]: state.zoom.toFixed(2),
    [MAP_CAMERA_QUERY_KEYS.bearing]: state.bearing.toFixed(1),
    [MAP_CAMERA_QUERY_KEYS.pitch]: state.pitch.toFixed(1),
  }
}

export function serializeMapShareState(state: MapShareState): Record<string, string> {
  const serialized: Record<string, string> = serializeMapCameraState(state)
  if (state.showHexGrid !== undefined) serialized[MAP_VIEW_QUERY_KEYS.hexGrid] = state.showHexGrid ? '1' : '0'
  if (state.showConnections !== undefined) serialized[MAP_VIEW_QUERY_KEYS.connections] = state.showConnections ? '1' : '0'
  if (state.selectedSpeciesGroups !== undefined) {
    serialized[MAP_VIEW_QUERY_KEYS.speciesGroups] = [...new Set(state.selectedSpeciesGroups.filter(group => VALID_SPECIES_GROUPS.has(group)))].join(',')
  }
  return serialized
}

/** Updates only the map's namespaced parameters, retaining unrelated query/hash state. */
export function buildMapShareUrl(href: string, state: MapShareState): string {
  const url = new URL(href)
  for (const [key, value] of Object.entries(serializeMapShareState(state))) {
    if (value === '') url.searchParams.delete(key)
    else url.searchParams.set(key, value)
  }
  return url.toString()
}
