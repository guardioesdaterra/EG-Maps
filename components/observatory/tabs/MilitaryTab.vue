/**
 * components/observatory/tabs/MilitaryTab.vue
 * @why Military activity tab — shows armed conflicts, base locations, restricted zones
 * @component MilitaryTab
 * @props highlight?: string | null
 * @emits 'update:highlight': [v: string | null]
 * @deps vue (ref); @/lib/observatory-tabs (MILITARY_ASSETS, US_INVESTMENTS)
 */
<template>
  <div class="obs-tab">
    
    <div class="obs-expand">
      <button
        type="button"
        class="obs-expand__btn"
        :aria-expanded="infoOpen"
        @click="infoOpen = !infoOpen"
      >
        <Icon :name="infoOpen ? 'lucide:chevron-down' : 'lucide:shield-question'" class="obs-expand__icon" />
        {{ infoOpen ? t('observatory.military.hideInfo') : t('observatory.military.whatIsThis') }}
      </button>
      <Transition name="obs-fade">
        <div v-if="infoOpen" class="obs-expand__body">
          <p>{{ t('observatory.military.infoText') }}</p>
          <div class="obs-expand__tags">
            <span class="obs-expand__tag"><Icon name="lucide:map-pin" class="obs-expand__tag-icon" /> AM, AP, PA, RR, RO, MT</span>
          </div>
        </div>
      </Transition>
    </div>

    
    <div class="obs-callout obs-callout--danger">
      <div class="obs-callout__head">
        <Icon name="lucide:shield" class="obs-callout__icon" />
        <h3 class="obs-callout__title">{{ t('observatory.military.headline') }}</h3>
      </div>
      <p class="obs-callout__body">{{ t('observatory.military.headlineBody') }}</p>
    </div>

    
    <h4 class="obs-section-title">
      <Icon name="lucide:building-2" class="obs-section-title__icon" />
      {{ t('observatory.military.dodTitle') }}
    </h4>
    <ul class="obs-card-list" role="list">
      <li
        v-for="m in MILITARY_ASSETS"
        :key="m.name"
        class="obs-card"
        :class="{ 'obs-card--highlighted': highlighted === m.name }"
        @mouseenter="onHighlight(m.name)"
        @mouseleave="onClearHighlight"
      >
        <div class="obs-card__accent" style="background: var(--obs-red)" />
        <div class="obs-card__body">
          <div class="obs-card__head">
            <span class="obs-card__flag" aria-hidden="true">{{ m.flag }}</span>
            <span class="obs-card__name">{{ m.name }}</span>
            <span v-if="m.kgPerUnit" class="obs-card__tag obs-card__tag--red">
              <Icon name="lucide:weight" class="obs-card__tag-icon" />
              {{ m.kgPerUnit.toLocaleString() }} kg
            </span>
          </div>
          <p class="obs-card__desc">{{ m.description }}</p>
        </div>
        <div class="obs-card__actions">
          <button
            type="button"
            class="obs-card__action-btn"
            :title="t('observatory.military.showZones')"
            @click="onHighlight(m.name)"
          >
            <Icon name="lucide:map-pin" class="obs-card__action-icon" />
          </button>
        </div>
      </li>
    </ul>

    
    <h4 class="obs-section-title">
      <Icon name="lucide:dollar-sign" class="obs-section-title__icon" />
      {{ t('observatory.military.stateDeptTitle') }}
    </h4>
    <ul class="obs-card-list" role="list">
      <li
        v-for="(i, idx) in US_INVESTMENTS"
        :key="idx"
        class="obs-card"
      >
        <div class="obs-card__accent" style="background: var(--obs-amber)" />
        <div class="obs-card__body">
          <div class="obs-card__head">
            <span class="obs-card__name">{{ i.from }} <Icon name="lucide:arrow-right" class="obs-card__arrow" /> {{ i.to }}</span>
            <span class="obs-card__tag obs-card__tag--amber">
              <Icon name="lucide:dollar-sign" class="obs-card__tag-icon" />
              {{ i.amount }}
            </span>
          </div>
          <p class="obs-card__desc">{{ i.year }}</p>
        </div>
      </li>
    </ul>

    
    <div class="obs-callout obs-callout--warn">
      <div class="obs-callout__head">
        <Icon name="lucide:ban" class="obs-callout__icon" />
        <h3 class="obs-callout__title">{{ t('observatory.military.chinaBanTitle') }}</h3>
      </div>
      <p class="obs-callout__body">{{ t('observatory.military.chinaBanBody') }}</p>
    </div>

    <div class="obs-tab__footnote">
      <Icon name="lucide:info" class="obs-tab__footnote-icon" />
      {{ t('observatory.military.learnMore') }}
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref } from 'vue'
import { MILITARY_ASSETS, US_INVESTMENTS } from '@/lib/observatory-tabs'

const { t } = useI18n()

const props = defineProps<{
  highlight?: string | null
}>()

const emit = defineEmits<{
  'update:highlight': [v: string | null]
}>()

const infoOpen = ref(false)
const highlighted = ref<string | null>(null)

function onHighlight(name: string) {
  highlighted.value = name
  emit('update:highlight', name)
}

function onClearHighlight() {
  highlighted.value = null
  emit('update:highlight', null)
}

</script>

<style scoped>
.obs-tab { display: flex; flex-direction: column; gap: 8px; }

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

.obs-expand__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

.obs-expand__tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: clamp(8px, 1.3vw, 11px); font-weight: 700; padding: 2px clamp(4px, 1vw, 8px);
  border-radius: 3px; background: rgba(231,76,60,0.1); color: var(--obs-red);
}

.obs-expand__tag-icon { width: 8px; height: 8px; }

.obs-callout {
  padding: clamp(8px, 1.5vw, 14px); background: rgba(231,76,60,0.05);
  border: 1px solid rgba(231,76,60,0.12);
  border-radius: 8px; border-left: 3px solid var(--obs-red);
}

.obs-callout--warn { background: rgba(243,156,18,0.05); border-color: rgba(243,156,18,0.12); border-left-color: var(--obs-amber); }

.obs-callout__head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }

.obs-callout__icon { width: 13px; height: 13px; color: var(--obs-red); flex-shrink: 0; }
.obs-callout--warn .obs-callout__icon { color: var(--obs-amber); }

.obs-callout__title { margin: 0; font-size: clamp(10px, 1.5vw, 13px); font-weight: 700; color: var(--obs-red); }
.obs-callout--warn .obs-callout__title { color: var(--obs-amber); }

.obs-callout__body { margin: 0; font-size: clamp(9.5px, 1.5vw, 12.5px); color: var(--obs-text-body); line-height: 1.5; }

.obs-section-title {
  margin: 2px 0 0; display: flex; align-items: center; gap: 5px;
  font-size: clamp(9px, 1.4vw, 12px); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--obs-text-label);
}

.obs-section-title__icon { width: 11px; height: 11px; color: var(--obs-text-dim); }

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

.obs-card__head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.obs-card__flag { font-size: clamp(12px, 1.8vw, 15px); line-height: 1; }

.obs-card__name { font-size: clamp(10px, 1.5vw, 13px); font-weight: 600; color: var(--obs-text-primary); flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

.obs-card__arrow { width: 9px; height: 9px; color: var(--obs-text-dim); flex-shrink: 0; }

.obs-card__tag { display: inline-flex; align-items: center; gap: 3px; font-size: clamp(8px, 1.3vw, 11px); font-weight: 700; padding: 2px 5px; border-radius: 3px; white-space: nowrap; }

.obs-card__tag--red { background: rgba(231,76,60,0.12); color: var(--obs-red); }
.obs-card__tag--amber { background: rgba(243,156,18,0.12); color: var(--obs-amber); }
.obs-card__tag-icon { width: 8px; height: 8px; }

.obs-card__desc { margin: 3px 0 0; font-size: clamp(9px, 1.4vw, 12px); color: var(--obs-text-body); line-height: 1.45; }

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
