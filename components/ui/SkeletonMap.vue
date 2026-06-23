<template>
  <div class="skeleton-map animate-pulse bg-zinc-900 rounded-xl overflow-hidden" :style="{ height: height }">
    <div class="relative w-full h-full">
      <!-- Map grid lines -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-1/4 left-0 right-0 h-px bg-zinc-600" />
        <div class="absolute top-1/2 left-0 right-0 h-px bg-zinc-600" />
        <div class="absolute top-3/4 left-0 right-0 h-px bg-zinc-600" />
        <div class="absolute left-1/4 top-0 bottom-0 w-px bg-zinc-600" />
        <div class="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600" />
        <div class="absolute left-3/4 top-0 bottom-0 w-px bg-zinc-600" />
      </div>
      <!-- Fake markers -->
      <div class="absolute top-[20%] left-[30%] w-3 h-3 rounded-full bg-zinc-700" />
      <div class="absolute top-[45%] left-[60%] w-3 h-3 rounded-full bg-zinc-700" />
      <div class="absolute top-[70%] left-[25%] w-3 h-3 rounded-full bg-zinc-700" />
      <div class="absolute top-[35%] left-[80%] w-3 h-3 rounded-full bg-zinc-700" />
      <!-- Controls -->
      <div class="absolute top-3 left-3 w-8 h-8 rounded bg-zinc-800" />
      <div class="absolute top-3 right-3 w-8 h-8 rounded bg-zinc-800" />
      <div class="absolute bottom-3 right-3 w-16 h-4 rounded bg-zinc-800" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ height?: string }>(), { height: '100%' })
</script>
