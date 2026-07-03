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

export function useCulturalAgentsData(baseURL: string) {
  const culturalAgentsData = shallowRef<CulturalAgentFeatureCollection | undefined>(undefined)
  const communityPins = ref<CommunityPin[]>([])
  const communityFeatures = ref<CulturalAgentFeature[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const lastSync = ref<string | null>(null)

  /** Combined GeoJSON: static cultural agents + live community pins */
  const combinedData = computed<CulturalAgentFeatureCollection>(() => {
    const staticFeatures = culturalAgentsData.value?.features ?? []
    const liveFeatures = communityFeatures.value
    return {
      type: 'FeatureCollection',
      features: [...staticFeatures, ...liveFeatures],
    }
  })

  /** Only community-sourced pins */
  const communityOnlyData = computed<CulturalAgentFeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: communityFeatures.value,
  }))

  /** Only API-synced agents */
  const agentsOnlyData = computed<CulturalAgentFeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: culturalAgentsData.value?.features ?? [],
  }))

  /** Count by source */
  const sourceCounts = computed(() => {
    const counts: Record<string, number> = { mapa_cultura: 0, floresta_ativista: 0, community: 0 }
    for (const f of combinedData.value.features) {
      const src = f.properties.source
      counts[src] = (counts[src] || 0) + 1
    }
    return counts
  })

  /** Load static JSON baseline */
  async function loadStaticData() {
    try {
      const res = await fetch(`${baseURL}data/cultural-agents/cultural-agents.json`)
      if (res.ok) {
        culturalAgentsData.value = await res.json()
      }
    } catch (e) {
      console.warn('[useCulturalAgentsData] Static data load failed:', e)
    }
  }

  /** Load live community pins from Supabase */
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

  /** Submit a new community pin via Edge Function */
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

      // Add the new pin to local state immediately
      const newPin: CommunityPin = {
        ...result.pin,
        status: 'pending',
      }
      communityPins.value = [newPin, ...communityPins.value]

      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' }
    }
  }

  /** Full load: static + live */
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

  /** Refresh live data only */
  async function refresh() {
    await loadCommunityPins()
  }

  return {
    culturalAgentsData,
    communityPins,
    combinedData,
    communityOnlyData,
    agentsOnlyData,
    sourceCounts,
    isLoading,
    error,
    lastSync,
    load,
    refresh,
    submitPin,
  }
}
