/**
 * composables/useSupabaseAuth.ts
 * @why Supabase authentication wrapper — sign in, sign up, sign out, session management
 * @functions useSupabaseAuth
 * @deps vue (ref, watch); ./useSupabase (useSupabase); ~/lib/auth-redirect (stripBasePath, withTimeout)
 */
import { ref, watch } from 'vue'
import { useSupabase } from './useSupabase'
import { buildAuthCallbackUrl, stripBasePath, withTimeout } from '~/lib/auth-redirect'

/** Upper bound for the manager role check — fail closed to non-manager. */
const VERIFY_MANAGER_TIMEOUT_MS = 8000

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
      const { data, error } = await withTimeout(
        client.functions.invoke('is-manager', {
          method: 'GET',
        }),
        VERIFY_MANAGER_TIMEOUT_MS,
        'is-manager',
      )
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
    // Canonical trailing-slash callback path: the prerendered page is
    // `auth/callback/index.html`, so a bare `/auth/callback` 301s to
    // `/auth/callback/` on GitHub Pages/CDN and can drop `?code&next`.
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
    const redirectTo = buildAuthCallbackUrl(window.location.origin, baseURL, next ?? null)

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
