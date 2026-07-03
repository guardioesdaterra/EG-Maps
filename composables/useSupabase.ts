import { ref, onMounted, onUnmounted, readonly } from 'vue'
import type { User, Subscription } from '@supabase/supabase-js'
import { getSupabaseClient } from '~/lib/supabase'

const currentUser = ref<User | null>(null)
let initialized = false
let authSubscription: Subscription | null = null

export function useSupabase() {
  const client = getSupabaseClient()

  onMounted(() => {
    if (!initialized) {
      initialized = true
      client.auth.getSession().then(({ data: { session } }) => {
        currentUser.value = session?.user ?? null
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
  }
}
