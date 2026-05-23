<template>
  <div class="min-h-screen bg-[var(--bg-secondary)] flex flex-col items-center justify-center relative overflow-hidden">
    <!-- Background effects -->
    <div class="absolute inset-0 bg-black/10 dark:bg-white/5 pointer-events-none" />
    <div class="absolute inset-0 pointer-events-none" style="box-shadow: inset 0 0 200px 50px rgba(0,0,0,0.8)" />

    <!-- Main content -->
    <div class="relative z-10 flex flex-col items-center px-4 text-center">
      <!-- Error icon -->
      <div class="mb-8 animate-float">
        <div class="w-24 h-24 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--text-primary)]/20 flex items-center justify-center">
          <Icon name="lucide:alert-triangle" class="h-12 w-12 text-[var(--text-secondary)]" />
        </div>
      </div>

      <!-- Error code -->
      <h1 class="text-6xl sm:text-8xl font-bold mb-4 text-[var(--text-primary)]">
        {{ error?.statusCode || 'Error' }}
      </h1>

      <!-- Error message -->
      <p class="text-xl text-[var(--text-secondary)] mb-8 max-w-md">
        {{ error?.statusCode === 404 ? t('error.pageNotFound') : t('error.somethingWrong') }}
      </p>

      <!-- Action buttons -->
      <div class="flex flex-col sm:flex-row gap-4">
        <NuxtLink
          to="/"
          class="px-6 py-3 rounded-lg font-medium bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-80 transition-opacity"
        >
          {{ t('error.goHome') }}
        </NuxtLink>
        <button
          @click="handleError"
          class="px-6 py-3 rounded-lg font-medium border-2 border-[var(--text-primary)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors"
        >
          {{ t('error.tryAgain') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const error = useError()
const { t } = useI18n()

useHead({
  title: computed(() => `${error.value?.statusCode || 'Error'} | Earth Guardians`),
  meta: [
    { name: 'description', content: 'Earth Guardians - Page not found' },
  ],
})

function handleError() {
  clearError({ redirect: '/' })
}
</script>
