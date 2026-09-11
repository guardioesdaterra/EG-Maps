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

async function fetchFeatureCollection(url: string): Promise<CulturalAgentFeatureCollection | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[useCulturalAgentsData] ${url} returned HTTP ${res.status}`)
      return undefined
    }
    const data = await res.json()
    if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      return data as CulturalAgentFeatureCollection
    }
    console.warn(`[useCulturalAgentsData] ${url} did not return a FeatureCollection`)
    return undefined
  } catch (e) {
    console.warn(`[useCulturalAgentsData] Failed to load ${url}:`, e)
    return undefined
  }
}

export function useCulturalAgentsData(baseURL: string) {
  const mergedAgentsData = shallowRef<CulturalAgentFeatureCollection | undefined>(undefined)
  const florestaAtivistaData = shallowRef<CulturalAgentFeatureCollection | undefined>(undefined)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const lastSync = ref<string | null>(null)
  const sourceErrors = ref<Record<string, string>>({})

  /** Combined GeoJSON: merged mapa+floresta + standalone floresta (dedup) */
  const combinedData = computed<CulturalAgentFeatureCollection>(() => {
    const seen = new Set<string>()
    const features: CulturalAgentFeature[] = []

    const pushUnique = (f: CulturalAgentFeature) => {
      const p = f.properties
      const key = `${p.source}|${p.source_id || p.name}|${f.geometry.coordinates[0].toFixed(5)},${f.geometry.coordinates[1].toFixed(5)}`
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
    const [merged, floresta] = await Promise.all([
      fetchFeatureCollection(`${baseURL}data/cultural-agents/cultural-agents.json`),
      fetchFeatureCollection(`${baseURL}data/cultural-agents/floresta-ativista.json`),
    ])
    if (merged) mergedAgentsData.value = merged
    else sourceErrors.value['cultural-agents.json'] = 'Missing or invalid FeatureCollection'
    if (floresta) florestaAtivistaData.value = floresta
    // No warning for missing floresta — it's an optional additive source.
  }

  /** Full load: static data only. */
  async function load() {
    isLoading.value = true
    error.value = null
    try {
      await loadStaticData()
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
    isLoading,
    error,
    lastSync,
    load,
    refresh,
  }
}