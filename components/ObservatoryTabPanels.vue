<template>
  <div class="obs-tab-content">
    <template v-if="activeTab === 'danger'">
      <template v-if="!showAll">
        <button v-for="d in dangerItems" :key="d.normalizedName" type="button" class="obs-danger-row" @click="emit('flyToEnterprise', d.displayName)">
          <div class="obs-danger-row__head">
            <span class="obs-danger-row__score" :style="{ color: dangerColor(d.suspicionScore) }">{{ d.suspicionScore.toFixed(1) }}</span>
            <span class="obs-danger-row__name">{{ d.displayName }}</span>
            <span v-if="d.suspicionFlags && d.suspicionFlags.length" class="obs-danger-row__network" :title="d.suspicionFlags.join(', ')">{{ d.suspicionFlags.length }}!</span>
          </div>
          <div class="obs-danger-row__bar">
            <div class="obs-danger-row__bar-fill" :style="{ width: `${d.suspicionScore * 10}%`, background: dangerColor(d.suspicionScore) }" />
          </div>
          <div class="obs-danger-row__meta">
            <span>{{ d.count }} proc.</span>
            <span>{{ Math.round(d.totalAreaHa / 1000) }}K ha</span>
            <span>{{ d.ufs.join(', ') }}</span>
          </div>
          <div class="obs-danger-row__substances">{{ d.subs.slice(0, 4).join(' · ') }}</div>
        </button>
      </template>
      <template v-else>
        <div class="obs-table-controls">
          <label class="obs-table-sort">
            <span class="obs-table-sort__label">Sort:</span>
            <select v-model="sortKey" class="obs-table-sort__select">
              <option value="score">Danger score</option>
              <option value="claims"># Claims</option>
              <option value="area">Area (ha)</option>
              <option value="recency">Recency %</option>
            </select>
          </label>
          <span class="obs-table-count">{{ sortedItems.length.toLocaleString() }} entries</span>
        </div>
        <div class="obs-table-wrap">
          <table class="obs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Enterprise</th>
                <th class="obs-table-num">Score</th>
                <th class="obs-table-num">Claims</th>
                <th class="obs-table-num">Area</th>
                <th class="obs-table-num">Rec.</th>
                <th>UFs</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in pagedItems" :key="d.normalizedName" class="obs-table-row" @click="emit('flyToEnterprise', d.displayName)">
                <td class="obs-table-num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="obs-table-name" :title="d.displayName">{{ d.displayName }}</td>
                <td class="obs-table-num" :style="{ color: dangerColor(d.suspicionScore) }">{{ d.suspicionScore.toFixed(1) }}</td>
                <td class="obs-table-num">{{ d.count.toLocaleString() }}</td>
                <td class="obs-table-num">{{ Math.round(d.totalAreaHa / 1000) }}K</td>
                <td class="obs-table-num">{{ d.recentPct ?? '—' }}%</td>
                <td class="obs-table-ufs">{{ d.ufs.join(', ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="obs-table-pager">
          <button type="button" class="obs-table-pager__btn" :disabled="currentPage === 1" @click="currentPage--">←</button>
          <span class="obs-table-pager__info">{{ currentPage }} / {{ totalPages }}</span>
          <button type="button" class="obs-table-pager__btn" :disabled="currentPage >= totalPages" @click="currentPage++">→</button>
        </div>
      </template>
    </template>

    <template v-else-if="activeTab === 'military'">
      <div class="obs-callout obs-callout--red">
        <div class="obs-callout__title">{{ t('observatory.military.headline') }}</div>
        <div class="obs-callout__body">{{ t('observatory.military.headlineBody') }}</div>
      </div>
      <div v-for="m in MILITARY_ASSETS" :key="m.name" class="obs-asset" :style="{ borderLeftColor: '#e74c3c' }">
        <div class="obs-asset__head">
          <span class="obs-asset__flag">{{ m.flag }}</span>
          <span class="obs-asset__name">{{ m.name }}</span>
          <span v-if="m.kgPerUnit" class="obs-asset__kg">{{ m.kgPerUnit.toLocaleString() }} kg REE</span>
        </div>
        <div class="obs-asset__body">{{ m.description }}</div>
      </div>
      <div v-for="i in US_INVESTMENTS" :key="`${i.from}-${i.to}-${i.year}`" class="obs-asset" :style="{ borderLeftColor: '#f39c12' }">
        <div class="obs-asset__head">
          <span class="obs-asset__name">{{ i.from }} → {{ i.to }}</span>
          <span class="obs-asset__kg">{{ i.amount }}</span>
        </div>
        <div class="obs-asset__body">{{ i.year }}</div>
      </div>
    </template>

    <template v-else-if="activeTab === 'illegal'">
      <div v-for="p in ILLEGAL_PATTERNS" :key="p.titleKey" class="obs-pattern" :style="{ borderLeftColor: p.color }">
        <div class="obs-pattern__title" :style="{ color: p.color }">{{ t(p.titleKey) }}</div>
        <div class="obs-pattern__body">{{ t(p.descKey) }}</div>
        <div v-for="(e, i) in p.examples" :key="i" class="obs-pattern__example">• {{ t(e.key) }}</div>
      </div>
    </template>

    <template v-else-if="activeTab === 'env'">
      <button v-for="r in ENV_REGIONS" :key="r.regionKey" type="button" class="obs-region" :style="{ borderLeftColor: dangerColor(r.danger) }" :disabled="!r.coord" @click="r.coord && emit('flyToCoord', r.coord)">
        <div class="obs-region__head">
          <span class="obs-region__score" :style="{ color: dangerColor(r.danger) }">{{ r.danger.toFixed(1) }}</span>
          <span class="obs-region__name">{{ r.regionLabel }}</span>
        </div>
        <div class="obs-region__companies">
          <span v-for="c in r.companies" :key="c" class="obs-region__company">{{ c }}</span>
        </div>
        <div v-for="(risk, i) in r.risks" :key="i" class="obs-region__risk">⚠ {{ risk }}</div>
      </button>
    </template>

    <template v-else-if="activeTab === 'network'">
      <div v-for="n in NETWORK_NOTES" :key="n.titleKey" class="obs-network" :style="{ borderLeftColor: n.color }">
        <div class="obs-network__title" :style="{ color: n.color }">{{ t(n.titleKey) }}</div>
        <div class="obs-network__body">{{ t(n.bodyKey) }}</div>
      </div>
    </template>

    <template v-else-if="activeTab === 'timeline'">
      <div v-for="entry in TIMELINE_HIGHLIGHTS" :key="entry.year" class="obs-timeline" :class="{ 'obs-timeline--event': entry.event }">
        <span class="obs-timeline__year">{{ entry.year }}</span>
        <div class="obs-timeline__content">
          <div class="obs-timeline__bar">
            <div class="obs-timeline__bar-fill" :style="{ width: `${(entry.count / maxTimelineCount) * 100}%`, background: barColor(entry.count) }" />
          </div>
          <div class="obs-timeline__count">{{ entry.count.toLocaleString() }} claims (cum. {{ cumulative(entry.year).toLocaleString() }})</div>
          <div v-if="entry.event" class="obs-timeline__event">← {{ entry.event }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  MILITARY_ASSETS,
  US_INVESTMENTS,
  ILLEGAL_PATTERNS,
  ENV_REGIONS,
  NETWORK_NOTES,
  TIMELINE_HIGHLIGHTS,
  type EnvRegion,
  type IllegalPattern,
  type NetworkNote,
  type TimelineHighlight,
} from '@/lib/observatory-tabs'

interface DangerItem {
  displayName: string
  suspicionScore: number
  count: number
  totalAreaHa: number
  ufs: string[]
  subs: string[]
  normalizedName?: string
  recentPct?: number
  suspicionFlags?: string[]
}

interface MilitaryAsset { flag: string; name: string; country?: string; kgPerUnit: number | null; description: string }
interface InvestmentFlow { from: string; to: string; amount: string; year: number }

const props = defineProps<{
  activeTab: string
  dangerItems: DangerItem[]
  showAll?: boolean
}>()

const emit = defineEmits<{
  flyToEnterprise: [name: string]
  flyToCoord: [coord: [number, number]]
}>()

const { t } = useI18n()

const sortKey = ref<'score' | 'claims' | 'area' | 'recency'>('score')
const currentPage = ref(1)
const pageSize = 20

watch(() => props.activeTab, () => { currentPage.value = 1 })
watch(() => props.showAll, (v) => { if (!v) currentPage.value = 1 })

const sortedItems = computed(() => {
  const list = [...props.dangerItems]
  switch (sortKey.value) {
    case 'claims': return list.sort((a, b) => b.count - a.count)
    case 'area': return list.sort((a, b) => b.totalAreaHa - a.totalAreaHa)
    case 'recency': return list.sort((a, b) => (b.recentPct ?? 0) - (a.recentPct ?? 0))
    default: return list.sort((a, b) => b.suspicionScore - a.suspicionScore)
  }
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedItems.value.length / pageSize)))
const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sortedItems.value.slice(start, start + pageSize)
})

const maxTimelineCount = computed(() => Math.max(...TIMELINE_HIGHLIGHTS.map(t => t.count), 1))
const cumulativeMap = computed(() => {
  const m: Record<number, number> = {}
  let cum = 0
  for (const entry of TIMELINE_HIGHLIGHTS) { cum += entry.count; m[entry.year] = cum }
  return m
})
function cumulative(year: number) { return cumulativeMap.value[year] ?? 0 }

function dangerColor(score: number) {
  if (score >= 8) return '#e74c3c'
  if (score >= 6) return '#f39c12'
  return '#27ae60'
}

function barColor(count: number) {
  if (count > 2000) return '#c0392b'
  if (count > 800) return '#f39c12'
  return '#27ae60'
}
</script>

<style scoped>
.obs-tab-content { display: flex; flex-direction: column; gap: 6px; }

.obs-danger-row {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;
  margin-bottom: 6px;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
}
.obs-danger-row:hover .obs-danger-row__name { color: #fff; }
.obs-danger-row__head { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.obs-danger-row__score { font-weight: 800; font-size: 10px; }
.obs-danger-row__name { font-weight: 600; font-size: 11px; color: #e0e0e0; }
.obs-danger-row__network { font-size: 7.5px; padding: 1px 4px; border-radius: 2px; font-weight: 700; background: rgba(41,128,185,0.2); color: #5dade2; }
.obs-danger-row__bar { height: 3px; border-radius: 2px; background: rgba(255,255,255,0.06); margin: 3px 0; overflow: hidden; }
.obs-danger-row__bar-fill { height: 100%; border-radius: 2px; }
.obs-danger-row__meta { font-size: 9px; color: #666; display: flex; gap: 6px; flex-wrap: wrap; }
.obs-danger-row__substances { font-size: 9px; color: #555; margin-top: 2px; line-height: 1.35; }

.obs-callout { border-left: 3px solid #e74c3c; padding: 8px; margin-bottom: 6px; }
.obs-callout__title { font-weight: 700; color: #e74c3c; font-size: 12px; }
.obs-callout__body { font-size: 9px; color: #888; line-height: 1.4; margin-top: 4px; }

.obs-asset { border-left: 3px solid; padding: 8px; margin-bottom: 6px; }
.obs-asset__head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.obs-asset__flag { font-size: 11px; }
.obs-asset__name { font-weight: 600; font-size: 11px; color: #ddd; }
.obs-asset__kg { font-size: 9px; padding: 1px 5px; border-radius: 2px; font-weight: 700; background: rgba(231,76,60,0.2); color: #e74c3c; }
.obs-asset__body { font-size: 9px; color: #888; margin-top: 2px; }

.obs-pattern { border-left: 3px solid; padding: 8px; margin-bottom: 6px; }
.obs-pattern__title { font-weight: 700; font-size: 11px; }
.obs-pattern__body { font-size: 9px; color: #888; line-height: 1.4; margin-top: 2px; }
.obs-pattern__example { font-size: 9px; color: #666; margin-top: 2px; padding-left: 8px; border-left: 2px solid rgba(255,255,255,0.06); }

.obs-region {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  border-left: 3px solid;
  padding: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
}
.obs-region:disabled { cursor: not-allowed; opacity: 0.6; }
.obs-region__head { display: flex; align-items: center; gap: 4px; }
.obs-region__score { font-weight: 800; font-size: 10px; }
.obs-region__name { font-weight: 600; font-size: 11px; color: #e0e0e0; }
.obs-region__companies { font-size: 9px; color: #888; margin: 2px 0; display: flex; flex-wrap: wrap; gap: 2px; }
.obs-region__company { display: inline-block; font-size: 7.5px; padding: 1px 4px; border-radius: 2px; font-weight: 700; background: rgba(41,128,185,0.2); color: #5dade2; margin: 1px; }
.obs-region__risk { font-size: 9px; color: #666; line-height: 1.35; margin-top: 1px; }

.obs-network { padding: 6px; font-size: 10px; color: #888; line-height: 1.5; border-left: 3px solid; margin-bottom: 6px; }
.obs-network__title { font-weight: 700; }
.obs-network__body { font-size: 10px; color: #888; line-height: 1.5; }

.obs-timeline { display: flex; gap: 6px; align-items: flex-start; padding: 3px 0; font-size: 9px; }
.obs-timeline--event { font-weight: 700; color: #e74c3c; }
.obs-timeline__year { width: 32px; flex-shrink: 0; color: #666; }
.obs-timeline__content { flex: 1; }
.obs-timeline__bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.obs-timeline__bar-fill { height: 100%; border-radius: 3px; }
.obs-timeline__count { font-size: 8px; color: #666; margin-top: 1px; }
.obs-timeline__event { font-size: 8px; color: #e74c3c; margin-top: 1px; }

.obs-table-controls { display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; background: rgba(255,255,255,0.04); border-radius: 3px; }
.obs-table-sort { display: flex; align-items: center; gap: 4px; font-size: 9px; color: #999; }
.obs-table-sort__label { font-weight: 600; }
.obs-table-sort__select { background: rgba(0,0,0,0.4); color: #ddd; border: 1px solid rgba(255,255,255,0.1); border-radius: 2px; padding: 1px 4px; font-size: 9px; font-family: inherit; cursor: pointer; }
.obs-table-count { font-size: 9px; color: #888; }

.obs-table-wrap { max-height: 420px; overflow: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 3px; }
.obs-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
.obs-table th { position: sticky; top: 0; background: rgba(0,0,0,0.9); text-align: left; padding: 4px 6px; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; border-bottom: 1px solid rgba(255,255,255,0.08); z-index: 1; }
.obs-table td { padding: 3px 6px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.obs-table-row { cursor: pointer; transition: background 0.1s; }
.obs-table-row:hover { background: rgba(231,76,60,0.08); }
.obs-table-num { text-align: right; font-variant-numeric: tabular-nums; }
.obs-table-name { font-weight: 600; color: #e0e0e0; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.obs-table-ufs { font-size: 8.5px; color: #888; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.obs-table-pager { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 6px 0 0; }
.obs-table-pager__btn { background: rgba(255,255,255,0.06); color: #ddd; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; padding: 2px 10px; font-size: 11px; cursor: pointer; font-family: inherit; }
.obs-table-pager__btn:hover:not(:disabled) { background: rgba(231,76,60,0.2); border-color: #e74c3c; }
.obs-table-pager__btn:disabled { opacity: 0.3; cursor: not-allowed; }
.obs-table-pager__info { font-size: 10px; color: #888; font-variant-numeric: tabular-nums; }
</style>
