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
  // --- PKCE flow (authorization code in query string) ---
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
        navigateTo('/eg-grants')
        return
      }
      error.value = authError.message
      return
    }
    await syncCrewMember()
    navigateTo('/eg-grants')
    return
  }

  // --- Implicit grant flow (tokens in URL hash fragment) ---
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
    await syncCrewMember()
    navigateTo('/eg-grants')
    return
  }

  // --- Check for existing session ---
  const { data: { session } } = await client.auth.getSession()
  if (session) {
    navigateTo('/eg-grants')
    return
  }

  error.value = 'No authorization code received.'
})

async function syncCrewMember() {
  try {
    const { data: { user } } = await client.auth.getUser()
    if (user) {
      await client.functions.invoke('crew-sync', {
        body: { email: user.email, name: user.user_metadata?.full_name || user.email },
      })
    }
  } catch { /* crew-sync failed, non-critical */ }
}
</script>
