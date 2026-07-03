<template>
  <canvas
    ref="canvasRef"
    class="fixed inset-0 pointer-events-none"
    :style="{ zIndex: 'var(--z-canvas)' }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { GlobeProject } from '~/composables/useThreeGlobe'

interface Props {
  projects?: GlobeProject[]
}

const props = withDefaults(defineProps<Props>(), {
  projects: () => [],
})

const emit = defineEmits<{
  ready: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let globeApi: { init: () => Promise<void>; ready: Promise<void> } | null = null

onMounted(async () => {
  if (!canvasRef.value) return
  const { useThreeGlobe } = await import('~/composables/useThreeGlobe')
  globeApi = useThreeGlobe(canvasRef, props.projects)
  await globeApi.init()
  emit('ready')
})

onBeforeUnmount(() => {
  globeApi = null
})
</script>
