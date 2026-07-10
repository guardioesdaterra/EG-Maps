<template>
  <div class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
    <div class="text-center">
      <div v-if="error">
        <p class="text-red-400 font-semibold">Authentication Error</p>
        <p class="text-sm text-[var(--text-muted)] mt-2">{{ error }}</p>
        <NuxtLink to="/" class="mt-4 inline-block px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-semibold">
          Back to Home
        </NuxtLink>
      </div>
      <div v-else>
        <p class="text-[var(--text-secondary)]">Signing you in...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSupabase } from '~/composables/useSupabase'

useHead({ title: 'Auth Callback | Earth Guardians' })

const { client, sessionReady } = useSupabase()
const error = ref('')

// With detectSessionInUrl: true and flowType: 'pkce', the Supabase SDK
// automatically detects the PKCE auth code in the URL during its
// getSession() call in useSupabase's onMounted, exchanges it, and
// sets the session. The callback just needs to wait for that to finish.
watch(sessionReady, async (ready) => {
  if (!ready) return

  const SIGN_UP_URL = 'https://www.earthguardians.org/crews-sign-up-1'

  // Clean PKCE params from URL after exchange
  if (window.location.search || window.location.hash) {
    window.history.replaceState({}, '', window.location.pathname)
  }

  const { data: { session } } = await client.auth.getSession()
  if (session) {
    await checkMembershipAndRedirect(SIGN_UP_URL)
    return
  }

  // No session after PKCE exchange — user might have arrived here
  // without an auth code (e.g. direct navigation)
  error.value = 'No authorization code received.'
}, { immediate: true })

async function checkMembershipAndRedirect(signUpUrl: string) {
  const { data: { user } } = await client.auth.getUser()
  if (!user?.email) {
    window.location.href = signUpUrl
    return
  }

  // Server-verified manager check via edge function (unspoofable)
  let isManager = false
  try {
    const { data: mgrData, error: mgrErr } = await client.functions.invoke('is-manager', {
      method: 'GET',
    })
    if (!mgrErr && mgrData?.isManager === true) {
      isManager = true
    }
  } catch {
    // Fall through to crew check below
  }

  if (isManager) {
    navigateTo('/eg-grants')
    return
  }

  // Crew membership check via edge function
  const { data: result, error: fnError } = await client.functions.invoke('crew-sync')

  if (fnError || !result?.authorized) {
    window.location.href = signUpUrl
    return
  }

  navigateTo('/eg-grants')
}
</script>
