/**
 * components/observatory/ObservatorySidebar.vue
 * @why Floating right-side panel for the Vulcan Observatory v2 — replaces
 *      the old 6-tab grid (Danger/Military/Illegal/Env/Network/Timeline)
 *      with a single, focused **Cultural Agents browser** that surfaces
 *      Mapa Cultura BR + Floresta Ativista data as first-class content.
 *
 *      The map's cultural-layer rendering (handled by
 *      `useCulturalLayers.setupCulturalLayers` on the MapLibre map) still
 *      receives the full merged FeatureCollection via `:rare-earth-cultural`;
 *      this panel adds a search/filter/list UI on top of the same data.
 *
 * @props rareEarthCultural, speculatorIndex, layerVis, toggleLayer
 * @emits flyToCoord, flyToEnterprise, jumpToCultural
 * @deps vue (ref, computed, watch); @/composables/useI18n
 * @connections pages/vulcan-observatory/index.vue, pages/vulcan-observatory/3d.vue
 */
<template>
  <Transition name="vulc-panel">
    <aside
      v-show="open"
      class="vulc-panel"
      :aria-label="t('observatory.v2.panel.title')"
      role="region"
    >
      <header class="vulc-panel__head">
        <div class="vulc-panel__title-wrap">
          <h2 class="vulc-panel__title">{{ t('observatory.v2.panel.title') }}</h2>
          <p class="vulc-panel__subtitle">{{ t('observatory.v2.panel.subtitle') }}</p>
        </div>
        <button
          type="button"
          class="vulc-panel__toggle"
          :aria-label="open ? t('observatory.v2.panel.collapse') : t('observatory.v2.panel.expand')"
          :aria-pressed="!open"
          @click="open = !open"
        >
          <Icon :name="open ? 'lucide:panel-right-close' : 'lucide:panel-right-open'" />
        </button>
      </header>

      <div v-show="open" class="vulc-panel__body">
        <!-- ── Source filter pills ─────────────────────────────── -->
        <div class="vulc-source-pills" role="group" :aria-label="t('observatory.v2.panel.sources')">
          <button
            v-for="src in SOURCES"
            :key="src.id"
            type="button"
            class="vulc-source-pill"
            :class="{ 'is-on': sourceFilter[src.id] }"
            :style="{ '--pill-color': src.color }"
            :aria-pressed="sourceFilter[src.id]"
            @click="toggleSource(src.id)"
          >
            <span class="vulc-source-pill__dot" aria-hidden="true" />
            <span class="vulc-source-pill__label">{{ t(src.labelKey) }}</span>
            <span class="vulc-source-pill__count">{{ formatCount(sourceCounts[src.id] ?? 0) }}</span>
          </button>
        </div>

        <!-- ── Subtype filter chips ────────────────────────────── -->
        <div class="vulc-subtype-chips" role="group" :aria-label="t('observatory.v2.panel.subtypes')">
          <button
            v-for="sub in SUBTYPES"
            :key="sub.id"
            type="button"
            class="vulc-chip"
            :class="{ 'is-on': subtypeFilter[sub.id] }"
            :style="{ '--chip-color': sub.color }"
            :aria-pressed="subtypeFilter[sub.id]"
            @click="toggleSubtype(sub.id)"
          >
            <span class="vulc-chip__dot" aria-hidden="true" />
            {{ t(sub.labelKey) }}
            <span class="vulc-chip__count">{{ formatCount(subtypeCounts[sub.id] ?? 0) }}</span>
          </button>
        </div>

        <!-- ── Search ──────────────────────────────────────────── -->
        <div class="vulc-search">
          <Icon name="lucide:search" class="vulc-search__icon" />
          <input
            v-model="search"
            type="search"
            class="vulc-search__input"
            :placeholder="t('observatory.v2.panel.searchPlaceholder')"
            :aria-label="t('observatory.v2.panel.searchPlaceholder')"
          >
          <button
            v-if="search"
            type="button"
            class="vulc-search__clear"
            :aria-label="t('observatory.v2.panel.searchClear')"
            @click="search = ''"
          >
            <Icon name="lucide:x" />
          </button>
        </div>

        <!-- ── Layer toggles (mining + protected areas) ────────── -->
        <details class="vulc-details" :open="layerSectionOpen">
          <summary class="vulc-details__summary">
            <Icon name="lucide:layers" />
            <span>{{ t('observatory.v2.panel.layersLabel') }}</span>
            <Icon name="lucide:chevron-down" class="vulc-details__chev" />
          </summary>
          <div class="vulc-details__body">
            <div
              v-for="key in TOGGLE_LAYER_KEYS"
              :key="key"
              class="vulc-toggle"
              role="checkbox"
              :aria-checked="layerVis[key] !== false"
              :aria-label="t(LAYER_LABELS[key])"
              tabindex="0"
              @click="toggleLayer(key)"
              @keydown.enter="toggleLayer(key)"
              @keydown.space.prevent="toggleLayer(key)"
            >
              <div :class="['vulc-toggle__box', layerVis[key] === false && 'is-off']" :style="{ '--cb-color': LAYER_COLORS[key] }">
                <Icon v-if="layerVis[key] !== false" name="lucide:check" />
              </div>
              <span class="vulc-toggle__label">{{ t(LAYER_LABELS[key]) }}</span>
            </div>
          </div>
        </details>

        <!-- ── Results count + sort ────────────────────────────── -->
        <div class="vulc-results-head">
          <span class="vulc-results-count">
            <strong>{{ filteredFeatures.length }}</strong>
            <span class="vulc-results-count__of">/ {{ totalCount }}</span>
            {{ t('observatory.v2.panel.agentsShown') }}
          </span>
          <label class="vulc-sort">
            <span class="vulc-sort__label">{{ t('observatory.v2.panel.sortBy') }}</span>
            <select v-model="sortKey" class="vulc-sort__select" :aria-label="t('observatory.v2.panel.sortBy')">
              <option value="source">{{ t('observatory.v2.panel.sortSource') }}</option>
              <option value="name">{{ t('observatory.v2.panel.sortName') }}</option>
            </select>
          </label>
        </div>

        <!-- ── List ────────────────────────────────────────────── -->
        <div v-if="filteredFeatures.length === 0" class="vulc-empty">
          <Icon name="lucide:search-x" class="vulc-empty__icon" />
          <p>{{ t('observatory.v2.panel.empty') }}</p>
        </div>
        <ul v-else class="vulc-list" role="list">
          <li
            v-for="f in paginatedFeatures"
            :key="featureKey(f)"
            class="vulc-card"
            :class="{ 'is-flash': flashing === featureKey(f) }"
          >
            <button
              type="button"
              class="vulc-card__btn"
              :aria-label="`${t('observatory.v2.panel.flyToAgent')} ${f.properties.name}`"
              @click="onCardClick(f)"
            >
              <span class="vulc-card__pill" :style="{ background: SOURCE_COLORS[f.properties.source] || '#888' }">
                {{ t(SOURCE_LABEL_KEYS[f.properties.source] || 'observatory.v2.panel.unknownSource') }}
              </span>
              <h3 class="vulc-card__name">{{ f.properties.name || t('observatory.v2.panel.unnamed') }}</h3>
              <p v-if="f.properties.description" class="vulc-card__desc">{{ truncate(f.properties.description, 120) }}</p>
              <div class="vulc-card__meta">
                <span v-if="f.properties.subtype">{{ subtypeLabel(f.properties.subtype) }}</span>
                <span v-if="f.properties.municipality">· {{ f.properties.municipality }}</span>
                <span v-if="f.properties.state">· {{ f.properties.state }}</span>
              </div>
            </button>
            <a
              v-if="f.properties.single_url"
              :href="f.properties.single_url"
              target="_blank"
              rel="noopener"
              class="vulc-card__link"
              :aria-label="t('observatory.v2.panel.openOnSource')"
            >
              <Icon name="lucide:external-link" />
            </a>
          </li>
        </ul>

        <!-- ── Pagination ─────────────────────────────────────── -->
        <div v-if="totalPages > 1" class="vulc-pager">
          <button
            type="button"
            class="vulc-pager__btn"
            :disabled="page <= 1"
            :aria-label="t('observatory.v2.panel.pagePrev')"
            @click="page = Math.max(1, page - 1)"
          >
            <Icon name="lucide:chevron-left" />
          </button>
          <span class="vulc-pager__count">{{ page }} / {{ totalPages }}</span>
          <button
            type="button"
            class="vulc-pager__btn"
            :disabled="page >= totalPages"
            :aria-label="t('observatory.v2.panel.pageNext')"
            @click="page = Math.min(totalPages, page + 1)"
          >
            <Icon name="lucide:chevron-right" />
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = defineProps<{
  rareEarthCultural?: FeatureCollection | null
  speculatorIndex?: Array<{ displayName: string; normalizedName: string; suspicionScore: number }>
  layerVis: Record<string, boolean>
  toggleLayer: (key: string) => void
}>()

const emit = defineEmits<{
  flyToCoord: [coord: [number, number]]
  flyToEnterprise: [name: string]
  jumpToCultural: [coord: [number, number], name: string]
}>()

// ── Source / subtype metadata ──────────────────────────────────────────
interface SourceMeta { id: string; labelKey: string; color: string }
interface SubtypeMeta { id: string; labelKey: string; color: string }

const SOURCES: SourceMeta[] = [
  { id: 'mapa_cultura', labelKey: 'observatory.v2.panel.sourceMapa', color: '#f39c12' },
  { id: 'floresta_ativista', labelKey: 'observatory.v2.panel.sourceFloresta', color: '#27ae60' },
  { id: 'community', labelKey: 'observatory.v2.panel.sourceCommunity', color: '#9b59b6' },
]
const SOURCE_COLORS: Record<string, string> = Object.fromEntries(SOURCES.map(s => [s.id, s.color]))
const SOURCE_LABEL_KEYS: Record<string, string> = Object.fromEntries(SOURCES.map(s => [s.id, s.labelKey]))

const SUBTYPES: SubtypeMeta[] = [
  { id: 'cultural_center', labelKey: 'observatory.v2.panel.subCulturalCenter', color: '#f39c12' },
  { id: 'artist_group', labelKey: 'observatory.v2.panel.subArtistGroup', color: '#9b59b6' },
  { id: 'indigenous', labelKey: 'observatory.v2.panel.subIndigenous', color: '#e74c3c' },
  { id: 'rural', labelKey: 'observatory.v2.panel.subRural', color: '#27ae60' },
]
const SUBTYPE_LABELS: Record<string, string> = {
  cultural_center: 'observatory.v2.panel.subCulturalCenter',
  artist_group: 'observatory.v2.panel.subArtistGroup',
  indigenous: 'observatory.v2.panel.subIndigenous',
  rural: 'observatory.v2.panel.subRural',
}

const TOGGLE_LAYER_KEYS = [
  'protected_ti',
  'protected_quilombo',
  'overlaps',
  'enterprise_hq',
  'heatmap',
  'cultural',
] as const
const LAYER_LABELS: Record<string, string> = {
  protected_ti: 'observatory.layers.indigenousLands',
  protected_quilombo: 'observatory.layers.quilombolaTerritories',
  overlaps: 'observatory.layers.overlaps',
  enterprise_hq: 'observatory.layers.enterpriseHq',
  heatmap: 'observatory.layers.heatmap',
  cultural: 'observatory.layers.cultural',
}
const LAYER_COLORS: Record<string, string> = {
  protected_ti: '#c0392b',
  protected_quilombo: '#f39c12',
  overlaps: '#ff00ff',
  enterprise_hq: '#9b59b6',
  heatmap: '#e74c3c',
  cultural: '#3498db',
}

// ── State ───────────────────────────────────────────────────────────────
const open = ref(true)
const layerSectionOpen = ref(false)
const search = ref('')
const sortKey = ref<'source' | 'name'>('source')
const page = ref(1)
const PAGE_SIZE = 30

const sourceFilter = ref<Record<string, boolean>>({
  mapa_cultura: true,
  floresta_ativista: true,
  community: true,
})
const subtypeFilter = ref<Record<string, boolean>>({
  cultural_center: true,
  artist_group: true,
  indigenous: true,
  rural: true,
})

function toggleSource(id: string) { sourceFilter.value[id] = !sourceFilter.value[id] }
function toggleSubtype(id: string) { subtypeFilter.value[id] = !subtypeFilter.value[id] }

// ── Derived ─────────────────────────────────────────────────────────────
type CulturalFeature = Feature<Point, Record<string, any>>
const allFeatures = computed<CulturalFeature[]>(() => {
  const fc = props.rareEarthCultural
  return ((fc?.features ?? []) as CulturalFeature[])
})

const sourceCounts = computed(() => {
  const out: Record<string, number> = { mapa_cultura: 0, floresta_ativista: 0, community: 0 }
  for (const f of allFeatures.value) {
    const s = String(f.properties?.source ?? '')
    if (s in out) out[s]++
  }
  return out
})

const subtypeCounts = computed(() => {
  const out: Record<string, number> = { cultural_center: 0, artist_group: 0, indigenous: 0, rural: 0 }
  for (const f of allFeatures.value) {
    const s = String(f.properties?.subtype ?? '')
    if (s in out) out[s]++
  }
  return out
})

const totalCount = computed(() => allFeatures.value.length)

const filteredFeatures = computed<CulturalFeature[]>(() => {
  const term = search.value.trim().toLowerCase()
  return allFeatures.value.filter((f) => {
    const p = f.properties ?? {}
    const src = String(p.source ?? '')
    const sub = String(p.subtype ?? '')
    if (src in sourceFilter.value && !sourceFilter.value[src]) return false
    if (sub in subtypeFilter.value && !subtypeFilter.value[sub]) return false
    if (term) {
      const hay = `${p.name ?? ''} ${p.description ?? ''} ${p.municipality ?? ''} ${p.state ?? ''}`.toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
})

const sortedFeatures = computed<CulturalFeature[]>(() => {
  const list = [...filteredFeatures.value]
  if (sortKey.value === 'name') {
    list.sort((a, b) => String(a.properties?.name ?? '').localeCompare(String(b.properties?.name ?? '')))
  } else {
    // source then name
    const order = ['mapa_cultura', 'floresta_ativista', 'community']
    list.sort((a, b) => {
      const oa = order.indexOf(String(a.properties?.source ?? ''))
      const ob = order.indexOf(String(b.properties?.source ?? ''))
      if (oa !== ob) return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob)
      return String(a.properties?.name ?? '').localeCompare(String(b.properties?.name ?? ''))
    })
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedFeatures.value.length / PAGE_SIZE)))
const paginatedFeatures = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return sortedFeatures.value.slice(start, start + PAGE_SIZE)
})

// Reset page when filters change
function resetPage() { page.value = 1 }

// ── Actions ─────────────────────────────────────────────────────────────
const flashing = ref<string | null>(null)
function featureKey(f: CulturalFeature): string {
  return `${f.properties?.source ?? 'x'}-${f.properties?.source_id ?? f.properties?.name ?? Math.random()}`
}
function onCardClick(f: CulturalFeature) {
  const coords = f.geometry?.coordinates
  if (!coords || coords.length < 2) return
  const coord: [number, number] = [coords[0], coords[1]]
  flashing.value = featureKey(f)
  setTimeout(() => { flashing.value = null }, 1500)
  emit('jumpToCultural', coord, String(f.properties?.name ?? ''))
  emit('flyToCoord', coord)
}
function subtypeLabel(subtype: string): string {
  return t(SUBTYPE_LABELS[subtype] || subtype)
}
function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s
}
function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

// Watch filtered count → reset pagination
import { watch } from 'vue'
watch([filteredFeatures], () => resetPage(), { flush: 'post' })
</script>

<style scoped>
.vulc-panel {
  position: absolute;
  top: clamp(4rem, 8vh, 5rem);
  right: clamp(0.6rem, 1.2vw, 1rem);
  bottom: clamp(4rem, 8vh, 5rem);
  width: clamp(20rem, 26vw, 24rem);
  max-height: calc(100svh - 10rem);
  z-index: 530;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 10, 0.88);
  backdrop-filter: blur(16px) saturate(1.25);
  -webkit-backdrop-filter: blur(16px) saturate(1.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.9);
}
.vulc-panel[aria-pressed="false"],
.vulc-panel:not([aria-expanded]) { display: flex; }

.vulc-panel__head {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(231, 76, 60, 0.06), transparent);
}
.vulc-panel__title-wrap { min-width: 0; flex: 1; }
.vulc-panel__title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.2;
}
.vulc-panel__subtitle {
  margin: 0.15rem 0 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
}
.vulc-panel__toggle {
  width: 1.75rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.vulc-panel__toggle svg {
  width: 0.95rem;
  height: 0.95rem;
}
.vulc-panel__toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.vulc-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.85rem 0.85rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.vulc-panel__body::-webkit-scrollbar { width: 5px; }
.vulc-panel__body::-webkit-scrollbar-track { background: transparent; }
.vulc-panel__body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 3px; }

/* ── Source pills ─────────────────────────────────────────────── */
.vulc-source-pills {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.vulc-source-pill {
  display: grid;
  grid-template-columns: 0.55rem 1fr auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.65rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 3px solid var(--pill-color, #888);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.85);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.vulc-source-pill .vulc-source-pill__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--pill-color, #888);
  box-shadow: 0 0 6px var(--pill-color, #888);
}
.vulc-source-pill.is-on {
  background: color-mix(in srgb, var(--pill-color, #888) 14%, transparent);
  color: #fff;
}
.vulc-source-pill:not(.is-on) {
  opacity: 0.45;
}
.vulc-source-pill__count {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  font-size: 10px;
}
.vulc-source-pill:focus-visible {
  outline: 2px solid var(--pill-color, #fff);
  outline-offset: 2px;
}

/* ── Subtype chips ─────────────────────────────────────────────── */
.vulc-subtype-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.vulc-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.vulc-chip__dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: var(--chip-color, #888);
  flex-shrink: 0;
}
.vulc-chip.is-on {
  background: color-mix(in srgb, var(--chip-color, #888) 18%, transparent);
  border-color: color-mix(in srgb, var(--chip-color, #888) 50%, transparent);
  color: #fff;
}
.vulc-chip:not(.is-on) {
  opacity: 0.45;
}
.vulc-chip__count {
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
  font-size: 9px;
}

/* ── Search ────────────────────────────────────────────────────── */
.vulc-search {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 2rem;
  padding: 0 0.6rem;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}
.vulc-search:focus-within {
  border-color: rgba(231, 76, 60, 0.5);
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.12);
}
.vulc-search__icon {
  width: 0.85rem;
  height: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}
.vulc-search__input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: #fff;
  font-size: 11px;
  font-family: inherit;
  padding: 0;
  min-width: 0;
}
.vulc-search__input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}
.vulc-search__clear {
  width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-family: inherit;
}
.vulc-search__clear svg { width: 0.75rem; height: 0.75rem; }
.vulc-search__clear:hover {
  background: rgba(231, 76, 60, 0.15);
  color: var(--obs-red, #e74c3c);
}

/* ── Layer details ─────────────────────────────────────────────── */
.vulc-details {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.vulc-details__summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  list-style: none;
  user-select: none;
}
.vulc-details__summary::-webkit-details-marker { display: none; }
.vulc-details__summary svg {
  width: 0.85rem;
  height: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}
.vulc-details__chev {
  margin-left: auto;
  transition: transform 0.2s ease;
}
.vulc-details[open] .vulc-details__chev {
  transform: rotate(180deg);
}
.vulc-details__body {
  padding: 0.25rem 0.55rem 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}
.vulc-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.15rem;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
}
.vulc-toggle:hover {
  background: rgba(255, 255, 255, 0.03);
}
.vulc-toggle:focus-visible {
  outline: 2px solid var(--obs-red, #e74c3c);
  outline-offset: -2px;
}
.vulc-toggle__box {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 3px;
  border: 2px solid var(--cb-color, #666);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.vulc-toggle__box svg { width: 0.6rem; height: 0.6rem; color: #fff; }
.vulc-toggle__box.is-off { opacity: 0.3; }
.vulc-toggle__label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

/* ── Results head ──────────────────────────────────────────────── */
.vulc-results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.15rem;
}
.vulc-results-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}
.vulc-results-count strong {
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
}
.vulc-results-count__of {
  margin: 0 0.15rem;
  opacity: 0.6;
}
.vulc-sort {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}
.vulc-sort__label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}
.vulc-sort__select {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  color: #fff;
  padding: 0.2rem 0.4rem;
  font-size: 10px;
  font-family: inherit;
  cursor: pointer;
}

/* ── Empty ─────────────────────────────────────────────────────── */
.vulc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  text-align: center;
}
.vulc-empty__icon {
  width: 2rem;
  height: 2rem;
  opacity: 0.5;
}

/* ── List ──────────────────────────────────────────────────────── */
.vulc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.vulc-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}
.vulc-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
}
.vulc-card.is-flash {
  border-color: var(--obs-amber, #f39c12);
  box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.25);
}
.vulc-card__btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  padding-right: 2.25rem;
}
.vulc-card__pill {
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #fff;
  margin-bottom: 0.3rem;
}
.vulc-card__name {
  margin: 0 0 0.2rem;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
}
.vulc-card__desc {
  margin: 0 0 0.3rem;
  font-size: 10px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.55);
}
.vulc-card__meta {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
}
.vulc-card__link {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  width: 1.6rem;
  height: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.vulc-card__link svg { width: 0.75rem; height: 0.75rem; }
.vulc-card__link:hover {
  background: rgba(231, 76, 60, 0.18);
  border-color: rgba(231, 76, 60, 0.5);
  color: var(--obs-red, #e74c3c);
}

/* ── Pager ─────────────────────────────────────────────────────── */
.vulc-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.vulc-pager__btn {
  width: 1.75rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.vulc-pager__btn svg { width: 0.85rem; height: 0.85rem; }
.vulc-pager__btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.vulc-pager__btn:disabled { opacity: 0.3; cursor: not-allowed; }
.vulc-pager__count {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.6);
}

/* ── Panel transition ──────────────────────────────────────────── */
.vulc-panel-enter-active,
.vulc-panel-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.vulc-panel-enter-from,
.vulc-panel-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

@media (max-width: 900px) {
  .vulc-panel { width: min(20rem, calc(100vw - 1.5rem)); right: 0.5rem; top: 4rem; bottom: 4.5rem; max-height: none; }
}
@media (max-width: 640px) {
  .vulc-panel { width: calc(100vw - 1rem); left: 0.5rem; right: 0.5rem; }
}

@media (prefers-reduced-motion: reduce) {
  .vulc-panel-enter-active, .vulc-panel-leave-active { transition: none; }
  .vulc-card:hover, .vulc-pager__btn:hover, .vulc-source-pill:hover, .vulc-chip:hover { transition: none; }
}
</style>