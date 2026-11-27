/**
 * lib/garden-basemap.ts
 * @why Basemap styles for the Agroecological Garden Tool. Resolves styles
 *      identically to the main maps (useMapBase.currentStyle): MapTiler
 *      style.json when a key is available, offline IndexedDB satellite when a
 *      pyramid is cached, and the local land-background fallback as a last
 *      resort. The garden never renders ESRI tiles — it uses the same MapTiler
 *      basemap as every other map.
 * @functions buildGardenStyle, streetsStyle, resolveGardenStyle, initialGardenStyle
 * @connections components/tools/garden/AgroecologicalGardenTool.vue,
 *              components/tools/garden/GardenToolMobile.vue
 */

import type { StyleSpecification } from 'maplibre-gl'
import { getMapStyle, offlineSatelliteStyle } from '@/composables/useMapLibre'
import { tileStyleDef, type TileStyleId } from '@/lib/tile-styles'

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

/**
 * Resolve the garden basemap identically to the main maps:
 *   - MapTiler style.json when a key is available (same tileset as every map)
 *   - offline IndexedDB satellite when a pyramid is cached
 *   - local land-background fallback (getMapStyle with no key) as last resort
 * Never renders ESRI tiles.
 */
export function buildGardenStyle(apiKey: string, maptilerStyle = 'satellite-v4'): string | StyleSpecification {
  if (apiKey) {
    // Same MapTiler style.json resolution as every other map (useMapLibre.getMapStyle).
    return getMapStyle(apiKey, undefined, '/', maptilerStyle) as string | StyleSpecification
  }
  return getMapStyle('', undefined, '/') as string | StyleSpecification
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
 *   0 MapTiler (styleId) → 1 offline IndexedDB satellite →
 *   2+ local land-background fallback (same as useMapBase).
 *
 * Offline + cache starts at level 1 with the local raster style (remote
 * style.json cannot load offline). ESRI tiles are not used at any level.
 */
export function resolveGardenStyle(level: number, ctx: GardenStyleContext): string | StyleSpecification {
  if (level <= 0) {
    if (!ctx.apiKey) {
      if (ctx.hasOfflineTiles) return offlineStyle(ctx)
      return buildGardenStyle('')
    }
    return buildGardenStyle(ctx.apiKey, tileStyleDef(ctx.styleId).maptilerStyle)
  }
  if (level === 1) {
    if (ctx.hasOfflineTiles) return offlineStyle(ctx)
    return buildGardenStyle('')
  }
  return buildGardenStyle('')
}

/** Initial style + starting fallback level for a garden map. */
export function initialGardenStyle(ctx: GardenStyleContext): { style: string | StyleSpecification; level: number } {
  if (!ctx.isOnline && ctx.hasOfflineTiles) {
    return { style: offlineStyle(ctx), level: 1 }
  }
  if (!ctx.apiKey) {
    return ctx.hasOfflineTiles
      ? { style: offlineStyle(ctx), level: 1 }
      : { style: buildGardenStyle(''), level: 2 }
  }
  return { style: resolveGardenStyle(0, ctx), level: 0 }
}
