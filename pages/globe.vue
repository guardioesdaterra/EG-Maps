<template>
  <div class="flex h-screen w-full items-center justify-center bg-black text-white">
    <LoadingSpinner
      :size="'xl'"
      :message="'Redirecting to Project Grants 3D...'"
    />
  </div>
</template>

<script setup lang="ts">
// This route is kept for backwards compatibility
// Users visiting /globe will be redirected to /project-grants/3d
useHead({ title: 'Redirecting... | Earth Guardians' })
navigateTo('/project-grants/3d', { redirectCode: 301 })
</script>
