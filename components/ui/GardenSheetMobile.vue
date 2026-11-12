<!--
  components/ui/GardenSheetMobile.vue
  @why Flat, theme-aware bottom sheet with drag-to-close;
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
const dragOffset = ref(0)
const dragThreshold = 100

const sheetStyle = computed(() => {
  if (props.side === 'bottom') {
    return {
      height: 'auto',
      maxHeight: '85vh',
      maxWidth: 'none',
      borderRadius: '18px 18px 0 0',
      transform: `translateY(${isDragging.value ? dragOffset.value : 0}px)`,
    }
  }
  return {
    width: props.width,
    maxWidth: props.width,
    transform: `translateX(${isDragging.value ? dragOffset.value : 0}px)`,
  }
})

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
  document.body.style.overflow = 'hidden'
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || !props.dismissible) return
  const touch = e.touches[0]
  const delta = props.side === 'bottom'
    ? touch.clientY - dragStartY
    : touch.clientX - dragStartX

  if (props.side === 'bottom' && delta > 0) {
    dragOffset.value = delta * 0.6
  } else if (props.side === 'right' && delta < 0) {
    dragOffset.value = delta * 0.6
  }
}

function onTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  document.body.style.overflow = ''

  const shouldClose = Math.abs(dragOffset.value) > 100

  if (shouldClose) {
    close()
  } else {
    dragOffset.value = 0
  }
}

function onMouseDown(e: MouseEvent) {
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
    const shouldClose = Math.abs(dragOffset.value) > 100
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
/* ── CSS Variables (Theme-Aware) ─────────────────────────────────────────── */
:root {
  /* Light theme (default) */
  --garden-space-xs: 4px;
  --garden-space-sm: 8px;
  --garden-space-md: 12px;
  --garden-space-lg: 16px;
  --garden-space-xl: 24px;

  --garden-radius-sm: 6px;
  --garden-radius-md: 10px;
  --garden-radius-lg: 14px;
  --garden-radius-xl: 18px;
  --garden-radius-full: 999px;

  --garden-transition-fast: 120ms ease-out;
  --garden-transition-base: 180ms ease-out;
  --garden-transition-slow: 250ms ease-out;
  --garden-transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

  --garden-color-neutral-50: #f8fafc;
  --garden-color-neutral-100: #f1f5f9;
  --garden-color-neutral-200: #e2e8f0;
  --garden-color-neutral-300: #cbd5e1;
  --garden-color-neutral-400: #94a3b8;
  --garden-color-neutral-500: #64748b;
  --garden-color-neutral-600: #475569;
  --garden-color-neutral-700: #334155;
  --garden-color-neutral-800: #1e293b;
  --garden-color-neutral-900: #0f172a;
  --garden-color-neutral-950: #020617;

  --garden-color-brand-50: #f0f9ff;
  --garden-color-brand-100: #e0f2fe;
  --garden-color-brand-200: #bae6fd;
  --garden-color-brand-300: #7dd3fc;
  --garden-color-brand-400: #38bdf8;
  --garden-color-brand-500: #0ea5e9;
  --garden-color-brand-600: #0284c7;
  --garden-color-brand-700: #0369a1;
  --garden-color-brand-800: #075985;
  --garden-color-brand-900: #0c4a6e;

  --garden-color-bg-primary: #f8fafc;
  --garden-color-bg-secondary: #f1f5f9;
  --garden-color-bg-tertiary: #e2e8f0;
  --garden-color-bg-inverse: #0f172a;

  --garden-color-surface-primary: #ffffff;
  --garden-color-surface-secondary: #f1f5f9;
  --garden-color-surface-tertiary: #e2e8f0;
  --garden-color-surface-hover: #f1f5f9;
  --garden-color-surface-active: #e2e8f0;

  --garden-color-border-primary: #cbd5e1;
  --garden-color-border-secondary: #e2e8f0;
  --garden-color-border-focus: #0ea5e9;
  --garden-color-border-error: #ef4444;

  --garden-color-text-primary: #020617;
  --garden-color-text-secondary: #64748b;
  --garden-color-text-muted: #64748b;
  --garden-color-text-inverse: #f8fafc;
  --garden-color-text-link: #38bdf8;

  --garden-color-brand-primary: #0ea5e9;
  --garden-color-brand-hover: #0284c7;
  --garden-color-brand-light: #f0f9ff;
  --garden-color-brand-dark: #0369a1;
}

/* Dark theme overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --garden-color-bg-primary: #020617;
    --garden-color-bg-secondary: #0f172a;
    --garden-color-bg-tertiary: #1e293b;
    --garden-color-bg-inverse: #f8fafc;

    --garden-color-surface-primary: #0f172a;
    --garden-color-surface-secondary: #1e293b;
    --garden-color-surface-tertiary: #334155;
    --garden-color-surface-hover: #1e293b;
    --garden-color-surface-active: #334155;

    --garden-color-border-primary: #334155;
    --garden-color-border-secondary: #1e293b;
    --garden-color-border-focus: #38bdf8;
    --garden-color-border-error: #f87171;

    --garden-color-text-primary: #f8fafc;
    --garden-color-text-secondary: #94a3b8;
    --garden-color-text-muted: #64748b;
    --garden-color-text-inverse: #020617;
    --garden-color-text-link: #7dd3fc;

    --garden-color-brand-primary: #38bdf8;
    --garden-color-brand-hover: #0ea5e9;
    --garden-color-brand-light: #0c4a6e;
    --garden-color-brand-dark: #0369a1;
  }
}

/* ── Overlay ─────────────────────────────────────────────────────────────── */
.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity var(--garden-transition-fast) ease-out;
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

/* ── Bottom Sheet ────────────────────────────────────────────────────────── */
.sheet-bottom-enter-active,
.sheet-bottom-leave-active {
  transition: transform var(--garden-transition-slow) var(--garden-transition-spring), opacity var(--garden-transition-fast) ease-out;
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
  background: var(--garden-color-surface-primary);
  border: 1px solid var(--garden-color-border-primary);
  color: var(--garden-color-text-primary);
  box-shadow: 0 -8px 24px rgba(0,0,0,0.08), 0 0 0 1px var(--garden-color-border-primary);
  will-change: transform;
}

.sheet--bottom {
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-height: 85vh;
  border-radius: var(--garden-radius-xl) var(--garden-radius-xl) 0 0;
  overflow: hidden;
}

.sheet--right {
  top: 0;
  right: 0;
  height: 100vh;
  height: 100dvh;
  width: 100%;
  max-width: 32rem;
  border-radius: var(--garden-radius-lg) 0 0 var(--garden-radius-lg);
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
  padding: var(--garden-space-sm);
  cursor: grab;
  -webkit-app-region: drag;
}
.drag-handle:active { cursor: grabbing; }

.drag-bar {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--garden-color-border-secondary);
  transition: background var(--garden-transition-base) ease-out;
}
.drag-handle:hover .drag-bar { background: var(--garden-color-brand-primary); }

/* ── Header ───────────────────────────────────────────────────────────────── */
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--garden-space-lg) var(--garden-space-xl);
  border-bottom: 1px solid var(--garden-color-border-primary);
  flex-shrink: 0;
}

.sheet-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--garden-color-text-primary);
}

.sheet-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--garden-radius-md);
  background: transparent;
  color: var(--garden-color-text-secondary);
  cursor: pointer;
  transition: background var(--garden-transition-fast) ease-out, color var(--garden-transition-fast) ease-out, transform var(--garden-transition-fast) ease-out;
}
.sheet-close:hover { background: var(--garden-color-surface-hover); color: var(--garden-color-text-primary); transform: scale(1.05); }
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
    padding-bottom: max(var(--garden-space-lg), env(safe-area-inset-bottom));
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