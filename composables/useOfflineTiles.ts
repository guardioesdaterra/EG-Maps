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
const MAX_CACHE_ENTRIES = 50000

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export function useOfflineTiles(apiKey?: string, _containerRef?: Ref<HTMLDivElement | null>) {
  const isOnline = ref(navigator.onLine)
  const isInitialized = ref(false)
  const stats = ref<OfflineTileStats>({
    cachedTiles: 0,
    cacheSizeBytes: 0,
    cacheSizeFormatted: '0 B',
    tileFormat: 'jpg',
    minZoom: 0,
    maxZoom: 0,
    isOffline: !navigator.onLine,
  })
  const isPrefetching = ref(false)
  const prefetchProgress = ref(0)
  const prefetchTotal = ref(0)

  const memCache = new Map<string, ArrayBuffer>()
  const MEM_CACHE_MAX = 200

  function handleOnline() { isOnline.value = true; stats.value.isOffline = false }
  function handleOffline() { isOnline.value = false; stats.value.isOffline = true }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  onScopeDispose(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  async function init() {
    if (isInitialized.value) return
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()
      const statsP = getStats()

      countReq.onsuccess = () => {
        stats.value.cachedTiles = countReq.result
      }

      await statsP
      isInitialized.value = true
    } catch (_e) {
      // IndexedDB not available, falling back to memory cache only
      isInitialized.value = true
    }
  }

  function tileKey(z: number, x: number, y: number): string {
    return `${z}/${x}/${y}`
  }

  async function getTile(z: number, x: number, y: number): Promise<ArrayBuffer | null> {
    const key = tileKey(z, x, y)
    if (memCache.has(key)) {
      memCache.delete(key)
      memCache.set(key, memCache.get(key)!)
      return memCache.get(key)!
    }
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      return new Promise((resolve) => {
        req.onsuccess = () => {
          if (req.result) {
            const buf = req.result.data
            if (memCache.size >= MEM_CACHE_MAX) {
              const firstKey = memCache.keys().next().value
              if (firstKey) memCache.delete(firstKey)
            }
            memCache.set(key, buf)
            resolve(buf)
          } else {
            resolve(null)
          }
        }
        req.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  }

  async function setTile(z: number, x: number, y: number, data: ArrayBuffer, contentType: string) {
    const key = tileKey(z, x, y)
    memCache.set(key, data)
    if (memCache.size > MEM_CACHE_MAX) {
      const firstKey = memCache.keys().next().value
      if (firstKey) memCache.delete(firstKey)
    }
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put({ key, data, contentType, timestamp: Date.now(), size: data.byteLength } as TileRecord)
      stats.value.cachedTiles++
      stats.value.cacheSizeBytes += data.byteLength
      stats.value.cacheSizeFormatted = formatBytes(stats.value.cacheSizeBytes)
      tx.oncomplete = () => maybeEvict()
    } catch {
      // Silently fail store - memory cache still works
    }
  }

  async function hasTile(z: number, x: number, y: number): Promise<boolean> {
    const key = tileKey(z, x, y)
    if (memCache.has(key)) return true
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.count(key)
      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result > 0)
        req.onerror = () => false
      })
    } catch {
      return false
    }
  }

  async function maybeEvict() {
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()
      countReq.onsuccess = () => {
        if (countReq.result > MAX_CACHE_ENTRIES) {
          const index = store.index('timestamp')
          const range = IDBKeyRange.upperBound(Date.now() - 7 * 24 * 60 * 60 * 1000)
          const cursorReq = index.openCursor(range)
          let deleted = 0
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result
            if (cursor && deleted < countReq.result - MAX_CACHE_ENTRIES) {
              store.delete(cursor.primaryKey)
              deleted++
              cursor.continue()
            }
          }
        }
      }
    } catch {
      // Best effort
    }
  }

  async function clearCache() {
    memCache.clear()
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
    } catch {
      // Best effort
    }
    stats.value.cachedTiles = 0
    stats.value.cacheSizeBytes = 0
    stats.value.cacheSizeFormatted = '0 B'
  }

  async function getStats(): Promise<OfflineTileStats> {
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()
      const allReq = store.getAll()

      return new Promise((resolve) => {
        countReq.onsuccess = () => {
          allReq.onsuccess = () => {
            const totalBytes = allReq.result.reduce((sum: number, r: TileRecord) => sum + (r.size || 0), 0)
            const s: OfflineTileStats = {
              cachedTiles: countReq.result,
              cacheSizeBytes: totalBytes,
              cacheSizeFormatted: formatBytes(totalBytes),
              tileFormat: 'jpg',
              minZoom: 0,
              maxZoom: 0,
              isOffline: !navigator.onLine,
            }
            stats.value = s
            resolve(s)
          }
          allReq.onerror = () => resolve(stats.value)
        }
        countReq.onerror = () => resolve(stats.value)
      })
    } catch {
      return stats.value
    }
  }

  async function getTileUrl(z: number, x: number, y: number): Promise<string | null> {
    if (await hasTile(z, x, y)) {
      return `/tiles/${z}/${x}/${y}.jpg`
    }
    return null
  }

  function transformRequestCached(url: string, resourceType?: string) {
    if (resourceType === 'Tile' && !navigator.onLine) {
      const match = url.match(/\/satellite\/(\d+)\/(\d+)\/(\d+)\./)
      if (match) {
        const [, z, x, y] = match
        const localUrl = `/tiles/${z}/${x}/${y}.jpg`
        return { url: localUrl }
      }
    }
    return { url }
  }

  async function prefetchRegion(
    bounds: { north: number; south: number; east: number; west: number },
    minZoom: number,
    maxZoom: number,
    signal?: AbortSignal
  ) {
    if (isPrefetching.value) return
    isPrefetching.value = true
    prefetchProgress.value = 0

    let total = 0
    for (let z = minZoom; z <= maxZoom; z++) {
      const x1 = lonToTileX(bounds.west, z)
      const x2 = lonToTileX(bounds.east, z)
      const y1 = latToTileY(bounds.north, z)
      const y2 = latToTileY(bounds.south, z)
      total += (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1)
    }
    prefetchTotal.value = total

    let done = 0
    for (let z = minZoom; z <= maxZoom; z++) {
      const x1 = lonToTileX(bounds.west, z)
      const x2 = lonToTileX(bounds.east, z)
      const y1 = latToTileY(bounds.north, z)
      const y2 = latToTileY(bounds.south, z)
      const minX = Math.min(x1, x2)
      const maxX = Math.max(x1, x2)
      const minY = Math.min(y1, y2)
      const maxY = Math.max(y1, y2)

      for (let x = minX; x <= maxX && !signal?.aborted; x++) {
        const clampedX = ((x % Math.pow(2, z)) + Math.pow(2, z)) % Math.pow(2, z)
        for (let y = minY; y <= maxY && !signal?.aborted; y++) {
          if (y < 0 || y >= Math.pow(2, z)) continue
          if (await hasTile(z, clampedX, y)) {
            done++
            prefetchProgress.value = done
            continue
          }
          try {
            const url = `https://api.maptiler.com/tiles/satellite/${z}/${clampedX}/${y}.jpg?key=${apiKey}`
            const resp = await fetch(url, { signal })
            if (resp.ok) {
              const buf = await resp.arrayBuffer()
              await setTile(z, clampedX, y, buf, resp.headers.get('content-type') || 'image/jpeg')
            }
          } catch {
            // Skip failed tiles
          }
          done++
          prefetchProgress.value = done
        }
      }
    }

    isPrefetching.value = false
    if (!signal?.aborted) {
      await getStats()
    }
  }

  function onTileResponse(url: string, response: Response) {
    if (!response.ok) return
    if (!url.includes('maptiler.com/tiles/satellite/')) return
    const match = url.match(/\/satellite\/(\d+)\/(\d+)\/(\d+)\./)
    if (!match) return
    const [, z, x, y] = match
    response.clone().arrayBuffer().then(buf => {
      setTile(parseInt(z), parseInt(x), parseInt(y), buf, response.headers.get('content-type') || 'image/jpeg')
    }).catch(() => {})
  }

  return {
    isOnline,
    isInitialized,
    stats,
    isPrefetching,
    prefetchProgress,
    prefetchTotal,
    init,
    getTile,
    setTile,
    hasTile,
    clearCache,
    getStats,
    getTileUrl,
    transformRequest: transformRequestCached,
    prefetchRegion,
    onTileResponse,
  }
}

function lonToTileX(lon: number, zoom: number): number {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom))
}

function latToTileY(lat: number, zoom: number): number {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
