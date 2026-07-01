import { useSupabase } from './useSupabase'

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

export interface ScrapedGrant {
  id: string
  source_id: string
  title: string
  funder: string
  source: string
  url: string
  description: string
  deadline: string
  amount_max: string
  amount_min: string
  currency: string
  country: string
  region: string
  categories: string[]
  language: string
  relevance?: number
  status: string
  fetched_at: string
  created_at: string
  grant_type?: string
  grant_types?: string[]
  highlights?: string[]
  urgency?: string
  deadline_days?: number | null
  amount_usd?: number | null
  priority_score?: number
}

export interface LeaderboardEntry {
  id: string
  title: string
  description: string
  source_type: 'internal' | 'scraped'
  avg_stars: number
  total_stars: number
  vote_count: number
  view_count: number
  status: string
  location_name?: string
  country?: string
  funder?: string
  url?: string
  source?: string
  deadline?: string
  amount_max?: string
  created_at: string
}

async function invoke(fnName: string, options?: { method?: string; body?: unknown }) {
  const { client } = useSupabase()
  const { data, error } = await client.functions.invoke(fnName, {
    method: options?.method || 'GET',
    body: options?.body,
  })
  if (error) throw error
  return data
}

export function useGrants() {
  async function listGrants(status?: string) {
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const data = await invoke(`grants-list?${params}`)
      return data as { grants: GrantRecord[]; total: number }
    } catch (e) {
      return { error: (e as Error).message, grants: [] as GrantRecord[], total: 0 }
    }
  }

  async function listScrapedGrants(status?: string) {
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const data = await invoke(`grants-scraped-list?${params}`)
      return data as { grants: ScrapedGrant[]; total: number }
    } catch (e) {
      return { error: (e as Error).message, grants: [] as ScrapedGrant[], total: 0 }
    }
  }

  async function submitGrant(input: GrantInput) {
    try {
      const data = await invoke('grants-submit', { method: 'POST', body: input })
      return data as { grant: GrantRecord }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  async function reviewGrant(grantId: string, decision: 'approved' | 'rejected', notes?: string) {
    try {
      const data = await invoke('grants-review', {
        method: 'POST',
        body: { grant_id: grantId, decision, notes },
      })
      return data as { grant: GrantRecord }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  async function updateScrapedGrant(grantId: string, updates: Record<string, unknown>) {
    try {
      const data = await invoke('grants-scraped-update', {
        method: 'POST',
        body: { grant_id: grantId, ...updates },
      })
      return data as { grant: ScrapedGrant }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  async function reviewScrapedGrant(grantId: string, decision: 'approved' | 'rejected' | 'hidden' | 'pending', notes?: string) {
    try {
      const data = await invoke('grants-approve', {
        method: 'POST',
        body: { grant_id: grantId, decision, notes },
      })
      return data as { grant_id: string; decision: string }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  async function getStats() {
    try {
      const data = await invoke('grants-stats')
      return data as { pending: number; approved: number; rejected: number; total: number }
    } catch {
      return { pending: 0, approved: 0, rejected: 0, total: 0 }
    }
  }

  async function voteGrant(grantId: string, stars: number) {
    try {
      const data = await invoke('grants-vote', {
        method: 'POST',
        body: { grant_id: grantId, stars },
      })
      return data as { vote: { id: string; stars: number } }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  async function voteScrapedGrant(scrapedId: string, stars: number) {
    try {
      const data = await invoke('grants-vote', {
        method: 'POST',
        body: { scraped_id: scrapedId, stars },
      })
      return data as { vote: { id: string; stars: number } }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  async function deleteVote(grantId: string, scrapedId?: string) {
    try {
      const params = new URLSearchParams({ method: 'delete' })
      if (scrapedId) params.set('scraped_id', scrapedId)
      else params.set('grant_id', grantId)
      const data = await invoke(`grants-vote?${params}`, { method: 'DELETE' })
      return data as { deleted: boolean }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  async function getLeaderboard(type?: string, status?: string) {
    try {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (status) params.set('status', status)
      const data = await invoke(`grants-leaderboard?${params}`)
      return data as { grants: LeaderboardEntry[]; total: number }
    } catch (e) {
      return { error: (e as Error).message, grants: [] as LeaderboardEntry[], total: 0 }
    }
  }

  return {
    listGrants,
    listScrapedGrants,
    submitGrant,
    reviewGrant,
    reviewScrapedGrant,
    updateScrapedGrant,
    getStats,
    voteGrant,
    voteScrapedGrant,
    deleteVote,
    getLeaderboard,
  }
}
