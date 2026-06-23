<template>
  <div class="skeleton-panel animate-pulse space-y-3 p-4">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-zinc-700" />
      <div class="h-3 w-24 rounded bg-zinc-700" />
    </div>
    <!-- Lines -->
    <div class="space-y-2">
      <div class="h-2.5 rounded bg-zinc-800 w-full" />
      <div class="h-2.5 rounded bg-zinc-800 w-4/5" />
      <div class="h-2.5 rounded bg-zinc-800 w-3/5" />
    </div>
    <!-- Cards -->
    <div class="grid grid-cols-2 gap-2 pt-2">
      <div class="h-16 rounded-lg bg-zinc-800/50" />
      <div class="h-16 rounded-lg bg-zinc-800/50" />
      <div class="h-16 rounded-lg bg-zinc-800/50" />
      <div class="h-16 rounded-lg bg-zinc-800/50" />
    </div>
  </div>
</template>
