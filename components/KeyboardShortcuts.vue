<template>
  <Teleport to="body">
    <Transition name="kbd-fade">
      <div
        v-if="open"
        class="kbd-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('shortcuts.title')"
        @click.self="close"
        @keydown.esc="close"
      >
        <div class="kbd-panel">
          <header class="kbd-panel__head">
            <h2 class="kbd-panel__title">{{ t('shortcuts.title') }}</h2>
            <button type="button" class="kbd-panel__close" :aria-label="t('general.close')" @click="close">
              <Icon name="lucide:x" class="h-4 w-4" />
            </button>
          </header>
          <ul class="kbd-list">
            <li v-for="s in shortcuts" :key="s.id" class="kbd-item">
              <div class="kbd-item__keys">
                <kbd v-for="(k, i) in s.keys" :key="i" class="kbd-key">{{ k }}</kbd>
              </div>
              <div class="kbd-item__label">{{ t(s.labelKey) }}</div>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const { t } = useI18n()
const open = ref(false)

const isMac = computed(() =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform),
)

const mod = computed(() => isMac.value ? '⌘' : 'Ctrl')

const shortcuts = computed(() => [
  { id: 'palette', keys: [mod.value, 'K'], labelKey: 'shortcuts.openPalette' },
  { id: 'theme', keys: [mod.value, 'Shift', 'D'], labelKey: 'shortcuts.toggleTheme' },
  { id: 'fullscreen', keys: ['F'], labelKey: 'shortcuts.toggleFullscreen' },
  { id: 'shortcuts', keys: ['?'], labelKey: 'shortcuts.showShortcuts' },
  { id: 'escape', keys: ['Esc'], labelKey: 'shortcuts.closeOverlay' },
])

function open_() { open.value = true }
function close() { open.value = false }

function onGlobalKeydown(e: KeyboardEvent) {
  // Don't trigger when typing in inputs
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    if (e.key === 'Escape') open.value = false
    return
  }
  if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    e.preventDefault()
    open_()
  } else if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    close()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onGlobalKeydown)
  }
})
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onGlobalKeydown)
  }
})
</script>

<style scoped>
.kbd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.kbd-panel {
  width: 100%;
  max-width: 400px;
  background: rgba(15, 15, 18, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}
.kbd-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.kbd-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #fafafa;
}
.kbd-panel__close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 22px;
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
}
.kbd-panel__close:hover { color: #fafafa; }
.kbd-list {
  list-style: none;
  margin: 0;
  padding: 8px;
}
.kbd-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 6px;
}
.kbd-item:hover { background: rgba(255, 255, 255, 0.04); }
.kbd-item__keys {
  display: flex;
  gap: 4px;
}
.kbd-key {
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.08);
  color: #fafafa;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 3px 7px;
  min-width: 22px;
  text-align: center;
  font-family: 'SF Mono', Menlo, monospace;
}
.kbd-item__label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
  text-align: right;
}
.kbd-fade-enter-active, .kbd-fade-leave-active { transition: opacity 150ms; }
.kbd-fade-enter-from, .kbd-fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .kbd-fade-enter-active, .kbd-fade-leave-active { transition: none; }
}
</style>
