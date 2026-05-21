<template>
  <div :class="wrapperClass">
    <iconify-icon :icon="icon" :class="iconClass" />
    <p v-if="message" :class="messageClass">{{ message }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  icon?: string
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  inline?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'svg-spinners:eclipse',
  size: 'md',
  inline: false,
})

const sizeClasses: Record<string, string> = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

const wrapperClass = computed(() => {
  return props.inline
    ? 'flex items-center gap-3'
    : 'flex flex-col items-center justify-center'
})

const iconClass = computed(() => {
  const spinningIcons = ['svg-spinners:eclipse', 'svg-spinners:wind-toy', 'svg-spinners:blocks-shuffle-2', 'svg-spinners:3-dots-move']
  return {
    'text-cyan-400': true,
    [sizeClasses[props.size]]: true,
    'animate-[spin_1.2s_linear_infinite]': spinningIcons.includes(props.icon),
  }
})

const messageClass = computed(() => {
  if (props.size === 'sm') return 'text-xs text-gray-400'
  if (props.size === 'md') return 'text-sm text-gray-400'
  if (props.size === 'lg') return 'text-base text-gray-300'
  return 'text-lg text-gray-300'
})
</script>
