/**
 * components/ToastHost.vue
 * @why Fixed-position container that renders active toast notifications
 * @component ToastHost
 * @props position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
 */
<template>
  <Teleport to="body">
    <div
      class="toast-host"
      :class="['toast-host--' + position]"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast--${toast.kind}`]"
          role="status"
          :aria-live="toast.kind === 'error' ? 'assertive' : 'polite'"
        >
          <div class="toast__icon" aria-hidden="true">
            <span v-if="toast.kind === 'success'">✓</span>
            <span v-else-if="toast.kind === 'warning'">⚠</span>
            <span v-else-if="toast.kind === 'error'">✕</span>
            <span v-else>ℹ</span>
          </div>
          <div class="toast__body">
            <div class="toast__title">{{ toast.title }}</div>
            <div v-if="toast.body" class="toast__text">{{ toast.body }}</div>
          </div>
          <button
            v-if="toast.action"
            type="button"
            class="toast__action"
            @click="runAction(toast.id, toast.action!.onClick)"
          >
            {{ toast.action.label }}
          </button>
          <button
            type="button"
            class="toast__close"
            :aria-label="t('general.close')"
            @click="dismiss(toast.id)"
          >
            ×
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">

const { t } = useI18n()

withDefaults(defineProps<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}>(), {
  position: 'bottom-right',
})

const { toasts, dismiss } = useToast()

function runAction(id: string, onClick: () => void) {
  try { onClick() } catch { /* toast action error — silently ignore */ }
  void dismiss(id)
}

</script>

<style scoped>
.toast-host {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.2vw, 12px);
  pointer-events: none;
  max-width: min(92vw, 360px);
}
.toast-host--top-right { top: 16px; right: 16px; }
.toast-host--top-left { top: 16px; left: 16px; }
.toast-host--bottom-right { bottom: 16px; right: 16px; }
.toast-host--bottom-left { bottom: 16px; left: 16px; }

.toast {
  display: flex;
  align-items: flex-start;
  gap: clamp(6px, 1.2vw, 12px);
  padding: clamp(6px, 1.2vw, 12px);
  border-radius: 10px;
  background: var(--glass-bg);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  box-shadow: 0 6px 24px var(--shadow-color), 0 0 0 1px var(--glass-border-light) inset;
  font-size: clamp(12px, 1.8vw, 15px);
  line-height: 1.4;
  pointer-events: auto;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.toast--success { border-left: 3px solid var(--success); }
.toast--info { border-left: 3px solid var(--info); }
.toast--warning { border-left: 3px solid var(--warning); }
.toast--error { border-left: 3px solid var(--danger); }

.toast__icon {
  font-size: clamp(14px, 2vw, 18px);
  font-weight: 800;
  line-height: 1;
  padding-top: 1px;
  min-width: 18px;
  text-align: center;
}
.toast--success .toast__icon { color: var(--success); }
.toast--info .toast__icon { color: var(--info); }
.toast--warning .toast__icon { color: var(--warning); }
.toast--error .toast__icon { color: var(--danger); }

.toast__body { flex: 1; min-width: 0; }
.toast__title { font-weight: 700; color: var(--text-primary); }
.toast__text { color: var(--text-secondary); margin-top: 2px; word-wrap: break-word; }

.toast__action {
  background: var(--glass-border);
  color: var(--text-primary);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  padding: clamp(2px, 0.5vw, 6px) clamp(6px, 1.2vw, 12px);
  font-size: clamp(11px, 1.6vw, 14px);
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.toast__action:hover { background: var(--panel-border); }

.toast__close {
  background: transparent;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  font-size: clamp(16px, 2.5vw, 22px);
  line-height: 1;
  padding: 0 4px;
  font-family: inherit;
}
.toast__close:hover { color: var(--text-primary); }

.toast-enter-active,
.toast-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.toast-enter-from { opacity: 0; transform: translateY(8px); }
.toast-leave-to { opacity: 0; transform: translateX(8px); }

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: none; }
}
</style>
