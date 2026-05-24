<template>
  <div v-if="loading" class="flex h-screen w-full items-center justify-center bg-black text-white">
    <LoadingSpinner
      icon="svg-spinners:wind-toy"
      :message="t('loading.endangeredSpeciesMap')"
      :inline="true"
    />
  </div>
  <div v-else-if="error" class="flex h-screen w-full items-center justify-center bg-black text-white">
    <p class="text-red-400">{{ t('globe.connectionError') }}</p>
  </div>
  <ClientOnly v-else>
    <UnifiedMap :species="speciesList" :default-dataset="'endangered-species'" />
    <template #fallback>
      <div class="flex h-screen w-full items-center justify-center bg-black text-white">
        <LoadingSpinner
          icon="svg-spinners:wind-toy"
          :message="t('loading.endangeredSpeciesMap')"
          :inline="true"
        />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: 'Endangered Species Map (2D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 2D map of critically endangered species around the world' },
  ],
})

const { data: speciesList, loading, error } = useSpeciesData(['icmbio-brazil', 'iucn'])
</script>
