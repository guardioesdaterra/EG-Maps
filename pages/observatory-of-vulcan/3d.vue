<template>
  <div class="flex h-[100svh] w-full items-center justify-center bg-black text-white">
    <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
    <p class="absolute bottom-8 text-xs text-gray-500">
      <NuxtLink to="/observatory-of-vulcan" class="underline hover:text-white transition-colors">
        {{ t('globe.view2D') }} →
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: 'Observatory of Vulcan | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

onMounted(() => {
  navigateTo({ path: '/observatory-of-vulcan' }, { replace: true })
})
</script>
