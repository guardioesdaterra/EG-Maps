<template>
  <ClientOnly>
    <MapView2D :default-dataset="'project-grants'" />
    <template #fallback>
      <div class="flex flex-col h-[100svh] w-full items-center justify-center bg-black text-white">
        <div class="relative mb-[clamp(1.5rem,4vw,3rem)] flex items-center justify-center loader-ring">
          <iconify-icon icon="svg-spinners:eclipse" class="absolute loader-ring text-white/20" />
          <iconify-icon icon="svg-spinners:eclipse" class="absolute loader-ring-sm text-white/30 animate-[spin_0.8s_linear_infinite]" />
          <iconify-icon icon="svg-spinners:blocks-shuffle-2" class="relative loader-icon text-white" />
        </div>
        <LoadingSpinner
          :message="t('loading.projectGrantsMap')"
          size="sm"
        />
        <p class="text-fluid-sm text-gray-400 mt-2">{{ t('loading.initializingVisualization') }}</p>
        <iconify-icon icon="svg-spinners:3-dots-move" class="w-[clamp(1.5rem,4vw,2rem)] h-[clamp(1.5rem,4vw,2rem)] text-white/50 mt-[clamp(0.75rem,2vw,1rem)]" />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const MapView2D = defineAsyncComponent(() => import('~/components/MapView2D.vue'))

const { t } = useI18n()

useHead({
  title: 'Project Grants Map (2D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 2D map showing Earth Guardians project grants worldwide' },
  ],
})
</script>
