<template>
  <iconify-icon
    :icon="name"
    :class="iconClasses"
    :style="iconStyles"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: string | number
  color?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: '1em',
  color: undefined,
  class: '',
})

const iconClasses = computed(() => props.class)

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}

  if (props.size) {
    styles['--icon-size'] = typeof props.size === 'number' ? `${props.size}px` : props.size
  }

  if (props.color) {
    styles['--icon-color'] = props.color
  }

  return styles
})
</script>

<style scoped>
iconify-icon {
  width: var(--icon-size, 1em);
  height: var(--icon-size, 1em);
  color: var(--icon-color, inherit);
  display: inline-block;
  vertical-align: middle;
}
</style>
