import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { rateLimit, rateLimitHeaders } from '../_shared/rate-limit.ts'
import { getSupabaseServiceRole } from '../_shared/supabase.ts'

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = rateLimit(`grants-list:${ip}`)
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const supabase = getSupabaseServiceRole()
    let query = supabase.from('grants').select('*').order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return new Response(JSON.stringify({ grants: data ?? [], total: data?.length ?? 0 }), {
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, grants: [], total: 0 }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
