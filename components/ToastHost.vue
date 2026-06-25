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

const { position } = withDefaults(defineProps<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}>(), {
  position: 'bottom-right',
})

const { toasts, dismiss } = useToast()

function runAction(id: string, onClick: () => void) {
  try { onClick() } catch (_e) { /* toast action error — silently ignore */ }
  void dismiss(id)
}
</script>

<style scoped>
.toast-host {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(15, 15, 18, 0.96);
  color: #f5f5f5;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  font-size: 12px;
  line-height: 1.4;
  pointer-events: auto;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.toast--success { border-left: 3px solid #27ae60; }
.toast--info { border-left: 3px solid #5dade2; }
.toast--warning { border-left: 3px solid #f39c12; }
.toast--error { border-left: 3px solid #e74c3c; }

.toast__icon {
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  padding-top: 1px;
  min-width: 18px;
  text-align: center;
}
.toast--success .toast__icon { color: #27ae60; }
.toast--info .toast__icon { color: #5dade2; }
.toast--warning .toast__icon { color: #f39c12; }
.toast--error .toast__icon { color: #e74c3c; }

.toast__body { flex: 1; min-width: 0; }
.toast__title { font-weight: 700; color: #fafafa; }
.toast__text { color: rgba(255, 255, 255, 0.7); margin-top: 2px; word-wrap: break-word; }

.toast__action {
  background: rgba(255, 255, 255, 0.08);
  color: #fafafa;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.toast__action:hover { background: rgba(255, 255, 255, 0.15); }

.toast__close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
  font-family: inherit;
}
.toast__close:hover { color: #fafafa; }

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
