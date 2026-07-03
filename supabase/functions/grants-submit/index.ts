import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { rateLimit, rateLimitHeaders } from '../_shared/rate-limit.ts'
import { getSupabaseServiceRole, getUser } from '../_shared/supabase.ts'

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const user = await getUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = rateLimit(`grants-submit:${user.id}:${ip}`)
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { title, description, location_name, latitude, longitude, category } = body

    if (!title || !description || !location_name) {
      return new Response(JSON.stringify({ error: 'Title, description, and location are required' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseServiceRole()
    const { data, error } = await supabase
      .from('grants')
      .insert({
        title: title.slice(0, 500),
        description: description.slice(0, 5000),
        location_name: location_name.slice(0, 300),
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        category: category || 'environment',
        status: 'pending',
        submitted_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ grant: data }), {
      headers: { ...corsHeaders(req), ...rateLimitHeaders(rl), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
