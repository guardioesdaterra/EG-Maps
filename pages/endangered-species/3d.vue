/**
 * pages/endangered-species/3d.vue
 * @why Endangered species 3D globe — species locations on globe with connection arcs
 * @component 3d
 * @deps vue (defineAsyncComponent)
 */
<template>
  <ClientOnly>
    <MapView3D :default-dataset="'endangered-species'" />
    <template #fallback>
      <div class="flex h-[100svh] w-full items-center justify-center bg-black text-white">
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

import { defineAsyncComponent } from 'vue'

const MapView3D = defineAsyncComponent(() => import('~/components/MapView3D.vue'))

const { t } = useI18n()

useHead({
  title: 'Endangered Species Globe (3D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 3D globe of critically endangered species around the world' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://api.maptiler.com' },
    { rel: 'dns-prefetch', href: 'https://api.maptiler.com' },
  ],
})

</script>
