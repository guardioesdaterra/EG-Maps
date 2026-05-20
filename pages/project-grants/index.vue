<template>
  <ClientOnly>
    <UnifiedMap :default-dataset="'project-grants'" />
    <template #fallback>
      <div class="flex flex-col h-screen w-full items-center justify-center bg-gradient-to-b from-black via-gray-950 to-black text-white">
        <!-- eclipse rings overlay -->
        <div class="relative mb-8 flex items-center justify-center w-28 h-28">
          <iconify-icon icon="svg-spinners:eclipse" class="absolute w-28 h-28 text-cyan-500/20" />
          <iconify-icon icon="svg-spinners:eclipse" class="absolute w-20 h-20 text-purple-500/30 animate-[spin_0.8s_linear_infinite]" />
          <iconify-icon icon="svg-spinners:blocks-shuffle-2" class="relative w-12 h-12 text-white" />
        </div>
        <LoadingSpinner
          :message="'Loading Project Grants Map'"
          size="sm"
        />
        <p class="text-sm text-gray-400 mt-2">Initializing interactive visualization...</p>
        <!-- 3-dots-move indicator -->
        <iconify-icon icon="svg-spinners:3-dots-move" class="w-6 h-6 text-cyan-400 mt-4" />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">

useHead({
  title: 'Project Grants Map (2D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 2D map showing Earth Guardians project grants worldwide' },
  ],
})
</script>
