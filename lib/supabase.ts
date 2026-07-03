import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const url = import.meta.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const key = import.meta.env.NUXT_PUBLIC_SUPABASE_KEY || ''

  if (!url || !key) {
    console.warn('[supabase] Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_KEY')
  }

  client = createClient(url, key)
  return client
}
