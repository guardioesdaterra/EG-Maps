/**
 * composables/useOfflineTiles.ts
 * @why Offline map tiles — caches tile blobs in IndexedDB for offline map viewing
 * @functions useOfflineTiles
 * @interfaces OfflineTileStats
 * @deps vue (ref, onScopeDispose, type Ref)
 */
import { ref, onScopeDispose, type Ref } from 'vue'

export interface OfflineTileStats {
  cachedTiles: number
  cacheSizeBytes: number
  cacheSizeFormatted: string
  tileFormat: string
  minZoom: number
  maxZoom: number
  isOffline: boolean
}

interface TileRecord {
  key: string
  data: ArrayBuffer
  contentType: string
  timestamp: number
  size: number
}

const DB_NAME = 'eg-maps-tile-cache'
const DB_VERSION = 1
const STORE_NAME = 'tiles'
const MAX_CACHE_ENTRIES = 10000
export const MAX_TILE_BYTES = 10 * 1024 * 1024
const MAX_ZOOM = 24
const TILE_PATH_RE = /^\/tiles\/satellite(?:-[^/]+)?\/(\d+)\/(\d+)\/(\d+)\.(?:jpg|jpeg|png|webp)$/i

let dbPromise: Promise<IDBDatabase> | null = null

function hasIndexedDB(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.indexedDB !== 'undefined'
}

function openDB(): Promise<IDBDatabase> {
  if (!hasIndexedDB()) return Promise.reject(new Error('IndexedDB unavailable'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = globalThis.indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
      req.onsuccess = () => {
        req.result.onclose = () => { dbPromise = null }
        resolve(req.result)
      }
      req.onerror = () => { dbPromise = null; reject(req.error || new Error('IndexedDB open failed')) }
      req.onblocked = () => { dbPromise = null; reject(new Error('IndexedDB blocked')) }
    } catch (err) {
      dbPromise = null
      reject(err)
    }
  })
  return dbPromise
}

function onlineState(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true
}

function validCoordinate(z: number, x: number, y: number): boolean {
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y) || z < 0 || z > MAX_ZOOM) return false
  const limit = 2 ** z
  return x >= 0 && x < limit && y >= 0 && y < limit
}

function tileKey(z: number, x: number, y: number): string {
  return `${z}/${x}/${y}`
}

function tileKeyFromUrl(url: string): { z: number; x: number; y: number } | null {
  try {
    const parsed = new URL(url, 'https://offline.invalid')
    if (parsed.protocol !== 'https:') return null
    if (!parsed.hostname.toLowerCase().endsWith('.maptiler.com')) return null
    const match = parsed.pathname.match(TILE_PATH_RE)
    if (!match) return null
    const z = Number(match[1]); const x = Number(match[2]); const y = Number(match[3])
    return validCoordinate(z, x, y) ? { z, x, y } : null
  } catch { return null }
}

/** Exported for focused tests and for callers that need to validate a MapLibre tile URL. */
export function isSafeTileUrl(url: string): boolean {
  return tileKeyFromUrl(url) !== null
}

function canCreateObjectUrl(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.URL?.createObjectURL === 'function'
}

function revokeObjectUrl(url: string | undefined): void {
  if (url && typeof globalThis.URL?.revokeObjectURL === 'function') globalThis.URL.revokeObjectURL(url)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function useOfflineTiles(apiKey?: string, _containerRef?: Ref<HTMLDivElement | null>) {
  const isOnline = ref(onlineState())
  const isInitialized = ref(false)
  const stats = ref<OfflineTileStats>({ cachedTiles: 0, cacheSizeBytes: 0, cacheSizeFormatted: '0 B', tileFormat: 'jpg', minZoom: 0, maxZoom: 0, isOffline: !onlineState() })
  const isPrefetching = ref(false)
  const prefetchProgress = ref(0)
  const prefetchTotal = ref(0)
  const memCache = new Map<string, ArrayBuffer>()
  const memContentTypes = new Map<string, string>()
  const objectUrls = new Map<string, string>()
  const MEM_CACHE_MAX = 200

  function forgetObjectUrl(key: string) {
    revokeObjectUrl(objectUrls.get(key))
    objectUrls.delete(key)
  }

  function cacheMemory(key: string, data: ArrayBuffer, contentType = 'image/jpeg') {
    memCache.delete(key)
    memContentTypes.delete(key)
    memCache.set(key, data)
    memContentTypes.set(key, contentType)
    if (memCache.size > MEM_CACHE_MAX) {
      const firstKey = memCache.keys().next().value as string | undefined
      if (firstKey) { memCache.delete(firstKey); memContentTypes.delete(firstKey); forgetObjectUrl(firstKey) }
    }
    if (canCreateObjectUrl()) {
      forgetObjectUrl(key)
      objectUrls.set(key, globalThis.URL.createObjectURL(new Blob([data], { type: contentType })))
    }
  }

  function handleOnline() { isOnline.value = true; stats.value.isOffline = false }
  function handleOffline() { isOnline.value = false; stats.value.isOffline = true }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }
  onScopeDispose(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    for (const url of objectUrls.values()) revokeObjectUrl(url)
    objectUrls.clear()
  })

  async function init() {
    if (isInitialized.value) return
    try {
      const db = await openDB(); const tx = db.transaction(STORE_NAME, 'readonly'); const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()
      stats.value.cachedTiles = await new Promise<number>((resolve, reject) => {
        countReq.onsuccess = () => resolve(countReq.result)
        countReq.onerror = () => reject(countReq.error || new Error('Tile count failed'))
      })
    } catch { /* IndexedDB unavailable — continue without caching */ }
    isInitialized.value = true
  }

  async function getTile(z: number, x: number, y: number): Promise<ArrayBuffer | null> {
    if (!validCoordinate(z, x, y)) return null
    const key = tileKey(z, x, y)
    if (memCache.has(key)) {
      const value = memCache.get(key)!; memCache.delete(key); memCache.set(key, value); return value
    }
    try {
      const db = await openDB(); const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      return await new Promise((resolve) => {
        req.onsuccess = () => {
          const record = req.result as TileRecord | undefined
          if (!record || !(record.data instanceof ArrayBuffer) || record.data.byteLength > MAX_TILE_BYTES) return resolve(null)
          cacheMemory(key, record.data, record.contentType || 'image/jpeg'); resolve(record.data)
        }
        req.onerror = () => resolve(null)
      })
    } catch { return null }
  }

  async function setTile(z: number, x: number, y: number, data: ArrayBuffer, contentType: string) {
    if (!validCoordinate(z, x, y) || !(data instanceof ArrayBuffer) || data.byteLength === 0 || data.byteLength > MAX_TILE_BYTES || !/^image\/(jpeg|jpg|png|webp)$/i.test(contentType)) return
    const key = tileKey(z, x, y)
    cacheMemory(key, data, contentType)
    try {
      const db = await openDB(); const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME)
      const oldReq = store.get(key)
      await new Promise<void>((resolve, reject) => {
        oldReq.onsuccess = () => { store.put({ key, data, contentType, timestamp: Date.now(), size: data.byteLength } as TileRecord) }
        oldReq.onerror = () => reject(oldReq.error)
        tx.oncomplete = () => {
          const old = oldReq.result as TileRecord | undefined
          stats.value.cachedTiles += old ? 0 : 1
          stats.value.cacheSizeBytes += data.byteLength - (old?.size || 0)
          stats.value.cacheSizeFormatted = formatBytes(Math.max(0, stats.value.cacheSizeBytes))
          resolve()
        }
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      await maybeEvict()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/QuotaExceededError|FILE_ERROR_NO_SPACE|disk/i.test(msg)) { console.warn('[OfflineTiles] Storage quota exceeded, evicting old tiles'); await maybeEvict() }
    }
  }

  async function hasTile(z: number, x: number, y: number): Promise<boolean> {
    if (!validCoordinate(z, x, y)) return false
    const key = tileKey(z, x, y); if (memCache.has(key)) return true
    try {
      const db = await openDB(); const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count(key)
      return await new Promise(resolve => { req.onsuccess = () => resolve(req.result > 0); req.onerror = () => resolve(false) })
    } catch { return false }
  }

  async function maybeEvict() {
    try {
      const db = await openDB(); const tx = db.transaction(STORE_NAME, 'readwrite'); const store = tx.objectStore(STORE_NAME); const countReq = store.count()
      await new Promise<void>(resolve => {
        countReq.onsuccess = () => {
          if (countReq.result <= MAX_CACHE_ENTRIES) return resolve()
          const cursorReq = store.index('timestamp').openCursor(IDBKeyRange.upperBound(Date.now() - 24 * 60 * 60 * 1000)); let deleted = 0; const toDelete = countReq.result - MAX_CACHE_ENTRIES
          cursorReq.onsuccess = () => { const cursor = cursorReq.result; if (cursor && deleted < toDelete) { forgetObjectUrl(String(cursor.primaryKey)); memCache.delete(String(cursor.primaryKey)); memContentTypes.delete(String(cursor.primaryKey)); store.delete(cursor.primaryKey); deleted++; cursor.continue() } else resolve() }
          cursorReq.onerror = () => resolve()
        }
        countReq.onerror = () => resolve()
      })
    } catch { /* ignore */ }
  }

  async function clearCache() {
    memCache.clear(); memContentTypes.clear(); for (const key of objectUrls.keys()) forgetObjectUrl(key)
    try { const db = await openDB(); await new Promise<void>(resolve => { const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).clear(); tx.oncomplete = () => resolve(); tx.onerror = () => resolve() }) } catch { /* ignore */ }
    stats.value.cachedTiles = 0; stats.value.cacheSizeBytes = 0; stats.value.cacheSizeFormatted = '0 B'
  }

  async function getStats(): Promise<OfflineTileStats> {
    try {
      const db = await openDB(); const tx = db.transaction(STORE_NAME, 'readonly'); const store = tx.objectStore(STORE_NAME); const countReq = store.count(); const allReq = store.getAll()
      return await new Promise(resolve => {
        const finish = () => { const records = (allReq.result || []) as TileRecord[]; const totalBytes = records.reduce((sum, r) => sum + Math.min(r.size || 0, MAX_TILE_BYTES), 0); const s: OfflineTileStats = { cachedTiles: countReq.result || 0, cacheSizeBytes: totalBytes, cacheSizeFormatted: formatBytes(totalBytes), tileFormat: 'jpg', minZoom: 0, maxZoom: 0, isOffline: !onlineState() }; stats.value = s; resolve(s) }
        countReq.onsuccess = () => { allReq.onsuccess = finish; allReq.onerror = () => resolve(stats.value) }; countReq.onerror = () => resolve(stats.value)
      })
    } catch { return stats.value }
  }

  async function getTileUrl(z: number, x: number, y: number): Promise<string | null> {
    if (!await hasTile(z, x, y)) return null
    const key = tileKey(z, x, y)
    if (!objectUrls.has(key)) await getTile(z, x, y)
    return objectUrls.get(key) || null
  }

  function transformRequestCached(url: string, resourceType?: string) {
    if (resourceType !== 'Tile' || isOnline.value) return { url }
    const coords = tileKeyFromUrl(url)
    if (!coords) return { url }
    const localUrl = objectUrls.get(tileKey(coords.z, coords.x, coords.y))
    return localUrl ? { url: localUrl } : { url }
  }

  async function prefetchRegion(bounds: { north: number; south: number; east: number; west: number }, minZoom: number, maxZoom: number, signal?: AbortSignal) {
    if (isPrefetching.value || minZoom < 0 || maxZoom < minZoom || maxZoom > MAX_ZOOM) return
    isPrefetching.value = true; prefetchProgress.value = 0
    let total = 0
    for (let z = minZoom; z <= maxZoom; z++) { const x1 = lonToTileX(bounds.west, z); const x2 = lonToTileX(bounds.east, z); const y1 = latToTileY(bounds.north, z); const y2 = latToTileY(bounds.south, z); total += (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1) }
    prefetchTotal.value = total
    let done = 0
    for (let z = minZoom; z <= maxZoom; z++) {
      const x1 = lonToTileX(bounds.west, z); const x2 = lonToTileX(bounds.east, z); const y1 = latToTileY(bounds.north, z); const y2 = latToTileY(bounds.south, z); const limit = 2 ** z
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2) && !signal?.aborted; x++) {
        const clampedX = ((x % limit) + limit) % limit
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2) && !signal?.aborted; y++) {
          if (y < 0 || y >= limit) continue
          if (!await hasTile(z, clampedX, y)) {
            try { const resp = await fetch(`https://api.maptiler.com/tiles/satellite-v2/${z}/${clampedX}/${y}.jpg?key=${encodeURIComponent(apiKey || '')}`, { signal }); if (resp.ok) { const buf = await resp.arrayBuffer(); await setTile(z, clampedX, y, buf, resp.headers.get('content-type') || 'image/jpeg') } } catch (err: unknown) { if (/QuotaExceededError|FILE_ERROR_NO_SPACE/i.test(err instanceof Error ? err.message : String(err))) break }
          }
          done++; prefetchProgress.value = done
        }
      }
    }
    isPrefetching.value = false; if (!signal?.aborted) await getStats()
  }

  function onTileResponse(url: string, response: Response) {
    if (!response.ok || !isSafeTileUrl(url)) return
    const coords = tileKeyFromUrl(url); if (!coords) return
    response.clone().arrayBuffer().then(buf => setTile(coords.z, coords.x, coords.y, buf, response.headers.get('content-type') || 'image/jpeg')).catch(() => {})
  }

  return { isOnline, isInitialized, stats, isPrefetching, prefetchProgress, prefetchTotal, init, getTile, setTile, hasTile, clearCache, getStats, getTileUrl, transformRequest: transformRequestCached, prefetchRegion, onTileResponse }
}

function lonToTileX(lon: number, zoom: number): number { return Math.floor((lon + 180) / 360 * 2 ** zoom) }
function latToTileY(lat: number, zoom: number): number { const bounded = Math.max(-85.051129, Math.min(85.051129, lat)); return Math.floor((1 - Math.log(Math.tan(bounded * Math.PI / 180) + 1 / Math.cos(bounded * Math.PI / 180)) / Math.PI) / 2 * 2 ** zoom) }
