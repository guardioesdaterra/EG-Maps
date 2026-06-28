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

useHead({ title: 'Auth Callback | Earth Guardians' })

const route = useRoute()
const client = useSupabaseClient()
const error = ref('')

onMounted(async () => {
  const code = route.query.code as string | undefined
  if (code) {
    const { error: authError } = await client.auth.exchangeCodeForSession(code)
    if (authError) {
      error.value = authError.message
    } else {
      navigateTo('/eg-grants')
    }
  } else {
    error.value = 'No authorization code received.'
  }
})
</script>
