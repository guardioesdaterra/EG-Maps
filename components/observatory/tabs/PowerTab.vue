/**
 * components/observatory/tabs/PowerTab.vue
 * @why Power tab — data-driven socio-military picture from deep_analysis:
 *      military-critical claims, foreign capital share, secrecy (sigilo)
 *      stats and the top suspicious speculators. Turns the analysis JSON
 *      into first-class panel content instead of an unused download.
 * @component PowerTab
 * @props analysis, highlight
 * @emits 'update:highlight': [v: string | null]
 *         'fly-to-enterprise': [name: string]
 * @deps vue (computed, ref); @/composables/useRareEarthData (type DeepAnalysis)
 */
<template>
  <div class="obs-tab">
    <div v-if="!analysis" class="obs-tab__hint">{{ t('observatory.power.noData') }}</div>
    <template v-else>
      <!-- ── Military-critical ─────────────────────────────── -->
      <div class="obs-callout obs-callout--danger">
        <div class="obs-callout__head">
          <Icon name="lucide:shield" class="obs-callout__icon" />
          <h3 class="obs-callout__title">{{ t('observatory.power.militaryTitle') }}</h3>
        </div>
        <div class="obs-kpis" role="list">
          <div class="obs-kpi" role="listitem">
            <span class="obs-kpi__value">{{ (analysis.military_critical?.total_claims ?? 0).toLocaleString() }}</span>
            <span class="obs-kpi__label">{{ t('observatory.power.criticalClaims') }}</span>
          </div>
          <div class="obs-kpi" role="listitem">
            <span class="obs-kpi__value">{{ formatHa(analysis.military_critical?.total_area_ha ?? 0) }}</span>
            <span class="obs-kpi__label">{{ t('observatory.power.criticalArea') }}</span>
          </div>
          <div class="obs-kpi" role="listitem">
            <span class="obs-kpi__value">{{ (analysis.military_critical?.us_connected_claims ?? 0).toLocaleString() }}</span>
            <span class="obs-kpi__label">{{ t('observatory.power.usConnected') }}</span>
          </div>
        </div>
      </div>

      <!-- ── Foreign capital ───────────────────────────────── -->
      <h4 v-if="foreignEntries.length || liveForeign.length" class="obs-section-title">
        <Icon name="lucide:globe" class="obs-section-title__icon" />
        {{ t('observatory.power.foreignTitle') }}
      </h4>
      <ul v-if="foreignEntries.length" class="obs-bars" role="list">
        <li v-for="f in foreignEntries" :key="f.key" class="obs-bar-row">
          <span class="obs-bar-row__label">{{ f.key }}</span>
          <span class="obs-bar-row__track" aria-hidden="true">
            <span class="obs-bar-row__fill" :style="{ width: `${Math.max(2, f.share)}%` }" />
          </span>
          <span class="obs-bar-row__count">{{ f.claims.toLocaleString() }} · {{ f.pct }}%</span>
        </li>
      </ul>

      <!-- ── Live foreign holders in the loaded region ───────── -->
      <ul v-if="liveForeign.length" class="obs-card-list" role="list">
        <li
          v-for="h in liveForeign"
          :key="`${h.country}::${h.name}`"
          class="obs-card"
          :class="{ 'obs-card--highlighted': highlighted === h.name }"
          @mouseenter="onHighlight(h.name)"
          @mouseleave="onClearHighlight"
        >
          <button type="button" class="obs-card__btn" :aria-label="h.name" @click="onFlyTo(h.name)">
            <div class="obs-card__btn-accent" style="background: var(--danger)" />
            <div class="obs-card__btn-body">
              <div class="obs-card__btn-top">
                <span class="obs-card__flag">{{ flagFor(h.country) }}</span>
                <span class="obs-card__btn-name" :title="h.name">{{ h.name }}</span>
                <span class="obs-card__btn-count">{{ h.country }}</span>
              </div>
              <div class="obs-card__btn-meta">
                <span>{{ h.claims }} {{ t('observatory.power.claims') }}</span>
                <span>{{ formatHa(h.areaHa) }} ha</span>
              </div>
            </div>
          </button>
        </li>
      </ul>

      <!-- ── Secrecy ───────────────────────────────────────── -->
      <div v-if="analysis.sigilo_stats" class="obs-callout obs-callout--warn">
        <div class="obs-callout__head">
          <Icon name="lucide:eye-off" class="obs-callout__icon" />
          <h3 class="obs-callout__title">{{ t('observatory.power.sigiloTitle') }}</h3>
        </div>
        <p class="obs-callout__body">
          {{ t('observatory.power.sigiloBody', {
            total: analysis.sigilo_stats.total,
            pct: analysis.sigilo_stats.pct,
            area: formatHa(analysis.sigilo_stats.total_area_ha),
          }) }}
        </p>
      </div>

      <!-- ── Top suspicious ────────────────────────────────── -->
      <h4 v-if="topSuspicious.length" class="obs-section-title">
        <Icon name="lucide:radar" class="obs-section-title__icon" />
        {{ t('observatory.power.topTitle') }}
      </h4>
      <ul v-if="topSuspicious.length" class="obs-card-list" role="list">
        <li
          v-for="s in topSuspicious"
          :key="s.name"
          class="obs-card"
          :class="{ 'obs-card--highlighted': highlighted === s.name }"
          @mouseenter="onHighlight(s.name)"
          @mouseleave="onClearHighlight"
        >
          <button type="button" class="obs-card__btn" :aria-label="s.name" @click="onFlyTo(s.name)">
            <div class="obs-card__btn-accent" :style="{ background: scoreColor(s.score) }" />
            <div class="obs-card__btn-body">
              <div class="obs-card__btn-top">
                <span class="obs-card__btn-score" :style="{ background: scoreColor(s.score) }">{{ s.score }}</span>
                <span class="obs-card__btn-name" :title="s.name">{{ s.name }}</span>
              </div>
              <div class="obs-card__btn-meta">
                <span>{{ s.claims }} {{ t('observatory.power.claims') }}</span>
                <span>{{ formatHa(s.area_ha) }} ha</span>
                <span v-if="s.subs?.length">{{ s.subs.slice(0, 3).join(' · ') }}</span>
              </div>
              <div v-if="s.flags?.length" class="obs-card__btn-flags">
                <span v-for="flag in s.flags.slice(0, 3)" :key="flag" class="obs-card__flag-badge">{{ flag }}</span>
              </div>
            </div>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DeepAnalysis } from '@/composables/useRareEarthData'
import type { ForeignHolderRank } from '@/lib/enterprise-data'

const { t } = useI18n()

const props = defineProps<{
  analysis?: DeepAnalysis | null
  foreignHolders?: ForeignHolderRank[] | null
  highlight?: string | null
}>()

const emit = defineEmits<{
  'update:highlight': [v: string | null]
  'fly-to-enterprise': [name: string]
}>()

const highlighted = ref<string | null>(null)

const foreignEntries = computed(() => {
  const fc = (props.analysis?.foreign_claims ?? {}) as Record<string, { total_claims: number; total_area_ha: number; pct: number }>
  const max = Math.max(...Object.values(fc).map(v => v.total_claims), 1)
  return Object.entries(fc)
    .map(([key, v]) => ({ key, claims: v.total_claims ?? 0, pct: v.pct ?? 0, share: Math.round(((v.total_claims ?? 0) / max) * 100) }))
    .filter(f => f.claims > 0)
    .sort((a, b) => b.claims - a.claims)
})

interface SuspiciousHolder {
  name: string
  score: number
  flags: string[]
  claims: number
  area_ha: number
  subs: string[]
  recent_pct: number
}

const topSuspicious = computed<SuspiciousHolder[]>(() => {
  const raw = props.analysis as unknown as Record<string, unknown> | null | undefined
  const list = raw?.top_suspicious
  if (!Array.isArray(list)) return []
  return (list as SuspiciousHolder[]).slice(0, 10)
})

const liveForeign = computed<ForeignHolderRank[]>(() => (props.foreignHolders ?? []).slice(0, 8))

function flagFor(country: string): string {
  const map: Record<string, string> = {
    Australia: '🇦🇺',
    'United States': '🇺🇸',
    USA: '🇺🇸',
    UK: '🇬🇧',
    Canada: '🇨🇦',
    China: '🇨🇳',
    Chile: '🇨🇱',
  }
  return map[country] ?? '🏴'
}

function formatHa(ha: number): string {
  if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
  if (ha >= 1000) return `${Math.round(ha / 1000)}K`
  return `${Math.round(ha)}`
}

function scoreColor(score: number): string {
  if (score >= 8) return 'var(--danger)'
  if (score >= 6) return 'var(--warning)'
  return 'var(--success)'
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
</script>

<style scoped>
.obs-tab { display: flex; flex-direction: column; gap: 8px; }
.obs-tab__hint { font-size: clamp(9px, 1.4vw, 12px); color: var(--obs-text-dim); font-style: italic; padding: 2px 4px; margin: 0; }

.obs-callout { padding: clamp(8px, 1.5vw, 14px); background: rgba(231,76,60,0.05); border: 1px solid rgba(231,76,60,0.12); border-radius: 8px; border-left: 3px solid var(--obs-red); }
.obs-callout--warn { background: rgba(243,156,18,0.05); border-color: rgba(243,156,18,0.12); border-left-color: var(--obs-amber); }
.obs-callout__head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.obs-callout__icon { width: 13px; height: 13px; color: var(--obs-red); flex-shrink: 0; }
.obs-callout--warn .obs-callout__icon { color: var(--obs-amber); }
.obs-callout__title { margin: 0; font-size: clamp(10px, 1.5vw, 13px); font-weight: 700; color: var(--obs-red); }
.obs-callout--warn .obs-callout__title { color: var(--obs-amber); }
.obs-callout__body { margin: 0; font-size: clamp(9.5px, 1.5vw, 12.5px); color: var(--obs-text-body); line-height: 1.5; }
.obs-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.obs-kpi { display: flex; flex-direction: column; gap: 1px; padding: 6px 4px; background: rgba(0,0,0,0.25); border: 1px solid var(--obs-panel-border); border-radius: 6px; text-align: center; min-width: 0; }
.obs-kpi__value { font-size: clamp(12px, 1.8vw, 16px); font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
.obs-kpi__label { font-size: clamp(7px, 1.2vw, 10px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--obs-text-dim); }

.obs-section-title { margin: 2px 0 0; display: flex; align-items: center; gap: 5px; font-size: clamp(9px, 1.4vw, 12px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--obs-text-label); }
.obs-section-title__icon { width: 11px; height: 11px; color: var(--obs-text-dim); }

.obs-bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.obs-bar-row { display: grid; grid-template-columns: auto 1fr auto; gap: 6px; align-items: center; }
.obs-bar-row__label { font-size: clamp(9px, 1.4vw, 12px); font-weight: 700; color: var(--obs-text-primary); text-transform: uppercase; letter-spacing: 0.03em; }
.obs-bar-row__track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.obs-bar-row__fill { display: block; height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--obs-amber), var(--obs-red)); }
.obs-bar-row__count { font-size: clamp(8px, 1.3vw, 11px); font-weight: 600; font-family: ui-monospace, monospace; color: var(--obs-text-dim); font-variant-numeric: tabular-nums; }

.obs-card-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.obs-card { display: flex; border-radius: 7px; transition: box-shadow 0.15s; }
.obs-card--highlighted { box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 0 16px rgba(255,255,255,0.06); }
.obs-card__btn { flex: 1; display: flex; text-align: left; background: rgba(255,255,255,0.02); border: 1px solid var(--obs-panel-border); border-radius: 7px; overflow: hidden; cursor: pointer; font-family: inherit; color: inherit; padding: 0; transition: background 0.12s, border-color 0.12s; min-width: 0; }
.obs-card__btn:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); }
.obs-card__btn-accent { width: 3px; flex-shrink: 0; }
.obs-card__btn-body { flex: 1; padding: clamp(4px, 1vw, 8px) clamp(6px, 1.2vw, 12px); min-width: 0; }
.obs-card__btn-top { display: flex; align-items: center; gap: 6px; }
.obs-card__btn-score { display: inline-block; font-size: clamp(8px, 1.3vw, 11px); font-weight: 800; padding: 1px 5px; border-radius: 3px; color: #fff; font-family: ui-monospace, monospace; }
.obs-card__btn-name { flex: 1; font-size: clamp(10px, 1.5vw, 13px); font-weight: 600; color: var(--obs-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.obs-card__btn-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 3px; font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-muted); font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.obs-card__btn-flags { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 4px; }
.obs-card__flag-badge { font-size: clamp(7px, 1.2vw, 10px); font-weight: 800; padding: 1px 5px; border-radius: 3px; background: rgba(93,173,226,0.12); color: var(--obs-blue-light); letter-spacing: 0.02em; }
.obs-card__flag { font-size: clamp(13px, 2vw, 16px); line-height: 1; flex-shrink: 0; }

@media (prefers-reduced-motion: reduce) { .obs-card { transition: none; } }
</style>
