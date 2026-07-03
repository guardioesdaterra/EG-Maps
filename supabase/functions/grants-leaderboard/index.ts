import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { rateLimit, rateLimitHeaders } from '../_shared/rate-limit.ts'
import { getSupabaseServiceRole } from '../_shared/supabase.ts'

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = rateLimit(`grants-leaderboard:${ip}`)
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'approved'

    const supabase = getSupabaseServiceRole()

    const { data: votes, error: voteError } = await supabase
      .from('grant_votes')
      .select('grant_id, scraped_id, stars')

    if (voteError) throw voteError

    const voteMap = new Map<string, { total: number; count: number }>()
    for (const v of votes ?? []) {
      const id = v.scraped_id || v.grant_id
      if (!id) continue
      const entry = voteMap.get(id) || { total: 0, count: 0 }
      entry.total += v.stars
      entry.count++
      voteMap.set(id, entry)
    }

    const { data: grants, error: grantError } = await supabase
      .from('scraped_grants')
      .select('id, title, description, source, status, country, funder, url, deadline, amount_max, created_at')
      .eq('status', status)

    if (grantError) throw grantError

    const leaderboard = (grants ?? []).map(g => {
      const v = voteMap.get(g.id)
      return {
        ...g,
        source_type: 'scraped',
        avg_stars: v ? v.total / v.count : 0,
        total_stars: v?.total ?? 0,
        vote_count: v?.count ?? 0,
        view_count: 0,
      }
    }).sort((a, b) => b.avg_stars - a.avg_stars || b.vote_count - a.vote_count)

    return new Response(JSON.stringify({ grants: leaderboard, total: leaderboard.length }), {
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, grants: [], total: 0 }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
