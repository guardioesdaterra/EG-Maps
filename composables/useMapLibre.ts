/**
 * composables/useMapLibre.ts
 * @why MapLibre GL instance lifecycle — create, destroy, resize, load handlers
 * @functions getMapStyle, offlineSatelliteStyle, detectWebGLSupport
 * @connections composables/useMapBase.ts, lib/tile-styles.ts, lib/garden-basemap.ts
 */
import type { StyleSpecification } from 'maplibre-gl'

export function getMapStyle(apiKey: string, tileResolution?: 'low' | 'medium' | 'high', baseURL = '/', tilesetId = 'hybrid-v4'): string | Record<string, unknown> {
  const resParam = tileResolution && tileResolution !== 'high' ? `&res=${tileResolution}` : ''
  if (apiKey) {
    return `https://api.maptiler.com/maps/${tilesetId}/style.json?key=${apiKey}${resParam}`
  }
  return {
    version: 8,
    // Fallback style has no text/symbol layers, so no glyphs endpoint needed.
    // Omitting glyphs prevents 404 errors from missing font endpoints.
    sources: {
      earthGuardiansLand: {
        type: 'geojson',
        data: `${baseURL.replace(/\/$/, '/')}data/embed/land-110m.geojson`,
      },
    },
    layers: [
      { id: 'local-background', type: 'background', paint: { 'background-color': '#07110d' } },
      { id: 'local-land', type: 'fill', source: 'earthGuardiansLand', paint: { 'fill-color': '#193b2a', 'fill-opacity': 0.92 } },
      { id: 'local-land-outline', type: 'line', source: 'earthGuardiansLand', paint: { 'line-color': '#5b8f63', 'line-opacity': 0.45, 'line-width': 0.7 } },
    ],
  }
}

export interface OfflineStyleOptions {
  /**
   * Source maxzoom — set to the cached pyramid's max zoom so MapLibre
   * overzooms by requesting the parent canonical tile (correct UVs) instead
   * of asking for missing child tiles above the downloaded range.
   */
  maxzoom?: number
  minzoom?: number
}

/**
 * Local raster style that points at MapTiler satellite tile URLs. Tile
 * requests go through `transformMapTileRequest` → `egoffline://`, so a
 * downloaded IndexedDB pyramid paints without fetching style.json from the
 * network — the offline path when the remote MapTiler style cannot load.
 */
export function offlineSatelliteStyle(apiKey = '', options: OfflineStyleOptions = {}): StyleSpecification {
  const key = encodeURIComponent(apiKey)
  const maxzoom = options.maxzoom !== undefined ? Math.max(0, Math.min(24, Math.floor(options.maxzoom))) : 20
  const minzoom = options.minzoom !== undefined ? Math.max(0, Math.min(maxzoom, Math.floor(options.minzoom))) : 0
  return {
    version: 8,
    sources: {
      'eg-offline-satellite': {
        type: 'raster',
        tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${key}`],
        tileSize: 256,
        minzoom,
        maxzoom,
        attribution: 'MapTiler satellite · offline cache',
      },
    },
    layers: [
      { id: 'eg-offline-satellite', type: 'raster', source: 'eg-offline-satellite' },
    ],
  }
}

export function detectWebGLSupport(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}
