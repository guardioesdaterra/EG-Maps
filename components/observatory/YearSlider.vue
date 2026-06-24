<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <h3 class="text-[8px] font-bold uppercase tracking-wider text-zinc-500">{{ t('observatory.yearSlider.title') }}</h3>
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-mono font-bold text-zinc-300">{{ yearMin }}</span>
        <span class="text-[8px] text-zinc-600">—</span>
        <span class="text-[10px] font-mono font-bold text-zinc-300">{{ yearMax }}</span>
      </div>
    </div>

    <div class="relative h-6 flex items-center">
      <input
        type="range"
        :min="MIN_YEAR"
        :max="MAX_YEAR"
        :value="yearMin"
        class="year-slider range-slider"
        :style="{ '--fill-pct': ((yearMin - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100 + '%' }"
        :aria-label="t('observatory.yearSlider.minYear')"
        @input="$emit('update:yearMin', Number(($event.target as HTMLInputElement).value))"
      />
      <input
        type="range"
        :min="MIN_YEAR"
        :max="MAX_YEAR"
        :value="yearMax"
        class="year-slider range-slider"
        :style="{ '--fill-pct': ((yearMax - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100 + '%' }"
        :aria-label="t('observatory.yearSlider.maxYear')"
        @input="$emit('update:yearMax', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <div class="flex items-center justify-between text-[8px] text-zinc-600 font-mono">
      <span>{{ MIN_YEAR }}</span>
      <span>{{ MAX_YEAR }}</span>
    </div>

    <div class="flex items-center gap-1.5 mt-0.5">
      <button
        type="button"
        class="flex items-center gap-1 px-2 py-1 text-[9px] font-bold rounded border transition-all"
        :class="isPlaying
          ? 'bg-red-900/30 border-red-500/40 text-red-400'
          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'"
        :aria-label="isPlaying ? t('observatory.yearSlider.pause') : t('observatory.yearSlider.play')"
        @click="togglePlay"
      >
        <span>{{ isPlaying ? '⏹' : '▶' }}</span>
        {{ isPlaying ? t('observatory.yearSlider.pause') : t('observatory.yearSlider.play') }}
      </button>
      <button
        type="button"
        class="flex items-center gap-1 px-2 py-1 text-[9px] font-bold rounded border bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-all"
        :aria-label="t('observatory.yearSlider.reset')"
        @click="resetRange"
      >
        ↺ {{ t('observatory.yearSlider.reset') }}
      </button>
      <span class="ml-auto text-[8px] text-zinc-600 font-mono" aria-live="polite">
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
.year-slider {
  position: absolute;
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
}
.year-slider::-webkit-slider-runnable-track {
  height: 4px;
  background: linear-gradient(
    to right,
    #e74c3c var(--fill-pct, 100%),
    rgba(255, 255, 255, 0.06) var(--fill-pct, 100%)
  );
  border-radius: 2px;
}
.year-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e74c3c;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 6px rgba(231, 76, 60, 0.4);
  cursor: pointer;
  pointer-events: auto;
  margin-top: -4px;
  position: relative;
  z-index: 2;
}
.year-slider::-moz-range-track {
  height: 4px;
  background: transparent;
  border-radius: 2px;
}
.year-slider::-moz-range-progress {
  height: 4px;
  background: #e74c3c;
  border-radius: 2px;
}
.year-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e74c3c;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 6px rgba(231, 76, 60, 0.4);
  cursor: pointer;
  pointer-events: auto;
}
</style>
