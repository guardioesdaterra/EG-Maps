<script setup lang="ts">
import { DialogContent, DialogDescription, DialogTitle, DialogPortal, DialogRoot, DialogTrigger, VisuallyHidden } from 'reka-ui'

interface Props {
  open?: boolean
  title?: string
  description?: string
  /** Use a side sheet on desktop, full sheet on mobile */
  side?: 'right' | 'bottom'
  /** Hide the explicit title visually (still announced to screen readers) */
  hideTitle?: boolean
  /** Custom max width in CSS units (desktop) */
  width?: string
  /** Allow closing via Esc / outside click */
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '',
  description: '',
  side: 'right',
  hideTitle: false,
  width: '32rem',
  dismissible: true,
})

const emit = defineEmits<{
  'update:open': [v: boolean]
  close: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v),
})

function handleEscapeKeyDown(e: KeyboardEvent) {
  if (!props.dismissible) {
    e.preventDefault()
    return
  }
  emit('close')
}

function handleInteractOutside(e: Event) {
  if (!props.dismissible) {
    e.preventDefault()
  }
}

function handlePointerDownOutside(e: Event) {
  if (!props.dismissible) {
    e.preventDefault()
  }
}
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogPortal>
      <Transition name="sheet-fade">
        <div
          v-if="isOpen"
          class="sheet-overlay"
          aria-hidden="true"
        />
      </Transition>
      <Transition :name="`sheet-${side}`">
        <DialogContent
          v-if="isOpen"
          :class="['sheet', `sheet--${side}`]"
          :style="side === 'right' ? { maxWidth: width } : undefined"
          @escape-key-down="handleEscapeKeyDown"
          @interact-outside="handleInteractOutside"
          @pointer-down-outside="handlePointerDownOutside"
        >
          <VisuallyHidden v-if="hideTitle && title">
            <DialogTitle>{{ title }}</DialogTitle>
          </VisuallyHidden>
          <template v-else>
            <DialogTitle v-if="title" class="sheet__title">{{ title }}</DialogTitle>
          </template>
          <VisuallyHidden v-if="description">
            <DialogDescription>{{ description }}</DialogDescription>
          </VisuallyHidden>

          <button
            type="button"
            class="sheet__close"
            aria-label="Close"
            @click="isOpen = false; emit('close')"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>

          <slot />
        </DialogContent>
      </Transition>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 9000;
}

.sheet {
  position: fixed;
  background: rgba(15, 15, 18, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fafafa;
  z-index: 9001;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
}
.sheet--right {
  top: 0;
  right: 0;
  height: 100vh;
  height: 100svh;
  width: 100%;
  max-width: 32rem;
  border-radius: 12px 0 0 12px;
  padding: 1.25rem;
  overflow-y: auto;
}
.sheet--bottom {
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-height: 90vh;
  border-radius: 16px 16px 0 0;
  padding: 1.25rem 1.25rem max(1.25rem, env(safe-area-inset-bottom)) 1.25rem;
  overflow-y: auto;
}
.sheet__title {
  font-size: 1.1rem;
  font-weight: 800;
  margin: 0 0 0.75rem 0;
}
.sheet__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  z-index: 1;
}
.sheet__close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fafafa;
}

/* Animations */
.sheet-fade-enter-active,
.sheet-fade-leave-active { transition: opacity 0.2s ease; }
.sheet-fade-enter-from,
.sheet-fade-leave-to { opacity: 0; }

.sheet-right-enter-active,
.sheet-right-leave-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.sheet-right-enter-from,
.sheet-right-leave-to { transform: translateX(100%); }

.sheet-bottom-enter-active,
.sheet-bottom-leave-active { transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.sheet-bottom-enter-from,
.sheet-bottom-leave-to { transform: translateY(100%); }

@media (prefers-reduced-motion: reduce) {
  .sheet-fade-enter-active,
  .sheet-fade-leave-active,
  .sheet-right-enter-active,
  .sheet-right-leave-active,
  .sheet-bottom-enter-active,
  .sheet-bottom-leave-active { transition: none; }
}

@media (max-width: 768px) {
  .sheet--right {
    top: auto;
    bottom: 0;
    right: 0;
    height: auto;
    max-height: 90vh;
    max-width: none;
    border-radius: 16px 16px 0 0;
  }
  .sheet-right-enter-from,
  .sheet-right-leave-to { transform: translateY(100%); }
}
</style>
