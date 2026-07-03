<template>
  <ClientOnly>
    <UnifiedMap :species-index="speciesIndex || []" :default-dataset="'endangered-species'" />
    <template #fallback>
      <div class="flex h-[100svh] w-full items-center justify-center bg-black text-white">
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

const { data: speciesIndex } = useSpeciesIndex(['icmbio-brazil', 'iucn'])

console.log(`[endangered-species/page] speciesIndex loaded: ${speciesIndex.value?.length ?? 0} items`)
</script>
