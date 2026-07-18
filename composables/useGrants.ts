/**
 * composables/useGrants.ts
 * @why Grants API client — fetch grant lists, submit new grants, approve, vote, and comment via edge function
 * @functions useGrants
 * @interfaces ReviewScrapedResult, GrantInput, GrantRecord, ScrapedGrant, GrantComment, LeaderboardEntry
 * @deps ./useSupabase (useSupabase)
 */
import type { ClaimRecord, CreateGrantInput } from '~/lib/types'
import { useSupabase } from './useSupabase'

function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export interface ReviewScrapedResult {
  grant_id: string
  action: string
  moved_to_grants?: boolean
  status?: string
  error?: string
}

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

export interface EGProjectGrant {
  id: string
  project_slug: string
  title: string
  country: string
  latitude: number
  longitude: number
  direct_beneficiaries: number
  indirect_beneficiaries: number
  priority_score: number
  funder: string
  amount_max: string
  amount_min: string
  currency: string
  grant_type: string
  category: string
  status: string
  claimed_by: string | null
  claimed_at: string | null
  claim_note: string
  description: string
  website_url: string
  photo_urls: string[]
  update_summary: string
  last_update_at: string | null
  highlights: string[]
  urgency: string | null
  source: string
  reviewed: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface EGProjectUpdate {
  id: string
  project_id: string
  user_id: string
  user_email: string
  user_name: string
  title: string
  content: string
  photo_urls: string[]
  created_at: string
}

export interface Partner {
  id: string
  name: string
  slug: string
  description: string
  mission: string
  logo_url: string
  website_url: string
  country: string
  city: string
  latitude: number | null
  longitude: number | null
  partner_type: string
  sectors: string[]
  status: string
  contact_email: string
  contact_name: string
  contact_phone: string
  total_opportunities: number
  total_funded: number
  total_amount_usd: number
  created_by: string | null
  reviewed: boolean
  created_at: string
  updated_at: string
}

export interface PartnerOpportunity {
  id: string
  partner_id: string
  title: string
  description: string
  url: string
  amount_min: string
  amount_max: string
  currency: string
  amount_usd: number | null
  deadline: string
  is_standing: boolean
  categories: string[]
  grant_type: string
  priority_score: number
  urgency: string | null
  country: string
  region: string
  worldwide: boolean
  status: string
  highlights: string[]
  source: string
  hidden: boolean
  created_at: string
  updated_at: string
  partners?: { name: string; slug: string; logo_url: string }
}

export interface CrewLocation {
  id: string
  name: string
  country: string
  city: string
  state: string
  region: string
  latitude: number
  longitude: number
  status: string
  member_count: number
  leader_name: string
  leader_email: string
  description: string
  meeting_schedule: string
  created_at: string
  updated_at: string
}

export interface CrewRegionStats {
  id: string
  region: string
  latitude: number
  longitude: number
  active_crews: number
  inactive_crews: number
  total_members: number
  countries: number
  history: Array<{ year: number; activeCrews: number; inactiveCrews: number; members: number; countries: number }>
  updated_at: string
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
    timeout: 15000,
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

  async function reviewScrapedGrant(grantId: string, decision: 'approved' | 'rejected' | 'hidden' | 'closed' | 'pending', notes?: string, table = 'scraped_grants'): Promise<ReviewScrapedResult> {
    try {
      const actionMap: Record<string, string> = {
        approved: 'approve',
        rejected: 'reject',
        hidden: 'hide',
        closed: 'close',
        pending: 'show',
      }
      const action = actionMap[decision] || 'reject'
      const data = await invoke('grants?action=manage', {
        method: 'POST',
        body: {
          grant_id: grantId,
          action,
          table,
          notes,
          move_to_grants: action === 'approve',
        },
      })
      const result = data as Record<string, unknown>
      return {
        grant_id: (result.grant_id as string) || grantId,
        action: (result.action as string) || action,
        moved_to_grants: (result.moved_to_grants as boolean) ?? action === 'approve',
        status: (result.status as string) || undefined,
      }
    } catch (e: unknown) {
      return { grant_id: grantId, action: decision, error: (e as Error).message }
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

  async function listEGProjects(status?: string) {
    try {
      const params = new URLSearchParams({ action: 'eg_projects', source_table: 'eg_project_grants' })
      if (status) params.set('status', status)
      const data = await invoke(`grants?${params}`)
      return data as { grants: EGProjectGrant[]; total: number }
    } catch (e: unknown) {
      return { error: (e as Error).message, grants: [] as EGProjectGrant[], total: 0 }
    }
  }

  async function claimEGProject(projectId: string, claimNote: string) {
    try {
      const data = await invoke('grants?action=manage', {
        method: 'POST',
        body: { grant_id: projectId, action: 'claim', table: 'eg_project_grants', notes: claimNote },
      })
      return data as { grant: EGProjectGrant }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function updateEGProject(projectId: string, updates: Record<string, unknown>) {
    try {
      const data = await invoke('grants?action=manage', {
        method: 'POST',
        body: { grant_id: projectId, action: 'edit', table: 'eg_project_grants', updates },
      })
      return data as { grant: EGProjectGrant }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function listEGProjectUpdates(projectId: string) {
    try {
      const params = new URLSearchParams({ action: 'eg_updates', project_id: projectId })
      const data = await invoke(`grants?${params}`)
      return data as { updates: EGProjectUpdate[] }
    } catch (e: unknown) {
      return { error: (e as Error).message, updates: [] as EGProjectUpdate[] }
    }
  }

  async function addEGProjectUpdate(projectId: string, title: string, content: string, photoUrls?: string[]) {
    try {
      const data = await invoke('grants?action=manage', {
        method: 'POST',
        body: { grant_id: projectId, action: 'add_update', table: 'eg_project_updates', updates: { title, content, photo_urls: photoUrls || [] } },
      })
      return data as { update: EGProjectUpdate }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  // ── Partners & Opportunities ──────────────────────────────────

  async function listPartners(params?: { status?: string; type?: string; q?: string; page?: number; limit?: number }) {
    try {
      const sp = new URLSearchParams({ action: 'list' })
      if (params?.status) sp.set('status', params.status)
      if (params?.type) sp.set('type', params.type)
      if (params?.q) sp.set('q', params.q)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.limit) sp.set('limit', String(params.limit))
      const data = await invoke(`partners?${sp}`)
      return data as { partners: Partner[]; total: number }
    } catch (e: unknown) {
      return { error: (e as Error).message, partners: [] as Partner[], total: 0 }
    }
  }

  async function getPartner(idOrSlug: string) {
    try {
      const sp = new URLSearchParams({ action: 'get' })
      if (isValidUUID(idOrSlug)) sp.set('id', idOrSlug)
      else sp.set('slug', idOrSlug)
      const data = await invoke(`partners?${sp}`)
      return data as { partner: Partner; opportunities: PartnerOpportunity[] }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function listOpportunities(params?: { status?: string; partner_id?: string; category?: string; q?: string; worldwide?: boolean; page?: number; limit?: number }) {
    try {
      const sp = new URLSearchParams({ action: 'opportunities' })
      if (params?.status) sp.set('status', params.status)
      if (params?.partner_id) sp.set('partner_id', params.partner_id)
      if (params?.category) sp.set('category', params.category)
      if (params?.q) sp.set('q', params.q)
      if (params?.worldwide) sp.set('worldwide', 'true')
      if (params?.page) sp.set('page', String(params.page))
      if (params?.limit) sp.set('limit', String(params.limit))
      const data = await invoke(`partners?${sp}`)
      return data as { opportunities: PartnerOpportunity[]; total: number }
    } catch (e: unknown) {
      return { error: (e as Error).message, opportunities: [] as PartnerOpportunity[], total: 0 }
    }
  }

  async function getPartnerStats() {
    try {
      const data = await invoke('partners?action=stats')
      return data as { totalPartners: number; openOpportunities: number; closedOpportunities: number; standingOpportunities: number }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  // ── Crew Locations ──────────────────────────────────────────

  // ── Claims & Grant Creation ──────────────────────────────────

  async function createGrant(input: CreateGrantInput) {
    try {
      const data = await invoke('grants?action=create', {
        method: 'POST',
        body: input,
      })
      return data as { grant: GrantRecord }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function listClaims(params?: { status?: string; project_id?: string }) {
    try {
      const sp = new URLSearchParams({ action: 'list_claims' })
      if (params?.status) sp.set('status', params.status)
      if (params?.project_id) sp.set('project_id', params.project_id)
      const data = await invoke(`grants?${sp}`)
      return data as { claims: ClaimRecord[]; total: number }
    } catch (e: unknown) {
      return { error: (e as Error).message, claims: [] as ClaimRecord[], total: 0 }
    }
  }

  async function reviewClaim(claimId: string, decision: 'approved' | 'rejected', reviewNote?: string) {
    try {
      const data = await invoke('grants?action=review_claim', {
        method: 'POST',
        body: { claim_id: claimId, decision, review_note: reviewNote },
      })
      return data as { claim: ClaimRecord }
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  }

  async function listCrewLocations(params?: { region?: string; status?: string; country?: string; q?: string; page?: number; limit?: number }) {
    try {
      const sp = new URLSearchParams({ action: 'list' })
      if (params?.region) sp.set('region', params.region)
      if (params?.status) sp.set('status', params.status)
      if (params?.country) sp.set('country', params.country)
      if (params?.q) sp.set('q', params.q)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.limit) sp.set('limit', String(params.limit))
      const data = await invoke(`crew-locations?${sp}`)
      return data as { locations: CrewLocation[]; total: number }
    } catch (e: unknown) {
      return { error: (e as Error).message, locations: [] as CrewLocation[], total: 0 }
    }
  }

  async function getCrewRegionStats() {
    try {
      const data = await invoke('crew-locations?action=regions')
      return data as { regions: CrewRegionStats[] }
    } catch (e: unknown) {
      return { error: (e as Error).message, regions: [] as CrewRegionStats[] }
    }
  }

  return {
    listGrants,
    listScrapedGrants,
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
    listEGProjects,
    claimEGProject,
    updateEGProject,
    listEGProjectUpdates,
    addEGProjectUpdate,
    listPartners,
    getPartner,
    listOpportunities,
    getPartnerStats,
    listCrewLocations,
    getCrewRegionStats,
    createGrant,
    listClaims,
    reviewClaim,
  }
}
