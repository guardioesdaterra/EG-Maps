/**
 * composables/useSupabaseAuth.ts
 * @why Supabase authentication wrapper — sign in, sign up, sign out, session management
 * @functions useSupabaseAuth
 * @deps vue (ref, watch); ./useSupabase (useSupabase)
 */
import { ref, watch } from 'vue'
import { useSupabase } from './useSupabase'

export function useSupabaseAuth() {
  const { client, user, sessionReady } = useSupabase()

  const isManager = ref(false)
  const isManagerReady = ref(false)

  async function verifyManager() {
    isManagerReady.value = false
    const email = user.value?.email

    if (!email) {
      isManager.value = false
      isManagerReady.value = true
      return
    }

    try {
      const { data, error } = await client.functions.invoke('is-manager', {
        method: 'GET',
      })
      if (error) {
        console.error('is-manager edge function error:', error)
        isManager.value = false
      } else {
        isManager.value = data?.isManager === true
      }
    } catch (e) {
      console.error('is-manager invoke failed:', e)
      isManager.value = false
    } finally {
      isManagerReady.value = true
    }
  }

  watch(
    () => (sessionReady.value ? user.value?.email : undefined),
    (email) => {
      if (email) {
        verifyManager()
      } else {
        isManager.value = false
        isManagerReady.value = true
      }
    },
    { immediate: true },
  )

  async function signIn() {
    const config = useRuntimeConfig()
    const baseURL = config.app.baseURL || '/'
    const callbackPath = baseURL === '/' ? '/auth/callback' : `${baseURL}auth/callback`
    const redirectTo = window.location.origin + callbackPath

    await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  async function signOut() {
    isManager.value = false
    isManagerReady.value = false
    await client.auth.signOut()
  }

  return { user, isManager, isManagerReady, signIn, signOut, sessionReady }
}
