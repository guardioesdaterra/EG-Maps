<template>
  <div class="relative inline-block">
    <slot name="trigger" />
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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

  // Keep tooltip within viewport
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
  // Look for the trigger element in the named slot
  const parent = tooltipRef.value?.closest('.relative')
  if (parent) {
    // Prefer elements with data-tooltip-trigger attribute for reliability
    const explicitTrigger = parent.querySelector('[data-tooltip-trigger]')
    if (explicitTrigger) {
      triggerEl.value = explicitTrigger as HTMLElement
      return
    }
    // Fallback to first button, link, or role=button element
    const btn = parent.querySelector('button, [role="button"], a')
    if (btn) triggerEl.value = btn as HTMLElement
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

defineExpose({ show, hide })
</script>
