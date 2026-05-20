<template>
  <ClientOnly>
    <UnifiedMap :species="speciesList" :default-dataset="'endangered-species'" />
    <template #fallback>
      <div class="flex h-screen w-full items-center justify-center bg-black text-white">
        <LoadingSpinner
          icon="svg-spinners:wind-toy"
          :message="'Loading Endangered Species Map...'"
          :inline="true"
        />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import speciesData from '~/public/data/species.json'
import { LoadingSpinner } from '@/components/LoadingSpinner'

useHead({
  title: 'Endangered Species Map (2D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 2D map of critically endangered species around the world' },
  ],
})

const speciesList = speciesData
</script>
