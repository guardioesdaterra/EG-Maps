import { ref } from 'vue'
import type { Species } from '@/lib/types'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'

const memCache = new Map<string, Species[]>()

const DB_NAME = 'eg-maps-species'
const DB_VERSION = 1
const STORE_NAME = 'datasets'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
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
  } catch { return undefined }
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
  } catch { /* silently fail */ }
}

type DatasetParam = string | string[]

function resolveDatasets(dataset?: DatasetParam): string[] {
  if (!dataset) return ['icmbio-brazil']
  if (Array.isArray(dataset)) return dataset
  return [dataset]
}

function preloadJSON(baseURL: string, dataset: string) {
  const href = `${baseURL}data/species/${dataset}.json`
  if (document.querySelector(`link[href="${href}"][rel="preload"]`)) return
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'fetch'
  link.href = href
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

async function fetchDataset(baseURL: string, ds: string): Promise<Species[]> {
  if (memCache.has(ds)) return memCache.get(ds)!

  const cached = await idbGet<Species[]>(ds)
  if (cached) {
    memCache.set(ds, cached)
    return cached
  }

  const url = `${baseURL}data/species/${ds}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load species data: ${res.status}`)
  const data: Species[] = await res.json()
  memCache.set(ds, data)

  idbSet(ds, data)
  return data
}

// Fetch lightweight index for map markers (loads in seconds vs minutes)
async function fetchSpeciesIndex(baseURL: string, ds: string): Promise<SpeciesIndexItem[]> {
  const cacheKey = `${ds}-index`
  if (memCache.has(cacheKey)) return memCache.get(cacheKey) as SpeciesIndexItem[]

  const url = `${baseURL}data/species/${ds}-index.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load species index: ${res.status}`)
  const data: SpeciesIndexItem[] = await res.json()
  memCache.set(cacheKey, data as unknown as Species[])  // Store as Species[] for compatibility

  return data
}

// Fetch full species by ID from the complete dataset
async function fetchSpeciesById(baseURL: string, ds: string, speciesId: string): Promise<Species | null> {
  const fullData = await fetchDataset(baseURL, ds)
  return fullData.find(s => s.id === speciesId) || null
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
      const results: Species[] = []
      for (const ds of datasets) {
        const species = await fetchDataset(baseURL, ds)
        results.push(...species)
      }
      data.value = results
    } catch (e) {
      error.value = e as Error
      // eslint-disable-next-line no-console
      console.error('Failed to load species data:', e)
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    for (const ds of datasets) {
      preloadJSON(baseURL, ds)
    }
    load()
  }

  return { data, loading, error, reload: load }
}

// Lightweight version that only loads marker index (for large datasets)
export function useSpeciesIndex(dataset?: DatasetParam) {
  const data = ref<SpeciesIndexItem[]>([])
  const loading = ref(true)
  const error = ref<Error | null>(null)

  const datasets = resolveDatasets(dataset)
  const baseURL = (useRuntimeConfig().app?.baseURL as string) || '/'

  async function load() {
    loading.value = true
    error.value = null
    try {
      const results: SpeciesIndexItem[] = []
      for (const ds of datasets) {
        const index = await fetchSpeciesIndex(baseURL, ds)
        results.push(...index)
      }
      data.value = results
    } catch (e) {
      error.value = e as Error
      // eslint-disable-next-line no-console
      console.error('Failed to load species index:', e)
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    load()
  }

  return { data, loading, error, reload: load }
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
    
    // Last resort: fetch the full dataset (expensive)
    for (const ds of datasets) {
      try {
        const species = await fetchSpeciesById(baseURL, ds, speciesId)
        if (species) {
          cache.set(speciesId, species)
          return species
        }
      } catch {
        // Continue
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
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
  } catch {
    // IndexedDB might not be available, ignore errors
  }
}
