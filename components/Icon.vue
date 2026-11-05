/**
 * components/Icon.vue
 * @why Offline SVG icon wrapper — renders Tabler / GIS icons from the local
 *   registry (lib/icons.ts). Zero network: no Iconify, no CDN, no icon mapper.
 * @component Icon
 * @deps vue (computed), ~/lib/icons
 */
<template>
  <span
    ref="iconRef"
    :class="['icon', iconClasses]"
    aria-hidden="true"
    v-html="resolvedSvg"
  />
</template>

<script setup lang="ts">

import { computed } from 'vue'
import { resolveIconSvg } from '~/lib/icons'

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

const wrapperStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.size) {
    styles.fontSize = typeof props.size === 'number' ? `${props.size}px` : props.size
  }
  if (props.color) {
    styles.color = props.color
  }
  return styles
})

const resolvedSvg = computed(() => {
  const svg = resolveIconSvg(props.name)
  if (!svg) return ''
  const size = typeof props.size === 'number' ? `${props.size}px` : (props.size || '1em')
  const color = props.color ? `color:${props.color};` : ''
  // inject width/height/color into the <svg> opening tag so size/color props apply
  return svg.replace(/<svg([^>]*)>/, (_match, attrs) => {
    const clean = attrs.replace(/\b(width|height)="[^"]*"/g, '').trim()
    return `<svg style="width:${size};height:${size};${color}"${clean ? ' ' + clean : ''}>`
  })
})

</script>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}
.icon svg {
  display: block;
}
</style>
