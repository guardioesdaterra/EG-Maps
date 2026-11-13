/**
 * composables/useOfflineTileProtocol.ts
 * @why Shared MapLibre `egoffline://` protocol + Tile transformRequest used by
 *      every map (useMapBase and the garden tool) so offline satellite tiles
 *      from the Tools downloader resolve the same way everywhere.
 *
 *      Resolution order for a satellite Tile request:
 *        1. Exact tile in IndexedDB / memory
 *        2. Network fetch (when online), then cache for next time
 *        3. Throw — MapLibre marks the tile failed. Overzoom past the cached
 *           pyramid is handled by the style source `maxzoom` (set to the
 *           cached max), so MapLibre requests the parent canonical tile
 *           itself and scales it with correct UVs. Returning ancestor bytes
 *           under a child URL would paint the whole parent into the child
 *           quad (geographic mosaic).
 * @functions registerOfflineTileProtocol, transformMapTileRequest
 * @connections composables/useMapBase.ts, components/tools/garden/*
 */
import maplibregl from 'maplibre-gl'
import { isSafeTileUrl, MAX_TILE_BYTES, TILE_PATH_RE, type OfflineTileCache } from '@/composables/useOfflineTiles'

let offlineTileProtocolRegistered = false
let offlineTileProtocolCache: OfflineTileCache | null = null

export function registerOfflineTileProtocol(cache: OfflineTileCache) {
  offlineTileProtocolCache = cache
  if (offlineTileProtocolRegistered) return
  maplibregl.addProtocol('egoffline', async (request, abortController) => {
    const activeCache = offlineTileProtocolCache
    if (!activeCache) throw new Error('Offline tile cache is unavailable')
    const protocolUrl = new URL(request.url)
    const sourceUrl = protocolUrl.searchParams.get('url')
    if (!sourceUrl || !isSafeTileUrl(sourceUrl)) throw new Error('Invalid offline tile request')
    const parsed = new URL(sourceUrl)
    // Only satellite raster tiles are IndexedDB-cached; every other tileset
    // (streets/outdoors vectors, hybrid labels) bypasses the offline protocol.
    const match = parsed.pathname.match(TILE_PATH_RE)
    if (!match) throw new Error('Unsupported offline tile path')
    const z = Number(match[1]); const x = Number(match[2]); const y = Number(match[3])

    const exact = await activeCache.getTile(z, x, y)
    if (exact) return { data: exact }

    // Prefer the shared online ref (same source as the tool + provider hints).
    const offline = activeCache.isOnline.value === false
      || (typeof navigator !== 'undefined' && navigator.onLine === false)
    if (offline) {
      throw new Error(`Tile ${z}/${x}/${y} is not available offline`)
    }

    try {
      const response = await fetch(sourceUrl, { signal: abortController.signal })
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/jpeg'
        const contentLength = Number(response.headers.get('content-length') || 0)
        if (contentLength > MAX_TILE_BYTES) throw new Error('Tile exceeds the local cache size limit')
        const data = await response.arrayBuffer()
        if (data.byteLength > MAX_TILE_BYTES) throw new Error('Tile exceeds the local cache size limit')
        // Cache-through: only expose in memory after a successful IDB write.
        await activeCache.setTile(z, x, y, data, contentType)
        return { data }
      }
      throw new Error(`Tile request failed (${response.status})`)
    } catch (err) {
      if (abortController.signal.aborted) throw err
      throw err
    }
  })
  offlineTileProtocolRegistered = true
}

export function transformMapTileRequest(url: string, resourceType?: string) {
  if (resourceType !== 'Tile' || !isSafeTileUrl(url)) return { url }
  return { url: `egoffline://tile?url=${encodeURIComponent(url)}` }
}
