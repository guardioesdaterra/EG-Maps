<template>
  <ClientOnly>
    <UnifiedMap :species-index="speciesIndex || []" :default-dataset="'endangered-species'" />
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

// Use lightweight index for fast loading (3.2MB vs 35MB)
// Full details are loaded on demand when user clicks a marker
const { data: speciesIndex } = useSpeciesIndex(['icmbio-brazil', 'iucn'])
</script>
