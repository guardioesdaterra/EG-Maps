import { useSupabase } from './useSupabase'

export function useSupabaseAuth() {
  const { client, user } = useSupabase()

  const isManager = computed(() =>
    user.value?.email?.endsWith('@earthguardians.org') ?? false,
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
    await client.auth.signOut()
  }

  return { user, isManager, signIn, signOut }
}
