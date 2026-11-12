/**
 * composables/useMapTileStyle.ts
 * @why Shared, persisted basemap-style choice (hybrid/satellite/streets/outdoors)
 *      read by the header switcher and by useMapBase when resolving the style URL.
 * @functions useMapTileStyle
 * @connections lib/tile-styles.ts, composables/useMapLibre.ts, composables/useMapBase.ts, layouts/default.vue
 */
import { createSharedComposable, useLocalStorage } from '@vueuse/core'
import { DEFAULT_TILE_STYLE, TILE_STYLE_STORAGE_KEY, isTileStyleId, type TileStyleId } from '@/lib/tile-styles'

export const useMapTileStyle = createSharedComposable(() => {
  const styleId = useLocalStorage<TileStyleId>(TILE_STYLE_STORAGE_KEY, DEFAULT_TILE_STYLE)

  // Guard against hand-edited storage values.
  if (!isTileStyleId(styleId.value)) styleId.value = DEFAULT_TILE_STYLE

  function setStyle(id: TileStyleId) {
    styleId.value = id
  }

  function cycleStyle(): TileStyleId {
    const order: TileStyleId[] = ['hybrid', 'satellite', 'streets', 'outdoors']
    const idx = order.indexOf(styleId.value)
    const next = order[(idx + 1) % order.length]!
    styleId.value = next
    return next
  }

  return { styleId, setStyle, cycleStyle }
})
