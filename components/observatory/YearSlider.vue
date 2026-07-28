/**
 * components/observatory/YearSlider.vue
 * @why Year range slider for filtering observatory data by year
 * @component YearSlider
 * @props yearMin: number
  yearMax
 * @emits 'update:yearMin': [value: number]
  'update:yearMax': [value: number]
 * @deps vue (ref, onUnmounted, watch)
 */
<template>
  <div class="obs-slider">
    <div class="obs-slider__header">
      <h3 class="obs-slider__title">
        <Icon name="lucide:calendar" class="obs-slider__title-icon" />
        {{ t('observatory.yearSlider.title') }}
      </h3>
      <div class="obs-slider__years">
        <span class="obs-slider__year-value">{{ yearMin }}</span>
        <span class="obs-slider__year-sep">—</span>
        <span class="obs-slider__year-value">{{ yearMax }}</span>
      </div>
    </div>

    <div class="obs-slider__track-wrap">
      <input
        type="range"
        :min="MIN_YEAR"
        :max="MAX_YEAR"
        :value="yearMin"
        class="obs-slider__input"
        :style="{ '--fill-pct': ((yearMin - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100 + '%' }"
        :aria-label="t('observatory.yearSlider.minYear')"
        @input="$emit('update:yearMin', Number(($event.target as HTMLInputElement).value))"
      />
      <input
        type="range"
        :min="MIN_YEAR"
        :max="MAX_YEAR"
        :value="yearMax"
        class="obs-slider__input"
        :style="{ '--fill-pct': ((yearMax - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100 + '%' }"
        :aria-label="t('observatory.yearSlider.maxYear')"
        @input="$emit('update:yearMax', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <div class="obs-slider__range-labels">
      <span>{{ MIN_YEAR }}</span>
      <span>{{ MAX_YEAR }}</span>
    </div>

    <div class="obs-slider__controls">
      <button
        type="button"
        class="obs-slider__btn"
        :class="{ 'obs-slider__btn--active': isPlaying }"
        :aria-label="isPlaying ? t('observatory.yearSlider.pause') : t('observatory.yearSlider.play')"
        @click="togglePlay"
      >
        <Icon :name="isPlaying ? 'lucide:square' : 'lucide:play'" class="obs-slider__btn-icon" />
        {{ isPlaying ? t('observatory.yearSlider.pause') : t('observatory.yearSlider.play') }}
      </button>
      <button
        type="button"
        class="obs-slider__btn"
        :aria-label="t('observatory.yearSlider.reset')"
        @click="resetRange"
      >
        <Icon name="lucide:rotate-ccw" class="obs-slider__btn-icon" />
        {{ t('observatory.yearSlider.reset') }}
      </button>
      <span class="obs-slider__count" aria-live="polite">
        {{ filteredCount.toLocaleString() }} {{ t('observatory.yearSlider.claims') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onUnmounted, watch } from 'vue'

const MIN_YEAR = 1935
const MAX_YEAR = 2026

const props = defineProps<{
  yearMin: number
  yearMax: number
  filteredCount: number
}>()

const emit = defineEmits<{
  'update:yearMin': [value: number]
  'update:yearMax': [value: number]
}>()

const { t } = useI18n()

const isPlaying = ref(false)
let playInterval: ReturnType<typeof setInterval> | null = null

function togglePlay() {
  if (isPlaying.value) {
    stopPlay()
  } else {
    startPlay()
  }
}

function startPlay() {
  isPlaying.value = true
  if (props.yearMax >= MAX_YEAR) {
    emit('update:yearMin', MIN_YEAR)
    emit('update:yearMax', MIN_YEAR)
  }
  playInterval = setInterval(() => {
    if (props.yearMax >= MAX_YEAR) {
      stopPlay()
      return
    }
    emit('update:yearMax', props.yearMax + 1)
  }, 200)
}

function stopPlay() {
  isPlaying.value = false
  if (playInterval) {
    clearInterval(playInterval)
    playInterval = null
  }
}

function resetRange() {
  stopPlay()
  emit('update:yearMin', MIN_YEAR)
  emit('update:yearMax', MAX_YEAR)
}

onUnmounted(() => {
  stopPlay()
})

watch(() => [props.yearMin, props.yearMax], ([min, max]) => {
  if (min > max) {
    emit('update:yearMax', min)
  }
})

</script>

<style scoped>
.obs-slider {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.2vw, 12px);
  padding: clamp(8px, 1.5vw, 16px);
  background: var(--obs-panel-bg-dark);
  border: 1px solid var(--obs-panel-border);
  border-radius: 8px;
}

.obs-slider__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.obs-slider__title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.8vw, 8px);
  font-size: clamp(9px, 1.4vw, 12px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--obs-text-label);
}

.obs-slider__title-icon {
  width: 12px;
  height: 12px;
  color: var(--obs-red);
}

.obs-slider__years {
  display: flex;
  align-items: center;
  gap: clamp(2px, 0.5vw, 6px);
}

.obs-slider__year-value {
  font-size: clamp(11px, 1.6vw, 14px);
  font-weight: 800;
  font-family: ui-monospace, monospace;
  color: var(--obs-text-primary);
  font-variant-numeric: tabular-nums;
}

.obs-slider__year-sep {
  font-size: clamp(10px, 1.5vw, 13px);
  color: var(--obs-text-dim);
}

.obs-slider__track-wrap {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
}

.obs-slider__input {
  position: absolute;
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
}

.obs-slider__input::-webkit-slider-runnable-track {
  height: 4px;
  background: linear-gradient(
    to right,
    var(--obs-red) var(--fill-pct, 100%),
    rgba(255, 255, 255, 0.06) var(--fill-pct, 100%)
  );
  border-radius: 2px;
}

.obs-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--obs-red);
  border: 2px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.4);
  cursor: pointer;
  pointer-events: auto;
  margin-top: -5px;
  transition: box-shadow 0.15s, transform 0.15s;
}

.obs-slider__input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 14px rgba(231, 76, 60, 0.6);
}

.obs-slider__input::-moz-range-track {
  height: 4px;
  background: transparent;
  border-radius: 2px;
}

.obs-slider__input::-moz-range-progress {
  height: 4px;
  background: var(--obs-red);
  border-radius: 2px;
}

.obs-slider__input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--obs-red);
  border: 2px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.4);
  cursor: pointer;
  pointer-events: auto;
}

.obs-slider__range-labels {
  display: flex;
  justify-content: space-between;
  font-size: clamp(8px, 1.3vw, 11px);
  color: var(--obs-text-dim);
  font-family: ui-monospace, monospace;
  margin-top: -4px;
}

.obs-slider__controls {
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.8vw, 8px);
}

.obs-slider__btn {
  display: inline-flex;
  align-items: center;
  gap: clamp(2px, 0.5vw, 6px);
  padding: clamp(2px, 0.5vw, 6px) clamp(6px, 1.2vw, 12px);
  font-size: clamp(9px, 1.4vw, 12px);
  font-weight: 700;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--obs-panel-border);
  color: var(--obs-text-body);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.obs-slider__btn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
  color: var(--obs-text-primary);
}

.obs-slider__btn--active {
  background: rgba(231, 76, 60, 0.1);
  border-color: rgba(231, 76, 60, 0.3);
  color: var(--obs-red);
}

.obs-slider__btn--active:hover {
  background: rgba(231, 76, 60, 0.16);
  border-color: rgba(231, 76, 60, 0.4);
}

.obs-slider__btn-icon {
  width: 10px;
  height: 10px;
}

.obs-slider__count {
  margin-left: auto;
  font-size: clamp(9px, 1.4vw, 12px);
  color: var(--obs-text-dim);
  font-family: ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}
</style>
