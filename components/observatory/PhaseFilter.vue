<template>
  <div class="obs-phase-filter">
    <h3 class="obs-phase-filter__title">
      <Icon name="lucide:layers" class="obs-phase-filter__title-icon" />
      {{ t('observatory.phaseFilter.title') }}
    </h3>
    <div class="obs-phase-filter__chips" role="group" :aria-label="t('observatory.phaseFilter.title')">
      <button
        v-for="phase in phases"
        :key="phase.key"
        type="button"
        class="obs-phase-filter__chip"
        :class="{ 'obs-phase-filter__chip--active': selectedPhases.has(phase.key) }"
        :style="{
          '--chip-color': phase.color,
        }"
        :aria-pressed="selectedPhases.has(phase.key)"
        :aria-label="phase.label"
        @click="togglePhase(phase.key)"
      >
        <Icon
          name="lucide:check"
          class="obs-phase-filter__chip-check"
          :style="{ opacity: selectedPhases.has(phase.key) ? 1 : 0 }"
        />
        {{ phase.shortLabel }}
      </button>
    </div>
    <div class="obs-phase-filter__actions">
      <button
        type="button"
        class="obs-phase-filter__action"
        @click="selectAll"
      >
        <Icon name="lucide:check-square" class="obs-phase-filter__action-icon" />
        {{ t('observatory.phaseFilter.all') }}
      </button>
      <span class="obs-phase-filter__sep">·</span>
      <button
        type="button"
        class="obs-phase-filter__action"
        @click="selectNone"
      >
        <Icon name="lucide:square" class="obs-phase-filter__action-icon" />
        {{ t('observatory.phaseFilter.none') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
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

watch(() => props.selected, (newVal) => {
  selectedPhases.clear()
  newVal.forEach(v => selectedPhases.add(v))
})

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

<style scoped>
.obs-phase-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--obs-panel-bg-dark);
  border: 1px solid var(--obs-panel-border);
  border-radius: 8px;
}

.obs-phase-filter__title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--obs-text-label);
}

.obs-phase-filter__title-icon {
  width: 12px;
  height: 12px;
  color: var(--obs-blue);
}

.obs-phase-filter__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.obs-phase-filter__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 5px;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.45);
  transition: background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s;
}

.obs-phase-filter__chip:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.7);
}

.obs-phase-filter__chip--active {
  background: color-mix(in srgb, var(--chip-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--chip-color) 30%, transparent);
  color: var(--chip-color);
  opacity: 1;
}

.obs-phase-filter__chip-check {
  width: 9px;
  height: 9px;
  opacity: 0;
  transition: opacity 0.15s;
}

.obs-phase-filter__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.obs-phase-filter__action {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 8px;
  font-weight: 600;
  color: var(--obs-text-dim);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 2px 4px;
  border-radius: 3px;
  transition: color 0.15s, background 0.15s;
}

.obs-phase-filter__action:hover {
  color: var(--obs-text-body);
  background: rgba(255, 255, 255, 0.04);
}

.obs-phase-filter__action-icon {
  width: 9px;
  height: 9px;
}

.obs-phase-filter__sep {
  color: var(--obs-text-dim);
  font-size: 8px;
}
</style>
