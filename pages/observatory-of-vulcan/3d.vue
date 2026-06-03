<template>
  <div class="flex h-screen w-full items-center justify-center bg-black text-white">
    <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: 'Observatory of Vulcan (3D) | Earth Guardians',
  meta: [{ name: 'description', content: '3D view of Brazil rare earth mining claims and socio-environmental impact.' }],
})

if (import.meta.client) {
  navigateTo({ path: '/observatory-of-vulcan', query: { mode: '3d' } }, { replace: true })
}
</script>
