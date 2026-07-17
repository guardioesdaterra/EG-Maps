/**
 * pages/project-grants/3d.vue
 * @why Project grants 3D globe — grants on globe with particle effects and connection lines
 * @component 3d
 * @deps vue (defineAsyncComponent)
 */
<template>
  <ClientOnly>
    <MapView3D :default-dataset="'project-grants'" />
    <template #fallback>
      <div class="flex h-[100svh] w-full items-center justify-center bg-black text-white">
        <LoadingSpinner
          icon="svg-spinners:wind-toy"
          :message="t('loading.projectGrantsGlobe')"
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
  title: 'Project Grants Globe (3D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 3D globe showing Earth Guardians project grants worldwide' },
  ],
})

</script>
