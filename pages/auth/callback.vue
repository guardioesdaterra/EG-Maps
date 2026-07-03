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
    } else {
      await syncCrewMember()
      navigateTo('/eg-grants')
    }
  } else {
    const { data: { session } } = await client.auth.getSession()
    if (session) {
      navigateTo('/eg-grants')
    } else {
      error.value = 'No authorization code received.'
    }
  }
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
