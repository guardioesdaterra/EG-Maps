<template>
  <div class="obs-tab">
    <!-- EDUCATIONAL: What are illegal patterns? -->
    <div class="obs-expand">
      <button
        type="button"
        class="obs-expand__btn"
        :aria-expanded="infoOpen"
        @click="infoOpen = !infoOpen"
      >
        <Icon :name="infoOpen ? 'lucide:chevron-down' : 'lucide:scale'" class="obs-expand__icon" />
        {{ infoOpen ? t('observatory.illegal.hideInfo') : t('observatory.illegal.whatIsThis') }}
      </button>
      <Transition name="obs-fade">
        <div v-if="infoOpen" class="obs-expand__body">
          <p>{{ t('observatory.illegal.infoText') }}</p>
        </div>
      </Transition>
    </div>

    <ul class="obs-card-list" role="list">
      <li
        v-for="p in ILLEGAL_PATTERNS"
        :key="p.titleKey"
        class="obs-card"
        :class="{ 'obs-card--highlighted': highlighted === p.titleKey }"
        :style="{ '--card-accent': p.color }"
        @mouseenter="onHighlight(p.titleKey)"
        @mouseleave="onClearHighlight"
      >
        <div class="obs-card__accent" :style="{ background: p.color }" />
        <div class="obs-card__body">
          <div class="obs-card__head">
            <Icon :name="patternIcon(p.titleKey)" class="obs-card__head-icon" :style="{ color: p.color }" />
            <h4 class="obs-card__title" :style="{ color: p.color }">{{ t(p.titleKey) }}</h4>
          </div>
          <p class="obs-card__desc">{{ t(p.descKey) }}</p>
          <ul v-if="p.examples.length" class="obs-card__examples" role="list">
            <li v-for="(e, i) in p.examples" :key="i" class="obs-card__example">
              <Icon name="lucide:circle" class="obs-card__example-dot" />
              {{ t(e.key) }}
            </li>
          </ul>
        </div>
        <div class="obs-card__actions">
          <button
            type="button"
            class="obs-card__action-btn"
            :title="t('observatory.illegal.showMatching')"
            :aria-label="t('observatory.illegal.showMatching')"
            @click="onHighlight(p.titleKey)"
          >
            <Icon name="lucide:search" class="obs-card__action-icon" />
          </button>
          <button
            type="button"
            class="obs-card__action-btn"
            :title="t('observatory.illegal.reportPattern')"
            :aria-label="t('observatory.illegal.reportPattern')"
            @click="openReport(p.titleKey)"
          >
            <Icon name="lucide:flag" class="obs-card__action-icon" />
          </button>
        </div>
      </li>
    </ul>

    <div class="obs-tab__footnote">
      <Icon name="lucide:info" class="obs-tab__footnote-icon" />
      {{ t('observatory.illegal.learnMore') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ILLEGAL_PATTERNS } from '@/lib/observatory-tabs'

const { t } = useI18n()

defineProps<{
  highlight?: string | null
}>()

const emit = defineEmits<{
  'update:highlight': [v: string | null]
  'report-pattern': [key: string]
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

function openReport(key: string) {
  emit('report-pattern', key)
}

function patternIcon(titleKey: string): string {
  const map: Record<string, string> = {
    'observatory.illegal.landSpec': 'lucide:land-plot',
    'observatory.illegal.rejeito': 'lucide:trash-2',
    'observatory.illegal.secrecy': 'lucide:eye-off',
    'observatory.illegal.foreign': 'lucide:globe',
    'observatory.illegal.exclusion': 'lucide:circle-x',
    'observatory.illegal.water': 'lucide:droplets',
  }
  return map[titleKey] || 'lucide:ban'
}
</script>

<style scoped>
.obs-tab { display: flex; flex-direction: column; gap: 6px; }

.obs-expand { margin: 0; }

.obs-expand__btn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 8px; font-weight: 600; color: var(--obs-text-dim);
  background: none; border: none; cursor: pointer; font-family: inherit;
  padding: 3px 6px; border-radius: 3px;
  transition: color 0.12s, background 0.12s;
}

.obs-expand__btn:hover { color: var(--obs-text-body); background: rgba(255,255,255,0.03); }

.obs-expand__icon { width: 10px; height: 10px; }

.obs-expand__body {
  font-size: 9px; color: var(--obs-text-body); line-height: 1.5;
  padding: 6px 8px; margin-top: 2px;
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
.obs-card__body { flex: 1; padding: 8px 9px; min-width: 0; }

.obs-card__head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }

.obs-card__head-icon { width: 12px; height: 12px; flex-shrink: 0; }

.obs-card__title { margin: 0; font-size: 10px; font-weight: 700; }

.obs-card__desc { margin: 0 0 4px; font-size: 9px; color: var(--obs-text-body); line-height: 1.5; }

.obs-card__examples { list-style: none; margin: 0; padding: 0; }

.obs-card__example { display: flex; align-items: flex-start; gap: 4px; font-size: 8.5px; color: var(--obs-text-dim); line-height: 1.45; margin-top: 2px; padding-left: 2px; }

.obs-card__example-dot { width: 4px; height: 4px; margin-top: 4px; flex-shrink: 0; color: rgba(255,255,255,0.15); }

.obs-card__actions {
  display: flex; flex-direction: column; justify-content: center; gap: 2px;
  padding: 6px 4px; flex-shrink: 0;
}

.obs-card__action-btn {
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid transparent; border-radius: 4px;
  color: var(--obs-text-dim); cursor: pointer; font-family: inherit;
  transition: all 0.12s;
}

.obs-card__action-btn:hover { background: rgba(255,255,255,0.06); color: var(--obs-text-primary); border-color: var(--obs-panel-border); }

.obs-card__action-icon { width: 11px; height: 11px; }

.obs-tab__footnote {
  display: flex; align-items: center; gap: 4px;
  font-size: 8px; color: var(--obs-text-dim); font-style: italic;
  padding: 4px; text-align: center; justify-content: center;
}

.obs-tab__footnote-icon { width: 9px; height: 9px; }

.obs-fade-enter-active, .obs-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.obs-fade-enter-from, .obs-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@media (prefers-reduced-motion: reduce) { .obs-fade-enter-active, .obs-fade-leave-active { transition: none; } }
</style>
