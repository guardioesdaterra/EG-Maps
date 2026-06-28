export interface GrantInput {
  title: string
  description: string
  location_name: string
  latitude: number | null
  longitude: number | null
  category: string
}

export interface GrantRecord {
  id: string
  title: string
  description: string
  location_name: string
  latitude: number
  longitude: number
  category: string
  status: string
  submitted_by: string
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
}

export function useGrants() {
  const client = useSupabaseClient()

  async function listGrants(status?: string): Promise<{ grants: GrantRecord[]; error?: string }> {
    try {
      const url = status ? `grants-list?status=${encodeURIComponent(status)}` : 'grants-list'
      const { data, error } = await client.functions.invoke(url)

      if (error) return { grants: [], error: error.message }
      return { grants: (data as { grants?: GrantRecord[] })?.grants ?? [] }
    } catch (e: unknown) {
      return { grants: [], error: e instanceof Error ? e.message : 'Failed to load grants' }
    }
  }

  async function submitGrant(input: GrantInput): Promise<{ grant?: GrantRecord; error?: string }> {
    try {
      const { data, error } = await client.functions.invoke('grants-submit', {
        body: input,
      })

      if (error) return { error: error.message }
      return { grant: (data as { grant?: GrantRecord })?.grant }
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Failed to submit grant' }
    }
  }

  async function reviewGrant(grantId: string, decision: 'approved' | 'rejected', notes?: string): Promise<{ error?: string }> {
    try {
      const { error } = await client.functions.invoke('grants-review', {
        body: { grant_id: grantId, decision, notes },
      })

      if (error) return { error: error.message }
      return {}
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Failed to review grant' }
    }
  }

  async function getStats(): Promise<{ pending: number; approved: number; rejected: number; total: number }> {
    try {
      const { data } = await client.functions.invoke('grants-stats')
      return (data as { pending: number; approved: number; rejected: number; total: number }) ?? { pending: 0, approved: 0, rejected: 0, total: 0 }
    } catch {
      return { pending: 0, approved: 0, rejected: 0, total: 0 }
    }
  }

  return { listGrants, submitGrant, reviewGrant, getStats }
}
