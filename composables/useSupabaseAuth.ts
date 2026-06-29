export function useSupabaseAuth() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const config = useRuntimeConfig()

  const isManager = computed(() =>
    user.value?.email?.endsWith('@earthguardians.org') ?? false,
  )

  async function signIn() {
    const baseURL = config.app.baseURL || '/'
    const callbackPath = baseURL === '/' ? '/auth/callback' : `${baseURL}auth/callback`
    const redirectTo = window.location.origin + callbackPath

    await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { hd: 'earthguardians.org' },
      },
    })
  }

  async function signOut() {
    await client.auth.signOut()
    navigateTo('/')
  }

  return { user, isManager, signIn, signOut }
}
