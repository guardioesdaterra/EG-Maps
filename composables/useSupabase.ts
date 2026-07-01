import { ref, onMounted, readonly } from 'vue'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '~/lib/supabase'

const currentUser = ref<User | null>(null)
let initialized = false

export function useSupabase() {
  const client = getSupabaseClient()

  if (!initialized && import.meta.client) {
    initialized = true
    client.auth.getSession().then(({ data: { session } }) => {
      currentUser.value = session?.user ?? null
    })
    client.auth.onAuthStateChange((_event, session) => {
      currentUser.value = session?.user ?? null
    })
  }

  return {
    client,
    user: readonly(currentUser),
  }
}
