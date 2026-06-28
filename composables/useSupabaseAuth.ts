export function useSupabaseAuth() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const isManager = computed(() =>
    user.value?.email?.endsWith('@earthguardians.org') ?? false,
  )

  async function signIn() {
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
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
