/**
 * lib/supabase.ts
 * @why Supabase client factory — creates admin and anon clients, configures auth persistence
 * @functions getSupabaseClient, isSupabaseConfigured
 * @deps @supabase/supabase-js (createClient, type SupabaseClient)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string || ''
  const key = config.public.supabaseKey as string || ''

  if (!url || !key || url.includes('placeholder')) {
    // No credentials (e.g. static GitHub Pages preview): return an inert
    // placeholder so pages still render. Callers must gate features via
    // isSupabaseConfigured() — every Supabase op will otherwise fail.
    if (!client) {
      console.warn('[supabase] Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_KEY — Supabase features disabled')
      client = createClient('https://placeholder.supabase.co', 'placeholder-key')
    }
    return client
  }

  client = createClient(url, key, {
    auth: {
      flowType: 'pkce',
      // Single-owner code exchange: pages/auth/callback.vue performs the ONE
      // explicit exchangeCodeForSession(snapshotCode). Leaving auto-detect on
      // lets gotrue's initialize() race the page for the single-use PKCE code
      // (loser reports "code already used") and strips ?code via
      // history.replaceState before diagnostics can read it.
      detectSessionInUrl: false,
    },
  })
  return client
}

export function isSupabaseConfigured(): boolean {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string || ''
  const key = config.public.supabaseKey as string || ''
  return !!url && !!key
}
