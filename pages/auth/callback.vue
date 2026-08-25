/**
 * pages/auth/callback.vue
 * @why OAuth callback handler — processes Supabase auth redirect, sets session, redirects to origin
 * @component callback
 * @deps vue (ref, watch); ~/composables/useSupabase (useSupabase)
 */
<template>
  <main id="main-content" role="main" class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
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
  </main>
</template>

<script setup lang="ts">

import { ref, watch } from 'vue'
import { useSupabase } from '~/composables/useSupabase'

useHead({ title: 'Auth Callback | Earth Guardians' })

const { client, sessionReady } = useSupabase()
const error = ref('')

watch(sessionReady, async (ready) => {
  if (!ready) return

  const SIGN_UP_URL = '/eg-grants?signup=1'

  if (window.location.search || window.location.hash) {
    window.history.replaceState({}, '', window.location.pathname)
  }

  const { data: { session } } = await client.auth.getSession()
  if (session) {
    await checkMembershipAndRedirect(SIGN_UP_URL)
    return
  }

  error.value = 'No authorization code received.'
}, { immediate: true })

async function checkMembershipAndRedirect(signUpUrl: string) {
  const { data: { user } } = await client.auth.getUser()
  if (!user?.email) {
    navigateTo(signUpUrl)
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
    navigateTo('/eg-grants')
    return
  }

  const { data: result, error: fnError } = await client.functions.invoke('crew-sync?action=check')

  if (fnError || !result?.authorized) {
    navigateTo(signUpUrl)
    return
  }

  navigateTo('/eg-grants')
}

</script>
