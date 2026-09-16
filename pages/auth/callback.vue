/**
 * pages/auth/callback.vue
 * @why OAuth callback handler — processes Supabase auth redirect, sets session, redirects to origin
 * @component callback
 * @deps vue (ref, onMounted, onBeforeUnmount); ~/composables/useSupabase (useSupabase); ~/composables/useSupabaseAuth (useSupabaseAuth); ~/composables/useI18n (useI18n); ~/lib/supabase (isSupabaseConfigured); ~/lib/auth-redirect (safeNext, withTimeout)
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
import { safeNext, withTimeout } from '~/lib/auth-redirect'

useHead({ title: 'Auth Callback | Earth Guardians' })

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
  const q = new URLSearchParams(window.location.search)
  if (window.location.hash) {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    h.forEach((v, k) => { if (!q.has(k)) q.set(k, v) })
  }
  return q
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
  const params = readOAuthParams()
  const next = safeNext(params.get('next')) || FALLBACK_NEXT
  backUrl.value = next

  if (!isSupabaseConfigured()) {
    settleError(t('grantsPortal.authFailedRetry'))
    return
  }

  const oauthError = params.get('error_description') || params.get('error')
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

  // getSession() awaits the client's internal URL-code exchange, so when it
  // resolves the PKCE exchange (if any) has already settled.
  try {
    const { data: { session } } = await client.auth.getSession()
    if (session) {
      await checkMembershipAndRedirect(next)
      return
    }
  } catch { /* fall through to the explicit exchange attempt below */ }

  // No session yet but a code is present — the auto-detect may have missed it
  // (e.g. client initialized before the URL was parsed). Retry explicitly once.
  const code = params.get('code')
  console.log('[auth/callback] callback landed', { hasCode: !!code, next })
  if (code) {
    try {
      const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code)
      if (!exchangeError && data.session) {
        await checkMembershipAndRedirect(next)
        return
      }
      // A code WAS received but the exchange failed (expired/reused code, or
      // the PKCE verifier is gone because the flow started in another
      // tab/browser). Report the real cause — not "no code".
      const detail = exchangeError instanceof Error
        ? exchangeError.message
        : (typeof exchangeError === 'object' && exchangeError !== null && 'message' in exchangeError
            ? String((exchangeError as { message: unknown }).message)
            : 'code exchange returned no session')
      console.warn('[auth/callback] explicit code exchange failed', { detail })
      settleError(t('grantsPortal.authFailedRetry'), detail)
      return
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      console.warn('[auth/callback] explicit code exchange threw', { detail })
      settleError(t('grantsPortal.authFailedRetry'), detail)
      return
    }
  } else {
    try {
      const { data: { session } } = await client.auth.getSession()
      if (!session) {
        // No ?code= at all: stale bookmark, page refresh after the code was
        // consumed, or the provider redirected without one.
        settleError(t('grantsPortal.authNoCode'), 'no ?code= param in callback URL')
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
