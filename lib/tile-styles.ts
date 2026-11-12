/**
 * lib/tile-styles.ts
 * @why Basemap tile-style registry for the MapTiler provider — the satellite/
 *      hybrid/streets/outdoors choice surfaced in the header style switcher.
 * @functions isTileStyleId
 * @consts TILE_STYLES, DEFAULT_TILE_STYLE, TILE_STYLE_STORAGE_KEY
 * @types TileStyleId
 * @connections composables/useMapTileStyle.ts, composables/useMapLibre.ts, layouts/default.vue
 */

export type TileStyleId = 'hybrid' | 'satellite' | 'streets' | 'outdoors'

export interface TileStyleDef {
  id: TileStyleId
  /** MapTiler style/tileset slug used in the style.json URL. */
  maptilerStyle: string
  /** i18n key under mapStyles.* */
  labelKey: string
  icon: string
}

export const TILE_STYLES: readonly TileStyleDef[] = [
  { id: 'hybrid', maptilerStyle: 'hybrid-v4', labelKey: 'mapStyles.hybrid', icon: 'gis:satellite' },
  { id: 'satellite', maptilerStyle: 'satellite-v4', labelKey: 'mapStyles.satellite', icon: 'tabler:satellite' },
  { id: 'streets', maptilerStyle: 'streets-v2', labelKey: 'mapStyles.streets', icon: 'tabler:map-2' },
  { id: 'outdoors', maptilerStyle: 'outdoors-v2', labelKey: 'mapStyles.outdoors', icon: 'tabler:mountain' },
] as const

export const DEFAULT_TILE_STYLE: TileStyleId = 'hybrid'

export const TILE_STYLE_STORAGE_KEY = 'eg-map-tile-style'

export function isTileStyleId(value: unknown): value is TileStyleId {
  return typeof value === 'string' && TILE_STYLES.some(s => s.id === value)
}

export function tileStyleDef(id: TileStyleId): TileStyleDef {
  return TILE_STYLES.find(s => s.id === id) ?? TILE_STYLES[0]!
}
