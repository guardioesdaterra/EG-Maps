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
  // Non-empty when the check itself failed (transport error/timeout) as
  // opposed to an explicit "not a manager" answer — lets the UI offer a
  // retry instead of mislabeling a manager as unauthorized.
  const managerCheckError = ref('')

  async function invokeIsManager(): Promise<{ isManager: boolean; reason?: string }> {
    const { data, error } = await withTimeout(
      client.functions.invoke('is-manager', {
        method: 'GET',
      }),
      VERIFY_MANAGER_TIMEOUT_MS,
      'is-manager',
    )
    if (error) throw error
    if (data?.reason && data?.isManager !== true) {
      console.warn('is-manager answered non-manager', { reason: data.reason })
    }
    return { isManager: data?.isManager === true, reason: data?.reason }
  }

  async function verifyManager() {
    isManagerReady.value = false
    managerCheckError.value = ''
    const email = user.value?.email

    if (!email) {
      isManager.value = false
      isManagerReady.value = true
      return
    }

    // One retry on transport failure only (cold start / blip). An explicit
    // `isManager: false` answer is final — never retried.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const { isManager: ok } = await invokeIsManager()
        isManager.value = ok
        isManagerReady.value = true
        return
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e)
        console.error(`is-manager invoke failed (attempt ${attempt}/2):`, detail)
        if (attempt === 2) {
          isManager.value = false
          managerCheckError.value = detail
          isManagerReady.value = true
        }
      }
    }
  }

  async function retryManagerCheck() {
    await verifyManager()
  }

  watch(
    () => (sessionReady.value ? user.value?.email : undefined),
    (email) => {
      if (email) {
        verifyManager()
      } else {
        isManager.value = false
        managerCheckError.value = ''
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
      // ALWAYS force Google's account chooser (`prompt=select_account`).
      // Without it, Google silently reuses the single existing browser
      // session: if that session is an unauthorized account, users get an
      // instant 403 with no chooser and no chance to pick the right account.
      options: { redirectTo, queryParams: { prompt: 'select_account' } },
    })
  }

  /** Sign in (account chooser is always forced — see signIn). */
  async function signInWithNewAccount(returnTo?: string) {
    return signIn(returnTo)
  }

  /**
   * Forget the current session and restart login. Supabase sign-out alone
   * does NOT clear the Google browser session; the forced account chooser
   * in signIn() is what prevents auto-relogin to the same Google account.
   */
  async function switchAccount(returnTo?: string) {
    try {
      await client.auth.signOut()
    } catch { /* already signed out — continue to chooser */ }
    return signIn(returnTo)
  }

  async function signOut() {
    isManagerReady.value = false
    managerCheckError.value = ''
    try {
      await client.auth.signOut()
    } finally {
      isManagerReady.value = true
    }
  }

  return { user, isManager, isManagerReady, managerCheckError, retryManagerCheck, signIn, signInWithNewAccount, switchAccount, signOut, sessionReady }
}
