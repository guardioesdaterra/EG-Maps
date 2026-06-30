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
  relevance: number
  status: string
  fetched_at: string
  created_at: string
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

export function useGrants() {
  const supabase = useSupabaseClient()

  async function listGrants(status?: string) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const { data, error } = await supabase.functions.invoke(`grants-list?${params}`, { method: 'GET' })
    if (error) return { error: error.message, grants: [] }
    return data as { grants: GrantRecord[]; total: number }
  }

  async function listScrapedGrants(status?: string) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const { data, error } = await supabase.functions.invoke(`grants-scraped-list?${params}`, { method: 'GET' })
    if (error) return { error: error.message, grants: [] }
    return data as { grants: ScrapedGrant[]; total: number }
  }

  async function submitGrant(input: GrantInput) {
    const { data, error } = await supabase.functions.invoke('grants-submit', {
      method: 'POST',
      body: input,
    })
    if (error) return { error: error.message }
    return data as { grant: GrantRecord }
  }

  async function reviewGrant(grantId: string, decision: 'approved' | 'rejected', notes?: string) {
    const { data, error } = await supabase.functions.invoke('grants-review', {
      method: 'POST',
      body: { grant_id: grantId, decision, notes },
    })
    if (error) return { error: error.message }
    return data as { grant: GrantRecord }
  }

  async function reviewScrapedGrant(grantId: string, decision: 'approved' | 'rejected' | 'hidden') {
    const { data, error } = await supabase.functions.invoke('grants-scraped-review', {
      method: 'POST',
      body: { grant_id: grantId, decision },
    })
    if (error) return { error: error.message }
    return data as { grant: ScrapedGrant }
  }

  async function getStats() {
    const { data, error } = await supabase.functions.invoke('grants-stats', { method: 'GET' })
    if (error) return { pending: 0, approved: 0, rejected: 0, total: 0 }
    return data as { pending: number; approved: number; rejected: number; total: number }
  }

  async function voteGrant(grantId: string, stars: number) {
    const { data, error } = await supabase.functions.invoke('grants-vote', {
      method: 'POST',
      body: { grant_id: grantId, stars },
    })
    if (error) return { error: error.message }
    return data as { vote: { id: string; stars: number } }
  }

  async function voteScrapedGrant(scrapedId: string, stars: number) {
    const { data, error } = await supabase.functions.invoke('grants-vote', {
      method: 'POST',
      body: { scraped_id: scrapedId, stars },
    })
    if (error) return { error: error.message }
    return data as { vote: { id: string; stars: number } }
  }

  async function deleteVote(grantId: string, scrapedId?: string) {
    const params = new URLSearchParams({ method: 'delete' })
    if (scrapedId) params.set('scraped_id', scrapedId)
    else params.set('grant_id', grantId)
    const { data, error } = await supabase.functions.invoke(`grants-vote?${params}`, { method: 'DELETE' })
    if (error) return { error: error.message }
    return data as { deleted: boolean }
  }

  async function getLeaderboard(type?: string, status?: string) {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    const { data, error } = await supabase.functions.invoke(`grants-leaderboard?${params}`, { method: 'GET' })
    if (error) return { error: error.message, grants: [] }
    return data as { grants: LeaderboardEntry[]; total: number }
  }

  return {
    listGrants,
    listScrapedGrants,
    submitGrant,
    reviewGrant,
    reviewScrapedGrant,
    getStats,
    voteGrant,
    voteScrapedGrant,
    deleteVote,
    getLeaderboard,
  }
}
