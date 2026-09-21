/**
 * pages/auth/callback.vue
 * @why OAuth callback handler — processes Supabase auth redirect, sets session, redirects to origin
 * @component callback
 * @deps vue (ref, onMounted, onBeforeUnmount); ~/composables/useSupabase (useSupabase); ~/composables/useSupabaseAuth (useSupabaseAuth); ~/composables/useI18n (useI18n); ~/lib/supabase (isSupabaseConfigured); ~/lib/auth-redirect (mergeOAuthParams, safeNext, snapshotOAuthLanding, summarizeAuthStorage, withTimeout)
 */
<template>
  <main id="main-content" tabindex="-1" role="main" class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
    <div class="text-center">
      <div v-if="error">
        <p class="text-[var(--danger)] font-semibold">{{ t('grantsPortal.authErrorTitle') }}</p>
        <p class="text-sm text-[var(--text-muted)] mt-2">{{ error }}</p>
        <p v-if="errorDetail" class="text-xs text-[var(--text-muted)] mt-1 font-mono opacity-70">{{ errorDetail }}</p>
        <div class="mt-4 flex items-center justify-center gap-2">
          <button class="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-semibold" @click="retrySignIn">
            {{ t('grantsPortal.signInBtn') }}
          </button>
          <button class="px-4 py-2 rounded-lg font-semibold border border-white/20 text-[var(--text-secondary)]" @click="retryWithNewAccount">
            {{ t('grantsPortal.useAnotherAccount') }}
          </button>
          <NuxtLink :to="backUrl" class="px-4 py-2 rounded-lg font-semibold border border-white/20 text-[var(--text-secondary)]">
            {{ t('grantsPortal.authBackToGrants') }}
          </NuxtLink>
        </div>
      </div>
      <div v-else>
        <p class="text-[var(--text-secondary)]">{{ t('grantsPortal.authSigningIn') }}</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">

import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useSupabase } from '~/composables/useSupabase'
import { useSupabaseAuth } from '~/composables/useSupabaseAuth'
import { useI18n } from '~/composables/useI18n'
import { isSupabaseConfigured } from '~/lib/supabase'
import { mergeOAuthParams, safeNext, snapshotOAuthLanding, summarizeAuthStorage, withTimeout } from '~/lib/auth-redirect'

useHead({ title: 'Auth Callback | Earth Guardians' })

// Capture the navigation entry FIRST, synchronously: its `name` is the URL
// the document actually loaded with, unaffected by any later
// history.replaceState (gotrue cleanup, settleRedirect, SPA-redirect shims).
// `type` distinguishes a fresh provider landing (navigate) from a refresh or
// Back-button restore (reload / back_forward) after the code was consumed.
const navigationEntry = (() => {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return null
  try {
    const e = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (!e) return null
    let navHasCode = false
    try {
      navHasCode = new URL(e.name, window.location.origin).searchParams.has('code')
    } catch { /* malformed — leave false */ }
    return { name: e.name ?? null, type: e.type ?? null, hasCode: navHasCode }
  } catch (err) {
    console.warn('[auth/callback] navigation-entry read failed', err)
    return null
  }
})()

// Snapshot the landing URL SYNCHRONOUSLY, before anything can rewrite it via
// history.replaceState. NOTE on codes: Google's `code=4/0A…` goes to
// Supabase's /auth/v1/callback (visible only in DevTools Network with
// "Preserve log" as its Location header). The `?code=` THIS page expects is
// a different, Supabase-issued PKCE code — that is the one diagnosed here.
let snapshotError: string | null = null
const landingSnapshot = (() => {
  if (typeof window === 'undefined') return null
  try {
    const route = useRoute()
    const rq = route.query as Record<string, unknown>
    let search = window.location.search
    const hash = window.location.hash
    // Fallback: vue-router parsed the initial URL before something cleaned
    // it (e.g. GitHub Pages directory 301 `/auth/callback` →
    // `/auth/callback/` dropping the query).
    if (!search && (rq.code || rq.next || rq.error)) {
      const fallback = new URLSearchParams()
      for (const k of ['code', 'next', 'error', 'error_description']) {
        const v = rq[k]
        if (typeof v === 'string' && v) fallback.set(k, v)
      }
      const extra = fallback.toString()
      if (extra) search = (search ? `${search}&` : '?') + extra
    }
    return { ...snapshotOAuthLanding(search, hash), href: window.location.href }
  } catch (err) {
    // NEVER swallow: a null snapshot must not print as `query=[]` ("the URL
    // had no params") when it really means "the snapshot crashed".
    snapshotError = err instanceof Error ? err.message : String(err)
    console.warn('[auth/callback] landing snapshot failed', { error: snapshotError })
    return null
  }
})()
if (snapshotError || !landingSnapshot) {
  console.warn('[auth/callback] snapshot status', {
    ok: !!landingSnapshot,
    error: snapshotError,
    navName: navigationEntry?.name ?? null,
    navType: navigationEntry?.type ?? null,
  })
}

// Cross-load trail (counts only, no values): distinguishes "the provider never
// sent a code on ANY landing" from "an earlier landing HAD a code" (refresh /
// Back-button / history restore after the code was consumed). Read together
// with navType in the diag — loads>1 with navType=reload is a refresh, not a
// provider failure.
function recordLanding(sawCode: boolean) {
  try {
    const n = Number(sessionStorage.getItem('eg-auth-cb-loads') || '0') + 1
    sessionStorage.setItem('eg-auth-cb-loads', String(n))
    if (sawCode) sessionStorage.setItem('eg-auth-cb-saw-code', '1')
  } catch { /* private mode / blocked storage — ignore */ }
}

function readTrail(): string {
  try {
    const loads = sessionStorage.getItem('eg-auth-cb-loads') ?? '?'
    const saw = sessionStorage.getItem('eg-auth-cb-saw-code') ? 1 : 0
    return `loads=${loads} sawCode=${saw}`
  } catch {
    return 'loads=? sawCode=?'
  }
}

recordLanding(!!landingSnapshot?.code)

const { t } = useI18n()
const { client } = useSupabase()
const { signIn: startSignIn, switchAccount: startSwitchAccount } = useSupabaseAuth()
const error = ref('')
const errorDetail = ref('')
const backUrl = ref('/eg-grants')

const FALLBACK_NEXT = '/eg-grants'
const SIGN_UP_URL = '/eg-grants?signup=1'
// Membership checks must never block the redirect longer than this. The
// grants portal re-verifies the role itself, so on timeout/error we land on
// `next` and let the portal gate access instead of stranding users here.
const MEMBERSHIP_TIMEOUT_MS = 8000
let authUnsubscribe: (() => void) | null = null
let settled = false

/** Read OAuth params from query string + hash fragment (implicit flow). */
function readOAuthParams(): URLSearchParams {
  return mergeOAuthParams(
    typeof window === 'undefined' ? '' : window.location.search,
    typeof window === 'undefined' ? '' : window.location.hash,
  )
}

function readVerifierToken(): { verifier: string; token: string } {
  let keys: string[] | null = null
  try {
    keys = []
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i) || '')
  } catch {
    keys = null
  }
  return summarizeAuthStorage(keys)
}

/**
 * Privacy-safe landing diagnostics (param NAMES only, never values). Read
 * storage FRESH on every call — a mount-time verifier/token string goes stale
 * (the verifier is removed only after a successful exchange, so "present at
 * mount" merely means the exchange hadn't finished yet, not that it failed).
 * A null snapshot prints as `snapshot=failed(...)`, never as `query=[]`.
 */
function diagnoseLanding(): string {
  const { verifier, token } = readVerifierToken()
  const snapshotPart = landingSnapshot
    ? `query=[${landingSnapshot.queryKeys.join(',')}] hash=[${landingSnapshot.hashKeys.join(',')}]`
    : `snapshot=failed(${snapshotError ?? 'null'})`
  const navPart = navigationEntry
    ? ` navType=${navigationEntry.type} navHasCode=${navigationEntry.hasCode ? 1 : 0}`
    : ' navType=? navHasCode=?'
  const diag = `${snapshotPart} verifier=${verifier} token=${token}${navPart} ${readTrail()}`
  console.log('[auth/callback] landing diagnostics', {
    diag,
    navName: navigationEntry?.name ?? null,
  })
  return diag
}

function settleRedirect(url: string) {
  if (settled) return
  settled = true
  if (authUnsubscribe) { authUnsubscribe(); authUnsubscribe = null }
  window.history.replaceState({}, '', window.location.pathname)
  navigateTo(url, { replace: true })
}

function settleError(message: string, detail = '') {
  if (settled) return
  settled = true
  if (authUnsubscribe) { authUnsubscribe(); authUnsubscribe = null }
  error.value = message
  errorDetail.value = detail
  console.warn('[auth/callback] settled with error', { message, detail })
}

/** Restart the OAuth round-trip with Google's account chooser (forget browser session). */
async function retryWithNewAccount() {
  error.value = ''
  errorDetail.value = ''
  settled = false
  try {
    window.history.replaceState({}, '', window.location.pathname)
  } catch { /* ignore */ }
  console.log('[auth/callback] retrying sign-in with account chooser', { next: backUrl.value })
  try {
    await startSwitchAccount(backUrl.value)
  } catch (e) {
    settleError(
      t('grantsPortal.authFailedRetry'),
      e instanceof Error ? e.message : String(e),
    )
  }
}
/** Restart the OAuth round-trip (fresh PKCE verifier) after a failed attempt. */
async function retrySignIn() {
  error.value = ''
  errorDetail.value = ''
  settled = false
  // Drop the consumed `?code` (single-use) before restarting so a retry
  // never re-sends a dead code alongside the fresh PKCE verifier.
  try {
    window.history.replaceState({}, '', window.location.pathname)
  } catch { /* ignore */ }
  console.log('[auth/callback] retrying sign-in', { next: backUrl.value })
  try {
    await startSignIn(backUrl.value)
  } catch (e) {
    settleError(
      t('grantsPortal.authFailedRetry'),
      e instanceof Error ? e.message : String(e),
    )
  }
}

type Membership = 'manager' | 'member' | 'guest' | 'unknown'

// Per-step budgets so logs reveal WHICH check hung (getUser vs
// is-manager vs crew-sync). The outer checkMembershipAndRedirect budget
// stays fail-open so OAuth success never strands users here.
const GET_USER_TIMEOUT_MS = 5000
const FUNCTION_TIMEOUT_MS = 6000

async function timed<T>(label: string, promise: Promise<T>, ms: number): Promise<T> {
  const start = performance.now()
  try {
    const result = await withTimeout(promise, ms, label)
    console.log('[auth/callback]', { label: `${label}-ok`, elapsedMs: Math.round(performance.now() - start) })
    return result
  } catch (e) {
    console.warn('[auth/callback]', {
      label: `${label}-timeout`,
      elapsedMs: Math.round(performance.now() - start),
      error: e instanceof Error ? e.message : String(e),
    })
    throw e
  }
}

async function resolveMembership(): Promise<Membership> {
  const { data: { user } } = await timed('getUser', client.auth.getUser(), GET_USER_TIMEOUT_MS)
  if (!user?.email) return 'unknown'

  // Track whether each check ran to completion: two errored checks mean
  // "unknown" (fail open to `next`), while explicit negative answers mean
  // "guest". Collapsing both into "guest" used to bounce managers to the
  // signup page on transient edge-function failures.
  let managerAnswered = false
  try {
    const { data, error: mgrErr } = await timed(
      'is-manager',
      client.functions.invoke('is-manager', { method: 'GET' }),
      FUNCTION_TIMEOUT_MS,
    )
    managerAnswered = !mgrErr
    if (!mgrErr && data?.isManager === true) return 'manager'
    if (mgrErr) console.warn('[auth/callback] is-manager returned error', mgrErr)
    else if (data?.reason) console.warn('[auth/callback] is-manager answered non-manager', { reason: data.reason })
  } catch { /* already logged by timed(); fall through to crew check */ }

  let crewAnswered = false
  try {
    const { data, error: fnError } = await timed(
      'crew-sync-check',
      client.functions.invoke('crew-sync?action=check'),
      FUNCTION_TIMEOUT_MS,
    )
    crewAnswered = !fnError
    if (!fnError && data?.authorized) return 'member'
    if (fnError) console.warn('[auth/callback] crew-sync check returned error', fnError)
  } catch { /* treated below — already logged by timed() */ }
  if (!managerAnswered && !crewAnswered) return 'unknown'
  return 'guest'
}

async function checkMembershipAndRedirect(next: string) {
  if (settled) return
  let url = next
  try {
    const membership = await withTimeout(resolveMembership(), MEMBERSHIP_TIMEOUT_MS, 'membership check')
    // Only divert to signup when a check positively reports "not authorized".
    // Errors/timeouts ('unknown') fail open to `next` — the portal gates
    // access itself via useSupabaseAuth (fail-closed).
    if (membership === 'guest' && next === FALLBACK_NEXT) url = SIGN_UP_URL
  } catch (e) {
    console.warn('[auth/callback] membership check timed out, continuing to grants portal', e)
  }
  settleRedirect(url)
}

onMounted(async () => {
  if (!import.meta.client) return
  // Use the setup-time snapshot: something may have rewritten the address bar
  // (directory 301, SPA-redirect shim, retry replaceState) before onMounted.
  // Fall back to a live read only when no snapshot exists (e.g. SSR).
  // The client runs with detectSessionInUrl:false, so NOTHING auto-consumes
  // ?code — this page's explicit exchangeCodeForSession below is the single
  // owner of the single-use PKCE code.
  const live = readOAuthParams()
  const code = landingSnapshot?.code ?? live.get('code')
  const rawNext = landingSnapshot?.next ?? live.get('next')
  const next = safeNext(rawNext) || FALLBACK_NEXT
  backUrl.value = next

  if (!isSupabaseConfigured()) {
    settleError(t('grantsPortal.authFailedRetry'))
    return
  }

  const oauthError = landingSnapshot?.oauthError ?? (live.get('error_description') || live.get('error'))
  if (oauthError) {
    // Supabase redirecting with ?error= means its own exchange with Google
    // failed — surface its message verbatim (outcome 3 of the Location test).
    settleError(oauthError, diagnoseLanding())
    return
  }

  // Subscribe BEFORE the explicit exchange so we never miss the SIGNED_IN
  // event it emits.
  const { data: { subscription } } = client.auth.onAuthStateChange(
    async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        await checkMembershipAndRedirect(next)
      }
    },
  )
  authUnsubscribe = () => subscription.unsubscribe()

  console.log('[auth/callback] callback landed', { hasCode: !!code, next, diag: diagnoseLanding() })

  // A pre-existing session (e.g. second OAuth round-trip in the same tab)
  // lets us skip the exchange entirely.
  try {
    const { data: { session } } = await withTimeout(client.auth.getSession(), 10000, 'getSession')
    if (session) {
      await checkMembershipAndRedirect(next)
      return
    }
  } catch { /* fall through to the explicit exchange attempt below */ }

  // No session yet but a code was present at landing — exchange it explicitly
  // (single owner; no auto-detect race). The SNAPSHOT code is used, never a
  // live re-read that a URL cleanup may already have stripped.
  if (code) {
    try {
      const { data, error: exchangeError } = await withTimeout(
        client.auth.exchangeCodeForSession(code),
        15000,
        'exchangeCodeForSession',
      )
      if (!exchangeError && data.session) {
        await checkMembershipAndRedirect(next)
        return
      }
      // Re-read the session before reporting failure (avoids false negatives
      // when SIGNED_IN just hasn't propagated yet).
      try {
        const { data: { session } } = await client.auth.getSession()
        if (session) {
          await checkMembershipAndRedirect(next)
          return
        }
      } catch { /* fall through to error below */ }
      // A code WAS received but the exchange failed (expired/reused code, or
      // the PKCE verifier is gone because the flow started in another
      // tab/browser). Report the real cause — not "no code". Diag is
      // recomputed HERE so verifier/token reflect failure time, not mount.
      const detail = exchangeError instanceof Error
        ? exchangeError.message
        : (typeof exchangeError === 'object' && exchangeError !== null && 'message' in exchangeError
            ? String((exchangeError as { message: unknown }).message)
            : 'code exchange returned no session')
      console.warn('[auth/callback] explicit code exchange failed', { detail })
      settleError(t('grantsPortal.authFailedRetry'), `${detail} | ${diagnoseLanding()}`)
      return
    } catch (e) {
      // Timeout/throw above — one last session check before giving up.
      try {
        const { data: { session } } = await client.auth.getSession()
        if (session) {
          await checkMembershipAndRedirect(next)
          return
        }
      } catch { /* fall through */ }
      const detail = e instanceof Error ? e.message : String(e)
      console.warn('[auth/callback] explicit code exchange threw', { detail })
      settleError(t('grantsPortal.authFailedRetry'), `${detail} | ${diagnoseLanding()}`)
      return
    }
  } else {
    try {
      const { data: { session } } = await client.auth.getSession()
      if (!session) {
        // No ?code= at landing. Distinguish via the FRESH diag: a null
        // snapshot, navType=reload/back_forward (refresh after consumption),
        // or navHasCode=1 (code arrived but something stripped it before the
        // snapshot) each point at a different cause.
        settleError(t('grantsPortal.authNoCode'), diagnoseLanding())
        return
      }
      await checkMembershipAndRedirect(next)
      return
    } catch {
      settleError(t('grantsPortal.authFailedRetry'))
      return
    }
  }
})

onBeforeUnmount(() => {
  if (authUnsubscribe) { authUnsubscribe(); authUnsubscribe = null }
})

</script>
