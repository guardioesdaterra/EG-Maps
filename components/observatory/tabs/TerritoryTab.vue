/**
 * components/observatory/tabs/TerritoryTab.vue
 * @why Territory tab — data-driven claims/boundaries overview: live layer
 *      counts, category breakdown, mining↔territory overlaps and the protected
 *      territories (TI / quilombos) behind the map polygons. Feeds entirely
 *      off the loaded GeoJSON + deep_analysis instead of static copy.
 * @component TerritoryTab
 * @props pointsCount, polygonsCount, totalAreaHa, overlapSummary, protectedBreakdown, categoryStats, lastSync, deepAnalysis, waterSummary, highlight
 * @emits 'update:highlight': [v: string | null]
 *   'fly-to-coord': [coord: [number, number]]
 * @deps vue (computed, ref); @/lib/observatory-normalize (type OverlapSummary, type ProtectedBreakdown); @/lib/water-defense (type WaterThreatSummary); @/lib/territory-dossier (buildDossierMarkdown, downloadTextFile, copyTextToClipboard)
 */
<template>
  <div class="obs-tab">
    <!-- ── Pin proximity alert ("watch my territory") ──────── -->
    <div v-if="pinThreats" class="obs-callout obs-callout--warn" role="status">
      <div class="obs-callout__head">
        <Icon name="lucide:map-pin" class="obs-callout__icon" />
        <h3 class="obs-callout__title">{{ t('observatory.territory.pinTitle') }}</h3>
      </div>
      <p class="obs-callout__body">
        {{ t('observatory.territory.pinBody', { count: pinThreats.within10, label: pinThreats.pinLabel }) }}
      </p>
      <p v-if="pinThreats.nearestProcesso" class="obs-callout__body obs-callout__body--dim">
        {{ t('observatory.territory.pinNearest', { processo: pinThreats.nearestProcesso, holder: pinThreats.nearestHolder, km: pinThreats.nearestKm }) }}
      </p>
    </div>

    <!-- ── Claim search ────────────────────────────────────── -->
    <div class="obs-search">
      <Icon name="lucide:search" class="obs-search__icon" />
      <input
        :value="searchTerm"
        type="search"
        class="obs-search__input"
        :placeholder="t('observatory.territory.searchPlaceholder')"
        :aria-label="t('observatory.territory.searchPlaceholder')"
        @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="searchTerm"
        type="button"
        class="obs-search__clear"
        :aria-label="t('observatory.v2.panel.searchClear')"
        @click="emit('update:searchTerm', '')"
      >
        <Icon name="lucide:x" />
      </button>
    </div>

    <!-- ── Dossier actions ─────────────────────────────────── -->
    <div class="obs-dossier-row">
      <button type="button" class="obs-dossier-btn" :aria-label="t('observatory.territory.dossierDownload')" @click="onDownloadDossier">
        <Icon name="lucide:file-down" class="obs-dossier-btn__icon" />
        {{ t('observatory.territory.dossierDownload') }}
      </button>
      <button type="button" class="obs-dossier-btn obs-dossier-btn--ghost" :aria-label="t('observatory.territory.dossierCopy')" @click="onCopyDossier">
        <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="obs-dossier-btn__icon" />
        {{ copied ? t('observatory.territory.dossierCopied') : t('observatory.territory.dossierCopy') }}
      </button>
    </div>

    <!-- ── Claims & boundaries ─────────────────────────────── -->
    <div class="obs-callout">
      <div class="obs-callout__head">
        <Icon name="lucide:hexagon" class="obs-callout__icon" />
        <h3 class="obs-callout__title">{{ t('observatory.territory.headline') }}</h3>
      </div>
      <div class="obs-kpis" role="list">
        <div class="obs-kpi" role="listitem">
          <span class="obs-kpi__value">{{ pointsCount.toLocaleString() }}</span>
          <span class="obs-kpi__label">{{ t('observatory.territory.claims') }}</span>
        </div>
        <div class="obs-kpi" role="listitem">
          <span class="obs-kpi__value">{{ polygonsCount.toLocaleString() }}</span>
          <span class="obs-kpi__label">{{ t('observatory.territory.boundaries') }}</span>
        </div>
        <div class="obs-kpi" role="listitem">
          <span class="obs-kpi__value">{{ formatHa(totalAreaHa) }}</span>
          <span class="obs-kpi__label">{{ t('observatory.territory.area') }}</span>
        </div>
        <div class="obs-kpi" role="listitem">
          <span class="obs-kpi__value">{{ overlapSummary?.claimsWithOverlaps ?? 0 }}</span>
          <span class="obs-kpi__label">{{ t('observatory.territory.withOverlaps') }}</span>
        </div>
      </div>
      <p v-if="lastSync" class="obs-callout__sync">{{ t('observatory.territory.synced') }} · {{ lastSync }}</p>
      <p v-else-if="polygonsCount === 0" class="obs-callout__warn">
        <Icon name="lucide:alert-triangle" class="obs-callout__warn-icon" />
        {{ t('observatory.territory.noBoundaries') }}
      </p>
    </div>

    <!-- ── Category breakdown ──────────────────────────────── -->
    <h4 v-if="categoryStats?.length" class="obs-section-title">
      <Icon name="lucide:layers" class="obs-section-title__icon" />
      {{ t('observatory.territory.bySubstance') }}
    </h4>
    <ul v-if="categoryStats?.length" class="obs-bars" role="list">
      <li v-for="c in categoryStats" :key="c.key" class="obs-bar-row">
        <span class="obs-bar-row__dot" :style="{ background: c.color }" aria-hidden="true" />
        <span class="obs-bar-row__label">{{ c.label }}</span>
        <span class="obs-bar-row__track" aria-hidden="true">
          <span class="obs-bar-row__fill" :style="{ width: `${barPct(c.count)}%`, background: c.color }" />
        </span>
        <span class="obs-bar-row__count">{{ c.count.toLocaleString() }}</span>
      </li>
    </ul>

    <!-- ── Demand filter (the mining-phase filter lives only in the
         left panel — rendering it here too duplicated it) ─────── -->
    <label class="obs-check" @click.stop="emit('update:sobDemandaOnly', !sobDemandaOnly)">
      <span :class="['obs-check__box', sobDemandaOnly && 'is-on']" aria-hidden="true">
        <Icon v-if="sobDemandaOnly" name="lucide:check" />
      </span>
      <span class="obs-check__label">{{ t('observatory.territory.sobDemanda') }}</span>
    </label>

    <!-- ── Overlaps ────────────────────────────────────────── -->
    <h4 class="obs-section-title">
      <Icon name="lucide:alert-triangle" class="obs-section-title__icon" />
      {{ t('observatory.territory.overlapsTitle') }}
      <span v-if="overlapSummary" class="obs-section-title__count">{{ overlapSummary.totalLinks }}</span>
    </h4>
    <p v-if="!overlapSummary || overlapSummary.byTerritory.length === 0" class="obs-tab__hint">
      {{ t('observatory.territory.noOverlaps') }}
    </p>
    <ul v-else class="obs-card-list" role="list">
      <li
        v-for="terr in overlapSummary.byTerritory.slice(0, 12)"
        :key="`${terr.kind}::${terr.name}`"
        class="obs-card"
        :class="{ 'obs-card--highlighted': highlighted === terr.name }"
        @mouseenter="onHighlight(terr.name)"
        @mouseleave="onClearHighlight"
      >
        <div class="obs-card__accent" :style="{ background: kindColor(terr.kind) }" />
        <div class="obs-card__body">
          <div class="obs-card__head">
            <span class="obs-card__kind" :style="{ background: kindColor(terr.kind) }">{{ kindLabel(terr.kind) }}</span>
            <span class="obs-card__name">{{ terr.name }}</span>
          </div>
          <p class="obs-card__desc">
            {{ t('observatory.territory.overlappedBy', { count: terr.claims }) }}
          </p>
        </div>
        <div class="obs-card__count-badge" :title="t('observatory.territory.overlappingClaims')">{{ terr.claims }}</div>
      </li>
    </ul>

    <!-- ── Waters under pressure ───────────────────────────── -->
    <h4 class="obs-section-title">
      <Icon name="lucide:droplets" class="obs-section-title__icon" />
      {{ t('observatory.territory.watersTitle') }}
      <span v-if="waterSummary" class="obs-section-title__count">
        {{ waterSummary.watersUnderPressure }}/{{ waterSummary.watersAssessed }}
      </span>
    </h4>
    <p v-if="!waterSummary || waterSummary.top.length === 0" class="obs-tab__hint">
      {{ t('observatory.territory.noWaters') }}
    </p>
    <template v-else>
      <p class="obs-tab__hint">
        {{ t('observatory.territory.watersLegend') }}
      </p>
      <ul class="obs-card-list" role="list">
        <li
          v-for="w in waterSummary.top.slice(0, 10)"
          :key="w.name"
          class="obs-card"
          :class="{ 'obs-card--highlighted': highlighted === w.name }"
          @mouseenter="onHighlight(w.name)"
          @mouseleave="onClearHighlight"
        >
          <div class="obs-card__accent" :style="{ background: w.claimsPressure > 0 ? 'var(--danger)' : 'var(--warning)' }" />
          <div class="obs-card__body">
            <div class="obs-card__head">
              <span class="obs-card__kind" :style="{ background: w.claimsPressure > 0 ? 'var(--danger)' : 'var(--warning)' }">
                {{ w.claimsPressure > 0 ? t('observatory.territory.pressure') : t('observatory.territory.watch') }}
              </span>
              <span class="obs-card__name">{{ w.name }}</span>
            </div>
            <p class="obs-card__desc">
              {{ w.claimsPressure }} {{ t('observatory.territory.claims2km') }} · {{ w.claimsWatch }} {{ t('observatory.territory.claims5km') }}
            </p>
            <div v-if="w.nearestLabel" class="obs-card__meta">
              <span>{{ w.nearestLabel }}</span>
            </div>
          </div>
          <button
            type="button"
            class="obs-card__go"
            :aria-label="t('observatory.territory.flyToWater', { name: w.name })"
            @click="onFlyToWater(w)"
          >
            <Icon name="lucide:map-pin" class="obs-card__go-icon" />
          </button>
        </li>
      </ul>
    </template>

    <!-- ── Protected territories ───────────────────────────── -->
    <h4 class="obs-section-title">
      <Icon name="lucide:shield-check" class="obs-section-title__icon" />
      {{ t('observatory.territory.protectedTitle') }}
    </h4>
    <!-- Search hits across protected areas + buffer zones (e.g. "Pedra Branca") -->
    <ul v-if="(props.searchTerm ?? '').trim().length >= 2 && (props.protectedMatches ?? []).length" class="obs-card-list" role="list" :aria-label="t('observatory.layers.protectedSearch')">
      <li v-for="hit in (props.protectedMatches ?? [])" :key="`prot-${hit.kind}-${hit.name}`" class="obs-card obs-card--hit">
        <div class="obs-card__accent" :style="{ background: matchColor(hit.kind) }" />
        <div class="obs-card__body">
          <div class="obs-card__head">
            <span class="obs-card__name">{{ hit.name }}</span>
            <button
              type="button"
              class="obs-card__go"
              :aria-label="t('observatory.territory.flyTo', { name: hit.name })"
              @click="emit('fly-to-coord', hit.coord)"
            >
              <Icon name="lucide:map-pin" class="obs-card__go-icon" />
            </button>
          </div>
          <div class="obs-card__meta">
            <span class="obs-card__kind" :style="{ color: matchColor(hit.kind) }">{{ matchKindLabel(hit.kind) }}</span>
            <span v-if="hit.municipality"><Icon name="lucide:map-pin" class="obs-card__meta-icon" />{{ hit.municipality }}{{ hit.state ? ` · ${hit.state}` : '' }}</span>
            <span v-if="hit.area_ha"><Icon name="lucide:maximize-2" class="obs-card__meta-icon" />{{ formatHa(hit.area_ha) }} ha</span>
          </div>
        </div>
      </li>
    </ul>
    <p v-else-if="(props.searchTerm ?? '').trim().length >= 2" class="obs-tab__hint">{{ t('observatory.layers.noProtectedSearch') }}</p>
    <template v-for="group in protectedGroups" :key="group.key">
      <div v-if="group.items.length" class="obs-tier-head">
        <div class="obs-tier-head__accent" :style="{ background: group.color }" />
        <span class="obs-tier-head__label" :style="{ color: group.color }">{{ t(group.labelKey) }}</span>
        <span class="obs-tier-head__count">{{ group.items.length }}</span>
      </div>
      <ul v-if="group.items.length" class="obs-card-list" role="list">
        <li v-for="area in group.items" :key="area.name" class="obs-card">
          <div class="obs-card__accent" :style="{ background: group.color }" />
          <div class="obs-card__body">
            <div class="obs-card__head">
              <span class="obs-card__name">{{ area.name }}</span>
            </div>
            <p v-if="area.people" class="obs-card__desc">{{ truncate(area.people, 160) }}</p>
            <div class="obs-card__meta">
              <span v-if="area.municipality"><Icon name="lucide:map-pin" class="obs-card__meta-icon" />{{ area.municipality }}{{ area.state ? ` · ${area.state}` : '' }}</span>
              <span v-if="area.area_ha"><Icon name="lucide:maximize-2" class="obs-card__meta-icon" />{{ formatHa(area.area_ha) }} ha</span>
              <span v-if="area.population"><Icon name="lucide:users" class="obs-card__meta-icon" />{{ area.population }}</span>
              <span v-if="area.status" class="obs-card__status">{{ area.status }}</span>
            </div>
            <a v-if="area.source_url" :href="area.source_url" target="_blank" rel="noopener" class="obs-card__link">
              {{ t('observatory.territory.source') }} <Icon name="lucide:external-link" class="obs-card__link-icon" />
            </a>
          </div>
        </li>
      </ul>
    </template>
    <p v-if="protectedEmpty" class="obs-tab__hint">{{ t('observatory.territory.noProtected') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OverlapSummary, ProtectedBreakdown } from '@/lib/observatory-normalize'
import type { DeepAnalysis } from '@/composables/useRareEarthData'
import type { WaterThreat, WaterThreatSummary } from '@/lib/water-defense'
import type { ForeignHolderRank } from '@/lib/enterprise-data'
import { buildDossierMarkdown, downloadTextFile, copyTextToClipboard, type DossierInput } from '@/lib/territory-dossier'

const { t } = useI18n()

const props = defineProps<{
  pointsCount: number
  polygonsCount: number
  totalAreaHa: number
  overlapSummary?: OverlapSummary | null
  protectedBreakdown?: ProtectedBreakdown | null
  categoryStats?: Array<{ key: string; label: string; color: string; count: number }>
  lastSync?: string
  deepAnalysis?: DeepAnalysis | null
  waterSummary?: WaterThreatSummary | null
  foreignHolders?: ForeignHolderRank[] | null
  searchTerm?: string
  selectedPhases?: Set<string>
  sobDemandaOnly?: boolean
  pinThreats?: {
    within10: number
    nearestProcesso: string
    nearestHolder: string
    nearestKm: number
    pinLabel: string
  } | null
  highlight?: string | null
  protectedMatches?: Array<{
    name: string
    kind: string
    municipality: string
    state: string
    area_ha: number
    coord: [number, number]
  }>
}>()

const emit = defineEmits<{
  'update:highlight': [v: string | null]
  'fly-to-coord': [coord: [number, number]]
  'update:searchTerm': [value: string]
  'update:selectedPhases': [value: Set<string>]
  'update:sobDemandaOnly': [value: boolean]
}>()

const highlighted = ref<string | null>(null)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const maxCategory = computed(() => Math.max(...(props.categoryStats ?? []).map(c => c.count), 1))

const protectedGroups = computed(() => [
  { key: 'ti', labelKey: 'observatory.layers.indigenousLands', color: 'var(--danger)', items: props.protectedBreakdown?.ti ?? [] },
  { key: 'quilombo', labelKey: 'observatory.layers.quilombolaTerritories', color: 'var(--warning)', items: props.protectedBreakdown?.quilombos ?? [] },
  { key: 'uc', labelKey: 'observatory.layers.conservationUnits', color: 'var(--success)', items: props.protectedBreakdown?.ucs ?? [] },
  { key: 'buffer', labelKey: 'observatory.layers.bufferZones', color: 'var(--info)', items: props.protectedBreakdown?.buffers ?? [] },
])

const protectedEmpty = computed(() =>
  (props.protectedBreakdown?.ti.length ?? 0) + (props.protectedBreakdown?.quilombos.length ?? 0)
  + (props.protectedBreakdown?.ucs?.length ?? 0) + (props.protectedBreakdown?.buffers?.length ?? 0) === 0,
)

function barPct(count: number): number {
  return Math.max(2, Math.round((count / maxCategory.value) * 100))
}

function formatHa(ha: number): string {
  if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
  if (ha >= 1000) return `${Math.round(ha / 1000)}K`
  return `${Math.round(ha)}`
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s
}

function kindColor(kind: string): string {
  const k = kind.toLowerCase()
  if (k === 'ti' || k.includes('indigen')) return 'var(--danger)'
  if (k === 'quilombo' || k.includes('quilomb')) return 'var(--warning)'
  if (k === 'uc' || k.includes('conserv') || k.includes('apa')) return 'var(--success)'
  if (k === 'buffer' || k.includes('amortecimento')) return 'var(--info)'
  return 'var(--info)'
}

function kindLabel(kind: string): string {
  const k = kind.toLowerCase()
  if (k === 'ti' || k.includes('indigen')) return 'TI'
  if (k === 'quilombo' || k.includes('quilomb')) return 'QUILOMBO'
  if (k === 'uc' || k.includes('conserv') || k.includes('apa')) return 'UC'
  if (k === 'buffer' || k.includes('amortecimento')) return 'ZA'
  return kind.toUpperCase().slice(0, 8)
}

function onHighlight(name: string) {
  highlighted.value = name
  emit('update:highlight', name)
}

function onClearHighlight() {
  highlighted.value = null
  emit('update:highlight', null)
}

function onFlyToWater(w: WaterThreat) {
  emit('fly-to-coord', [w.lng, w.lat])
}

function matchColor(kind: string): string {
  return kindColor(kind)
}

function matchKindLabel(kind: string): string {
  return kindLabel(kind)
}

// ── Evidence dossier ────────────────────────────────────────────────────
const dossierInput = computed<DossierInput>(() => {
  const raw = (props.deepAnalysis ?? {}) as unknown as Record<string, unknown>
  const foreignRaw = (raw.foreign_claims ?? {}) as Record<string, { total_claims: number; total_area_ha: number; pct: number }>
  const milRaw = raw.military_critical as { total_claims: number; total_area_ha: number; us_connected_claims: number } | undefined
  const sigRaw = raw.sigilo_stats as { total: number; pct: number; total_area_ha: number } | undefined
  const topRaw = (Array.isArray(raw.top_suspicious) ? raw.top_suspicious : []) as Array<{
    name: string; score: number; claims: number; area_ha: number; flags: string[]; subs: string[]
  }>
  // Live per-claim foreign ranking wins (same claims the map shows);
  // national aggregates are the fallback.
  const liveForeign = (props.foreignHolders ?? []).map(h => ({
    key: `${h.name} (${h.country})`,
    claims: h.claims,
    pct: props.pointsCount ? Math.round((h.claims / props.pointsCount) * 1000) / 10 : 0,
  }))
  const aggForeign = Object.entries(foreignRaw).map(([key, v]) => ({ key, claims: v.total_claims ?? 0, pct: v.pct ?? 0 }))
  return {
    regionLabel: 'Poços de Caldas (100km)',
    generatedAt: new Date().toISOString().slice(0, 10),
    dataSource: String(raw.data_source ?? 'ANM SIGMINE public dump'),
    syncLabel: props.lastSync,
    claims: props.pointsCount,
    boundaries: props.polygonsCount,
    totalAreaHa: props.totalAreaHa,
    categories: (props.categoryStats ?? []).map(c => ({ label: c.label, count: c.count })),
    overlapClaims: props.overlapSummary?.claimsWithOverlaps ?? 0,
    overlapLinks: props.overlapSummary?.totalLinks ?? 0,
    topTerritories: (props.overlapSummary?.byTerritory ?? []).map(x => ({ name: x.name, kind: x.kind, claims: x.claims })),
    protectedTi: (props.protectedBreakdown?.ti ?? []).map(a => ({ name: a.name, municipality: a.municipality, area_ha: a.area_ha, population: a.population })),
    protectedQuilombos: (props.protectedBreakdown?.quilombos ?? []).map(a => ({ name: a.name, municipality: a.municipality, area_ha: a.area_ha, population: a.population })),
    protectedUcs: (props.protectedBreakdown?.ucs ?? []).map(a => ({ name: a.name, municipality: a.municipality, area_ha: a.area_ha, population: a.population })),
    protectedBuffers: (props.protectedBreakdown?.buffers ?? []).map(a => ({ name: a.name, municipality: a.municipality, area_ha: a.area_ha, population: a.population })),
    watersAssessed: props.waterSummary?.watersAssessed ?? 0,
    watersUnderPressure: props.waterSummary?.watersUnderPressure ?? 0,
    topWaters: (props.waterSummary?.top ?? []).map(w => ({
      name: w.name, water_type: w.water_type,
      claimsPressure: w.claimsPressure, claimsWatch: w.claimsWatch, nearestLabel: w.nearestLabel,
    })),
    holders: topRaw.map(h => ({
      name: h.name, score: h.score, claims: h.claims,
      area_ha: h.area_ha, flags: h.flags ?? [], subs: h.subs ?? [],
    })),
    foreign: liveForeign.length ? liveForeign : aggForeign,
    military: milRaw
      ? { total_claims: milRaw.total_claims ?? 0, total_area_ha: milRaw.total_area_ha ?? 0, us_connected_claims: milRaw.us_connected_claims ?? 0 }
      : null,
    sigilo: sigRaw
      ? { total: sigRaw.total ?? 0, pct: sigRaw.pct ?? 0, total_area_ha: sigRaw.total_area_ha ?? 0 }
      : null,
  }
})

function dossierFilename(): string {
  return `vulcan-dossier-pococaldas-${new Date().toISOString().slice(0, 10)}.md`
}

function onDownloadDossier() {
  downloadTextFile(dossierFilename(), buildDossierMarkdown(dossierInput.value))
}

async function onCopyDossier() {
  const ok = await copyTextToClipboard(buildDossierMarkdown(dossierInput.value))
  if (ok) {
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<style scoped>
.obs-tab { display: flex; flex-direction: column; gap: 8px; }
.obs-tab__hint { font-size: clamp(9px, 1.4vw, 12px); color: var(--obs-text-dim); font-style: italic; padding: 2px 4px; margin: 0; }
.obs-callout__body--dim { opacity: 0.75; font-family: ui-monospace, monospace; font-size: clamp(8px, 1.3vw, 11px); }

.obs-search { display: flex; align-items: center; gap: 0.4rem; height: 2rem; padding: 0 0.6rem; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; }
.obs-search:focus-within { border-color: rgba(231,76,60,0.5); box-shadow: 0 0 0 2px rgba(231,76,60,0.12); }
.obs-search__icon { width: 0.85rem; height: 0.85rem; color: rgba(255,255,255,0.4); flex-shrink: 0; }
.obs-search__input { flex: 1; background: transparent; border: 0; outline: 0; color: #fff; font-size: 11px; font-family: inherit; padding: 0; min-width: 0; }
.obs-search__input::placeholder { color: rgba(255,255,255,0.35); }
.obs-search__clear { width: 1rem; height: 1rem; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: 0; border-radius: 4px; color: rgba(255,255,255,0.5); cursor: pointer; font-family: inherit; }
.obs-search__clear svg { width: 0.75rem; height: 0.75rem; }
.obs-search__clear:hover { background: rgba(231,76,60,0.15); color: var(--obs-red, #e74c3c); }

.obs-check { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.15rem; cursor: pointer; user-select: none; border-radius: 4px; }
.obs-check:hover { background: rgba(255,255,255,0.03); }
.obs-check__box { width: 0.85rem; height: 0.85rem; border-radius: 3px; border: 2px solid var(--obs-purple, #9b59b6); display: flex; align-items: center; justify-content: center; flex-shrink: 0; opacity: 0.35; }
.obs-check__box.is-on { opacity: 1; background: rgba(155,89,182,0.25); }
.obs-check__box svg { width: 0.6rem; height: 0.6rem; color: #fff; }
.obs-check__label { font-size: 11px; color: rgba(255,255,255,0.8); font-weight: 600; }

.obs-dossier-row { display: flex; gap: 6px; }
.obs-dossier-btn {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 0.5rem 0.6rem; font-size: 11px; font-weight: 800;
  background: rgba(231, 76, 60, 0.14); border: 1px solid rgba(231, 76, 60, 0.4);
  border-radius: 8px; color: #fff; cursor: pointer; font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.obs-dossier-btn:hover { background: rgba(231, 76, 60, 0.22); border-color: rgba(231, 76, 60, 0.6); }
.obs-dossier-btn--ghost { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.75); }
.obs-dossier-btn--ghost:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); }
.obs-dossier-btn__icon { width: 0.9rem; height: 0.9rem; flex-shrink: 0; }
.obs-card__go {
  align-self: center; flex-shrink: 0; margin-right: 6px;
  width: 1.75rem; height: 1.75rem; display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid transparent; border-radius: 6px;
  color: var(--obs-text-dim); cursor: pointer; font-family: inherit; transition: all 0.12s;
}
.obs-card__go:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: var(--obs-panel-border); }
.obs-card__go-icon { width: 0.9rem; height: 0.9rem; }

.obs-callout {
  padding: clamp(8px, 1.5vw, 14px); background: rgba(231,76,60,0.05);
  border: 1px solid rgba(231,76,60,0.12);
  border-radius: 8px; border-left: 3px solid var(--obs-red);
}
.obs-callout--warn { background: rgba(243,156,18,0.05); border-color: rgba(243,156,18,0.12); border-left-color: var(--obs-amber); }
.obs-callout__head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.obs-callout__icon { width: 13px; height: 13px; color: var(--obs-red); flex-shrink: 0; }
.obs-callout--warn .obs-callout__icon { color: var(--obs-amber); }
.obs-callout__title { margin: 0; font-size: clamp(10px, 1.5vw, 13px); font-weight: 700; color: var(--obs-red); }
.obs-callout--warn .obs-callout__title { color: var(--obs-amber); }
.obs-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.obs-kpi { display: flex; flex-direction: column; gap: 1px; padding: 6px 4px; background: rgba(0,0,0,0.25); border: 1px solid var(--obs-panel-border); border-radius: 6px; text-align: center; min-width: 0; }
.obs-kpi__value { font-size: clamp(12px, 1.8vw, 16px); font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
.obs-kpi__label { font-size: clamp(7px, 1.2vw, 10px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--obs-text-dim); }
.obs-callout__sync { margin: 8px 0 0; font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-dim); font-family: ui-monospace, monospace; }
.obs-callout__warn { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: clamp(9px, 1.4vw, 12px); color: var(--obs-amber); }
.obs-callout__warn-icon { width: 12px; height: 12px; flex-shrink: 0; }

.obs-section-title {
  margin: 2px 0 0; display: flex; align-items: center; gap: 5px;
  font-size: clamp(9px, 1.4vw, 12px); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--obs-text-label);
}
.obs-section-title__icon { width: 11px; height: 11px; color: var(--obs-text-dim); }
.obs-section-title__count {
  font-size: clamp(8px, 1.3vw, 11px); font-weight: 700; font-family: ui-monospace, monospace;
  color: var(--obs-text-dim); background: rgba(255,255,255,0.04);
  padding: 1px 5px; border-radius: 3px;
}

.obs-bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.obs-bar-row { display: grid; grid-template-columns: 8px 1fr auto; grid-template-rows: auto auto; column-gap: 6px; row-gap: 2px; align-items: center; }
.obs-bar-row__dot { width: 8px; height: 8px; border-radius: 50%; grid-row: 1; }
.obs-bar-row__label { font-size: clamp(9px, 1.4vw, 12px); font-weight: 600; color: var(--obs-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; grid-row: 1; }
.obs-bar-row__count { font-size: clamp(8px, 1.3vw, 11px); font-weight: 700; font-family: ui-monospace, monospace; color: var(--obs-text-dim); grid-row: 1; }
.obs-bar-row__track { grid-column: 1 / -1; grid-row: 2; height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.obs-bar-row__fill { display: block; height: 100%; border-radius: 2px; }

.obs-card-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.obs-card { display: flex; background: rgba(255,255,255,0.02); border: 1px solid var(--obs-panel-border); border-radius: 7px; overflow: hidden; transition: background 0.12s, border-color 0.12s, box-shadow 0.12s; }
.obs-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); }
.obs-card--highlighted { box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 0 16px rgba(255,255,255,0.06); }
.obs-card__accent { width: 3px; flex-shrink: 0; }
.obs-card__body { flex: 1; padding: clamp(6px, 1.2vw, 12px) clamp(7px, 1.4vw, 14px); min-width: 0; }
.obs-card__head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.obs-card__kind { font-size: clamp(7px, 1.2vw, 10px); font-weight: 800; padding: 1px 5px; border-radius: 3px; color: #fff; letter-spacing: 0.04em; }
.obs-card__name { font-size: clamp(10px, 1.5vw, 13px); font-weight: 600; color: var(--obs-text-primary); flex: 1; min-width: 0; }
.obs-card__desc { margin: 3px 0 0; font-size: clamp(9px, 1.4vw, 12px); color: var(--obs-text-body); line-height: 1.45; }
.obs-card__meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-muted); font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.obs-card__meta-icon { width: 8px; height: 8px; margin-right: 2px; vertical-align: middle; opacity: 0.6; }
.obs-card__status { text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: var(--obs-green); }
.obs-card__link { display: inline-flex; align-items: center; gap: 3px; margin-top: 5px; font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-blue-light); text-decoration: none; }
.obs-card__link:hover { text-decoration: underline; }
.obs-card__link-icon { width: 9px; height: 9px; }
.obs-card__count-badge {
  align-self: center; flex-shrink: 0; margin-right: 8px;
  min-width: 1.6rem; height: 1.6rem; display: inline-flex; align-items: center; justify-content: center;
  font-size: clamp(10px, 1.5vw, 13px); font-weight: 800; font-family: ui-monospace, monospace;
  background: rgba(231,76,60,0.12); color: var(--obs-red); border-radius: 6px; padding: 0 6px;
}

.obs-tier-head { display: flex; align-items: center; gap: 6px; padding: 5px 4px 3px; margin-top: 2px; }
.obs-tier-head__accent { width: 3px; height: 12px; border-radius: 2px; flex-shrink: 0; }
.obs-tier-head__label { font-size: clamp(9px, 1.4vw, 12px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; flex: 1; }
.obs-tier-head__count { font-size: clamp(8px, 1.3vw, 11px); font-weight: 700; font-family: ui-monospace, monospace; color: var(--obs-text-dim); background: rgba(255,255,255,0.04); padding: 1px 5px; border-radius: 3px; }

@media (prefers-reduced-motion: reduce) { .obs-card { transition: none; } }
</style>
