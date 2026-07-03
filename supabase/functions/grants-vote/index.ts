import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { rateLimit, rateLimitHeaders } from '../_shared/rate-limit.ts'
import { getUser, getSupabaseServiceRole } from '../_shared/supabase.ts'

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const user = await getUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = rateLimit(`grants-vote:${user.id}:${ip}`)
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url)
      const grantId = url.searchParams.get('grant_id')
      const scrapedId = url.searchParams.get('scraped_id')

      const supabase = getSupabaseServiceRole()
      let query = supabase.from('grant_votes').delete().eq('user_id', user.id)
      if (scrapedId) query = query.eq('scraped_id', scrapedId)
      else if (grantId) query = query.eq('grant_id', grantId)

      const { error } = await query
      if (error) throw error

      return new Response(JSON.stringify({ deleted: true }), {
        headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { grant_id, scraped_id, stars } = body

    if (!stars || stars < 1 || stars > 8) {
      return new Response(JSON.stringify({ error: 'stars must be 1-8' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseServiceRole()

    let existing
    if (scraped_id) {
      const { data } = await supabase
        .from('grant_votes')
        .select('id')
        .eq('user_id', user.id)
        .eq('scraped_id', scraped_id)
        .single()
      existing = data
    } else if (grant_id) {
      const { data } = await supabase
        .from('grant_votes')
        .select('id')
        .eq('user_id', user.id)
        .eq('grant_id', grant_id)
        .single()
      existing = data
    }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('grant_votes')
        .update({ stars })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('grant_votes')
        .insert({
          user_id: user.id,
          grant_id: grant_id || null,
          scraped_id: scraped_id || null,
          stars,
        })
        .select()
        .single()
      if (error) throw error
      result = data
    }

    return new Response(JSON.stringify({ vote: { id: result.id, stars: result.stars } }), {
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
