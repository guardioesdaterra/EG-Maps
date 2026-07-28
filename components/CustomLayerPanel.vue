/**
 * components/CustomLayerPanel.vue
 * @why Layer management panel showing all imported datasets — toggle visibility per layer, change color via color picker, remove individual layers, or clear all at once.
 */
<template>
  <div v-if="datasets.length > 0" class="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3">
    <div class="mb-2 flex items-center justify-between">
      <h3 class="text-sm font-medium text-[var(--text-primary)]">Custom Data ({{ datasets.length }})</h3>
      <button class="text-xs text-[var(--text-secondary)] hover:text-red-500" @click="clearAll">Clear All</button>
    </div>
    <div class="space-y-1.5">
      <div v-for="ds in datasets" :key="ds.id" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--bg-secondary)]">
        <button
          :aria-label="ds.visible ? 'Hide layer' : 'Show layer'"
          class="flex-shrink-0"
          @click="toggleVisibility(ds.id)"
        >
          <svg
            v-if="ds.visible"
            xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            :stroke="ds.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="text-[var(--text-secondary)]"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>

        <span class="flex-1 truncate text-[var(--text-primary)]">{{ ds.name }}</span>
        <span class="flex-shrink-0 text-xs text-[var(--text-secondary)]">{{ ds.count }}</span>

        <input
          type="color"
          :value="ds.color"
          class="h-5 w-5 cursor-pointer rounded border-0 p-0"
          @input="setColor(ds.id, ($event.target as HTMLInputElement).value)"
        >

        <button
          aria-label="Remove layer"
          class="flex-shrink-0 text-[var(--text-secondary)] hover:text-red-500"
          @click="removeDataset(ds.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCustomData } from '~/composables/useCustomData'

const { datasets, removeDataset, toggleVisibility, setColor, clearAll } = useCustomData()
</script>
