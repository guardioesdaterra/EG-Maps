<template>
  <div class="obs-tab">
    <!-- EDUCATIONAL: Military interest explainer -->
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

    <!-- DANGER CALLOUT -->
    <div class="obs-callout obs-callout--danger">
      <div class="obs-callout__head">
        <Icon name="lucide:shield" class="obs-callout__icon" />
        <h3 class="obs-callout__title">{{ t('observatory.military.headline') }}</h3>
      </div>
      <p class="obs-callout__body">{{ t('observatory.military.headlineBody') }}</p>
    </div>

    <!-- DOD ASSETS -->
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

    <!-- INVESTMENTS -->
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

    <!-- CHINA BAN CALLOUT -->
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

.obs-expand__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

.obs-expand__tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 8px; font-weight: 700; padding: 2px 6px;
  border-radius: 3px; background: rgba(231,76,60,0.1); color: var(--obs-red);
}

.obs-expand__tag-icon { width: 8px; height: 8px; }

.obs-callout {
  padding: 10px; background: rgba(231,76,60,0.05);
  border: 1px solid rgba(231,76,60,0.12);
  border-radius: 8px; border-left: 3px solid var(--obs-red);
}

.obs-callout--warn { background: rgba(243,156,18,0.05); border-color: rgba(243,156,18,0.12); border-left-color: var(--obs-amber); }

.obs-callout__head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }

.obs-callout__icon { width: 13px; height: 13px; color: var(--obs-red); flex-shrink: 0; }
.obs-callout--warn .obs-callout__icon { color: var(--obs-amber); }

.obs-callout__title { margin: 0; font-size: 10px; font-weight: 700; color: var(--obs-red); }
.obs-callout--warn .obs-callout__title { color: var(--obs-amber); }

.obs-callout__body { margin: 0; font-size: 9.5px; color: var(--obs-text-body); line-height: 1.5; }

.obs-section-title {
  margin: 2px 0 0; display: flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 700; text-transform: uppercase;
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
.obs-card__body { flex: 1; padding: 8px 9px; min-width: 0; }

.obs-card__head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.obs-card__flag { font-size: 12px; line-height: 1; }

.obs-card__name { font-size: 10px; font-weight: 600; color: var(--obs-text-primary); flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

.obs-card__arrow { width: 9px; height: 9px; color: var(--obs-text-dim); flex-shrink: 0; }

.obs-card__tag { display: inline-flex; align-items: center; gap: 3px; font-size: 8px; font-weight: 700; padding: 2px 5px; border-radius: 3px; white-space: nowrap; }

.obs-card__tag--red { background: rgba(231,76,60,0.12); color: var(--obs-red); }
.obs-card__tag--amber { background: rgba(243,156,18,0.12); color: var(--obs-amber); }
.obs-card__tag-icon { width: 8px; height: 8px; }

.obs-card__desc { margin: 3px 0 0; font-size: 9px; color: var(--obs-text-body); line-height: 1.45; }

.obs-card__actions {
  display: flex; flex-direction: column; justify-content: center;
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
