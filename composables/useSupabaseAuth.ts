/**
 * composables/useSupabaseAuth.ts
 * @why Supabase authentication wrapper — sign in, sign up, sign out, session management
 * @functions useSupabaseAuth
 * @deps vue (ref, watch); ./useSupabase (useSupabase); ~/lib/auth-redirect (stripBasePath)
 */
import { ref, watch } from 'vue'
import { useSupabase } from './useSupabase'
import { stripBasePath } from '~/lib/auth-redirect'

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

  async function signIn(returnTo?: string) {
    const config = useRuntimeConfig()
    const baseURL = config.app.baseURL || '/'
    const callbackPath = baseURL === '/' ? '/auth/callback' : `${baseURL}auth/callback`
    // Carry the originating page (incl. query such as ?ref= or ?signup=) so
    // the OAuth callback can send the user straight back to EG-Grants.
    // `next` is app-relative (no baseURL prefix): on subpath deploys
    // (e.g. /EG-Maps/ on GitHub Pages) window.location.pathname includes the
    // base, so strip it before comparing — otherwise the query is dropped and
    // the user always lands on the default grants page.
    let next = returnTo
    if (!next && typeof window !== 'undefined') {
      const appPath = stripBasePath(window.location.pathname, baseURL) + window.location.search
      next = appPath.startsWith('/eg-grants') ? appPath : '/eg-grants'
    }
    const redirectTo = window.location.origin + callbackPath + (next ? `?next=${encodeURIComponent(next)}` : '')

    await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  async function signOut() {
    isManagerReady.value = false
    try {
      await client.auth.signOut()
    } finally {
      isManagerReady.value = true
    }
  }

  return { user, isManager, isManagerReady, signIn, signOut, sessionReady }
}
