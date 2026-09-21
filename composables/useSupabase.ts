/**
 * composables/useSupabase.ts
 * @why Supabase client singleton — creates and caches the Supabase JS client instance.
 *  Also receives relayed auth-tab sessions ({source:'eg-auth'}) so an iframe
 *  embed can adopt the top-level login without leaving the host page.
 * @functions useSupabase
 * @deps vue (ref, onMounted, onUnmounted, readonly); ~/lib/supabase (getSupabaseClient)
 */
import { ref, onMounted, onUnmounted, readonly } from 'vue'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '~/lib/supabase'
import type { AuthSessionRelay } from '~/lib/auth-redirect'

interface AuthSubscription { unsubscribe(): void }

const currentUser = ref<User | null>(null)
const sessionReady = ref(false)
let refCount = 0
let authSubscription: AuthSubscription | null = null
let relayListener: ((e: Event) => void) | null = null

export function useSupabase() {
  const client = getSupabaseClient()

  onMounted(() => {
    refCount += 1
    if (refCount === 1) {
      client.auth.getSession().then(({ data: { session } }) => {
        currentUser.value = session?.user ?? null
      }).catch(() => {
      }).finally(() => {
        sessionReady.value = true
      })
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        currentUser.value = session?.user ?? null
      })
      authSubscription = data.subscription
      // Auth-tab relay: the popup tab posts its fresh top-level session to
      // its opener (this iframe, same origin). Accept same-origin only, never
      // our own window — then persist via setSession so the normal
      // onAuthStateChange flow picks it up (manager check, grants load).
      relayListener = (e: Event) => {
        const event = e as MessageEvent
        const data = event.data as AuthSessionRelay | undefined
        if (!data || data.source !== 'eg-auth' || data.type !== 'auth:session') return
        if (typeof window === 'undefined') return
        if (event.origin !== window.location.origin) return
        if (event.source === window) return
        const accessToken = data.payload?.access_token
        const refreshToken = data.payload?.refresh_token
        if (typeof accessToken !== 'string' || !accessToken) return
        if (typeof refreshToken !== 'string' || !refreshToken) return
        client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) console.error('[supabase] relayed session rejected:', error.message)
          })
          .catch((err) => {
            console.error('[supabase] relayed session failed:', err instanceof Error ? err.message : String(err))
          })
      }
      window.addEventListener('message', relayListener)
    }
  })

  onUnmounted(() => {
    refCount = Math.max(0, refCount - 1)
    if (refCount === 0 && authSubscription) {
      authSubscription.unsubscribe()
      authSubscription = null
    }
    if (refCount === 0 && relayListener) {
      window.removeEventListener('message', relayListener)
      relayListener = null
    }
  })

  return {
    client,
    user: readonly(currentUser),
    sessionReady: readonly(sessionReady),
  }
}
