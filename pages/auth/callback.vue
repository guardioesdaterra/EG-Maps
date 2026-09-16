/**
 * pages/auth/callback.vue
 * @why OAuth callback handler — processes Supabase auth redirect, sets session, redirects to origin
 * @component callback
 * @deps vue (ref, onMounted, onBeforeUnmount); ~/composables/useSupabase (useSupabase); ~/composables/useSupabaseAuth (useSupabaseAuth); ~/composables/useI18n (useI18n); ~/lib/supabase (isSupabaseConfigured); ~/lib/auth-redirect (mergeOAuthParams, safeNext, snapshotOAuthLanding, withTimeout)
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
import { mergeOAuthParams, safeNext, snapshotOAuthLanding, withTimeout } from '~/lib/auth-redirect'

useHead({ title: 'Auth Callback | Earth Guardians' })

// Snapshot the landing URL SYNCHRONOUSLY, before the Supabase client
// (detectSessionInUrl) can consume `?code` and clean the address bar. The
// client is created by useSupabase() below, whose gotrue `initialize()`
// exchanges the code async and strips it via history.replaceState — any
// later read of window.location.search would see `query=[]` and misreport
// "No authorization code received" even though the provider sent one.
const landingSnapshot = (() => {
  if (typeof window === 'undefined') return null
  try {
    const route = useRoute()
    const rq = route.query as Record<string, unknown>
    let search = window.location.search
    const hash = window.location.hash
    // Fallback: vue-router parsed the initial URL before auto-detect cleaned
    // it (e.g. GitHub Pages directory 301 `/auth/callback` → `/auth/callback/`
    // or gotrue's replaceState ran before setup finished).
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
  } catch {
    return null
  }
})()

const { t } = useI18n()
const { client } = useSupabase()
const { signIn: startSignIn } = useSupabaseAuth()
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
  let verifier: 'present' | 'missing' | 'unreadable' = 'missing'
  let token: 'present' | 'absent' | 'unreadable' = 'absent'
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || ''
      if (k.endsWith('-code-verifier')) verifier = 'present'
      else if (k.includes('auth-token')) token = 'present'
    }
  } catch {
    verifier = 'unreadable'
    token = 'unreadable'
  }
  return { verifier, token }
}

/**
 * Privacy-safe landing diagnostics (param NAMES only, never values): tells us
 * whether the provider sent no code at all, sent implicit tokens instead of a
 * PKCE code, or sent a code whose verifier/session then went missing. Uses the
 * setup-time snapshot for query/hash keys so auto-detect URL cleaning can't
 * rewrite history to `query=[]`.
 */
function diagnoseLanding(): string {
  const queryKeys = landingSnapshot?.queryKeys ?? []
  const hashKeys = landingSnapshot?.hashKeys ?? []
  const { verifier, token } = readVerifierToken()
  const diag = `query=[${queryKeys.join(',')}] hash=[${hashKeys.join(',')}] verifier=${verifier} token=${token}`
  console.log('[auth/callback] landing diagnostics', { diag })
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

type Membership = 'manager' | 'member' | 'guest'

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
  if (!user?.email) return 'guest'

  try {
    const { data, error: mgrErr } = await timed(
      'is-manager',
      client.functions.invoke('is-manager', { method: 'GET' }),
      FUNCTION_TIMEOUT_MS,
    )
    if (!mgrErr && data?.isManager === true) return 'manager'
    if (mgrErr) console.warn('[auth/callback] is-manager returned error', mgrErr)
  } catch { /* fall through to crew check — already logged by timed() */ }

  try {
    const { data, error: fnError } = await timed(
      'crew-sync-check',
      client.functions.invoke('crew-sync?action=check'),
      FUNCTION_TIMEOUT_MS,
    )
    if (!fnError && data?.authorized) return 'member'
    if (fnError) console.warn('[auth/callback] crew-sync check returned error', fnError)
  } catch { /* treated as guest below — already logged by timed() */ }
  return 'guest'
}

async function checkMembershipAndRedirect(next: string) {
  if (settled) return
  let url = next
  try {
    const membership = await withTimeout(resolveMembership(), MEMBERSHIP_TIMEOUT_MS, 'membership check')
    // Only divert to signup when a check positively reports "not authorized".
    // Timeouts/errors fail open to `next` — the portal gates access itself.
    if (membership === 'guest' && next === FALLBACK_NEXT) url = SIGN_UP_URL
  } catch (e) {
    console.warn('[auth/callback] membership check timed out, continuing to grants portal', e)
  }
  settleRedirect(url)
}

onMounted(async () => {
  if (!import.meta.client) return
  // Use the setup-time snapshot: detectSessionInUrl may already have
  // consumed `?code` and cleaned the address bar before onMounted runs.
  // Fall back to a live read only when no snapshot exists (e.g. SSR).
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
    settleError(oauthError)
    return
  }

  // Subscribe BEFORE reading the session so we never miss the auth event the
  // PKCE code exchange emits (auto-detect runs async on client init).
  const { data: { subscription } } = client.auth.onAuthStateChange(
    async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        await checkMembershipAndRedirect(next)
      }
    },
  )
  authUnsubscribe = () => subscription.unsubscribe()

  const diag = diagnoseLanding()
  console.log('[auth/callback] callback landed', { hasCode: !!code, next, diag })

  // getSession() awaits the client's internal URL-code exchange, so when it
  // resolves the PKCE auto-exchange (if any) has already settled.
  try {
    const { data: { session } } = await withTimeout(client.auth.getSession(), 10000, 'getSession')
    if (session) {
      await checkMembershipAndRedirect(next)
      return
    }
  } catch { /* fall through to the explicit exchange attempt below */ }

  // No session yet but a code was present at landing — the auto-detect may
  // have missed it (e.g. verifier written after init, directory-301 query
  // loss, hash-fragment code). Retry explicitly once with the SNAPSHOT code.
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
      // The auto-exchange may have won the race concurrently: re-read the
      // session before reporting failure (avoids "code already used" false
      // negatives when SIGNED_IN just hasn't propagated yet).
      try {
        const { data: { session } } = await client.auth.getSession()
        if (session) {
          await checkMembershipAndRedirect(next)
          return
        }
      } catch { /* fall through to error below */ }
      // A code WAS received but the exchange failed (expired/reused code, or
      // the PKCE verifier is gone because the flow started in another
      // tab/browser). Report the real cause — not "no code".
      const detail = exchangeError instanceof Error
        ? exchangeError.message
        : (typeof exchangeError === 'object' && exchangeError !== null && 'message' in exchangeError
            ? String((exchangeError as { message: unknown }).message)
            : 'code exchange returned no session')
      console.warn('[auth/callback] explicit code exchange failed', { detail })
      settleError(t('grantsPortal.authFailedRetry'), `${detail} | ${diag}`)
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
      settleError(t('grantsPortal.authFailedRetry'), `${detail} | ${diag}`)
      return
    }
  } else {
    try {
      const { data: { session } } = await client.auth.getSession()
      if (!session) {
        // No ?code= at landing (snapshot): stale bookmark, page refresh
        // after the code was consumed, or the provider redirected without
        // one. `diag` (snapshot keys) pinpoints it.
        settleError(t('grantsPortal.authNoCode'), diag)
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
