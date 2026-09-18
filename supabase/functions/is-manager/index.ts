/**
 * supabase/functions/is-manager/index.ts
 * @why Authoritative manager check — validates the caller's JWT server-side
 *  and answers whether the account is an Earth Guardians staff address.
 *  The EG-Grants portal (useSupabaseAuth) and the OAuth callback treat this
 *  as the source of truth, so the rule MUST stay in sync with them:
 *  client expects `{ isManager: boolean }` (plus optional `reason`).
 *
 * Deploy with:
 *   supabase functions deploy is-manager --project-ref lfyvociptzyhjtrxwhhf
 * Required secrets (dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const EG_EMAIL_DOMAIN = 'earthguardians.org'

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://guardioesdaterra.github.io',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data: Record<string, unknown>, origin: string | null, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ isManager: false, reason: 'method_not_allowed' }, origin, 405)
  }

  // Always answer 200 with isManager:false on auth problems (never 401):
  // the client fail-closes on transport errors but expects a JSON body.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ isManager: false, reason: 'invalid_token' }, origin)
  }

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !serviceRoleKey) {
    console.error('is-manager misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return json({ isManager: false, reason: 'misconfigured' }, origin)
  }

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  const { data: { user }, error } = await admin.auth.getUser(authHeader.slice(7))
  if (error || !user) {
    return json({ isManager: false, reason: 'invalid_token' }, origin)
  }

  const email = (user.email ?? '').toLowerCase()
  if (!email) {
    return json({ isManager: false, reason: 'no_email' }, origin)
  }
  if (!email.endsWith(`@${EG_EMAIL_DOMAIN}`)) {
    return json({ isManager: false, reason: 'not_eg_domain', email }, origin)
  }
  return json({ isManager: true, email }, origin)
})
