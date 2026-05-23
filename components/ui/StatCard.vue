<template>
  <div
    class="flex min-w-0 flex-col items-center rounded-md border p-2 transition-all duration-200 group"
    :style="`background:var(--stat-card-bg);border-color:var(--stat-card-border)`"
  >
    <div
      class="mb-1.5 flex items-center justify-center rounded-md shadow-[0_0_10px_rgba(var(--glow-rgb),0.25)] transition-all duration-200 group-hover:shadow-[0_0_14px_rgba(var(--glow-rgb),0.35)]"
      :style="`--glow-rgb:${glowRgbString};background:var(--stat-card-bg);border-color:var(--stat-card-border)`"
      :class="`border ${iconContainerSize}`"
    >
      <span
        class="group-hover:scale-110 transition-transform duration-200"
        :class="[accentColor, iconSizeClass]"
        :style="`filter:drop-shadow(0 0 3px rgba(var(--glow-rgb),0.45))`"
      >
        <Icon :name="icon" />
      </span>
    </div>
    <span
      :class="[valueTextSize, 'font-bold', accentColor]"
      class="tabular-nums"
    >
      {{ displayValue }}
    </span>
    <span
      :class="[labelTextSize, 'max-w-full leading-tight uppercase text-center transition-colors duration-200']"
      style="color: var(--stat-card-label);"
    >
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  icon: string
  value: number
  displayValue: string
  label: string
  accentColor: string
  glowColorRGB: number[]
  isMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMobile: false,
})

const iconContainerSize = computed(() => props.isMobile ? 'w-10 h-10' : 'w-9 h-9')
const iconSizeClass = computed(() => props.isMobile ? 'h-5 w-5' : 'h-4 w-4')
const valueTextSize = computed(() => props.isMobile ? 'text-lg' : 'text-xl')
const labelTextSize = computed(() => props.isMobile ? 'text-xs' : 'text-[11px]')
const glowRgbString = computed(() => props.glowColorRGB.join(','))
</script>
