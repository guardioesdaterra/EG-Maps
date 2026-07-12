<template>
  <div class="obs-tab">
    <h3 class="obs-tab__title">
      <Icon name="lucide:globe" class="obs-tab__title-icon" />
      {{ t('observatory.envPanel.title') }}
    </h3>

    <!-- Risk legend -->
    <div class="obs-expand">
      <button
        type="button"
        class="obs-expand__btn"
        :aria-expanded="legendOpen"
        @click="legendOpen = !legendOpen"
      >
        <Icon :name="legendOpen ? 'lucide:chevron-down' : 'lucide:layout-list'" class="obs-expand__icon" />
        {{ legendOpen ? t('observatory.envPanel.hideLegend') : t('observatory.envPanel.showLegend') }}
      </button>
      <Transition name="obs-fade">
        <div v-if="legendOpen" class="obs-expand__body">
          <p>{{ t('observatory.envPanel.legendIntro') }}</p>
          <ul class="obs-expand__legend">
            <li><span class="obs-legend-dot" style="background:#e74c3c" /> <strong>8+</strong> — {{ t('observatory.envPanel.criticalRisk') }}</li>
            <li><span class="obs-legend-dot" style="background:#f39c12" /> <strong>6–7.9</strong> — {{ t('observatory.envPanel.highRisk') }}</li>
            <li><span class="obs-legend-dot" style="background:#27ae60" /> <strong>&lt;6</strong> — {{ t('observatory.envPanel.moderateRisk') }}</li>
          </ul>
        </div>
      </Transition>
    </div>

    <ul class="obs-card-list" role="list">
      <li
        v-for="r in ENV_REGIONS"
        :key="r.regionKey"
        class="obs-card"
        :class="{ 'obs-card--highlighted': highlighted === r.regionKey }"
        @mouseenter="onHighlight(r.regionKey)"
        @mouseleave="onClearHighlight"
      >
        <button
          type="button"
          class="obs-card__btn"
          :disabled="!r.coord"
          :aria-label="t('observatory.envPanel.flyTo', { name: r.regionLabel })"
          :style="{ '--card-accent': dangerColor(r.danger) }"
          @click="r.coord && onFlyTo(r)"
        >
          <div class="obs-card__btn-accent" :style="{ background: dangerColor(r.danger) }" />
          <div class="obs-card__btn-body">
            <div class="obs-card__btn-head">
              <span class="obs-card__btn-score" :style="{ color: dangerColor(r.danger) }">{{ r.danger.toFixed(1) }}</span>
              <span class="obs-card__btn-name">{{ r.regionLabel }}</span>
            </div>
            <ul v-if="r.companies.length" class="obs-card__tags" role="list">
              <li v-for="c in r.companies" :key="c" class="obs-card__tag">
                <Icon name="lucide:building" class="obs-card__tag-icon" />
                {{ c }}
              </li>
            </ul>
            <ul v-if="r.risks.length" class="obs-card__risks" role="list">
              <li v-for="(risk, i) in r.risks.slice(0, 3)" :key="i" class="obs-card__risk">
                <Icon name="lucide:alert-triangle" class="obs-card__risk-icon" />
                {{ risk }}
              </li>
              <li v-if="r.risks.length > 3" class="obs-card__risk obs-card__risk--more">+{{ r.risks.length - 3 }} {{ t('observatory.envPanel.moreRisks') }}</li>
            </ul>
          </div>
        </button>
        <div class="obs-card__actions">
          <button
            type="button"
            class="obs-card__action-btn"
            :title="t('observatory.envPanel.flyTo', { name: r.regionLabel })"
            :disabled="!r.coord"
            @click="r.coord && onFlyTo(r)"
          >
            <Icon name="lucide:map-pin" class="obs-card__action-icon" />
          </button>
          <button
            type="button"
            class="obs-card__action-btn"
            :title="t('observatory.envPanel.addObservation')"
            :aria-label="t('observatory.envPanel.addObservation')"
            @click="openObservation(r)"
          >
            <Icon name="lucide:message-square-plus" class="obs-card__action-icon" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ENV_REGIONS } from '@/lib/observatory-tabs'
import type { EnvRegion } from '@/lib/observatory-tabs'

const { t } = useI18n()

defineProps<{
  highlight?: string | null
}>()

const emit = defineEmits<{
  'fly-to-coord': [coord: [number, number]]
  'update:highlight': [v: string | null]
  'add-observation': [region: string]
}>()

const legendOpen = ref(false)
const highlighted = ref<string | null>(null)

function dangerColor(score: number) {
  if (score >= 8) return '#e74c3c'
  if (score >= 6) return '#f39c12'
  return '#27ae60'
}

function onHighlight(key: string) {
  highlighted.value = key
  emit('update:highlight', key)
}

function onClearHighlight() {
  highlighted.value = null
  emit('update:highlight', null)
}

function onFlyTo(r: EnvRegion) {
  if (r.coord) emit('fly-to-coord', r.coord)
}

function openObservation(r: EnvRegion) {
  emit('add-observation', r.regionKey)
}
</script>

<style scoped>
.obs-tab { display: flex; flex-direction: column; gap: 6px; }

.obs-tab__title {
  margin: 0; display: flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--obs-text-label);
  padding: 4px 4px 2px;
}

.obs-tab__title-icon { width: 12px; height: 12px; color: var(--obs-green); }

.obs-expand { margin: 0 2px; }

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

.obs-expand__legend { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.obs-expand__legend li { display: flex; align-items: center; gap: 6px; font-size: 9px; }

.obs-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.obs-card-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }

.obs-card {
  display: flex; gap: 1px; border-radius: 7px;
  transition: box-shadow 0.12s;
}

.obs-card--highlighted { box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 0 16px rgba(255,255,255,0.06); }

.obs-card__btn {
  flex: 1; display: flex; text-align: left;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--obs-panel-border); border-radius: 7px;
  overflow: hidden; cursor: pointer; font-family: inherit; color: inherit;
  padding: 0; transition: background 0.12s, border-color 0.12s;
  min-width: 0;
}

.obs-card__btn:hover:not(:disabled) { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); }
.obs-card__btn:focus-visible { outline: 2px solid var(--obs-blue); outline-offset: 2px; }
.obs-card__btn:disabled { opacity: 0.55; cursor: not-allowed; }

.obs-card__btn-accent { width: 3px; flex-shrink: 0; }
.obs-card__btn-body { flex: 1; padding: 7px 8px; min-width: 0; }

.obs-card__btn-head { display: flex; align-items: center; gap: 6px; }

.obs-card__btn-score { font-size: 10px; font-weight: 800; font-variant-numeric: tabular-nums; flex-shrink: 0; }

.obs-card__btn-name { font-size: 10px; font-weight: 600; color: var(--obs-text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.obs-card__tags { list-style: none; margin: 3px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 3px; }

.obs-card__tag { display: inline-flex; align-items: center; gap: 2px; font-size: 8px; font-weight: 600; padding: 1px 4px; border-radius: 3px; background: rgba(93,173,226,0.1); color: var(--obs-blue-light); }

.obs-card__tag-icon { width: 7px; height: 7px; }

.obs-card__risks { list-style: none; margin: 3px 0 0; padding: 0; }

.obs-card__risk { display: flex; align-items: flex-start; gap: 4px; font-size: 8px; color: var(--obs-text-body); line-height: 1.4; margin-top: 1px; }

.obs-card__risk-icon { width: 7px; height: 7px; margin-top: 2px; flex-shrink: 0; color: var(--obs-amber); }

.obs-card__risk--more { color: var(--obs-text-dim); font-style: italic; }

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

.obs-card__action-btn:hover:not(:disabled) { background: rgba(255,255,255,0.06); color: var(--obs-text-primary); border-color: var(--obs-panel-border); }

.obs-card__action-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.obs-card__action-icon { width: 11px; height: 11px; }

.obs-fade-enter-active, .obs-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.obs-fade-enter-from, .obs-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@media (prefers-reduced-motion: reduce) { .obs-fade-enter-active, .obs-fade-leave-active { transition: none; } }
</style>
