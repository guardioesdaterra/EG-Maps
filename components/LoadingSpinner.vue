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
  icon: string
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  inline?: boolean
}

const props = withDefaults(defineProps<Props>(), {
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
  const base = props.inline
    ? 'flex items-center gap-3'
    : 'flex flex-col items-center justify-center'
  return base
})

const iconClass = computed(() => {
  return {
    'text-cyan-400': true,
    [sizeClasses[props.size]]: true,
    'animate-[spin_1.2s_linear_infinite]': props.icon === 'svg-spinners:eclipse',
  }
})

const messageClass = computed(() => {
  if (props.size === 'sm') return 'text-xs'
  if (props.size === 'md') return 'text-sm'
  if (props.size === 'lg') return 'text-base'
  return 'text-lg'
})
</script>
