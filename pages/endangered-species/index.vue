/**
 * pages/endangered-species/index.vue
 * @why Endangered species 2D map — species markers with clustering, filters for region/threat
 * @component index
 * @deps vue (defineAsyncComponent)
 */
<template>
  <ClientOnly>
    <MapView2D :default-dataset="'endangered-species'" />
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

import { defineAsyncComponent } from 'vue'

const MapView2D = defineAsyncComponent(() => import('~/components/MapView2D.vue'))

const { t } = useI18n()

useHead({
  title: 'Endangered Species Map (2D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 2D map of critically endangered species around the world' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://api.maptiler.com' },
    { rel: 'dns-prefetch', href: 'https://api.maptiler.com' },
  ],
})

</script>
