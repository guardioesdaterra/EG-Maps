import { ref, watch } from 'vue'
import { useSupabase } from './useSupabase'

export function useSupabaseAuth() {
  const { client, user, sessionReady } = useSupabase()

  // Start denied by default. The edge function is authoritative.
  // A fast local check from the JWT-verified email provides an initial value
  // while the server call completes.
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

  // Re-verify when session becomes ready or user email changes.
  // The edge function is the authoritative source — it validates
  // the JWT server-side and checks the email domain.
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
