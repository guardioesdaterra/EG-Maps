<template>
  <ClientOnly>
    <UnifiedMap :default-dataset="'active-crews'" :crews="crewRegions" />
    <template #fallback>
      <div class="flex flex-col h-screen w-full items-center justify-center bg-black text-white">
        <div class="relative mb-8 flex items-center justify-center w-28 h-28">
          <iconify-icon icon="svg-spinners:eclipse" class="absolute w-28 h-28 text-white/20" />
          <iconify-icon icon="svg-spinners:eclipse" class="absolute w-20 h-20 text-white/30 animate-[spin_0.8s_linear_infinite]" />
          <iconify-icon icon="svg-spinners:blocks-shuffle-2" class="relative w-12 h-12 text-white" />
        </div>
        <LoadingSpinner
          :message="t('loading.activeCrewsMap')"
          size="sm"
        />
        <p class="text-sm text-gray-400 mt-2">{{ t('loading.initializingVisualization') }}</p>
        <iconify-icon icon="svg-spinners:3-dots-move" class="w-6 h-6 text-white/50 mt-4" />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { allCrewRegionsData } from '@/lib/crew-data'

const { t } = useI18n()

const crewRegions = allCrewRegionsData

useHead({
  title: 'Active Crews Map (2D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 2D map showing Earth Guardians active crews worldwide' },
  ],
})
</script>
