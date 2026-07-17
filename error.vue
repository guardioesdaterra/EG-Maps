/**
 * error.vue
 * @why Global error page displayed on unhandled route errors
 * @component error
 */
<template>
  <div class="min-h-[100svh] bg-[var(--bg-secondary)] flex flex-col items-center justify-center relative overflow-hidden">
    
    <div class="absolute inset-0 bg-black/10 dark:bg-white/5 pointer-events-none" />
    <div class="absolute inset-0 pointer-events-none" style="box-shadow: inset 0 0 clamp(50px, 15vw, 200px) clamp(10px, 4vw, 50px) rgba(0,0,0,0.8)" />

    
    <div class="relative z-10 flex flex-col items-center px-4 text-center">
      
        <div class="mb-[clamp(1.5rem,4vw,3rem)] animate-float">
          <div class="w-[clamp(4rem,12vw,6rem)] h-[clamp(4rem,12vw,6rem)] rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--text-primary)]/20 flex items-center justify-center">
            <Icon name="lucide:alert-triangle" class="h-[clamp(2rem,6vw,3rem)] w-[clamp(2rem,6vw,3rem)] text-[var(--text-secondary)]" />
        </div>
      </div>

      
      <h1 class="text-fluid-5xl font-bold mb-4 text-[var(--text-primary)]">
        {{ error?.statusCode || 'Error' }}
      </h1>

      
      <p class="text-fluid-2xl text-[var(--text-secondary)] mb-8 max-w-[min(100%,28rem)]">
        {{ error?.statusCode === 404 ? t('error.pageNotFound') : t('error.somethingWrong') }}
      </p>

      
      <div class="flex flex-col sm:flex-row gap-fluid-lg">
        <NuxtLink
          to="/"
          class="px-fluid-lg py-fluid-md rounded-lg font-medium bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-80 transition-opacity"
        >
          {{ t('error.goHome') }}
        </NuxtLink>
        <button
          @click="handleError"
          class="px-fluid-lg py-fluid-md rounded-lg font-medium border-2 border-[var(--text-primary)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors"
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
