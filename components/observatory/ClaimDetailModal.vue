/**
 * components/observatory/ClaimDetailModal.vue
 * @why Full detail view for an observatory claim in a modal
 * @component ClaimDetailModal
 * @props visible: boolean
  claim
 * @emits close: []
 * @deps vue (ref, watch, computed); @/lib/map-utils (buildRareEarthPopupHTML)
 */
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="claim-overlay-fixed" role="dialog" aria-modal="true" aria-label="Claim details" @click.self="close" @keydown.esc="close">
        <button ref="closeBtnRef" class="claim-overlay-close-btn" @click="close" aria-label="Close claim details">
          <Icon name="lucide:x" class="h-5 w-5" />
        </button>
        <div class="claim-overlay-content" v-html="html" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, watch, computed } from 'vue'
import { buildRareEarthPopupHTML } from '@/lib/map-utils'

const props = defineProps<{
  visible: boolean
  claim: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  close: []
}>()

const closeBtnRef = ref<HTMLElement | null>(null)

const html = computed(() => {
  if (!props.claim) return ''
  return buildRareEarthPopupHTML(props.claim as { c?: string; ds?: number; a?: number; [key: string]: unknown })
})

function close() {
  emit('close')
}

watch(() => props.visible, (v) => {
  if (v) {
    import('vue').then(({ nextTick }) => nextTick(() => closeBtnRef.value?.focus()))
  }
})

</script>

<style scoped>
.claim-overlay-fixed {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
}
.claim-overlay-close-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1001;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
}
.claim-overlay-close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.claim-overlay-content {
  max-width: 34rem;
  width: 100%;
  max-height: min(90vh, 40rem);
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}
.claim-overlay-content :deep(.ree-popup-wrapper) {
  min-width: auto !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
