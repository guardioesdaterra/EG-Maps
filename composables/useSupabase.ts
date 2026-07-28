/**
 * composables/useSupabase.ts
 * @why Supabase client singleton — creates and caches the Supabase JS client instance
 * @functions useSupabase
 * @deps vue (ref, onMounted, onUnmounted, readonly); ~/lib/supabase (getSupabaseClient)
 */
import { ref, onMounted, onUnmounted, readonly } from 'vue'
import type { User, Subscription } from '@supabase/supabase-js'
import { getSupabaseClient } from '~/lib/supabase'

const currentUser = ref<User | null>(null)
const sessionReady = ref(false)
let initialized = false
let authSubscription: Subscription | null = null

export function useSupabase() {
  const client = getSupabaseClient()

  onMounted(() => {
    if (!initialized) {
      initialized = true
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
    }
  })

  onUnmounted(() => {
    if (authSubscription) {
      authSubscription.unsubscribe()
      authSubscription = null
    }
  })

  return {
    client,
    user: readonly(currentUser),
    sessionReady: readonly(sessionReady),
  }
}
