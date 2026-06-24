<template>
  <div class="flex flex-col gap-1.5">
    <h3 class="text-[8px] font-bold uppercase tracking-wider text-zinc-500">{{ t('observatory.phaseFilter.title') }}</h3>
    <div class="flex flex-wrap gap-1" role="group" :aria-label="t('observatory.phaseFilter.title')">
      <button
        v-for="phase in phases"
        :key="phase.key"
        type="button"
        class="px-2 py-1 text-[8px] font-bold rounded border transition-all"
        :class="selectedPhases.has(phase.key)
          ? 'opacity-100'
          : 'opacity-30 hover:opacity-60'"
        :style="{
          borderColor: phase.color,
          background: selectedPhases.has(phase.key) ? phase.color + '22' : 'transparent',
          color: phase.color,
        }"
        :aria-pressed="selectedPhases.has(phase.key)"
        :aria-label="phase.label"
        @click="togglePhase(phase.key)"
      >
        {{ phase.shortLabel }}
      </button>
    </div>
    <div class="flex items-center gap-1 mt-0.5">
      <button
        type="button"
        class="text-[8px] text-zinc-500 hover:text-zinc-300 transition-colors"
        @click="selectAll"
      >{{ t('observatory.phaseFilter.all') }}</button>
      <span class="text-zinc-700">·</span>
      <button
        type="button"
        class="text-[8px] text-zinc-500 hover:text-zinc-300 transition-colors"
        @click="selectNone"
      >{{ t('observatory.phaseFilter.none') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { RARE_EARTH_PHASES } from '@/lib/map-utils'

const { t } = useI18n()

const props = defineProps<{
  selected: Set<string>
}>()

const emit = defineEmits<{
  'update:selected': [value: Set<string>]
}>()

const phases = Object.entries(RARE_EARTH_PHASES).map(([key, val]) => ({
  key,
  ...val,
}))

const selectedPhases = reactive(new Set(props.selected))

function togglePhase(key: string) {
  if (selectedPhases.has(key)) {
    selectedPhases.delete(key)
  } else {
    selectedPhases.add(key)
  }
  emit('update:selected', new Set(selectedPhases))
}

function selectAll() {
  selectedPhases.clear()
  phases.forEach(p => selectedPhases.add(p.key))
  emit('update:selected', new Set(selectedPhases))
}

function selectNone() {
  selectedPhases.clear()
  emit('update:selected', new Set(selectedPhases))
}
</script>
