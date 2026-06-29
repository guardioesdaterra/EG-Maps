export interface ObservatoryUpdate {
  id: string
  user_id: string | null
  user_name: string | null
  update_type: string
  description: string
  location_name: string | null
  lat: number | null
  lng: number | null
  photo_base64?: string[]
  photo_count: number | null
  created_at: string
}

export interface ObservatoryUpdateInput {
  update_type: string
  description: string
  location_name?: string
  lat?: number
  lng?: number
  photos: string[]
}

const LOCAL_STORAGE_KEY = 'obs-community-contributions'

export function useObservatoryUpdates() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const updates = ref<ObservatoryUpdate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function loadLocal(): ObservatoryUpdate[] {
    if (!import.meta.client) return []
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveLocal(data: ObservatoryUpdate[]) {
    if (!import.meta.client) return
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  }

  function addLocal(update: ObservatoryUpdate) {
    const existing = loadLocal()
    existing.unshift(update)
    saveLocal(existing)
  }

  function removeLocal(id: string) {
    const existing = loadLocal().filter(u => u.id !== id)
    saveLocal(existing)
  }

  async function submitUpdate(input: ObservatoryUpdateInput): Promise<{ update?: ObservatoryUpdate; error?: string; synced?: boolean }> {
    // Always save to localStorage first (offline-first)
    const localUpdate: ObservatoryUpdate = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: user.value?.id || null,
      user_name: user.value?.user_metadata?.full_name as string || user.value?.email || null,
      update_type: input.update_type,
      description: input.description,
      location_name: input.location_name || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      photo_base64: input.photos,
      photo_count: input.photos.length,
      created_at: new Date().toISOString(),
    }
    addLocal(localUpdate)

    // If user is logged in, also sync to Supabase
    if (user.value) {
      try {
        const { data, error: fnError } = await client.functions.invoke('observatory-submit', {
          body: {
            update_type: input.update_type,
            description: input.description,
            location_name: input.location_name,
            lat: input.lat,
            lng: input.lng,
            photos: input.photos,
          },
        })

        if (fnError) {
          // Local save succeeded, cloud sync failed — return with synced=false
          return { update: localUpdate, error: fnError.message, synced: false }
        }

        const result = data as { update?: ObservatoryUpdate; error?: string }
        if (result.error) {
          return { update: localUpdate, error: result.error, synced: false }
        }

        if (result.update) {
          // Replace local entry with server entry (has real UUID)
          removeLocal(localUpdate.id)
          const existing = loadLocal()
          existing.unshift(result.update)
          saveLocal(existing)
          return { update: result.update, synced: true }
        }
      } catch (e) {
        // Network error — local save already succeeded
        return { update: localUpdate, error: e instanceof Error ? e.message : 'Network error', synced: false }
      }
    }

    // Not logged in — local only
    return { update: localUpdate, synced: false }
  }

  async function fetchUpdates(params?: { type?: string; page?: number; limit?: number; photos?: boolean }): Promise<{ updates: ObservatoryUpdate[]; total: number }> {
    loading.value = true
    error.value = null

    try {
      const url = new URL('observatory-list', window.location.origin)
      if (params?.type) url.searchParams.set('type', params.type)
      if (params?.page) url.searchParams.set('page', String(params.page))
      if (params?.limit) url.searchParams.set('limit', String(params.limit))
      if (params?.photos) url.searchParams.set('photos', 'true')

      const { data, error: fnError } = await client.functions.invoke(
        `observatory-list?${url.searchParams.toString()}`,
      )

      if (fnError) {
        error.value = fnError.message
        return { updates: [], total: 0 }
      }

      const result = data as { updates?: ObservatoryUpdate[]; total?: number; error?: string }
      if (result.error) {
        error.value = result.error
        return { updates: [], total: 0 }
      }

      updates.value = result.updates || []
      return { updates: result.updates || [], total: result.total || 0 }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch updates'
      return { updates: [], total: 0 }
    } finally {
      loading.value = false
    }
  }

  async function deleteUpdate(updateId: string): Promise<{ error?: string }> {
    // Remove from local storage
    removeLocal(updateId)

    // If logged in, also delete from Supabase
    if (user.value) {
      try {
        const { error: fnError } = await client.functions.invoke('observatory-delete', {
          body: { update_id: updateId },
        })
        if (fnError) {
          return { error: fnError.message }
        }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Network error' }
      }
    }

    return {}
  }

  function getLocalUpdates(): ObservatoryUpdate[] {
    return loadLocal()
  }

  return {
    updates: readonly(updates),
    loading: readonly(loading),
    error: readonly(error),
    submitUpdate,
    fetchUpdates,
    deleteUpdate,
    getLocalUpdates,
  }
}
