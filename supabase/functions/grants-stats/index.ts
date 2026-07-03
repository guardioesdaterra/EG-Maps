import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { rateLimit, rateLimitHeaders } from '../_shared/rate-limit.ts'
import { getSupabaseServiceRole } from '../_shared/supabase.ts'

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = rateLimit(`grants-stats:${ip}`)
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = getSupabaseServiceRole()

    const [grantsRes, scrapedRes] = await Promise.all([
      supabase.from('grants').select('status', { count: 'exact', head: true }),
      supabase.from('scraped_grants').select('status', { count: 'exact', head: true }),
    ])

    const { count: totalGrants } = grantsRes
    const { count: totalScraped } = scrapedRes

    const [pending, approved, rejected] = await Promise.all([
      supabase.from('grants').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('grants').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('grants').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    ])

    const [scrapedPending, scrapedApproved, scrapedClosed, scrapedRejected] = await Promise.all([
      supabase.from('scraped_grants').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('scraped_grants').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('scraped_grants').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
      supabase.from('scraped_grants').select('id', { count: 'exact', head: true }).in('status', ['rejected', 'hidden']),
    ])

    return new Response(JSON.stringify({
      pending: (pending.count ?? 0) + (scrapedPending.count ?? 0),
      approved: (approved.count ?? 0) + (scrapedApproved.count ?? 0),
      rejected: (rejected.count ?? 0) + (scrapedRejected.count ?? 0),
      total: (totalGrants ?? 0) + (totalScraped ?? 0),
      scraped: {
        pending: scrapedPending.count ?? 0,
        approved: scrapedApproved.count ?? 0,
        closed: scrapedClosed.count ?? 0,
        rejected: (scrapedRejected.count ?? 0),
      },
    }), {
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, pending: 0, approved: 0, rejected: 0, total: 0 }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
