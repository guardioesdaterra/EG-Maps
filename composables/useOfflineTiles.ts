/**
 * composables/useOfflineTiles.ts
 * @why Offline map tiles — caches tile blobs in IndexedDB for offline map viewing
 * @functions useOfflineTiles
 * @interfaces OfflineTileStats
 * @deps vue (ref, onScopeDispose)
 */
import { ref, onScopeDispose } from 'vue'

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

interface CacheMeta {
  id: 'cache'
  count: number
  bytes: number
  minZoom: number
  maxZoom: number
}

const DB_NAME = 'eg-maps-tile-cache'
const DB_VERSION = 2
const STORE_NAME = 'tiles'
const META_STORE = 'meta'
const META_KEY = 'cache' as const
const MAX_CACHE_ENTRIES = 10000
export const MAX_TILE_BYTES = 10 * 1024 * 1024
const MAX_ZOOM = 24
/** Parallel tile fetches during a region download. */
const PREFETCH_CONCURRENCY = 8
/** Hard ceiling on one prefetch run — protects memory and the job array. */
export const MAX_PREFETCH_JOBS = 50_000
/** How many parent zoom levels a missing tile may walk up for backup imagery. */
export const MAX_PARENT_ZOOM_WALK = 6
/** Transient HTTP statuses worth retrying during a region download. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
/** Auth / key failures — stop the whole run instead of hammering per tile. */
const FATAL_STATUS = new Set([401, 403])
const FETCH_ATTEMPTS = 3
/** Shared MapTiler satellite path pattern (cache + protocol must agree). */
export const TILE_PATH_RE = /^\/tiles\/satellite(?:-[^/]+)?\/(\d+)\/(\d+)\/(\d+)\.(?:jpg|jpeg|png|webp)$/i
const EMPTY_META: CacheMeta = { id: META_KEY, count: 0, bytes: 0, minZoom: 0, maxZoom: 0 }

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
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'id' })
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

function parseTileKey(key: string): { z: number; x: number; y: number } | null {
  const match = /^(\d+)\/(\d+)\/(\d+)$/.exec(key)
  if (!match) return null
  const z = Number(match[1]); const x = Number(match[2]); const y = Number(match[3])
  return validCoordinate(z, x, y) ? { z, x, y } : null
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

export function useOfflineTiles(apiKey?: string) {
  const isOnline = ref(onlineState())
  const isInitialized = ref(false)
  const stats = ref<OfflineTileStats>({ cachedTiles: 0, cacheSizeBytes: 0, cacheSizeFormatted: '0 B', tileFormat: 'jpg', minZoom: 0, maxZoom: 0, isOffline: !onlineState() })
  const isPrefetching = ref(false)
  const prefetchProgress = ref(0)
  const prefetchTotal = ref(0)
  const prefetchErrors = ref(0)
  const prefetchSkipped = ref(0)
  const prefetchFetched = ref(0)
  /** Set when a prefetch stops for a non-retryable reason (auth / quota / cap). */
  const prefetchAbortReason = ref<'auth' | 'quota' | 'cap' | 'aborted' | null>(null)
  const storageFull = ref(false)
  const memCache = new Map<string, ArrayBuffer>()
  const memContentTypes = new Map<string, string>()
  const objectUrls = new Map<string, string>()
  const MEM_CACHE_MAX = 200
  let prefetchController: AbortController | null = null

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

  function dropMemory(key: string) {
    memCache.delete(key)
    memContentTypes.delete(key)
    forgetObjectUrl(key)
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
    prefetchController?.abort()
    for (const url of objectUrls.values()) revokeObjectUrl(url)
    objectUrls.clear()
  })

  function applyMeta(meta: CacheMeta) {
    stats.value.cachedTiles = meta.count
    stats.value.cacheSizeBytes = meta.bytes
    stats.value.cacheSizeFormatted = formatBytes(meta.bytes)
    stats.value.minZoom = meta.count > 0 ? meta.minZoom : 0
    stats.value.maxZoom = meta.count > 0 ? meta.maxZoom : 0
    stats.value.isOffline = !onlineState()
  }

  async function readMeta(store: IDBObjectStore): Promise<CacheMeta> {
    return await new Promise((resolve) => {
      const req = store.get(META_KEY)
      req.onsuccess = () => resolve((req.result as CacheMeta | undefined) ?? { ...EMPTY_META })
      req.onerror = () => resolve({ ...EMPTY_META })
    })
  }

  async function writeMeta(store: IDBObjectStore, meta: CacheMeta): Promise<void> {
    store.put(meta)
  }

  /**
   * One-time rebuild of aggregate meta from tile keys only (cursor walks
   * primary keys; size is summed from each record's `size` field without a
   * full getAll of every ArrayBuffer body into a single array).
   */
  async function rebuildMetaFromTiles(db: IDBDatabase): Promise<CacheMeta> {
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const metaStore = tx.objectStore(META_STORE)
        const meta: CacheMeta = { ...EMPTY_META }
        let sawAny = false
        const cursorReq = store.openCursor()
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result
          if (!cursor) return
          sawAny = true
          const record = cursor.value as TileRecord
          const coords = parseTileKey(String(cursor.primaryKey))
          meta.count += 1
          meta.bytes += Math.min(record.size || record.data?.byteLength || 0, MAX_TILE_BYTES)
          if (coords) {
            meta.minZoom = meta.count === 1 ? coords.z : Math.min(meta.minZoom, coords.z)
            meta.maxZoom = meta.count === 1 ? coords.z : Math.max(meta.maxZoom, coords.z)
          }
          cursor.continue()
        }
        cursorReq.onerror = () => resolve({ ...EMPTY_META })
        tx.oncomplete = () => {
          // Empty store → keep zeros; otherwise persist what we saw.
          if (sawAny || meta.count > 0) metaStore.put(meta)
          resolve(meta)
        }
        tx.onerror = () => resolve({ ...EMPTY_META })
        tx.onabort = () => resolve({ ...EMPTY_META })
      } catch {
        resolve({ ...EMPTY_META })
      }
    })
  }

  async function init() {
    if (isInitialized.value) return
    try {
      const db = await openDB()
      // v1 → v2 upgrades: meta store may be empty while tiles exist.
      const tx = db.transaction(META_STORE, 'readonly')
      let meta = await readMeta(tx.objectStore(META_STORE))
      if (meta.count === 0) {
        const countTx = db.transaction(STORE_NAME, 'readonly')
        const count = await new Promise<number>((resolve) => {
          const req = countTx.objectStore(STORE_NAME).count()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => resolve(0)
        })
        if (count > 0) meta = await rebuildMetaFromTiles(db)
      }
      applyMeta(meta)
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

  /**
   * Persist a tile. Returns false when the payload was rejected (size/type)
   * or the IndexedDB write failed. Memory is only populated after a
   * successful write so resume-via hasTile never skips unpersisted gaps.
   */
  async function setTile(z: number, x: number, y: number, data: ArrayBuffer, contentType: string): Promise<boolean> {
    if (!validCoordinate(z, x, y) || !(data instanceof ArrayBuffer) || data.byteLength === 0 || data.byteLength > MAX_TILE_BYTES || !/^image\/(jpeg|jpg|png|webp)$/i.test(contentType)) return false
    const key = tileKey(z, x, y)

    const writeOnce = (): Promise<boolean> => new Promise((resolve, reject) => {
      void (async () => {
        try {
          const db = await openDB()
          const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          const metaStore = tx.objectStore(META_STORE)
          const oldReq = store.get(key)
          const metaReq = metaStore.get(META_KEY)
          let putScheduled = false
          oldReq.onsuccess = () => {
            metaReq.onsuccess = () => {
              const old = oldReq.result as TileRecord | undefined
              const meta = (metaReq.result as CacheMeta | undefined) ?? { ...EMPTY_META }
              const oldSize = old ? Math.min(old.size || 0, MAX_TILE_BYTES) : 0
              const next: CacheMeta = {
                id: META_KEY,
                count: meta.count + (old ? 0 : 1),
                bytes: Math.max(0, meta.bytes - oldSize + data.byteLength),
                minZoom: meta.minZoom,
                maxZoom: meta.maxZoom,
              }
              if (!old) {
                next.minZoom = meta.count === 0 ? z : Math.min(meta.minZoom, z)
                next.maxZoom = meta.count === 0 ? z : Math.max(meta.maxZoom, z)
              }
              store.put({ key, data, contentType, timestamp: Date.now(), size: data.byteLength } satisfies TileRecord)
              metaStore.put(next)
              putScheduled = true
            }
            metaReq.onerror = () => reject(metaReq.error)
          }
          oldReq.onerror = () => reject(oldReq.error)
          tx.oncomplete = () => resolve(putScheduled)
          tx.onerror = () => reject(tx.error)
          tx.onabort = () => reject(tx.error)
        } catch (err) {
          reject(err)
        }
      })()
    })

    try {
      const ok = await writeOnce()
      if (!ok) return false
      cacheMemory(key, data, contentType)
      storageFull.value = false
      await maybeEvict()
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/QuotaExceededError|FILE_ERROR_NO_SPACE|disk/i.test(msg)) {
        console.warn('[OfflineTiles] Storage quota exceeded, evicting old tiles')
        storageFull.value = true
        await maybeEvict(true)
        try {
          const retried = await writeOnce()
          if (retried) {
            cacheMemory(key, data, contentType)
            storageFull.value = false
            await maybeEvict()
            return true
          }
        } catch { /* still full */ }
      }
      return false
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

  /**
   * Exact tile, then parent-zoom backup levels (z-1 … z-N). Intended for
   * callers that can rebind UVs themselves — the MapLibre protocol does NOT
   * use this (ancestor bytes under a child URL render as a mosaic). Production
   * overzoom is handled by setting the style source `maxzoom` to the cached
   * max so MapLibre requests the parent canonical tile directly.
   */
  async function getTileOrAncestor(z: number, x: number, y: number): Promise<ArrayBuffer | null> {
    if (!validCoordinate(z, x, y)) return null
    const exact = await getTile(z, x, y)
    if (exact) return exact
    let cz = z - 1
    let cx = Math.floor(x / 2)
    let cy = Math.floor(y / 2)
    while (cz >= 0 && (z - cz) <= MAX_PARENT_ZOOM_WALK) {
      const data = await getTile(cz, cx, cy)
      if (data) return data
      cx = Math.floor(cx / 2)
      cy = Math.floor(cy / 2)
      cz -= 1
    }
    return null
  }

  /**
   * Evict oldest tiles until under the entry cap. Under quota pressure
   * (`force`), also drop same-day tiles so the write can succeed.
   */
  async function maybeEvict(force = false) {
    try {
      const db = await openDB()
      const deleted = await new Promise<{ count: number; bytes: number }>((resolve) => {
        const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const metaStore = tx.objectStore(META_STORE)
        let removedCount = 0
        let removedBytes = 0
        let metaAdjusted = false

        const finishMeta = () => {
          if (metaAdjusted) return
          metaAdjusted = true
          const metaRead = metaStore.get(META_KEY)
          metaRead.onsuccess = () => {
            const meta = (metaRead.result as CacheMeta | undefined) ?? { ...EMPTY_META }
            meta.count = Math.max(0, meta.count - removedCount)
            meta.bytes = Math.max(0, meta.bytes - removedBytes)
            if (meta.count === 0) { meta.minZoom = 0; meta.maxZoom = 0 }
            metaStore.put(meta)
          }
          metaRead.onerror = () => { /* leave meta for next rebuild */ }
        }

        const countReq = store.count()
        countReq.onsuccess = () => {
          const total = countReq.result
          const over = total - MAX_CACHE_ENTRIES
          if (over <= 0 && !force) {
            finishMeta()
            return
          }
          const toDelete = force
            ? Math.max(1, Math.ceil(total * 0.1))
            : over
          // Prefer tiles older than 24h; under force, take oldest regardless of age.
          const range = force
            ? IDBKeyRange.upperBound(Date.now())
            : IDBKeyRange.upperBound(Date.now() - 24 * 60 * 60 * 1000)
          const cursorReq = store.index('timestamp').openCursor(range)
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result
            if (cursor && removedCount < toDelete) {
              const record = cursor.value as TileRecord | undefined
              const pk = String(cursor.primaryKey)
              removedBytes += Math.min(record?.size || 0, MAX_TILE_BYTES)
              dropMemory(pk)
              store.delete(cursor.primaryKey)
              removedCount++
              cursor.continue()
            } else {
              finishMeta()
            }
          }
          cursorReq.onerror = () => finishMeta()
        }
        countReq.onerror = () => resolve({ count: 0, bytes: 0 })

        tx.oncomplete = () => resolve({ count: removedCount, bytes: removedBytes })
        tx.onerror = () => resolve({ count: removedCount, bytes: removedBytes })
        tx.onabort = () => resolve({ count: removedCount, bytes: removedBytes })
      })

      if (deleted.count > 0) {
        try {
          const ro = db.transaction(META_STORE, 'readonly')
          const meta = await readMeta(ro.objectStore(META_STORE))
          applyMeta(meta)
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  async function clearCache() {
    memCache.clear(); memContentTypes.clear(); for (const key of objectUrls.keys()) forgetObjectUrl(key)
    try {
      const db = await openDB()
      await new Promise<void>((resolve) => {
        const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite')
        tx.objectStore(STORE_NAME).clear()
        tx.objectStore(META_STORE).put({ ...EMPTY_META })
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } catch { /* ignore */ }
    applyMeta({ ...EMPTY_META })
    storageFull.value = false
  }

  async function getStats(): Promise<OfflineTileStats> {
    try {
      const db = await openDB()
      const tx = db.transaction(META_STORE, 'readonly')
      const meta = await readMeta(tx.objectStore(META_STORE))
      if (meta.count > 0 || stats.value.cachedTiles === 0) {
        applyMeta(meta)
      } else {
        // Meta empty but reactive count says otherwise (legacy) — rebuild once.
        const rebuilt = await rebuildMetaFromTiles(db)
        applyMeta(rebuilt)
      }
      return stats.value
    } catch { return stats.value }
  }

  /** Number of tiles needed to cover `bounds` between minZoom..maxZoom. */
  function countRegionTiles(bounds: { north: number; south: number; east: number; west: number }, minZoom: number, maxZoom: number): number {
    let total = 0
    for (let z = minZoom; z <= maxZoom; z++) {
      const x1 = lonToTileX(bounds.west, z); const x2 = lonToTileX(bounds.east, z)
      const y1 = latToTileY(bounds.north, z); const y2 = latToTileY(bounds.south, z)
      total += (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1)
    }
    return total
  }

  /** Fetch one satellite tile with backoff on rate-limit / transient failures. */
  async function fetchTileOnce(url: string, signal?: AbortSignal): Promise<Response> {
    let lastError: unknown = new Error('Tile fetch failed')
    for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
      if (signal?.aborted) throw new Error('Download aborted')
      try {
        const resp = await fetch(url, { signal })
        // 404 = no imagery at this tile (ocean / edge) — permanent, do not retry.
        if (resp.ok || resp.status === 404) return resp
        // 401/403 = bad key — not retryable, not per-tile recoverable.
        if (FATAL_STATUS.has(resp.status)) return resp
        if (!RETRYABLE_STATUS.has(resp.status)) return resp
        lastError = new Error(`HTTP ${resp.status}`)
      } catch (err: unknown) {
        if (signal?.aborted) throw err
        if (/QuotaExceededError|FILE_ERROR_NO_SPACE/i.test(err instanceof Error ? err.message : String(err))) throw err
        lastError = err
      }
      if (attempt < FETCH_ATTEMPTS - 1) {
        const delay = 400 * (2 ** attempt) + Math.floor(Math.random() * 200)
        await new Promise<void>((resolve) => {
          if (signal?.aborted) { resolve(); return }
          const timer = setTimeout(resolve, delay)
          signal?.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
        })
      }
    }
    throw lastError
  }

  /** Cancel an in-flight prefetch (shared — survives component remounts). */
  function cancelPrefetch(reason: 'aborted' = 'aborted') {
    if (!isPrefetching.value) return
    prefetchAbortReason.value = reason
    prefetchController?.abort()
  }

  /**
   * Download satellite tiles for a region into the offline cache.
   * Fetches run in a small parallel pool; `signal` cancels in-flight requests
   * (prefer `cancelPrefetch()` so Cancel works across remounts).
   *
   * Safety: transient 429/5xx/network errors are retried with backoff; HTTP
   * 404 is treated as “no data”; 401/403 abort the whole run; failed tiles
   * stay uncached so a re-run resumes via `hasTile`.
   */
  async function prefetchRegion(bounds: { north: number; south: number; east: number; west: number }, minZoom: number, maxZoom: number, signal?: AbortSignal) {
    if (isPrefetching.value || minZoom < 0 || maxZoom < minZoom || maxZoom > MAX_ZOOM) return
    const external = signal
    const ac = new AbortController()
    prefetchController = ac
    const onExternalAbort = () => ac.abort()
    if (external) {
      if (external.aborted) ac.abort()
      else external.addEventListener('abort', onExternalAbort, { once: true })
    }
    const signalAll = ac.signal

    isPrefetching.value = true
    prefetchProgress.value = 0
    prefetchErrors.value = 0
    prefetchSkipped.value = 0
    prefetchFetched.value = 0
    prefetchAbortReason.value = null
    storageFull.value = false

    const jobs: [number, number, number][] = []
    for (let z = minZoom; z <= maxZoom; z++) {
      const x1 = lonToTileX(bounds.west, z); const x2 = lonToTileX(bounds.east, z)
      const y1 = latToTileY(bounds.north, z); const y2 = latToTileY(bounds.south, z)
      const limit = 2 ** z
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        const clampedX = ((x % limit) + limit) % limit
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          if (y >= 0 && y < limit) jobs.push([z, clampedX, y])
        }
      }
    }

    if (jobs.length > MAX_PREFETCH_JOBS) {
      prefetchAbortReason.value = 'cap'
      prefetchTotal.value = jobs.length
      isPrefetching.value = false
      prefetchController = null
      if (external) external.removeEventListener('abort', onExternalAbort)
      return
    }

    prefetchTotal.value = jobs.length

    let cursor = 0
    let done = 0
    let fatal: 'auth' | 'quota' | null = null

    const worker = async () => {
      while (cursor < jobs.length && !signalAll.aborted && !fatal) {
        const job = jobs[cursor++]!
        const [z, x, y] = job
        try {
          if (await hasTile(z, x, y)) {
            prefetchSkipped.value++
          } else {
            const url = `https://api.maptiler.com/tiles/satellite-v2/${z}/${x}/${y}.jpg?key=${encodeURIComponent(apiKey || '')}`
            const resp = await fetchTileOnce(url, signalAll)
            if (resp.status === 404) {
              // No tile published at this coordinate — skip without counting as failure.
            } else if (FATAL_STATUS.has(resp.status)) {
              fatal = 'auth'
              prefetchAbortReason.value = 'auth'
              break
            } else if (resp.ok) {
              const buf = await resp.arrayBuffer()
              const ok = await setTile(z, x, y, buf, resp.headers.get('content-type') || 'image/jpeg')
              if (ok) prefetchFetched.value++
              else {
                if (storageFull.value) fatal = 'quota'
                prefetchErrors.value++
              }
            } else {
              prefetchErrors.value++
            }
          }
        } catch (err: unknown) {
          if (signalAll.aborted) break
          if (/QuotaExceededError|FILE_ERROR_NO_SPACE/i.test(err instanceof Error ? err.message : String(err))) {
            fatal = 'quota'
            prefetchAbortReason.value = 'quota'
            storageFull.value = true
            break
          }
          prefetchErrors.value++
        }
        done++; prefetchProgress.value = done
      }
    }

    await Promise.all(Array.from({ length: Math.min(PREFETCH_CONCURRENCY, jobs.length) }, worker))

    if (fatal === 'auth' && prefetchAbortReason.value !== 'auth') prefetchAbortReason.value = 'auth'
    if (signalAll.aborted && !prefetchAbortReason.value) prefetchAbortReason.value = 'aborted'
    if (fatal === 'quota') prefetchAbortReason.value = 'quota'

    isPrefetching.value = false
    prefetchController = null
    if (external) external.removeEventListener('abort', onExternalAbort)
    if (!signalAll.aborted || fatal) await getStats()
  }

  return {
    isOnline,
    isInitialized,
    stats,
    isPrefetching,
    prefetchProgress,
    prefetchTotal,
    prefetchErrors,
    prefetchSkipped,
    prefetchFetched,
    prefetchAbortReason,
    storageFull,
    cancelPrefetch,
    init,
    getTile,
    getTileOrAncestor,
    setTile,
    hasTile,
    clearCache,
    getStats,
    prefetchRegion,
    countRegionTiles,
  }
}

/** Shared cache API surface (map runtime and the satellite Tools panel). */
export type OfflineTileCache = ReturnType<typeof useOfflineTiles>

function lonToTileX(lon: number, zoom: number): number { return Math.floor((lon + 180) / 360 * 2 ** zoom) }
function latToTileY(lat: number, zoom: number): number { const bounded = Math.max(-85.051129, Math.min(85.051129, lat)); return Math.floor((1 - Math.log(Math.tan(bounded * Math.PI / 180) + 1 / Math.cos(bounded * Math.PI / 180)) / Math.PI) / 2 * 2 ** zoom) }
