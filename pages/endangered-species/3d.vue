<template>
  <div v-if="loading" class="flex h-screen w-full items-center justify-center bg-black text-white">
    <LoadingSpinner
      icon="svg-spinners:wind-toy"
      :message="t('loading.endangeredSpeciesGlobe')"
      :inline="true"
    />
  </div>
  <div v-else-if="error" class="flex h-screen w-full items-center justify-center bg-black text-white">
    <p class="text-red-400">{{ t('globe.connectionError') }}</p>
  </div>
  <ClientOnly v-else>
    <!-- Use lightweight species index for map markers -->
    <GlobeView :species-index="speciesIndex" :default-dataset="'endangered-species'" />
    <template #fallback>
      <div class="flex h-screen w-full items-center justify-center bg-black text-white">
        <LoadingSpinner
          icon="svg-spinners:wind-toy"
          :message="t('loading.endangeredSpeciesGlobe')"
          :inline="true"
        />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: 'Endangered Species Globe (3D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 3D globe of critically endangered species around the world' },
  ],
})

// Use lightweight index for fast loading (3.2MB vs 35MB)
// Full details are loaded on demand when user clicks a marker
const { data: speciesIndex, loading, error } = useSpeciesIndex(['icmbio-brazil', 'iucn'])
</script>
