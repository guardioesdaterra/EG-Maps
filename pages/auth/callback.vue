/**
 * pages/auth/callback.vue
 * @why OAuth callback handler — processes Supabase auth redirect, sets session, redirects to origin
 * @component callback
 * @deps vue (ref, onMounted, onBeforeUnmount); ~/composables/useSupabase (useSupabase); ~/composables/useI18n (useI18n); ~/lib/supabase (isSupabaseConfigured); ~/lib/auth-redirect (safeNext, withTimeout)
 */
<template>
  <main id="main-content" tabindex="-1" role="main" class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
    <div class="text-center">
      <div v-if="error">
        <p class="text-[var(--danger)] font-semibold">{{ t('grantsPortal.authErrorTitle') }}</p>
        <p class="text-sm text-[var(--text-muted)] mt-2">{{ error }}</p>
        <NuxtLink :to="backUrl" class="mt-4 inline-block px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-semibold">
          {{ t('grantsPortal.authBackToGrants') }}
        </NuxtLink>
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
import { useI18n } from '~/composables/useI18n'
import { isSupabaseConfigured } from '~/lib/supabase'
import { safeNext, withTimeout } from '~/lib/auth-redirect'

useHead({ title: 'Auth Callback | Earth Guardians' })

const { t } = useI18n()
const { client } = useSupabase()
const error = ref('')
const backUrl = ref('/eg-grants')

const FALLBACK_NEXT = '/eg-grants'
const SIGN_UP_URL = '/eg-grants?signup=1'
// Membership checks must never block the redirect longer than this. The
// grants portal re-verifies the role itself, so on timeout/error we land on
// `next` and let the portal gate access instead of stranding users here.
const MEMBERSHIP_TIMEOUT_MS = 8000
// Last resort: no session established at all (network down, bad code, …).
const FALLBACK_TIMEOUT_MS = 20000
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
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
  if (fallbackTimer) clearTimeout(fallbackTimer)
  if (authUnsubscribe) { authUnsubscribe(); authUnsubscribe = null }
  window.history.replaceState({}, '', window.location.pathname)
  navigateTo(url, { replace: true })
}

function settleError(message: string) {
  if (settled) return
  settled = true
  if (fallbackTimer) clearTimeout(fallbackTimer)
  if (authUnsubscribe) { authUnsubscribe(); authUnsubscribe = null }
  error.value = message
}

type Membership = 'manager' | 'member' | 'guest'

async function resolveMembership(): Promise<Membership> {
  const { data: { user } } = await client.auth.getUser()
  if (!user?.email) return 'guest'

  try {
    const { data, error: mgrErr } = await client.functions.invoke('is-manager', { method: 'GET' })
    if (!mgrErr && data?.isManager === true) return 'manager'
  } catch { /* fall through to crew check */ }

  try {
    const { data, error: fnError } = await client.functions.invoke('crew-sync?action=check')
    if (!fnError && data?.authorized) return 'member'
  } catch { /* treated as guest below */ }
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
  if (code) {
    try {
      const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code)
      if (!exchangeError && data.session) {
        await checkMembershipAndRedirect(next)
        return
      }
      if (!data.session) {
        settleError(t('grantsPortal.authNoCode'))
        return
      }
    } catch (e) {
      console.warn('[auth/callback] explicit code exchange failed', e)
      // Fall through: the auth-state listener may still fire; otherwise the
      // fallback timer below reports the failure.
    }
  } else {
    try {
      const { data: { session } } = await client.auth.getSession()
      if (!session) {
        settleError(t('grantsPortal.authNoCode'))
        return
      }
      await checkMembershipAndRedirect(next)
      return
    } catch {
      settleError(t('grantsPortal.authFailedRetry'))
      return
    }
  }

  // Safety fallback: no session established at all — show an actionable error.
  fallbackTimer = setTimeout(async () => {
    if (settled) return
    try {
      const { data: { session } } = await client.auth.getSession()
      if (session) await checkMembershipAndRedirect(next)
      else settleError(t('grantsPortal.authTakingTooLong'))
    } catch {
      settleError(t('grantsPortal.authTakingTooLong'))
    }
  }, FALLBACK_TIMEOUT_MS)
})

onBeforeUnmount(() => {
  if (fallbackTimer) clearTimeout(fallbackTimer)
  if (authUnsubscribe) { authUnsubscribe(); authUnsubscribe = null }
})

</script>
