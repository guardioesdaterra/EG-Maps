/**
 * components/observatory/tabs/NetworkTab.vue
 * @why Network graph tab — interactive force-directed graph of relationships
 * @component NetworkTab
 * @props highlight?: string | null
 * @emits 'update:highlight': [v: string | null]
 * @deps vue (ref); @/lib/observatory-tabs (NETWORK_NOTES)
 */
<template>
  <div class="obs-tab">
    <p class="obs-tab__hint">
      <Icon name="lucide:mouse-pointer-2" class="obs-tab__hint-icon" />
      {{ t('observatory.network.clickHint') }}
    </p>

    
    <div class="obs-expand">
      <button
        type="button"
        class="obs-expand__btn"
        :aria-expanded="infoOpen"
        @click="infoOpen = !infoOpen"
      >
        <Icon :name="infoOpen ? 'lucide:chevron-down' : 'lucide:network'" class="obs-expand__icon" />
        {{ infoOpen ? t('observatory.network.hideInfo') : t('observatory.network.whatIsThis') }}
      </button>
      <Transition name="obs-fade">
        <div v-if="infoOpen" class="obs-expand__body">
          <p>{{ t('observatory.network.infoText') }}</p>
        </div>
      </Transition>
    </div>

    <ul class="obs-card-list" role="list">
      <li
        v-for="n in NETWORK_NOTES"
        :key="n.titleKey"
        class="obs-card"
        :class="{ 'obs-card--highlighted': highlighted === n.titleKey }"
        :style="{ '--card-accent': n.color }"
        @mouseenter="onHighlight(n.titleKey)"
        @mouseleave="onClearHighlight"
      >
        <div class="obs-card__accent" :style="{ background: n.color }" />
        <div class="obs-card__body">
          <div class="obs-card__head">
            <Icon :name="networkIcon(n.titleKey)" class="obs-card__head-icon" :style="{ color: n.color }" />
            <h4 class="obs-card__title" :style="{ color: n.color }">{{ t(n.titleKey) }}</h4>
          </div>
          <p class="obs-card__desc">{{ t(n.bodyKey) }}</p>
        </div>
        <div class="obs-card__actions">
          <button
            type="button"
            class="obs-card__action-btn"
            :title="t('observatory.network.showConnections')"
            :aria-label="t('observatory.network.showConnections')"
            @click="onHighlight(n.titleKey)"
          >
            <Icon name="lucide:search" class="obs-card__action-icon" />
          </button>
        </div>
      </li>
    </ul>

    <div class="obs-tab__footnote">
      <Icon name="lucide:info" class="obs-tab__footnote-icon" />
      {{ t('observatory.network.learnMore') }}
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref } from 'vue'
import { NETWORK_NOTES } from '@/lib/observatory-tabs'

const { t } = useI18n()

defineProps<{
  highlight?: string | null
}>()

const emit = defineEmits<{
  'update:highlight': [v: string | null]
}>()

const infoOpen = ref(false)
const highlighted = ref<string | null>(null)

function onHighlight(key: string) {
  highlighted.value = key
  emit('update:highlight', key)
}

function onClearHighlight() {
  highlighted.value = null
  emit('update:highlight', null)
}

function networkIcon(titleKey: string): string {
  const map: Record<string, string> = {
    'observatory.network.foxfireTitle': 'lucide:flame',
    'observatory.network.australianTitle': 'lucide:ship',
    'observatory.network.usMilitaryTitle': 'lucide:shield-half',
    'observatory.network.cbmmTitle': 'lucide:factory',
  }
  return map[titleKey] || 'lucide:git-branch'
}

</script>

<style scoped>
.obs-tab { display: flex; flex-direction: column; gap: 8px; }

.obs-tab__hint {
  margin: 0; display: flex; align-items: center; justify-content: center; gap: 5px;
  font-size: clamp(9px, 1.4vw, 12px); font-style: italic; color: var(--obs-text-dim); text-align: center; padding: 4px;
}

.obs-tab__hint-icon { width: 10px; height: 10px; }

.obs-expand { margin: 0; }

.obs-expand__btn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: clamp(8px, 1.3vw, 11px); font-weight: 600; color: var(--obs-text-dim);
  background: none; border: none; cursor: pointer; font-family: inherit;
  padding: 3px clamp(4px, 1vw, 8px); border-radius: 3px;
  transition: color 0.12s, background 0.12s;
}

.obs-expand__btn:hover { color: var(--obs-text-body); background: rgba(255,255,255,0.03); }

.obs-expand__icon { width: 10px; height: 10px; }

.obs-expand__body {
  font-size: clamp(9px, 1.4vw, 12px); color: var(--obs-text-body); line-height: 1.5;
  padding: clamp(4px, 1vw, 8px) clamp(6px, 1.2vw, 12px); margin-top: 2px;
  background: rgba(255,255,255,0.02); border-radius: 5px;
  border: 1px solid var(--obs-panel-border);
}

.obs-card-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }

.obs-card {
  display: flex; background: rgba(255,255,255,0.02);
  border: 1px solid var(--obs-panel-border); border-radius: 7px;
  overflow: hidden; transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
}

.obs-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); }

.obs-card--highlighted { box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 0 16px rgba(255,255,255,0.06); }

.obs-card__accent { width: 3px; flex-shrink: 0; }
.obs-card__body { flex: 1; padding: clamp(6px, 1.2vw, 12px) clamp(7px, 1.4vw, 14px); min-width: 0; }

.obs-card__head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }

.obs-card__head-icon { width: 12px; height: 12px; flex-shrink: 0; }

.obs-card__title { margin: 0; font-size: clamp(10px, 1.5vw, 13px); font-weight: 700; line-height: 1.3; }

.obs-card__desc { margin: 0; font-size: clamp(9px, 1.4vw, 12px); color: var(--obs-text-body); line-height: 1.5; }

.obs-card__actions {
  display: flex; flex-direction: column; justify-content: center;
  padding: clamp(4px, 1vw, 8px) 4px; flex-shrink: 0;
}

.obs-card__action-btn {
  width: clamp(20px, 4vw, 28px); height: clamp(20px, 4vw, 28px); display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid transparent; border-radius: 4px;
  color: var(--obs-text-dim); cursor: pointer; font-family: inherit;
  transition: all 0.12s;
}

.obs-card__action-btn:hover { background: rgba(255,255,255,0.06); color: var(--obs-text-primary); border-color: var(--obs-panel-border); }

.obs-card__action-icon { width: 11px; height: 11px; }

.obs-tab__footnote {
  display: flex; align-items: center; gap: 4px;
  font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-dim); font-style: italic;
  padding: 4px; text-align: center; justify-content: center;
}

.obs-tab__footnote-icon { width: 9px; height: 9px; }

.obs-fade-enter-active, .obs-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.obs-fade-enter-from, .obs-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@media (prefers-reduced-motion: reduce) { .obs-fade-enter-active, .obs-fade-leave-active { transition: none; } }
</style>
