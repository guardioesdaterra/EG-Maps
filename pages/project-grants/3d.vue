<template>
  <ClientOnly>
    <GlobeView :default-dataset="'project-grants'" />
    <template #fallback>
      <div class="flex h-screen w-full items-center justify-center bg-black text-white">
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
const { t } = useI18n()

useHead({
  title: 'Project Grants Globe (3D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 3D globe showing Earth Guardians project grants worldwide' },
  ],
})
</script>
