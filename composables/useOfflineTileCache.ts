/**
 * composables/useOfflineTileCache.ts
 * @why Single shared offline tile cache instance — the map, the Tools sheet's
 *      satellite downloader, and the tile protocol all read/write one memory
 *      cache and one stats object instead of three parallel ones.
 * @functions useOfflineTileCache
 * @connections composables/useOfflineTiles.ts, composables/useMapBase.ts, components/tools/satellite/*
 */
import { createSharedComposable } from '@vueuse/core'
import { useOfflineTiles } from '@/composables/useOfflineTiles'

export const useOfflineTileCache = createSharedComposable(() =>
  useOfflineTiles(useRuntimeConfig().public.maptilerApiKey || ''),
)
