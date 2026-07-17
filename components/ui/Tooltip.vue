/**
 * components/ui/Tooltip.vue
 * @why Tooltip popover that appears on hover/focus with configurable position and delay
 * @component Tooltip
 * @emits 'update:modelValue': [value: boolean]
 * @deps vue (ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick); @/lib/utils (cn)
 */
<template>
  <div class="relative inline-block">
    <div ref="triggerWrapperRef" @focusin="onTriggerFocus" @focusout="onTriggerBlur">
      <slot name="trigger" />
    </div>
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="visible"
          ref="tooltipRef"
          role="tooltip"
          :id="tooltipId"
          :class="tooltipClasses"
          :style="tooltipStyle"
        >
          <slot />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  side?: 'top' | 'right' | 'bottom' | 'left'
  class?: string
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  side: 'top',
  modelValue: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = ref(props.modelValue)
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipStyle = ref({})
const triggerEl = ref<HTMLElement | null>(null)
const triggerWrapperRef = ref<HTMLElement | null>(null)
const tooltipId = `tooltip-${Math.random().toString(36).slice(2, 9)}`

const tooltipClasses = computed(() => {
  return cn(
    'z-[9999] overflow-hidden rounded-md bg-black/90 border border-white/20 px-3 py-1.5 text-xs text-white shadow-md',
    props.class
  )
})

function show() {
  visible.value = true
  emit('update:modelValue', true)
  nextTick(() => {
    updatePosition()
  })
}

function hide() {
  visible.value = false
  emit('update:modelValue', false)
}

function onTriggerFocus() {
  show()
}

function onTriggerBlur() {
  hide()
}

function updatePosition() {
  if (!tooltipRef.value || !triggerEl.value) return

  const tooltipRect = tooltipRef.value.getBoundingClientRect()
  const triggerRect = triggerEl.value.getBoundingClientRect()
  const gap = 8

  let top = 0
  let left = 0

  switch (props.side) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - gap
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
      break
    case 'bottom':
      top = triggerRect.bottom + gap
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
      break
    case 'left':
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
      left = triggerRect.left - tooltipRect.width - gap
      break
    case 'right':
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
      left = triggerRect.right + gap
      break
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  left = Math.max(4, Math.min(left, viewportWidth - tooltipRect.width - 4))
  top = Math.max(4, Math.min(top, viewportHeight - tooltipRect.height - 4))

  tooltipStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
  }
}

function findTriggerEl() {
  if (!triggerWrapperRef.value) return
  const el = triggerWrapperRef.value.querySelector('button, [role="button"], a, input, [tabindex]') as HTMLElement | null
  if (el) {
    triggerEl.value = el
    el.setAttribute('aria-describedby', tooltipId)
  }
}

watch(() => props.modelValue, (val) => { visible.value = val })

watch(() => visible.value, () => {
  if (visible.value) {
    nextTick(() => {
      findTriggerEl()
      updatePosition()
    })
  }
})

onMounted(() => {
  findTriggerEl()
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition)
})

onDeactivated(() => {
  hide()
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition)
})

onActivated(() => {
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition)
})

defineExpose({ show, hide })

</script>
