/**
 * composables/useCulturalAgentsData.ts
 * @why Cultural agents data fetching — loads from merged static GeoJSON
 *      (`cultural-agents.json` containing Mapa Cultura + Floresta Ativista),
 *      optionally augments with floresta-ativista.json when present.
 * @functions useCulturalAgentsData
 * @deps vue (ref, shallowRef, computed); ~/lib/types (CulturalAgentFeatureCollection, CulturalAgentFeature)
 * @connections composables/useVulcanObservatoryPage.ts
 */
import { ref, shallowRef, computed, onMounted } from 'vue'
import type { CulturalAgentFeatureCollection, CulturalAgentFeature } from '~/lib/types'

const FETCH_TIMEOUT_MS = 30000
const MAX_ATTEMPTS = 2

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new Error(`timeout after ${ms}ms: ${url}`)), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

function isValidAgentFeature(f: unknown): f is CulturalAgentFeature {
  if (!f || typeof f !== 'object') return false
  const feat = f as { geometry?: { type?: unknown; coordinates?: unknown }; properties?: { name?: unknown } }
  if (!feat.geometry || feat.geometry.type !== 'Point') return false
  const c = feat.geometry.coordinates
  if (!Array.isArray(c) || c.length < 2) return false
  return Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1]))
}

/** Crash-safe dedup key: never throws on malformed geometry. */
function agentKey(f: CulturalAgentFeature): string {
  const p = f.properties ?? ({} as CulturalAgentFeature['properties'])
  let lng = 'x'
  let lat = 'x'
  try {
    const c = f.geometry?.coordinates
    if (Array.isArray(c) && c.length >= 2) {
      const x = Number(c[0])
      const y = Number(c[1])
      if (Number.isFinite(x) && Number.isFinite(y)) {
        lng = x.toFixed(5)
        lat = y.toFixed(5)
      }
    }
  } catch { /* keep fallback */ }
  return `${String(p.source ?? '?')}|${String(p.source_id ?? p.name ?? '?')}|${lng},${lat}`
}

async function fetchFeatureCollection(
  urls: string[],
  onError: (_msg: string) => void,
): Promise<{ data: CulturalAgentFeatureCollection | undefined; dropped: number }> {
  let lastErr = ''
  for (const url of urls) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetchWithTimeout(url)
        if (!res.ok) {
          lastErr = `HTTP ${res.status}`
          continue
        }
        const data = (await res.json()) as { type?: unknown; features?: unknown }
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          const valid: CulturalAgentFeature[] = []
          let dropped = 0
          for (const f of data.features) {
            if (isValidAgentFeature(f)) valid.push(f)
            else dropped++
          }
          if (dropped > 0) {
            console.warn(`[useCulturalAgentsData] ${url}: dropped ${dropped} invalid feature(s)`)
          }
          return { data: { type: 'FeatureCollection', features: valid }, dropped }
        }
        lastErr = 'invalid FeatureCollection'
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e)
      }
    }
  }
  onError(lastErr || 'fetch failed')
  return { data: undefined, dropped: 0 }
}

export function useCulturalAgentsData(baseURL: string) {
  const mergedAgentsData = shallowRef<CulturalAgentFeatureCollection | undefined>(undefined)
  const florestaAtivistaData = shallowRef<CulturalAgentFeatureCollection | undefined>(undefined)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const lastSync = ref<string | null>(null)
  const sourceErrors = ref<Record<string, string>>({})
  const droppedCount = ref(0)
  const loadedAt = ref<string | null>(null)

  /** Combined GeoJSON: merged mapa+floresta + standalone floresta (dedup) */
  const combinedData = computed<CulturalAgentFeatureCollection>(() => {
    const seen = new Set<string>()
    const features: CulturalAgentFeature[] = []

    const pushUnique = (f: CulturalAgentFeature) => {
      if (!isValidAgentFeature(f)) return
      const key = agentKey(f)
      if (seen.has(key)) return
      seen.add(key)
      features.push(f)
    }

    for (const f of mergedAgentsData.value?.features ?? []) pushUnique(f)
    for (const f of florestaAtivistaData.value?.features ?? []) pushUnique(f)

    return { type: 'FeatureCollection', features }
  })

  const agentsOnlyData = computed<CulturalAgentFeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: combinedData.value.features,
  }))

  const sourceCounts = computed(() => {
    const counts: Record<string, number> = {
      mapa_cultura: 0,
      floresta_ativista: 0,
    }
    for (const f of combinedData.value.features) {
      const src = f.properties.source
      counts[src] = (counts[src] || 0) + 1
    }
    return counts
  })

  /** Load both static digests in parallel. floresta-ativista is optional. */
  async function loadStaticData() {
    const base = (baseURL || '/').replace(/\/?$/, '/')
    // Fallback chain: baseURL-prefixed (GitHub Pages subpath) then
    // root-relative (dev / custom domains). A wrong baseURL used to fail
    // silently with an empty culture browser.
    const mergedUrls = [`${base}data/cultural-agents/cultural-agents.json`]
    const florestaUrls = [`${base}data/cultural-agents/floresta-ativista.json`]
    if (base !== '/') {
      mergedUrls.push('/data/cultural-agents/cultural-agents.json')
      florestaUrls.push('/data/cultural-agents/floresta-ativista.json')
    }
    const [merged, floresta] = await Promise.all([
      fetchFeatureCollection(mergedUrls, (m) => { sourceErrors.value['cultural-agents.json'] = m }),
      fetchFeatureCollection(florestaUrls, (m) => { sourceErrors.value['floresta-ativista.json'] = m }),
    ])
    if (merged.data) {
      mergedAgentsData.value = merged.data
      delete sourceErrors.value['cultural-agents.json']
    } else if (!mergedAgentsData.value) {
      sourceErrors.value['cultural-agents.json'] = sourceErrors.value['cultural-agents.json'] || 'Missing or invalid FeatureCollection'
    }
    if (floresta.data) {
      florestaAtivistaData.value = floresta.data
      delete sourceErrors.value['floresta-ativista.json']
    }
    // No warning for missing floresta — it's an optional additive source.
    droppedCount.value = merged.dropped + floresta.dropped
    loadedAt.value = new Date().toISOString()
  }

  /** Full load: static data only. */
  async function load() {
    if (isLoading.value) return
    isLoading.value = true
    error.value = null
    try {
      await loadStaticData()
      if (!mergedAgentsData.value?.features?.length && sourceErrors.value['cultural-agents.json']) {
        error.value = new Error(`Cultural agents failed to load (${sourceErrors.value['cultural-agents.json']})`)
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      isLoading.value = false
    }
  }

  /** Refresh (no-op for static data). */
  async function refresh() {
    await loadStaticData()
  }

  onMounted(() => {
    if (!mergedAgentsData.value && !isLoading.value) {
      load()
    }
  })

  return {
    culturalAgentsData: mergedAgentsData,
    florestaAtivistaData,
    combinedData,
    agentsOnlyData,
    sourceCounts,
    sourceErrors,
    droppedCount,
    loadedAt,
    isLoading,
    error,
    lastSync,
    load,
    refresh,
  }
}
