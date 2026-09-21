/**
 * composables/useSupabaseAuth.ts
 * @why Supabase authentication wrapper — sign in, sign up, sign out, session management.
 *  OAuth always runs TOP-LEVEL: Google refuses to render its login page in a
 *  frame (X-Frame-Options: DENY), and the PKCE verifier must share a storage
 *  partition with the callback exchange. Framed callers open an auth TAB
 *  (?eg-signin= + ?eg-postback=1); the tab relays its fresh session back into
 *  the opener iframe via postMessage so the user stays on the embedding host.
 * @functions useSupabaseAuth
 * @deps vue (ref, watch); ./useSupabase (useSupabase); ~/lib/auth-redirect (buildAuthCallbackUrl, safeNext, stripBasePath, takeAutoPostbackFlag, takeAutoSignInFlag, withAutoPostbackFlag, withAutoSignInFlag, withTimeout)
 */
import { ref, watch } from 'vue'
import { useSupabase } from './useSupabase'
import {
  buildAuthCallbackUrl,
  safeNext,
  stripBasePath,
  takeAutoPostbackFlag,
  takeAutoSignInFlag,
  withAutoPostbackFlag,
  withAutoSignInFlag,
  withTimeout,
  type AuthSessionRelay,
  type AutoSignInMode,
} from '~/lib/auth-redirect'

/** Upper bound for the manager role check — fail closed to non-manager. */
const VERIFY_MANAGER_TIMEOUT_MS = 8000

/** True when running inside any frame (a cross-origin access throw counts as framed). */
function isFramed(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    return true
  }
}

/** App-relative path of the current page (query included), for `next` + breakout targets. */
function currentAppPath(): string {
  const config = useRuntimeConfig()
  const baseURL = config.app.baseURL || '/'
  return stripBasePath(window.location.pathname, baseURL) + window.location.search || '/'
}

/** Absolute URL of an app-relative path on the current origin (subpath-deploy aware). */
function absoluteAppUrl(appPath: string): string {
  const config = useRuntimeConfig()
  const baseURL = config.app.baseURL || '/'
  const base = baseURL === '/' ? '' : baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  const path = appPath.startsWith('/') ? appPath : `/${appPath}`
  return `${window.location.origin}${base}${path}`
}

/**
 * Navigate the TOP document to `url`. In-iframe navigation to Google's login
 * page is always refused (X-Frame-Options: DENY — surfaces as a frame error
 * that is easily misread as CORS, before any account chooser paints).
 * Falls back to a new tab when a sandboxed iframe blocks top access.
 */
function navigateTopLevel(url: string): void {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url
      return
    }
  } catch {
    /* sandboxed iframe blocked top access — fall through to popup */
  }
  if (window.self === window.top) {
    window.location.href = url
  } else {
    window.open(url, '_blank', 'noopener')
  }
}

/**
 * Framed sign-in entry: open the grants page as a top-level auth TAB carrying
 * ?eg-signin=<mode>&eg-postback=1. The tab runs OAuth (Google renders,
 * PKCE storage is unpartitioned) and relays its session back into this
 * iframe via postMessage. Deliberately NO `noopener` — the tab needs
 * `window.opener` for the relay. Returns true when handoff was issued.
 * Falls back to full top navigation when popups are blocked.
 */
function openAuthTopLevel(returnTo: string | undefined, mode: AutoSignInMode): boolean {
  if (typeof window === 'undefined' || !isFramed()) return false
  const target = (returnTo && safeNext(returnTo)) || currentAppPath()
  const withFlag = withAutoSignInFlag(absoluteAppUrl(target), mode)
  const topUrl = withFlag && withAutoPostbackFlag(withFlag)
  if (!topUrl) return false
  try {
    if (window.open(topUrl, '_blank')) return true
  } catch { /* popup blocked — fall through to top navigation */ }
  navigateTopLevel(topUrl)
  return true
}

export function useSupabaseAuth() {
  const { client, user, sessionReady } = useSupabase()

  const isManager = ref(false)
  const isManagerReady = ref(false)
  // Auth-tab relay state: true while this top-level load is a ?eg-postback=1
  // tab (shows the "signed in, closing" UI instead of the portal); done flips
  // once the session was relayed into the opener iframe.
  const isPostbackTab = ref(false)
  const postbackDone = ref(false)
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

  /**
   * Full PKCE round-trip starter. MUST run top-level: the verifier persisted
   * here is read back by the callback exchange, and cross-site iframe storage
   * is partitioned (invisible top-level). Framed callers never reach this —
   * signIn()/switchAccount() break out first (see above).
   */
  async function startOAuth(returnTo?: string) {
    const config = useRuntimeConfig()
    const baseURL = config.app.baseURL || '/'
    // Carry the originating page (incl. query such as ?ref= or ?signup=) so
    // the OAuth callback can send the user straight back to EG-Grants.
    // `next` is app-relative (no baseURL prefix): on subpath deploys
    // (e.g. /EG-Maps/ on GitHub Pages) window.location.pathname includes the
    // base, so strip it before comparing — otherwise the query is dropped and
    // the user always lands on the default grants page.
    let next = returnTo
    if (!next && typeof window !== 'undefined') {
      const appPath = currentAppPath()
      next = appPath.startsWith('/eg-grants') ? appPath : '/eg-grants'
    }
    const redirectTo = buildAuthCallbackUrl(window.location.origin, baseURL, next ?? null)

    // skipBrowserRedirect: we navigate ourselves via navigateTopLevel() so a
    // (legacy or unflagged) framed call still escapes Google's
    // X-Frame-Options: DENY instead of dying inside the iframe.
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      // ALWAYS force Google's account chooser (`prompt=select_account`).
      // Without it, Google silently reuses the single existing browser
      // session: if that session is an unauthorized account, users get an
      // instant 403 with no chooser and no chance to pick the right account.
      options: { redirectTo, queryParams: { prompt: 'select_account' }, skipBrowserRedirect: true },
    })
    if (error) throw error
    const url = data?.url
    if (!url) throw new Error('Sign-in failed: Supabase returned no OAuth URL')
    navigateTopLevel(url)
  }

  /**
   * One-shot consumer for ?eg-signin= (placed by a framed sign-in handoff).
   * Honored TOP-LEVEL ONLY (prevents loops): strips the flags, then once the
   * session state is known either relays the session back into the opener
   * iframe (?eg-postback=1) or starts OAuth so the PKCE verifier lands in
   * top-level storage. Call once from grants pages onMounted.
   */
  function autoSignInIfRequested(): void {
    if (typeof window === 'undefined' || !import.meta.client) return
    if (isFramed()) return
    const first = takeAutoSignInFlag(window.location.href)
    const second = takeAutoPostbackFlag(first.cleanHref)
    const mode = first.mode
    if (!mode) return
    // Postback is only meaningful with an opener to relay to (a manually
    // opened flag URL, or the blocked-popup top-nav fallback, has none) —
    // without one, run the ordinary top-level flow instead.
    const postback = second.postback && !!window.opener
    try {
      const clean = new URL(second.cleanHref)
      window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash)
    } catch { /* keep the original URL — still proceed with the sign-in */ }
    isPostbackTab.value = postback
    const stop = watch([sessionReady, user], ([ready, u]) => {
      if (!ready) return
      if (postback && u) {
        stop()
        void relaySessionToOpener()
        return
      }
      // (Re)start OAuth, preserving the flags so the landing page relays.
      // In postback mode the watcher dies with this page load; the flagged
      // `next` brings the relay branch back to life after the round-trip.
      const flaggedNext = postback ? flaggedReturnTo(mode) : undefined
      if (mode === 'switch') {
        stop()
        void (async () => {
          try {
            await client.auth.signOut()
          } catch { /* continue to chooser */ }
          await startOAuth(flaggedNext)
        })().catch((e) => {
          console.error('[auth] auto sign-in failed:', e instanceof Error ? e.message : String(e))
        })
        return
      }
      if (!u) {
        stop()
        startOAuth(flaggedNext).catch((e) => {
          console.error('[auth] auto sign-in failed:', e instanceof Error ? e.message : String(e))
        })
      } else {
        stop()
      }
    }, { immediate: true })
  }

  /**
   * Post the fresh top-level session into the opener (host iframe, same
   * origin) and try to close this auth tab. targetOrigin pins delivery to
   * the same origin — a cross-origin opener silently receives nothing.
   */
  async function relaySessionToOpener(): Promise<void> {
    try {
      const { data: { session } } = await client.auth.getSession()
      const opener = window.opener as Window | null
      if (opener && session?.access_token && session?.refresh_token) {
        const msg: AuthSessionRelay = {
          source: 'eg-auth',
          type: 'auth:session',
          payload: { access_token: session.access_token, refresh_token: session.refresh_token },
        }
        opener.postMessage(msg, window.location.origin)
      }
    } catch (e) {
      console.error('[auth] session relay failed:', e instanceof Error ? e.message : String(e))
    } finally {
      postbackDone.value = true
      try {
        window.close()
      } catch { /* script-closable only — user closes the tab manually */ }
    }
  }

  /** Current clean page path re-flagged, so an OAuth round-trip started from
   *  a postback tab returns to a URL that still relays. */
  function flaggedReturnTo(mode: AutoSignInMode): string {
    const path = currentAppPath()
    const withFlag = withAutoSignInFlag(absoluteAppUrl(path), mode)
    const full = withFlag && withAutoPostbackFlag(withFlag)
    if (full) {
      try {
        const u = new URL(full)
        return u.pathname + u.search + u.hash
      } catch { /* fall through to unflagged default */ }
    }
    return '/eg-grants'
  }

  async function signIn(returnTo?: string) {
    // Framed (e.g. earthguardians.org embed): do NOT start OAuth here — the
    // PKCE verifier would land in the iframe's partitioned storage while the
    // callback exchanges top-level, and Google would refuse the framed login
    // page anyway. Hand off to an auth tab; it relays the session back into
    // this iframe via postMessage (autoSignInIfRequested + useSupabase).
    if (openAuthTopLevel(returnTo, 'login')) return
    return startOAuth(returnTo)
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
    // Framed: the sign-out above only cleared the iframe partition — the
    // auth tab's top-level session (old account) survives, so hand off with
    // mode 'switch' to force a top-level sign-out + chooser there instead of
    // 'login' (which would no-op on the existing top-level user).
    if (openAuthTopLevel(returnTo, 'switch')) return
    return startOAuth(returnTo)
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

  return { user, isManager, isManagerReady, managerCheckError, retryManagerCheck, signIn, signInWithNewAccount, switchAccount, signOut, sessionReady, autoSignInIfRequested, isPostbackTab, postbackDone }
}
