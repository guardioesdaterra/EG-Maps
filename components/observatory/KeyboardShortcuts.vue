/**
 * components/observatory/KeyboardShortcuts.vue
 * @component KeyboardShortcuts
 * @props visible: boolean
 * @emits 'close': []
 */
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm kbd-backdrop" @click.self="$emit('close')">
        <div class="obs-shortcuts-panel" role="dialog" aria-label="Keyboard shortcuts">
          <div class="obs-shortcuts-panel__header">
            <h2 class="obs-shortcuts-panel__title">⌨️ Keyboard Shortcuts</h2>
            <button type="button" class="obs-shortcuts-panel__close" aria-label="Close" @click="$emit('close')">×</button>
          </div>
          <div class="obs-shortcuts-panel__body">
            <div v-for="group in shortcutGroups" :key="group.label" class="obs-shortcuts-panel__group">
              <h3 class="obs-shortcuts-panel__group-label">{{ group.label }}</h3>
              <div v-for="s in group.shortcuts" :key="s.keys" class="obs-shortcuts-panel__row">
                <span class="obs-shortcuts-panel__keys">
                  <kbd v-for="(k, i) in s.keys.split('+')" :key="i" class="obs-shortcuts-panel__kbd">{{ k }}</kbd>
                </span>
                <span class="obs-shortcuts-panel__desc">{{ s.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

defineProps<{
  visible: boolean
}>()

defineEmits<{
  'close': []
}>()

const shortcutGroups = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: 'Scroll', description: 'Zoom in/out' },
      { keys: 'Click+Drag', description: 'Pan the map' },
      { keys: 'Shift+Click+Drag', description: 'Rotate the map (3D)' },
      { keys: 'Ctrl+Click+Drag', description: 'Tilt the map (3D)' },
    ],
  },
  {
    label: 'Filters & Layers',
    shortcuts: [
      { keys: 'Ctrl+K', description: 'Open command palette' },
      { keys: 'Ctrl+F', description: 'Focus search bar' },
      { keys: 'Escape', description: 'Clear search / Close panel' },
      { keys: 'H', description: 'Toggle heatmap' },
      { keys: 'P', description: 'Toggle polygons' },
      { keys: 'W', description: 'Toggle hydrography' },
      { keys: 'T', description: 'Toggle data table' },
    ],
  },
  {
    label: 'Sidebar',
    shortcuts: [
      { keys: '1', description: 'Danger tab' },
      { keys: '2', description: 'Military tab' },
      { keys: '3', description: 'Illegal tab' },
      { keys: '4', description: 'Environment tab' },
      { keys: '5', description: 'Network tab' },
      { keys: '6', description: 'Timeline tab' },
    ],
  },
]

</script>

<style scoped>
.obs-shortcuts-panel {
  background: rgba(12, 12, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  width: clamp(280px, 40vw, 400px);
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: inherit;
}
.obs-shortcuts-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(8px, 1.5vw, 16px) clamp(10px, 2vw, 20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.obs-shortcuts-panel__title {
  margin: 0;
  font-size: clamp(12px, 1.8vw, 15px);
  font-weight: 700;
  color: var(--text-primary);
}
.obs-shortcuts-panel__close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: clamp(18px, 3vw, 26px);
  cursor: pointer;
  line-height: 1;
  padding: clamp(2px, 0.5vw, 6px);
  border-radius: 4px;
  transition: all 0.15s;
}
.obs-shortcuts-panel__close:hover {
  color: var(--danger);
  background: rgba(231, 76, 60, 0.1);
}
.obs-shortcuts-panel__body {
  padding: clamp(8px, 1.5vw, 16px) clamp(10px, 2vw, 20px);
  overflow-y: auto;
}
.obs-shortcuts-panel__group {
  margin-bottom: 12px;
}
.obs-shortcuts-panel__group:last-child {
  margin-bottom: 0;
}
.obs-shortcuts-panel__group-label {
  margin: 0 0 6px;
  font-size: clamp(9px, 1.4vw, 12px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
}
.obs-shortcuts-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(2px, 0.5vw, 6px) 0;
}
.obs-shortcuts-panel__keys {
  display: flex;
  gap: 3px;
}
.obs-shortcuts-panel__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 clamp(2px, 0.5vw, 6px);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: clamp(9px, 1.4vw, 12px);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
}
.obs-shortcuts-panel__desc {
  font-size: clamp(10px, 1.5vw, 13px);
  color: rgba(255, 255, 255, 0.5);
}

.kbd-backdrop { z-index: var(--obs-z-modal-backdrop); }
.modal-fade-enter-active {
  transition: opacity 0.2s ease;
}
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: none;
  }
}
</style>
