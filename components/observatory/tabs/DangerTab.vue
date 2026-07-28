/**
 * components/observatory/tabs/DangerTab.vue
 * @why Danger zone alerts tab — shows safety warnings and hazardous area notifications
 * @component DangerTab
 * @props items: SpeculatorIndexEntry[]
  showAll
 * @emits 'fly-to-enterprise': [name: string]
  'update:showAll': [v: boolean]
  'update:highlight': [v: string | null]
  'report-enterprise': [name: string, score: number, flags: string[]]
 * @deps vue (computed, ref, reactive, watch)
 */
<template>
  <div class="obs-tab">
    
    <div class="obs-tab__head">
      <h3 class="obs-tab__title">
        <Icon name="lucide:radar" class="obs-tab__title-icon" />
        {{ t('observatory.dangerPanel.title') }}
      </h3>
      <button
        v-if="items.length > 20"
        type="button"
        class="obs-tab__toggle"
        @click="$emit('update:showAll', !showAll)"
      >
        {{ showAll
          ? t('observatory.dangerPanel.showLess')
          : t('observatory.dangerPanel.showAll', { count: items.length })
        }}
      </button>
    </div>

    
    <div class="obs-expand">
      <button
        type="button"
        class="obs-expand__btn"
        :aria-expanded="infoOpen"
        @click="infoOpen = !infoOpen"
      >
        <Icon :name="infoOpen ? 'lucide:chevron-down' : 'lucide:help-circle'" class="obs-expand__icon" />
        {{ infoOpen ? t('observatory.dangerPanel.hideInfo') : t('observatory.dangerPanel.whatIsThis') }}
      </button>
      <Transition name="obs-fade">
        <div v-if="infoOpen" class="obs-expand__body">
          <p>{{ t('observatory.dangerPanel.infoIntro') }}</p>
          <ul class="obs-expand__legend">
            <li><span class="obs-legend-dot" :style="{ background: 'var(--danger)' }" /> <strong>8–10 Critical</strong> — {{ t('observatory.dangerPanel.criticalDesc') }}</li>
            <li><span class="obs-legend-dot" :style="{ background: 'var(--warning)' }" /> <strong>6–7.9 High</strong> — {{ t('observatory.dangerPanel.highDesc') }}</li>
            <li><span class="obs-legend-dot" :style="{ background: 'var(--success)' }" /> <strong>0–5.9 Medium</strong> — {{ t('observatory.dangerPanel.mediumDesc') }}</li>
          </ul>
          <p class="obs-expand__footnote">{{ t('observatory.dangerPanel.infoFooter') }}</p>
        </div>
      </Transition>
    </div>

    
    <div v-if="items.length === 0" class="obs-tab__empty">
      <Icon name="lucide:search-x" class="obs-tab__empty-icon" />
      {{ t('observatory.dangerPanel.empty') }}
    </div>

    
    <template v-else>
      <template v-for="(tier, tIdx) in sortedTiers" :key="tier.label">
        <div class="obs-tier-head">
          <div class="obs-tier-head__accent" :style="{ background: tier.color }" />
          <span class="obs-tier-head__label" :style="{ color: tier.color }">{{ tier.label }}</span>
          <span class="obs-tier-head__count">{{ tier.items.length }}</span>
          <button
            type="button"
            class="obs-tier-head__toggle"
            :aria-label="tierCollapsed[tIdx] ? 'Expand' : 'Collapse'"
            @click="tierCollapsed[tIdx] = !tierCollapsed[tIdx]"
          >
            <Icon :name="tierCollapsed[tIdx] ? 'lucide:chevron-right' : 'lucide:chevron-down'" class="obs-tier-head__toggle-icon" />
          </button>
        </div>

        <ol v-if="!tierCollapsed[tIdx]" class="obs-card-list" role="list">
          <li
            v-for="(d, idx) in pagedTierItems(tier.items)"
            :key="d.normalizedName"
            class="obs-card"
            :class="{ 'obs-card--highlighted': highlighted === d.normalizedName }"
            :style="{ '--anim-delay': `${idx * 0.03}s` }"
            @mouseenter="onHighlight(d.normalizedName)"
            @mouseleave="onClearHighlight"
          >
            <button
              type="button"
              class="obs-card__btn"
              :aria-label="t('observatory.dangerPanel.flyTo', { name: d.displayName })"
              @click="onFlyTo(d.displayName)"
            >
              <div class="obs-card__btn-accent" :style="{ background: dangerColor(d.suspicionScore) }" />
              <div class="obs-card__btn-body">
                <div class="obs-card__btn-top">
                  <span
                    class="obs-card__btn-score"
                    :style="{ background: dangerColor(d.suspicionScore) }"
                  >{{ d.suspicionScore.toFixed(1) }}</span>
                  <span class="obs-card__btn-name" :title="d.displayName">{{ d.displayName }}</span>
                  <span class="obs-card__btn-count">#{{ d.count }}</span>
                  <Icon v-if="d.recentPct >= 90" name="lucide:trending-up" class="obs-card__trend-icon" :title="`${d.recentPct.toFixed(0)}% recent`" />
                </div>
                <div class="obs-card__btn-bar" :aria-hidden="true">
                  <div
                    class="obs-card__btn-bar-fill"
                    :style="{
                      width: `${d.suspicionScore * 10}%`,
                      background: dangerColor(d.suspicionScore),
                    }"
                  />
                </div>
                <div class="obs-card__btn-meta">
                  <span :title="t('observatory.dangerPanel.processes')">
                    <Icon name="lucide:file-text" class="obs-card__meta-icon" />
                    {{ d.count }}
                  </span>
                  <span :title="t('observatory.dangerPanel.area')">
                    <Icon name="lucide:maximize-2" class="obs-card__meta-icon" />
                    {{ formatArea(d.totalAreaHa) }} ha
                  </span>
                  <span v-if="d.ufs.length" :title="t('observatory.dangerPanel.states')">
                    <Icon name="lucide:map-pin" class="obs-card__meta-icon" />
                    {{ d.ufs.slice(0, 4).join(' · ') }}
                  </span>
                </div>
                <div v-if="d.subs?.length" class="obs-card__btn-subs" :title="t('observatory.dangerPanel.substances')">
                  <Icon name="lucide:package" class="obs-card__subs-icon" />
                  {{ d.subs.slice(0, 4).join(' · ') }}
                </div>
                <div v-if="d.suspicionFlags?.length" class="obs-card__btn-flags">
                  <span
                    v-for="flag in d.suspicionFlags.slice(0, 3)"
                    :key="flag"
                    class="obs-card__flag-badge"
                    :title="flagTooltip(flag)"
                  >{{ flagLabel(flag) }}</span>
                  <span
                    v-if="d.suspicionFlags.length > 3"
                    class="obs-card__flag-badge obs-card__flag-badge--more"
                    :title="`${d.suspicionFlags.length - 3} more flags`"
                  >+{{ d.suspicionFlags.length - 3 }}</span>
                </div>
              </div>
            </button>
            <div class="obs-card__actions">
              <button
                type="button"
                class="obs-card__action-btn"
                :title="t('observatory.dangerPanel.showOnMap')"
                :aria-label="t('observatory.dangerPanel.showOnMap')"
                @click="onFlyTo(d.displayName)"
              >
                <Icon name="lucide:map-pin" class="obs-card__action-icon" />
              </button>
              <button
                type="button"
                class="obs-card__action-btn"
                :title="t('observatory.dangerPanel.report')"
                :aria-label="t('observatory.dangerPanel.report')"
                @click="openReport(d)"
              >
                <Icon name="lucide:flag" class="obs-card__action-icon" />
              </button>
            </div>
          </li>
        </ol>

        <nav v-if="!tierCollapsed[tIdx] && needPagination(tier.items)" class="obs-pager">
          <button type="button" class="obs-pager__btn" :disabled="tierPages[tIdx] === 1" @click="tierPages[tIdx]--">
            <Icon name="lucide:chevron-left" class="obs-pager__icon" />
          </button>
          <span class="obs-pager__info">{{ tierPages[tIdx] }} / {{ Math.ceil(tier.items.length / pageSize) }}</span>
          <button type="button" class="obs-pager__btn" :disabled="tierPages[tIdx] >= Math.ceil(tier.items.length / pageSize)" @click="tierPages[tIdx]++">
            <Icon name="lucide:chevron-right" class="obs-pager__icon" />
          </button>
        </nav>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">

import { computed, ref, reactive, watch } from 'vue'
import type { SpeculatorIndexEntry } from '@/lib/observatory-analysis'

const { t } = useI18n()

const props = defineProps<{
  items: SpeculatorIndexEntry[]
  showAll: boolean
  highlight?: string | null
}>()

const emit = defineEmits<{
  'fly-to-enterprise': [name: string]
  'update:showAll': [v: boolean]
  'update:highlight': [v: string | null]
  'report-enterprise': [name: string, score: number, flags: string[]]
}>()

const pageSize = 20
const infoOpen = ref(false)
const highlighted = ref<string | null>(null)
const tierCollapsed = reactive([false, false, false])
const tierPages = reactive([1, 1, 1])

watch(() => props.showAll, () => { tierPages.fill(1) })
watch(() => props.items, () => { tierPages.fill(1) })

const criticalItems = computed(() => sortedItems.value.filter(d => d.suspicionScore >= 8))
const highItems = computed(() => sortedItems.value.filter(d => d.suspicionScore >= 6 && d.suspicionScore < 8))
const mediumItems = computed(() => sortedItems.value.filter(d => d.suspicionScore < 6))

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    if (b.suspicionScore !== a.suspicionScore) return b.suspicionScore - a.suspicionScore
    return b.totalAreaHa - a.totalAreaHa
  })
})

const visibleItems = computed(() => {
  return props.showAll ? sortedItems.value : sortedItems.value.slice(0, 20)
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedItems.value.length / pageSize)))

const sortedTiers = computed(() => {
  const tiers = [
    { label: t('observatory.dangerPanel.critical'), color: 'var(--danger)', items: criticalItems.value },
    { label: t('observatory.dangerPanel.high'), color: 'var(--warning)', items: highItems.value },
    { label: t('observatory.dangerPanel.medium'), color: 'var(--success)', items: mediumItems.value },
  ]
  return tiers.filter(t => t.items.length > 0)
})

function pagedTierItems(items: SpeculatorIndexEntry[]) {
  if (!props.showAll) return items.slice(0, 20)
  const idx = sortedTiers.value.findIndex(t => t.label === findTierLabelForItem(items[0]))
  const page = idx >= 0 ? tierPages[idx] : 1
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

function findTierLabelForItem(item: SpeculatorIndexEntry): string {
  if (item.suspicionScore >= 8) return t('observatory.dangerPanel.critical')
  if (item.suspicionScore >= 6) return t('observatory.dangerPanel.high')
  return t('observatory.dangerPanel.medium')
}

function needPagination(items: SpeculatorIndexEntry[]) {
  return props.showAll && items.length > pageSize
}

function dangerColor(score: number) {
  if (score >= 8) return 'var(--danger)'
  if (score >= 6) return 'var(--warning)'
  return 'var(--success)'
}

function formatArea(ha: number) {
  if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
  if (ha >= 1000) return `${Math.round(ha / 1000)}K`
  return `${ha}`
}

function flagLabel(flag: string): string {
  const map: Record<string, string> = {
    RECENT_RUSH: 'Rush',
    CARPET_BOMBING: 'Carpet',
    HIGH_VOLUME: 'High Vol',
    LARGE_AREA_FEW_SUBS: 'Few Subs',
    MULTI_UF: 'Multi-UF',
  }
  return map[flag] || flag.slice(0, 6)
}

function flagTooltip(flag: string): string {
  const map: Record<string, string> = {
    RECENT_RUSH: t('observatory.dangerPanel.flagRecentRush'),
    CARPET_BOMBING: t('observatory.dangerPanel.flagCarpet'),
    HIGH_VOLUME: t('observatory.dangerPanel.flagHighVol'),
    LARGE_AREA_FEW_SUBS: t('observatory.dangerPanel.flagFewSubs'),
    MULTI_UF: t('observatory.dangerPanel.flagMultiUf'),
  }
  return map[flag] || flag
}

function onHighlight(name: string) {
  highlighted.value = name
  emit('update:highlight', name)
}

function onClearHighlight() {
  highlighted.value = null
  emit('update:highlight', null)
}

function onFlyTo(name: string) {
  emit('fly-to-enterprise', name)
}

function openReport(d: SpeculatorIndexEntry) {
  emit('report-enterprise', d.displayName, d.suspicionScore, d.suspicionFlags)
}

</script>

<style scoped>
.obs-tab { display: flex; flex-direction: column; gap: 6px; }

.obs-tab__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 4px 6px;
}

.obs-tab__title {
  margin: 0; display: flex; align-items: center; gap: 6px;
  font-size: clamp(9px, 1.4vw, 12px); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--obs-text-label);
}

.obs-tab__title-icon { width: 12px; height: 12px; color: var(--obs-red); }

.obs-tab__toggle {
  background: transparent; border: 1px solid var(--obs-panel-border);
  color: var(--obs-text-label); font-size: clamp(8px, 1.3vw, 11px); font-weight: 700;
  padding: 3px clamp(6px, 1.2vw, 12px); border-radius: 4px; cursor: pointer; font-family: inherit;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.obs-tab__toggle:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
  color: var(--obs-text-primary);
}

.obs-tab__empty {
  display: flex; flex-direction: column; align-items: center; gap: clamp(6px, 1.2vw, 14px);
  padding: clamp(14px, 2vw, 28px) clamp(8px, 1.5vw, 16px); text-align: center;
  color: var(--obs-text-dim); font-size: clamp(10px, 1.5vw, 13px);
}

.obs-tab__empty-icon { width: 20px; height: 20px; opacity: 0.4; }

.obs-expand { margin: 0 2px; }

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

.obs-expand__legend {
  list-style: none; margin: 6px 0; padding: 0;
  display: flex; flex-direction: column; gap: 4px;
}

.obs-expand__legend li { display: flex; align-items: center; gap: 6px; }

.obs-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.obs-expand__footnote {
  font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-dim); font-style: italic; margin: 6px 0 0;
}

.obs-tier-head {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 4px 3px; margin-top: 2px;
}

.obs-tier-head__accent { width: 3px; height: 12px; border-radius: 2px; flex-shrink: 0; }

.obs-tier-head__label {
  font-size: clamp(9px, 1.4vw, 12px); font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.06em; flex: 1;
}

.obs-tier-head__count {
  font-size: clamp(8px, 1.3vw, 11px); font-weight: 700; font-family: ui-monospace, monospace;
  color: var(--obs-text-dim); background: rgba(255,255,255,0.04);
  padding: 1px 5px; border-radius: 3px;
}

.obs-tier-head__toggle {
  background: none; border: none; color: var(--obs-text-dim);
  cursor: pointer; padding: 2px; border-radius: 3px;
  display: flex; align-items: center;
  transition: color 0.12s;
}

.obs-tier-head__toggle:hover { color: var(--obs-text-primary); }

.obs-tier-head__toggle-icon { width: 11px; height: 11px; }

.obs-card-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }

.obs-card {
  display: flex; gap: 1px;
  animation: obs-card-enter 0.3s ease both;
  animation-delay: var(--anim-delay, 0s);
  border-radius: 7px;
  transition: box-shadow 0.15s;
}

.obs-card--highlighted {
  box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 0 16px rgba(255,255,255,0.06);
}

@keyframes obs-card-enter {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.obs-card__btn {
  flex: 1; display: flex; text-align: left;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--obs-panel-border);
  border-radius: 7px; overflow: hidden; cursor: pointer;
  font-family: inherit; color: inherit; padding: 0;
  transition: background 0.12s, border-color 0.12s;
  min-width: 0;
}

.obs-card__btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}

.obs-card--highlighted .obs-card__btn {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
}

.obs-card__btn:focus-visible { outline: 2px solid var(--obs-blue); outline-offset: 2px; }

.obs-card__btn-accent { width: 3px; flex-shrink: 0; }

.obs-card__btn-body { flex: 1; padding: clamp(4px, 1vw, 8px) clamp(6px, 1.2vw, 12px); min-width: 0; }

.obs-card__btn-top { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

.obs-card__btn-score {
  display: inline-block; font-size: clamp(8px, 1.3vw, 11px); font-weight: 800;
  padding: 1px 4px; border-radius: 3px; color: #fff;
  font-family: ui-monospace, monospace; line-height: 1.3;
}

.obs-card__btn-name {
  flex: 1; font-size: clamp(10px, 1.5vw, 13px); font-weight: 600; color: var(--obs-text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}

.obs-card__btn-count {
  font-size: clamp(7px, 1.2vw, 10px); font-weight: 700; color: var(--obs-text-dim);
  font-family: ui-monospace, monospace;
}

.obs-card__trend-icon {
  width: 10px; height: 10px; color: var(--obs-amber); flex-shrink: 0;
}

.obs-card__btn-bar { height: 2px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin: 4px 0; }

.obs-card__btn-bar-fill { height: 100%; border-radius: 2px; transition: width 0.25s ease; }

.obs-card__btn-meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-muted); font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }

.obs-card__meta-icon { width: 7px; height: 7px; margin-right: 1px; vertical-align: middle; opacity: 0.6; }

.obs-card__btn-subs { display: flex; align-items: center; gap: 3px; font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-dim); margin-top: 2px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.obs-card__subs-icon { width: 7px; height: 7px; flex-shrink: 0; opacity: 0.5; }

.obs-card__btn-flags { display: flex; gap: 2px; flex-wrap: wrap; margin-top: 3px; }

.obs-card__flag-badge { font-size: clamp(7px, 1.2vw, 10px); font-weight: 800; padding: 1px 4px; border-radius: 2px; background: rgba(93,173,226,0.12); color: var(--obs-blue-light); letter-spacing: 0.02em; cursor: help; }

.obs-card__flag-badge--more { background: rgba(255,255,255,0.05); color: var(--obs-text-dim); }

.obs-card__actions {
  display: flex; flex-direction: column; gap: 2px; padding: clamp(4px, 1vw, 8px) 4px;
  flex-shrink: 0; align-self: center;
}

.obs-card__action-btn {
  width: clamp(20px, 4vw, 28px); height: clamp(20px, 4vw, 28px); display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid transparent; border-radius: 4px;
  color: var(--obs-text-dim); cursor: pointer; font-family: inherit;
  transition: all 0.12s;
}

.obs-card__action-btn:hover { background: rgba(255,255,255,0.06); color: var(--obs-text-primary); border-color: var(--obs-panel-border); }

.obs-card__action-icon { width: 11px; height: 11px; }

.obs-pager { display: flex; align-items: center; justify-content: center; gap: 6px; padding: clamp(4px, 1vw, 8px) 0 2px; }

.obs-pager__btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: clamp(20px, 4vw, 28px); height: clamp(18px, 3.5vw, 26px); background: rgba(255,255,255,0.04);
  color: var(--obs-text-body); border: 1px solid var(--obs-panel-border);
  border-radius: 4px; cursor: pointer; font-family: inherit;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.obs-pager__btn:hover:not(:disabled) { background: rgba(231,76,60,0.1); border-color: rgba(231,76,60,0.25); color: var(--obs-red); }
.obs-pager__btn:disabled { opacity: 0.25; cursor: not-allowed; }
.obs-pager__icon { width: 10px; height: 10px; }
.obs-pager__info { font-size: clamp(8px, 1.3vw, 11px); font-weight: 600; color: var(--obs-text-muted); font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }

.obs-fade-enter-active, .obs-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.obs-fade-enter-from, .obs-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@media (prefers-reduced-motion: reduce) {
  .obs-card { animation: none; }
  .obs-card__btn-bar-fill, .obs-card, .obs-card__btn, .obs-expand__body { transition: none; }
  .obs-fade-enter-active, .obs-fade-leave-active { transition: none; }
}
</style>
