import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const url = import.meta.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const key = import.meta.env.NUXT_PUBLIC_SUPABASE_KEY || ''

  if (!url || !key) {
    console.warn('[supabase] Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_KEY — all Supabase operations will be no-ops')
    // Return a stub client that throws meaningful errors on any operation
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  client = createClient(url, key)
  return client
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const key = import.meta.env.NUXT_PUBLIC_SUPABASE_KEY || ''
  return !!url && !!key
}
