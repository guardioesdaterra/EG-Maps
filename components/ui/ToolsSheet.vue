<template>
    <Transition name="tools-sheet">
      <div v-if="isOpen" class="tools-sheet-wrapper">
        <div class="tools-sheet-overlay" :aria-hidden="true" @click="handleOverlayClick" />
        <Transition :name="`tools-sheet-${side}`">
          <div
            v-if="isOpen"
            ref="panelRef"
            :class="['tools-sheet', `tools-sheet--${side}`]"
            :style="{ width: props.width, height: props.height }"
            @click.stop
            role="dialog"
            aria-modal="true"
            :aria-label="title || undefined"
          >
            <header class="tools-sheet__header">
              <button
                v-if="showBack"
                type="button"
                class="tools-sheet__back"
                :aria-label="t('general.back')"
                @click="emit('back')"
              >
                <Icon name="tabler:arrow-left" class="h-5 w-5" />
              </button>
              <h2 class="tools-sheet__title">{{ title }}</h2>
              <button
                type="button"
                class="tools-sheet__close"
                :aria-label="t('general.close')"
                @click="close"
              >
                <Icon name="tabler:x" class="h-5 w-5" />
              </button>
            </header>
            <div class="tools-sheet__content" :class="{ 'tools-sheet__content--flush': !contentPadded }">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, onScopeDispose } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useFocusTrap } from '@/composables/useFocusTrap'
import Icon from '@/components/Icon.vue'

interface Props {
  open?: boolean
  title?: string
  side?: 'right' | 'left' | 'center'
  dismissible?: boolean
  /** Renders the header back arrow (a tool is open on top of the hub). */
  showBack?: boolean
  /** false = the slotted tool owns the full viewport (map editors). */
  contentPadded?: boolean
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '',
  side: 'center',
  dismissible: true,
  showBack: false,
  contentPadded: true,
  width: '50vw',
  height: '85vh',
})

const emit = defineEmits<{
  'update:open': [v: boolean]
  close: []
  back: []
}>()

const { t } = useI18n()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v),
})

const panelRef = ref<HTMLElement | null>(null)
useFocusTrap(panelRef, { active: isOpen })

function close() {
  if (!props.dismissible) return
  isOpen.value = false
  emit('close')
}

function handleOverlayClick() {
  if (!props.dismissible) return
  // Inside a tool, the overlay first returns to the hub — closing straight
  // from a map editor would discard the editing context on a stray click.
  if (props.showBack) emit('back')
  else close()
}

function handleEscapeKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !props.dismissible) return
  if (props.showBack) emit('back')
  else close()
}

watch(isOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) window.addEventListener('keydown', handleEscapeKeyDown)
  else window.removeEventListener('keydown', handleEscapeKeyDown)
}, { immediate: true })

onScopeDispose(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', handleEscapeKeyDown)
})
</script>

<style scoped>
.tools-sheet-overlay {
  position: fixed;
  inset: 0;
  background: var(--shadow-color);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9000;
  opacity: 0;
  animation: tools-sheet-fade-in 0.2s ease forwards;
}

.tools-sheet {
  position: fixed;
  background: var(--panel-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  z-index: 9001;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px var(--shadow-color), 0 0 0 1px var(--glass-border-light) inset;
  overflow: hidden;
}

.tools-sheet--center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 400px;
  border-radius: 16px;
  padding: 0;
}

.tools-sheet--right {
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

.tools-sheet--left {
  top: 0;
  left: 0;
  height: 100vh;
  height: 100svh;
  width: 100%;
  max-width: 32rem;
  border-radius: 0 12px 12px 0;
  padding: 1.25rem;
  overflow-y: auto;
}

.tools-sheet__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.tools-sheet__title {
  font-size: 1.1rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tools-sheet__back,
.tools-sheet__close {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 8px;
  background: var(--glass-border-light);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.tools-sheet__back:hover,
.tools-sheet__close:hover {
  background: var(--panel-border);
  color: var(--text-primary);
}

.tools-sheet__content {
  flex: 1;
  overflow: auto;
  padding: 1.25rem;
}

/* Full-viewport tools (map editors) manage their own chrome. */
.tools-sheet__content--flush {
  padding: 0;
  overflow: hidden;
}

.tools-sheet-enter-active,
.tools-sheet-leave-active {
  transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.tools-sheet-enter-from,
.tools-sheet-leave-to {
  opacity: 0;
}

.tools-sheet-center-enter-from,
.tools-sheet-center-leave-to {
  transform: translate(-50%, -50%) scale(0.95);
}

.tools-sheet-right-enter-from,
.tools-sheet-right-leave-to {
  transform: translateX(100%);
}

.tools-sheet-left-enter-from,
.tools-sheet-left-leave-to {
  transform: translateX(-100%);
}

.tools-sheet-fade-in {
  animation: tools-sheet-fade-in 0.2s ease forwards;
}

@keyframes tools-sheet-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 768px) {
  .tools-sheet--center {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    min-width: 0;
    border-radius: 16px 16px 0 0;
  }
  
  .tools-sheet-center-enter-from,
  .tools-sheet-center-leave-to {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tools-sheet-enter-active,
  .tools-sheet-leave-active,
  .tools-sheet-overlay {
    transition: none;
    animation: none;
  }
  .tools-sheet-overlay {
    opacity: 1;
  }
}
</style>