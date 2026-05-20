<template>
  <iconify-icon :icon="name" :class="$props.class" />
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string
  class?: string
}>()
</script>
