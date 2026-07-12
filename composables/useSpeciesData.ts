import { ref } from 'vue'
import type { Species } from '@/lib/types'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'

const memCache = new Map<string, Species[] | SpeciesIndexItem[]>()
const regionLookupCache = new Map<string, string>()

const DB_NAME = 'eg-maps-species'
const DB_VERSION = 1
const STORE_NAME = 'datasets'


function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => {
      const db = req.result
      db.onclose = () => { dbPromise = null }
      db.onversionchange = () => {
        try { db.close() } catch { /* empty */ }
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result ?? undefined)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.warn('[useSpeciesData] idbGet failed:', e)
    return undefined
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('[useSpeciesData] idbSet failed:', e)
  }
}

type DatasetParam = string | string[]

function resolveDatasets(dataset?: DatasetParam): string[] {
  if (!dataset) return ['icmbio-brazil']
  if (Array.isArray(dataset)) return dataset
  return [dataset]
}



async function fetchDataset(baseURL: string, ds: string): Promise<Species[]> {
  const label = `[perf] fetchDataset ${ds}`
  console.time(label)

  if (memCache.has(ds)) {
    console.timeLog(label, 'memCache HIT')
    console.timeEnd(label)
    return memCache.get(ds)! as Species[]
  }

  const cached = await idbGet<Species[]>(ds)
  if (cached) {
    memCache.set(ds, cached)
    console.timeLog(label, 'IndexedDB HIT')
    console.timeEnd(label)
    return cached
  }

  const url = `${baseURL}data/species/${ds}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load species data: ${res.status}`)
  const data: Species[] = await res.json()
  console.timeLog(label, `fetch OK (${data.length} items)`)
  memCache.set(ds, data)

  idbSet(ds, data)
  console.timeEnd(label)
  return data
}

// Fetch lightweight index for map markers (loads in seconds vs minutes).
// IndexedDB-cached so repeat visits are instant.
async function fetchSpeciesIndex(baseURL: string, ds: string): Promise<SpeciesIndexItem[]> {
  const cacheKey = `${ds}-index`

  const cachedEntry = memCache.get(cacheKey)
  if (cachedEntry) return cachedEntry as SpeciesIndexItem[]

  const cached = await idbGet<SpeciesIndexItem[]>(cacheKey)
  if (cached) {
    memCache.set(cacheKey, cached)
    return cached
  }

  const url = `${baseURL}data/species/${ds}-index.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load species index: ${res.status}`)
  const data: SpeciesIndexItem[] = await res.json()
  memCache.set(cacheKey, data)

  deferIdbWrite(cacheKey, data)
  return data
}

function deferIdbWrite(key: string, value: unknown) {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => idbSet(key, value), { timeout: 5000 })
  } else {
    idbSet(key, value)
  }
}

// Fetch species-to-region lookup (185 KB, cached in IDB)
async function fetchRegionLookup(baseURL: string): Promise<Map<string, string>> {
  const label = '[perf] fetchRegionLookup'
  console.time(label)

  if (regionLookupCache.size > 0) {
    console.timeLog(label, 'memCache HIT')
    console.timeEnd(label)
    return regionLookupCache
  }

  const cacheKey = 'species-region-lookup'
  const cached = await idbGet<Record<string, string>>(cacheKey)
  if (cached) {
    for (const [id, region] of Object.entries(cached)) {
      regionLookupCache.set(id, region)
    }
    console.timeLog(label, `IndexedDB HIT (${Object.keys(cached).length} entries)`)
    console.timeEnd(label)
    return regionLookupCache
  }

  const url = `${baseURL}data/species/regions/species-region-lookup.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load region lookup: ${res.status}`)
  const data: Record<string, string> = await res.json()
  for (const [id, region] of Object.entries(data)) {
    regionLookupCache.set(id, region)
  }
  idbSet(cacheKey, data)
  console.timeLog(label, `fetch OK (${Object.keys(data).length} entries)`)
  console.timeEnd(label)
  return regionLookupCache
}

// Fetch a single region chunk (1-6 MB) instead of the full 32 MB dataset
async function fetchRegionChunk(baseURL: string, region: string): Promise<Species[]> {
  const slug = region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
  const cacheKey = `icmbio-brazil-region-${slug}`
  const label = `[perf] fetchRegionChunk ${slug}`
  console.time(label)

  if (memCache.has(cacheKey)) {
    console.timeLog(label, 'memCache HIT')
    console.timeEnd(label)
    return memCache.get(cacheKey)! as Species[]
  }

  const cached = await idbGet<Species[]>(cacheKey)
  if (cached) {
    memCache.set(cacheKey, cached)
    console.timeLog(label, 'IndexedDB HIT')
    console.timeEnd(label)
    return cached
  }

  const url = `${baseURL}data/species/regions/${slug}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load region chunk: ${res.status}`)
  const data: Species[] = await res.json()
  console.timeLog(label, `fetch OK (${data.length} items)`)
  memCache.set(cacheKey, data)
  idbSet(cacheKey, data)
  console.timeEnd(label)
  return data
}

// Fetch full species by ID — loads only the relevant region chunk (~1-6 MB)
async function fetchSpeciesById(baseURL: string, ds: string, speciesId: string): Promise<Species | null> {
  const label = `[perf] fetchSpeciesById ${ds}/${speciesId}`
  console.time(label)
  let result: Species | null = null

  if (ds === 'icmbio-brazil') {
    const lookup = await fetchRegionLookup(baseURL)
    const region = lookup.get(speciesId)
    if (!region) {
      console.timeLog(label, 'region not found')
      console.timeEnd(label)
      return null
    }
    const regionData = await fetchRegionChunk(baseURL, region)
    result = regionData.find(s => s.id === speciesId) || null
  } else {
    const fullData = await fetchDataset(baseURL, ds)
    result = fullData.find(s => s.id === speciesId) || null
  }

  console.timeLog(label, result ? 'FOUND' : 'NOT_FOUND')
  console.timeEnd(label)
  return result
}

export function useSpeciesData(dataset?: DatasetParam) {
  const data = ref<Species[]>([])
  const loading = ref(true)
  const error = ref<Error | null>(null)

  const datasets = resolveDatasets(dataset)
  const baseURL = (useRuntimeConfig().app?.baseURL as string) || '/'

  async function load() {
    loading.value = true
    error.value = null
    try {
      // Fetch all datasets in parallel
      const results = await Promise.all(
        datasets.map(ds => fetchDataset(baseURL, ds))
      )
      data.value = results.flat()
    } catch (e) {
      error.value = e as Error
      console.error('Failed to load species data:', e)
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    load()
  }

  return { data, loading, error, reload: load }
}

// Lightweight version that only loads marker index (for large datasets).
// Fires all fetches in parallel so wall-clock time = max(ds1, ds2) instead of
// sum(ds1, ds2). Results are processed in priority order (smallest dataset first)
// so the map renders visible markers incrementally.
export function useSpeciesIndex(dataset?: DatasetParam) {
  const data = ref<SpeciesIndexItem[]>([])
  const loading = ref(true)
  const error = ref<Error | null>(null)
  const loadedChunks = ref(0)
  const currentDatasetLabel = ref('')

  const datasets = resolveDatasets(dataset)
  const baseURL = (useRuntimeConfig().app?.baseURL as string) || '/'

  async function load() {
    loading.value = true
    error.value = null
    const collected: SpeciesIndexItem[] = []
    try {
      // Sort: smaller/priority datasets first (iucn before icmbio-brazil)
      const sorted = [...datasets].sort((a, b) => {
        if (a === 'iucn') return -1
        if (b === 'iucn') return 1
        return 0
      })
      // Fire all fetches in parallel immediately
      const promises = sorted.map(ds => fetchSpeciesIndex(baseURL, ds))
      // Process results in priority order (smallest datasets resolve first naturally)
      for (let i = 0; i < sorted.length; i++) {
        currentDatasetLabel.value = sorted[i]
        const items = await promises[i]
        collected.push(...items)
        data.value = [...collected]
        loadedChunks.value = collected.length
      }
    } catch (e) {
      error.value = e as Error
      console.error('[useSpeciesIndex] Failed to load species index:', e)
    } finally {
      loading.value = false
      currentDatasetLabel.value = ''
    }
  }

  if (import.meta.client) {
    load()
  }

  return { data, loading, error, reload: load, loadedChunks, currentDatasetLabel }
}

// Get full species details on demand
export function useSpeciesDetails(dataset?: DatasetParam) {
  const baseURL = (useRuntimeConfig().app?.baseURL as string) || '/'
  const datasets = resolveDatasets(dataset)
  
  const cache = new Map<string, Species>()

  async function getSpecies(speciesId: string): Promise<Species | null> {
    // Check memory cache first
    if (cache.has(speciesId)) return cache.get(speciesId)!
    
    // Try to find in cached full datasets
    for (const ds of datasets) {
      try {
        const species = await fetchSpeciesById(baseURL, ds, speciesId)
        if (species) {
          cache.set(speciesId, species)
          return species
        }
      } catch {
        // Try next dataset
      }
    }
    
    return null
  }

  return { getSpecies, cache }
}

export function getSpeciesCache() {
  return memCache
}

export async function clearSpeciesCache() {
  memCache.clear()
  regionLookupCache.clear()
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // IndexedDB might not be available, ignore errors
  }
}
