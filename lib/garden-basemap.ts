/**
 * lib/garden-basemap.ts
 * @why Basemap styles for the Agroecological Garden Tool. A garden planner is
 *      unusable without imagery, so when no MapTiler key is configured (or the
 *      MapTiler style fails) we still render real satellite tiles instead of an
 *      empty vector world. Downloaded offline tiles are preferred over remote
 *      free raster sources when a backup pyramid exists.
 * @functions buildGardenStyle, satelliteStyle, streetsStyle, resolveGardenStyle
 * @connections components/tools/garden/AgroecologicalGardenTool.vue,
 *              components/tools/garden/GardenToolMobile.vue
 */

import type { StyleSpecification } from 'maplibre-gl'
import { getMapStyle, offlineSatelliteStyle } from '@/composables/useMapLibre'
import { tileStyleDef, type TileStyleId } from '@/lib/tile-styles'

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
    // Same MapTiler style.json resolution as every other map (useMapLibre.getMapStyle).
    return getMapStyle(apiKey, undefined, '/', maptilerStyle) as string | StyleSpecification
  }
  // Use streets style (CARTO Voyager) as default when no MapTiler key
  // ESRI satellite tiles with TMS scheme don't work reliably in MapLibre
  return streetsStyle()
}

export interface GardenStyleContext {
  /** MapTiler key when the effective provider allows it (empty string = none). */
  apiKey: string
  /** Raw runtime key for offline tile URLs (may be present even on fallback). */
  offlineApiKey: string
  hasOfflineTiles: boolean
  cachedMinZoom: number
  cachedMaxZoom: number
  styleId: TileStyleId
  /** True when the browser reports offline. */
  isOnline: boolean
}

function offlineStyle(ctx: GardenStyleContext): StyleSpecification {
  const maxzoom = ctx.cachedMaxZoom > 0 ? ctx.cachedMaxZoom : 20
  const minzoom = ctx.cachedMinZoom > 0 ? Math.min(ctx.cachedMinZoom, maxzoom) : 0
  return offlineSatelliteStyle(ctx.offlineApiKey, { maxzoom, minzoom })
}

/**
 * Shared garden fallback ladder (both desktop and mobile tools):
 *   0 MapTiler (styleId) → 1 offline IndexedDB satellite / CARTO →
 *   2 CARTO → 3 ESRI satellite.
 *
 * Offline + cache starts at level 1 with the local raster style (remote
 * style.json cannot load offline).
 */
export function resolveGardenStyle(level: number, ctx: GardenStyleContext): string | StyleSpecification {
  if (level <= 0) {
    if (!ctx.apiKey) return ctx.hasOfflineTiles ? offlineStyle(ctx) : streetsStyle()
    return buildGardenStyle(ctx.apiKey, tileStyleDef(ctx.styleId).maptilerStyle)
  }
  if (level === 1) {
    if (ctx.hasOfflineTiles) return offlineStyle(ctx)
    return streetsStyle()
  }
  if (level === 2) return streetsStyle()
  return satelliteStyle()
}

/** Initial style + starting fallback level for a garden map. */
export function initialGardenStyle(ctx: GardenStyleContext): { style: string | StyleSpecification; level: number } {
  if (!ctx.isOnline && ctx.hasOfflineTiles) {
    return { style: offlineStyle(ctx), level: 1 }
  }
  if (!ctx.apiKey) {
    return ctx.hasOfflineTiles
      ? { style: offlineStyle(ctx), level: 1 }
      : { style: streetsStyle(), level: 2 }
  }
  return { style: resolveGardenStyle(0, ctx), level: 0 }
}
