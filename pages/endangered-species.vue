<template>
  <ClientOnly>
    <UnifiedMap :species="speciesList" :default-dataset="'endangered-species'" />
    <template #fallback>
      <div class="flex h-screen w-full items-center justify-center bg-black text-white">
        <LoadingSpinner
          icon="svg-spinners:wind-toy"
          :message="'Loading Endangered Species Map...'"
          :inline="true"
        />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import speciesData from '~/public/data/species.json'

// This page now acts as a simple loading state
// The actual content is loaded from /endangered-species/index.vue
</script>
