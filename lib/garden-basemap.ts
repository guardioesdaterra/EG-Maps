/**
 * lib/garden-basemap.ts
 * @why Basemap styles for the Agroecological Garden Tool. A garden planner is
 *      unusable without imagery, so when no MapTiler key is configured (or the
 *      MapTiler style fails) we still render real satellite tiles instead of an
 *      empty vector world.
 * @functions buildGardenStyle, satelliteStyle, streetsStyle
 * @connections components/tools/garden/AgroecologicalGardenTool.vue
 */

import type { StyleSpecification } from 'maplibre-gl'

const ESRI_IMAGERY_TILES = [
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
]

const ESRI_ATTRIBUTION = 'Imagery © Esri, Maxar, Earthstar Geographics'

/** Free raster fallback — CARTO Voyager with attribution. */
export function streetsStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: '© OpenStreetMap contributors © CARTO',
      },
    },
    layers: [
      { id: 'carto', type: 'raster', source: 'carto' },
    ],
  }
}

/** Satellite imagery without an API key. */
export function satelliteStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: ESRI_IMAGERY_TILES,
        tileSize: 256,
        maxzoom: 19,
        attribution: ESRI_ATTRIBUTION,
        scheme: 'tms',
      },
    },
    layers: [
      { id: 'satellite', type: 'raster', source: 'satellite' },
    ],
  }
}

/**
 * Resolve the garden basemap: MapTiler when a key is available, otherwise
 * keyless satellite imagery. Callers should watch for style load errors and
 * switch to `streetsStyle()` as a last resort.
 */
export function buildGardenStyle(apiKey: string, maptilerStyle = 'satellite-v4'): string | StyleSpecification {
  if (apiKey) {
    return `https://api.maptiler.com/maps/${maptilerStyle}/style.json?key=${encodeURIComponent(apiKey)}`
  }
  // Use streets style (CARTO Voyager) as default when no MapTiler key
  // ESRI satellite tiles with TMS scheme don't work reliably in MapLibre
  return streetsStyle()
}
