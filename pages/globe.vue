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
  <main id="main-content" tabindex="-1" class="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <p class="text-sm text-[var(--text-secondary)]">Redirecting to the 3D globe…</p>
  </main>
</template>
