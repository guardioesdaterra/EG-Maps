import { useSupabase } from './useSupabase'

export interface GrantInput {
  title: string
  description: string
  location_name: string
  latitude: number | null
  longitude: number | null
  category: string
  funder?: string
  url?: string
  amount_max?: string
  amount_min?: string
  currency?: string
  country?: string
  grant_type?: string
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
  reviewed?: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  funder?: string
  url?: string
  amount_max?: string
  amount_min?: string
  currency?: string
  country?: string
  grant_type?: string
  priority_score?: number
  hidden?: boolean
  source_id?: string
  source?: string
  highlights?: string[]
  urgency?: string
  categories?: string[]
  amount_usd?: number | null
  deadline?: string
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
  reviewed?: boolean
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

export interface GrantComment {
  id: string
  grant_id: string
  email: string
  author_name?: string
  content: string
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  title: string
  description: string
  source_type: 'crew' | 'scraped'
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
  priority_score?: number
  relevance?: number
  created_at: string
}

async function invoke(fnName: string, options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'; body?: Record<string, unknown> | object }) {
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
      const params = new URLSearchParams({ action: 'list' })
      if (status) params.set('status', status)
      const data = await invoke(`grants?${params}`)
      return data as { grants: GrantRecord[]; total: number }
    } catch (e: unknown) {
      return { error: (e as Error).message, grants: [] as GrantRecord[], total: 0 }
    }
  }

  async function listScrapedGrants(status?: string) {
    try {
      const params = new URLSearchParams({ action: 'list', source_table: 'scraped_grants' })
      if (status) params.set('status', status)
      const data = await invoke(`grants?${params}`)
      return data as { grants: ScrapedGrant[]; total: number }
    } catch (e: unknown) {
      return { error: (e as Error).message, grants: [] as ScrapedGrant[], total: 0 }
    }
  }

  async function submitGrant(input: GrantInput) {
    try {
      const data = await invoke('grants?action=submit', { method: 'POST', body: input })
      return data as { grant: GrantRecord }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function reviewGrant(grantId: string, decision: 'open' | 'closed', notes?: string) {
    try {
      const data = await invoke('grants?action=manage', {
        method: 'POST',
        body: { grant_id: grantId, action: decision === 'open' ? 'approve' : 'reject', notes },
      })
      return data as { grant: GrantRecord }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function updateScrapedGrant(grantId: string, updates: Record<string, unknown>) {
    try {
      const data = await invoke('grants?action=manage', {
        method: 'POST',
        body: { grant_id: grantId, action: 'edit', table: 'scraped_grants', updates },
      })
      return data as { grant: ScrapedGrant }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function reviewScrapedGrant(grantId: string, decision: 'approved' | 'rejected' | 'hidden' | 'pending', notes?: string) {
    try {
      const actionMap: Record<string, string> = {
        approved: 'approve',
        rejected: 'reject',
        hidden: 'hide',
        pending: 'show',
      }
      const data = await invoke('grants?action=manage', {
        method: 'POST',
        body: { grant_id: grantId, action: actionMap[decision] || 'reject', table: 'scraped_grants', notes },
      })
      return data as { grant_id: string; action: string }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function getStats() {
    try {
      const data = await invoke('grants?action=list&status=stats')
      const s = data as { pending: number; open: number; closed: number; hidden: number; total: number }
      return {
        pending: s.pending ?? 0,
        open: s.open ?? 0,
        closed: s.closed ?? 0,
        hidden: s.hidden ?? 0,
        total: s.total ?? 0,
      }
    } catch {
      return { pending: 0, open: 0, closed: 0, hidden: 0, total: 0 }
    }
  }

  async function voteGrant(grantId: string, stars: number) {
    try {
      const data = await invoke('grants?action=vote', {
        method: 'POST',
        body: { grant_id: grantId, stars },
      })
      return data as { vote: { id: string; stars: number } }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function voteScrapedGrant(scrapedId: string, stars: number) {
    try {
      const data = await invoke('grants?action=vote', {
        method: 'POST',
        body: { scraped_id: scrapedId, stars },
      })
      return data as { vote: { id: string; stars: number } }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function deleteVote(grantId: string, scrapedId?: string) {
    try {
      const id = scrapedId || grantId
      const data = await invoke(`grants?action=vote&grant_id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      return data as { deleted: boolean }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function getLeaderboard(type?: string, status?: string) {
    try {
      const params = new URLSearchParams({ action: 'leaderboard' })
      if (type) params.set('type', type)
      if (status) params.set('status', status)
      const data = await invoke(`grants?${params}`)
      return data as { grants: LeaderboardEntry[]; total: number }
    } catch (e: unknown) {
      return { error: (e as Error).message, grants: [] as LeaderboardEntry[], total: 0 }
    }
  }

  async function getComments(grantId: string) {
    try {
      const data = await invoke(`grants?action=comment&grant_id=${encodeURIComponent(grantId)}`)
      return data as { comments: GrantComment[] }
    } catch (e: unknown) {
      return { error: (e as Error).message, comments: [] as GrantComment[] }
    }
  }

  async function addComment(grantId: string, content: string, authorName?: string) {
    try {
      const data = await invoke('grants?action=comment', {
        method: 'POST',
        body: { grant_id: grantId, content, author_name: authorName },
      })
      return data as { comment: GrantComment }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const data = await invoke(`grants?action=comment&comment_id=${encodeURIComponent(commentId)}`, { method: 'DELETE' })
      return data as { deleted: boolean }
    } catch (e: unknown) {
      return { error: (e as Error).message }
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
    getComments,
    addComment,
    deleteComment,
  }
}
