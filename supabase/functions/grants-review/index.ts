import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getUser, isManager, getSupabaseServiceRole } from '../_shared/supabase.ts'

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
  if (!user || !isManager(user.email)) {
    return new Response(JSON.stringify({ error: 'Manager access required' }), {
      status: 403,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { grant_id, decision, notes } = body

    if (!grant_id || !decision) {
      return new Response(JSON.stringify({ error: 'grant_id and decision are required' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseServiceRole()
    const { data, error } = await supabase
      .from('grants')
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: notes || null,
      })
      .eq('id', grant_id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ grant: data }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
