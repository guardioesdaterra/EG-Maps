import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

export function getSupabaseAnon(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export function getSupabaseServiceRole(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getUser(req: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const client = getSupabaseAnon()
  const { data: { user }, error } = await client.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user) return null

  return { id: user.id, email: user.email || '' }
}

export function isManager(email: string): boolean {
  return email.endsWith('@earthguardians.org')
}
