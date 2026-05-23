<template>
  <img
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :class="cn('absolute inset-0 w-full h-full object-cover', props.class)"
    :style="style"
    loading="lazy"
    decoding="async"
  />
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  src: string
  alt: string
  width: number
  height: number
  class?: string
  style?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  class: '',
  style: () => ({}),
})
</script>
