<template>
  <div class="min-h-screen bg-[var(--bg-secondary)] flex flex-col items-center justify-center relative overflow-hidden">
    <!-- Background effects -->
    <div class="absolute inset-0 bg-gradient-to-b from-red-950/20 via-purple-950/10 to-cyan-950/20 pointer-events-none" />
    <div class="absolute inset-0 pointer-events-none" style="box-shadow: inset 0 0 200px 50px rgba(0,0,0,0.8)" />

    <!-- Main content -->
    <div class="relative z-10 flex flex-col items-center px-4 text-center">
      <!-- Error icon -->
      <div class="mb-8 animate-float">
        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
          <Icon name="lucide:alert-triangle" class="h-12 w-12 text-red-400" />
        </div>
      </div>

      <!-- Error code -->
      <h1 class="text-6xl sm:text-8xl font-bold mb-4 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
        {{ error.statusCode }}
      </h1>

      <!-- Error message -->
      <p class="text-xl text-[var(--text-secondary)] mb-8 max-w-md">
        {{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}
      </p>

      <!-- Action buttons -->
      <div class="flex flex-col sm:flex-row gap-4">
        <NuxtLink
          to="/"
          class="px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          Go Home
        </NuxtLink>
        <button
          @click="handleError"
          class="px-6 py-3 rounded-lg font-medium bg-black/50 text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const error = useError()

useHead({
  title: `${error.value?.statusCode || 'Error'} | Earth Guardians`,
  meta: [
    { name: 'description', content: 'Earth Guardians - Page not found' },
  ],
})

function handleError() {
  clearError({ redirect: '/' })
}
</script>
