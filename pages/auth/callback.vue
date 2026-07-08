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
import { ref, onMounted } from 'vue'
import { useSupabase } from '~/composables/useSupabase'

useHead({ title: 'Auth Callback | Earth Guardians' })

const route = useRoute()
const { client } = useSupabase()
const error = ref('')

onMounted(async () => {
  const SIGN_UP_URL = 'https://www.earthguardians.org/crews-sign-up-1'

  const code = route.query.code as string | undefined

  if (code || route.query.state) {
    const cleanUrl = window.location.pathname
    window.history.replaceState({}, '', cleanUrl)
  }

  if (code) {
    const { error: authError } = await client.auth.exchangeCodeForSession(code)
    if (authError) {
      const { data: { session } } = await client.auth.getSession()
      if (session) {
        await checkMembershipAndRedirect(SIGN_UP_URL)
        return
      }
      error.value = authError.message
      return
    }
    await checkMembershipAndRedirect(SIGN_UP_URL)
    return
  }

  const hash = window.location.hash.substring(1)
  const hashParams = new URLSearchParams(hash)
  const accessToken = hashParams.get('access_token')

  if (accessToken) {
    const refreshToken = hashParams.get('refresh_token') || ''
    window.history.replaceState({}, '', window.location.pathname)

    const { error: sessionError } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (sessionError) {
      error.value = sessionError.message
      return
    }
    await checkMembershipAndRedirect(SIGN_UP_URL)
    return
  }

  const { data: { session } } = await client.auth.getSession()
  if (session) {
    await checkMembershipAndRedirect(SIGN_UP_URL)
    return
  }

  error.value = 'No authorization code received.'
})

async function checkMembershipAndRedirect(signUpUrl: string) {
  const { data: { user } } = await client.auth.getUser()
  if (!user?.email) {
    window.location.href = signUpUrl
    return
  }

  // Managers auto-bypass crew check
  if (user.email.endsWith('@earthguardians.org')) {
    navigateTo('/eg-grants')
    return
  }

  // Secure check via edge function (no direct DB access)
  const { data: result, error: fnError } = await client.functions.invoke('crew-sync')

  if (fnError || !result?.authorized) {
    window.location.href = signUpUrl
    return
  }

  navigateTo('/eg-grants')
}
</script>
