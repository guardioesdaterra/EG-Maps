/**
 * pages/auth/callback.vue
 * @why OAuth callback handler — processes Supabase auth redirect, sets session, redirects to origin
 * @component callback
 * @deps vue (ref, onMounted, onBeforeUnmount); ~/composables/useSupabase (useSupabase); ~/composables/useI18n (useI18n)
 */
<template>
  <main id="main-content" tabindex="-1" role="main" class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
    <div class="text-center">
      <div v-if="error">
        <p class="text-red-400 font-semibold">{{ t('grantsPortal.authErrorTitle') }}</p>
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

useHead({ title: 'Auth Callback | Earth Guardians' })

const { t } = useI18n()
const { client } = useSupabase()
const error = ref('')
const backUrl = ref('/eg-grants')

const FALLBACK_NEXT = '/eg-grants'
const SIGN_UP_URL = '/eg-grants?signup=1'
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
let settled = false

/** Only allow internal return paths — prevents open-redirect abuse. */
function safeNext(raw: string | null): string | null {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) return decoded
  } catch { /* malformed encoding — ignore */ }
  return null
}

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
  // Strip one-time OAuth params (code, tokens) so they are not leaked via
  // referrer/history — the destination (next) is carried via navigateTo.
  window.history.replaceState({}, '', window.location.pathname)
  navigateTo(url)
}

function settleError(message: string) {
  if (settled) return
  settled = true
  if (fallbackTimer) clearTimeout(fallbackTimer)
  error.value = message
}

onMounted(async () => {
  if (!import.meta.client) return
  const params = readOAuthParams()
  const next = safeNext(params.get('next')) || FALLBACK_NEXT
  backUrl.value = next

  // Safety net: if Supabase auto-detection is still in flight, re-check the
  // session instead of flashing an error for a login that succeeded.
  fallbackTimer = setTimeout(async () => {
    if (settled) return
    try {
      const { data: { session } } = await client.auth.getSession()
      if (session) await checkMembershipAndRedirect(next)
      else settleError(t('grantsPortal.authTakingTooLong'))
    } catch {
      settleError(t('grantsPortal.authTakingTooLong'))
    }
  }, 15000)

  const oauthError = params.get('error_description') || params.get('error')
  if (oauthError) {
    settleError(oauthError)
    return
  }

  try {
    // A session may already exist (Supabase auto-detected the code in the
    // URL, or the user was already signed in) — that is an OK return, not
    // an error. Only exchange when there is no session yet.
    let { data: { session } } = await client.auth.getSession()
    const code = params.get('code')
    if (!session && code) {
      const { error: exchangeError } = await client.auth.exchangeCodeForSession(code)
      if (exchangeError) throw exchangeError
      ;({ data: { session } } = await client.auth.getSession())
    }

    if (!session) {
      settleError(code ? t('grantsPortal.authFailedRetry') : t('grantsPortal.authNoCode'))
      return
    }

    await checkMembershipAndRedirect(next)
  } catch (e) {
    settleError(e instanceof Error && e.message ? e.message : t('grantsPortal.authFailedRetry'))
  }
})

onBeforeUnmount(() => { if (fallbackTimer) clearTimeout(fallbackTimer) })

async function checkMembershipAndRedirect(next: string) {
  const { data: { user } } = await client.auth.getUser()
  if (!user?.email) {
    settleRedirect(next === FALLBACK_NEXT ? SIGN_UP_URL : next)
    return
  }

  let isManager = false
  try {
    const { data: mgrData, error: mgrErr } = await client.functions.invoke('is-manager', { method: 'GET' })
    if (!mgrErr && mgrData?.isManager === true) {
      isManager = true
    }
  } catch { /* ignored */ }

  if (isManager) {
    settleRedirect(next)
    return
  }

  const { data: result, error: fnError } = await client.functions.invoke('crew-sync?action=check')

  if (fnError || !result?.authorized) {
    settleRedirect(next === FALLBACK_NEXT ? SIGN_UP_URL : next)
    return
  }

  // Crew member (non-manager) lands on the return path — managers already returned.
  settleRedirect(next)
}

</script>
