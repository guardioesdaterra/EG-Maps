/**
 * composables/useCulturalAgentsData.ts
 * @why Cultural agents data fetching — loads from merged static GeoJSON
 *      (`cultural-agents.json` containing Mapa Cultura + Floresta Ativista),
 *      optionally augments with floresta-ativista.json when present, and
 *      layers live community pins from Supabase on top.
 * @functions useCulturalAgentsData
 * @deps vue (ref, shallowRef, computed); ~/lib/types (CulturalAgentFeatureCollection, CommunityPin, CulturalAgentFeature)
 * @connections composables/useVulcanObservatoryPage.ts
 */
import { ref, shallowRef, computed, onMounted } from 'vue'
import type { CulturalAgentFeatureCollection, CommunityPin, CulturalAgentFeature } from '~/lib/types'
import { getSupabaseClient, isSupabaseConfigured } from '~/lib/supabase'

const AGENT_PIN_TYPE_MAP: Record<string, string> = {
  cultural_agent: 'cultural_center',
  cultural_avenue: 'artist_group',
  show_event: 'event',
  action: 'rural',
  point_of_attention: 'marginalized',
}

function communityPinToFeature(pin: CommunityPin): CulturalAgentFeature {
  return {
    type: 'Feature',
    id: pin.id,
    geometry: { type: 'Point', coordinates: [pin.longitude, pin.latitude] },
    properties: {
      name: pin.name,
      type: 'cultural',
      subtype: AGENT_PIN_TYPE_MAP[pin.pin_type] || 'cultural_center',
      source: 'community',
      source_id: pin.id,
      status: pin.status === 'approved' ? 'active' : 'pending',
      description: pin.description || `Community ${pin.pin_type.replace(/_/g, ' ')}`,
    },
  }
}

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
  const communityPins = ref<CommunityPin[]>([])
  const communityFeatures = ref<CulturalAgentFeature[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const lastSync = ref<string | null>(null)
  const sourceErrors = ref<Record<string, string>>({})

  /** Combined GeoJSON: merged mapa+floresta + standalone floresta (dedup) + community */
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
    for (const f of communityFeatures.value) pushUnique(f)

    return { type: 'FeatureCollection', features }
  })

  const communityOnlyData = computed<CulturalAgentFeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: communityFeatures.value,
  }))

  const agentsOnlyData = computed<CulturalAgentFeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: combinedData.value.features.filter(
      (f) => f.properties.source !== 'community',
    ),
  }))

  const sourceCounts = computed(() => {
    const counts: Record<string, number> = {
      mapa_cultura: 0,
      floresta_ativista: 0,
      community: 0,
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

  /** Load live community pins from Supabase. */
  async function loadCommunityPins() {
    if (!isSupabaseConfigured()) return
    try {
      const client = getSupabaseClient()
      const { data, error: fetchError } = await client
        .from('community_pins')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(500)
      if (fetchError) {
        console.warn('[useCulturalAgentsData] Supabase query failed:', fetchError.message)
        return
      }
      communityPins.value = (data ?? []) as CommunityPin[]
      communityFeatures.value = communityPins.value.map(communityPinToFeature)
      lastSync.value = new Date().toISOString()
    } catch (e) {
      console.warn('[useCulturalAgentsData] Community pins load failed:', e)
    }
  }

  /** Submit a new community pin via Edge Function. */
  async function submitPin(payload: {
    pin_type: string
    name: string
    description?: string
    latitude: number
    longitude: number
    source_url?: string
  }): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' }
    }
    const client = getSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    if (!session?.access_token) {
      return { success: false, error: 'Authentication required' }
    }
    try {
      const config = useRuntimeConfig()
      const supabaseUrl = config.public.supabaseUrl as string
      const functionUrl = `${supabaseUrl}/functions/v1/register-pin`
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': config.public.supabaseKey as string,
        },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) {
        return { success: false, error: result.error || 'Submission failed' }
      }
      const newPin: CommunityPin = { ...result.pin, status: 'pending' }
      communityPins.value = [newPin, ...communityPins.value]
      communityFeatures.value = [communityPinToFeature(newPin), ...communityFeatures.value]
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' }
    }
  }

  /** Full load: static + live. */
  async function load() {
    isLoading.value = true
    error.value = null
    try {
      await Promise.all([loadStaticData(), loadCommunityPins()])
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      isLoading.value = false
    }
  }

  /** Refresh live data only. */
  async function refresh() {
    await loadCommunityPins()
  }

  onMounted(() => {
    if (!mergedAgentsData.value && !isLoading.value) {
      load()
    }
  })

  return {
    culturalAgentsData: mergedAgentsData,
    florestaAtivistaData,
    communityPins,
    combinedData,
    communityOnlyData,
    agentsOnlyData,
    sourceCounts,
    sourceErrors,
    isLoading,
    error,
    lastSync,
    load,
    refresh,
    submitPin,
  }
}