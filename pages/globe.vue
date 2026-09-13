/**
 * pages/globe.vue
 * @why Globe redirect — immediately redirects to /project-grants/3d
 * @component globe
 */
<script setup lang="ts">

definePageMeta({ redirect: '/project-grants/3d' })

useHead({ title: 'Globe | Earth Guardians' })

</script>
<template>
  <main id="main-content" class="min-h-screen bg-black flex items-center justify-center">
    <p class="text-white/60 text-sm">Redirecting to the 3D globe…</p>
  </main>
</template>
