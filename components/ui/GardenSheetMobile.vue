<!--
  components/ui/GardenSheetMobile.vue
  @why Mobile-first bottom sheet with smooth animations and drag-to-close.
  @component GardenSheetMobile
  @props open, side, title, width
  @emits 'update:open', close
-->
<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="isOpen" class="sheet-overlay" @click="handleOverlayClick" aria-hidden="true" />
    </Transition>

    <Transition :name="`sheet-${side}`">
      <div
        v-if="isOpen"
        ref="sheetRef"
        class="sheet"
        :class="[`sheet--${side}`, { 'sheet--dragging': isDragging }]"
        :style="sheetStyle"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
        @mousedown="onMouseDown"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Drag Handle -->
        <div class="drag-handle" @click.stop="handleDragHandleClick">
          <div class="drag-bar" />
        </div>

        <!-- Header -->
        <header class="sheet-header">
          <h2 class="sheet-title">{{ title }}</h2>
          <button
            class="sheet-close"
            @click="close"
            :aria-label="t('general.close')"
          >
            <Icon name="tabler:x" class="w-5 h-5" />
          </button>
        </header>

        <!-- Content -->
        <div class="sheet-content" ref="contentRef">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import Icon from '@/components/Icon.vue'

const props = withDefaults(defineProps<{
  open?: boolean
  side?: 'right' | 'bottom'
  title?: string
  width?: string
  dismissible?: boolean
}>(), {
  open: false,
  side: 'bottom',
  title: '',
  width: '100%',
  dismissible: true,
})

const emit = defineEmits<{
  'update:open': [v: boolean]
  close: []
}>()

const { t } = useI18n()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v),
})

const sheetRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
let dragStartY = 0
let dragStartX = 0
const sheetStartTransform = 0
const dragThreshold = 100
const velocityThreshold = 0.5
let lastTouchTime = 0
let lastTouchY = 0
let lastTouchX = 0

const sheetStyle = computed(() => {
  if (props.side === 'bottom') {
    return {
      height: 'auto',
      maxHeight: '85vh',
      maxWidth: 'none',
      borderRadius: '20px 20px 0 0',
      transform: `translateY(${isDragging.value ? dragTransform.value : 0}px)`,
    }
  }
  return {
    width: props.width,
    maxWidth: props.width,
    transform: `translateX(${isDragging.value ? dragTransform.value : 0}px)`,
  }
})

const dragTransform = computed(() => {
  if (props.side === 'bottom') {
    return Math.max(0, dragOffset.value)
  }
  return Math.min(0, dragOffset.value)
})

const dragOffset = ref(0)

function handleOverlayClick() {
  if (props.dismissible) close()
}

function close() {
  isOpen.value = false
  emit('close')
}

function handleDragHandleClick() {
  if (props.dismissible) close()
}

function onTouchStart(e: TouchEvent) {
  if (!props.dismissible) return
  const touch = e.touches[0]
  dragStartY = touch.clientY
  dragStartX = touch.clientX
  dragOffset.value = 0
  isDragging.value = true
  lastTouchTime = Date.now()
  lastTouchY = touch.clientY
  lastTouchX = touch.clientX
  document.body.style.overflow = 'hidden'
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || !props.dismissible) return
  const touch = e.touches[0]
  const delta = props.side === 'bottom'
    ? touch.clientY - dragStartY
    : touch.clientX - dragStartX

  // Only allow dragging in dismiss direction
  if (props.side === 'bottom' && delta > 0) {
    dragOffset.value = delta * 0.6 // Resistance
  } else if (props.side === 'right' && delta < 0) {
    dragOffset.value = delta * 0.6
  }

  // Update velocity tracking
  const now = Date.now()
  const dt = now - lastTouchTime
  if (dt > 0) {
    // velocity tracked via delta/dt
  }
  lastTouchTime = now
  lastTouchY = touch.clientY
  lastTouchX = touch.clientX
}

function onTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  document.body.style.overflow = ''

  const shouldClose = Math.abs(dragOffset.value) > dragThreshold

  if (shouldClose) {
    close()
  } else {
    dragOffset.value = 0
  }
}

function onMouseDown(e: MouseEvent) {
  // For desktop testing
  if (!props.dismissible) return
  dragStartY = e.clientY
  dragStartX = e.clientX
  dragOffset.value = 0
  isDragging.value = true

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return
    const delta = props.side === 'bottom'
      ? moveEvent.clientY - dragStartY
      : moveEvent.clientX - dragStartX
    if (props.side === 'bottom' && delta > 0) dragOffset.value = delta * 0.6
    else if (props.side === 'right' && delta < 0) dragOffset.value = delta * 0.6
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    if (!isDragging.value) return
    isDragging.value = false
    const shouldClose = Math.abs(dragOffset.value) > dragThreshold
    if (shouldClose) close()
    else dragOffset.value = 0
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

watch(isOpen, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  if (isOpen.value) document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ── CSS Variables ───────────────────────────────────────────────────────── */
:root {
  --sheet-h: 85vh;
  --sheet-w: 100%;
}

/* ── Overlay ─────────────────────────────────────────────────────────────── */
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.2s var(--ease-out);
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

/* ── Bottom Sheet ────────────────────────────────────────────────────────── */
.sheet-bottom-enter-active,
.sheet-bottom-leave-active {
  transition: transform 0.35s var(--ease-spring), opacity 0.2s var(--ease-out);
}
.sheet-bottom-enter-from,
.sheet-bottom-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.sheet {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1);
  will-change: transform;
}

.sheet--bottom {
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-height: 85vh;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}

.sheet--right {
  top: 0;
  right: 0;
  height: 100vh;
  height: 100dvh;
  width: 100%;
  max-width: 32rem;
  border-radius: 12px 0 0 12px;
  overflow-y: auto;
}

.sheet--dragging {
  transition: none !important;
}

/* ── Drag Handle ──────────────────────────────────────────────────────────── */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0.5rem;
  cursor: grab;
  -webkit-app-region: drag;
}
.drag-handle:active { cursor: grabbing; }

.drag-bar {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
  transition: background 0.2s var(--ease-out);
}
.drag-handle:hover .drag-bar { background: var(--ring); }

/* ── Header ───────────────────────────────────────────────────────────────── */
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.sheet-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.sheet-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), transform 0.1s var(--ease-out);
}
.sheet-close:hover { background: var(--bg-secondary); color: var(--text-primary); transform: scale(1.05); }
.sheet-close:active { transform: scale(0.95); }

/* ── Content ──────────────────────────────────────────────────────────────── */
.sheet-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* ── Safe Area ────────────────────────────────────────────────────────────── */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .sheet--bottom .sheet-content {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
}

/* ── Reduced Motion ───────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .sheet-fade-enter-active,
  .sheet-fade-leave-active,
  .sheet-bottom-enter-active,
  .sheet-bottom-leave-active,
  .sheet-right-enter-active,
  .sheet-right-leave-active {
    transition: none !important;
  }
}
</style>