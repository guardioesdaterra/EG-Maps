import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string || ''
  const key = config.public.supabaseKey as string || ''

  if (!url || !key) {
    console.warn('[supabase] Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_KEY — all Supabase operations will be no-ops')
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  client = createClient(url, key)
  return client
}

export function isSupabaseConfigured(): boolean {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string || ''
  const key = config.public.supabaseKey as string || ''
  return !!url && !!key
}
