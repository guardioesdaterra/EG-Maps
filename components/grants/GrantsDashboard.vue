/**
 * components/grants/GrantsDashboard.vue
 * @why Worldwide grants browser — header (search, user) + single responsive
 *  grid of worldwide scraped grant opportunities
 * @component GrantsDashboard
 * @emits signIn, signOut, 'update:searchQuery', 'view-detail', 'open-create-grant'
 * @deps vue (computed), ~/composables/useI18n (useI18n)
 */
<template>
  <div class="gstore">
    <header class="gstore-header">
      <div class="gstore-header-inner">
        <div class="gstore-header-left">
          <div class="gstore-logo">
            <svg viewBox="0 0 32 32" fill="none" class="gstore-logo-icon">
              <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M10 20c2-6 6-10 6-10s4 4 6 10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
              <path d="M7 16c3-4 9-4 9-4s6 0 9 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            </svg>
            <span class="gstore-logo-text">{{ t('grantsPortal.dashboardLogoText') }}</span>
          </div>
          <div class="gstore-header-divider" />
          <span class="gstore-badge">{{ t('grantsPortal.dashboardBadge') }}</span>
        </div>
        <div class="gstore-header-right">
          <div class="gstore-search">
            <svg class="gstore-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              :value="searchQuery"
              @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
              :placeholder="t('grantsPortal.dashboardSearchPlaceholder')"
              class="gstore-search-input"
              :aria-label="t('grantsPortal.dashboardSearchPlaceholder')"
            />
            <button
              v-if="searchQuery"
              class="gstore-search-clear"
              :aria-label="t('grantsPortal.clearSearch')"
              :title="t('grantsPortal.clearSearch')"
              @click="$emit('update:searchQuery', '')"
            >✕</button>
          </div>
          <template v-if="user">
            <div v-if="isManager" class="gstore-create-btn" role="button" tabindex="0" @click="emit('open-create-grant')" @keydown.enter="emit('open-create-grant')" :aria-label="t('grantsPortal.createGrant')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>{{ t('grantsPortal.createGrant') }}</span>
            </div>
            <div class="gstore-user-pill" role="group" aria-label="User menu">
              <span class="gstore-user-avatar" :class="isManager ? 'manager' : ''">{{ isManager ? 'M' : 'C' }}</span>
              <span class="gstore-user-email">{{ user.email }}</span>
              <button class="gstore-signout-btn" @click="$emit('signOut')" :aria-label="t('grantsPortal.signOut')">✕</button>
            </div>
          </template>
          <template v-else>
            <button class="gstore-google-btn" :aria-label="t('grantsPortal.signInBtn')" @click="$emit('signIn')">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {{ t('grantsPortal.signInShort') }}
            </button>
          </template>
        </div>
      </div>
    </header>

    <main class="gstore-main">
      <div v-if="isLoading" class="gstore-skel-grid" aria-hidden="true">
        <div v-for="n in 8" :key="n" class="gstore-skel-card">
          <div class="gstore-skel-line short" />
          <div class="gstore-skel-line" />
          <div class="gstore-skel-line" />
          <div class="gstore-skel-footer" />
        </div>
      </div>

      <section v-else class="gstore-section">
        <div class="gstore-section-header">
          <div class="gstore-section-header-left">
            <span class="gstore-section-icon">🌍</span>
            <h2 class="gstore-section-title">{{ t('grantsPortal.catWorldwide') }}</h2>
            <span class="gstore-section-count">{{ items.length }}</span>
          </div>
          <div class="gstore-section-header-right">
            <label class="gstore-sort">
              <span class="gstore-sort-label">{{ t('grantsPortal.sortLabel') }}</span>
              <select v-model="sortKey" class="gstore-sort-select" :aria-label="t('grantsPortal.sortLabel')">
                <option value="priority">{{ t('grantsPortal.sortPriority') }}</option>
                <option value="newest">{{ t('grantsPortal.sortNewest') }}</option>
                <option value="deadline">{{ t('grantsPortal.sortDeadline') }}</option>
                <option value="amount">{{ t('grantsPortal.sortAmount') }}</option>
                <option value="commented">{{ t('grantsPortal.sortMostCommented') }}</option>
              </select>
            </label>
            <span class="gstore-section-count-badge">{{ t('grantsPortal.itemsLabel', { count: items.length }) }}</span>
          </div>
        </div>
        <div class="gstore-filters" role="group" :aria-label="t('grantsPortal.sortLabel')">
          <label class="gstore-sort">
            <span class="gstore-sort-label">{{ t('grantsPortal.filterDeadlineLabel') }}</span>
            <select v-model="deadlineFilter" class="gstore-sort-select" :aria-label="t('grantsPortal.filterDeadlineLabel')">
              <option value="all">{{ t('grantsPortal.filterDeadlineAll') }}</option>
              <option value="7">{{ t('grantsPortal.filterDeadline7') }}</option>
              <option value="30">{{ t('grantsPortal.filterDeadline30') }}</option>
              <option value="90">{{ t('grantsPortal.filterDeadline90') }}</option>
            </select>
          </label>
          <label class="gstore-sort">
            <span class="gstore-sort-label">{{ t('grantsPortal.filterRegionLabel') }}</span>
            <select v-model="regionFilter" class="gstore-sort-select" :aria-label="t('grantsPortal.filterRegionLabel')">
              <option value="all">{{ t('grantsPortal.filterRegionAll') }} ({{ liveCount }})</option>
              <option v-for="c in continentsWithCounts" :key="c.key" :value="c.key">
                {{ t(c.labelKey) }} ({{ c.count }})
              </option>
            </select>
          </label>
        </div>
        <div v-if="!items.length" class="gstore-empty">
          <p>{{ emptyMessage }}</p>
          <button v-if="hasActiveFilters" class="gstore-empty-btn" @click="clearFilters">
            {{ t('grantsPortal.clearFilters') }}
          </button>
        </div>
        <div v-else class="gstore-grid">
          <div
            v-for="(g, i) in items"
            :key="g.id"
            class="gstore-card"
            :style="{ animationDelay: Math.min(i * 30, 360) + 'ms' }"
            role="button"
            tabindex="0"
            :aria-label="`View details: ${g.title}`"
            @click="($emit as any)('view-detail', g)"
            @keydown.enter="($emit as any)('view-detail', g)"
            @keydown.space.prevent="($emit as any)('view-detail', g)"
          >
            <div class="gstore-card-top">
              <span v-if="g.grant_type" class="gstore-card-type" :class="g.grant_type">
                {{ grantTypeEmoji(g.grant_type) }}
              </span>
              <div class="gstore-card-badges">
                <span v-if="g.priority_score != null && g.priority_score >= 60" class="gstore-card-priority high">{{ g.priority_score }}</span>
                <span v-else-if="g.priority_score != null && g.priority_score >= 30" class="gstore-card-priority mid">{{ g.priority_score }}</span>
              </div>
            </div>
            <h3 class="gstore-card-title">{{ g.title }}</h3>
            <div class="gstore-card-meta">
              <span v-if="g.funder" class="gstore-card-meta-item">{{ g.funder }}</span>
              <span v-if="g.country" class="gstore-card-meta-item">{{ g.country }}</span>
              <span v-if="commentCountOf(g) > 0" class="gstore-card-meta-item comments" :title="t('grantsPortal.comments')">💬 {{ commentCountOf(g) }}</span>
              <span v-if="deadlineInfo(g)" class="gstore-card-meta-item deadline" :class="deadlineInfo(g)!.cls">{{ deadlineInfo(g)!.text }}</span>
            </div>
            <div class="gstore-card-footer">
              <div v-if="g.amount_max" class="gstore-card-amount">{{ g.amount_max }} {{ g.currency }}</div>
              <div v-else-if="'direct_beneficiaries' in g && g.direct_beneficiaries != null" class="gstore-card-amount">{{ formatCompact(Number(g.direct_beneficiaries)) }} {{ t('grantsPortal.beneficiariesSuffix') }}</div>
              <div v-else class="gstore-card-amount muted">—</div>
              <div v-if="g.highlights?.length" class="gstore-card-tags">
                <span v-for="hl in g.highlights.slice(0, 2)" :key="hl" class="gstore-card-tag" :class="hl.toLowerCase().replace(/\s+/g, '_')">{{ hl }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GrantRecord, ScrapedGrant } from '~/composables/useGrants'
import { useI18n } from '~/composables/useI18n'
import { GRANT_CONTINENTS, grantContinentOf, type GrantContinentKey } from '~/lib/grants-regions'

const props = withDefaults(defineProps<{
  user: { email?: string } | null
  isManager: boolean
  searchQuery: string
  isLoading: boolean
  filteredScrapedGrants: (ScrapedGrant | GrantRecord)[]
  /** grant-id → comment count map (grants without comments are absent = 0) */
  commentCounts?: Record<string, number>
}>(), {
  commentCounts: () => ({}),
})

const emit = defineEmits<{
  signIn: []
  signOut: []
  'update:searchQuery': [q: string]
  'view-detail': [grant: ScrapedGrant | GrantRecord]
  'open-create-grant': []
}>()

const { t } = useI18n()

function grantTypeEmoji(type?: string): string {
  const map: Record<string, string> = {
    artivism: '🎨', climate_justice: '🌍', conservation: '🌿',
    human_rights: '⚖️', indigenous_rights: '🏹', youth: '🌟',
  }
  return map[type || ''] || '📋'
}

function formatCompact(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'K'
  return val.toFixed(0)
}

type MixedGrant = ScrapedGrant | GrantRecord | (ScrapedGrant & { direct_beneficiaries?: number })

type SortKey = 'newest' | 'priority' | 'deadline' | 'amount' | 'commented'
/** v2.9: default to smart ranking (mission fit + evidence + urgency),
 * not recency — a freshly scraped dateless reference must not outrank
 * an open dated call. */
const sortKey = ref<SortKey>('priority')

type DeadlineFilter = 'all' | '7' | '30' | '90'
type RegionFilter = 'all' | GrantContinentKey
const deadlineFilter = ref<DeadlineFilter>('all')
const regionFilter = ref<RegionFilter>('all')

function grantTimestamp(g: MixedGrant): number {
  const raw = ('fetched_at' in g && g.fetched_at) || g.created_at
  const ts = raw ? new Date(raw).getTime() : NaN
  return Number.isFinite(ts) ? ts : 0
}

function commentCountOf(g: MixedGrant): number {
  return props.commentCounts[g.id] ?? 0
}

/**
 * Calendar-day countdown to the deadline (UTC, matches the scraper's
 * compute_deadline_urgency). Prefers the server-computed deadline_days and
 * falls back to parsing the deadline string client-side. Null = unknown.
 */
function effectiveDeadlineDays(g: MixedGrant): number | null {
  if ('deadline_days' in g && typeof g.deadline_days === 'number' && Number.isFinite(g.deadline_days)) {
    return g.deadline_days
  }
  const raw = typeof g.deadline === 'string' ? g.deadline.trim() : ''
  if (!raw) return null
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  let dayMs: number | null = null
  if (iso) {
    dayMs = Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    if (!Number.isFinite(dayMs)) return null
  } else {
    const ts = Date.parse(raw)
    if (!Number.isFinite(ts)) return null
    const d = new Date(ts)
    dayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  }
  const now = new Date()
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((dayMs - todayMs) / 86400000)
}

/** Worldwide calls serve the whole community — they win priority ties over single-country calls. */
function isGlobalScope(g: MixedGrant): boolean {
  const c = (g.country || '').trim().toUpperCase()
  return c === '' || c === 'GLOBAL'
}

/** A grant is expired when closed or past its deadline — never shippable. */
function isExpiredGrant(g: MixedGrant): boolean {
  if ((g.status || '').toLowerCase() === 'closed') return true
  const days = effectiveDeadlineDays(g)
  if (days != null) return days < 0
  return g.urgency === 'expired'
}

function isOpenStatus(g: MixedGrant): boolean {
  return g.status === 'approved-active-open' || g.status === 'approved' || g.status === 'open'
}

/** Deadline display info for a card, or null when unknown. */
function deadlineInfo(g: MixedGrant): { text: string; cls: string } | null {
  const days = effectiveDeadlineDays(g)
  if (days != null) {
    if (days < 0) return { text: t('grantsPortal.urgencyExpired'), cls: 'expired' }
    if (days === 0) return { text: t('grantsPortal.closingToday'), cls: 'urgent' }
    const text = t('grantsPortal.daysRemaining', { count: days })
    if (days <= 30) return { text, cls: 'urgent' }
    if (days <= 90) return { text, cls: 'soon' }
    return { text, cls: '' }
  }
  if (g.deadline) {
    const ts = new Date(g.deadline).getTime()
    if (Number.isFinite(ts)) {
      return {
        text: `${t('grantsPortal.deadlineLabel')} ${new Date(ts).toLocaleDateString()}`,
        cls: ts < Date.now() ? 'expired' : '',
      }
    }
  }
  return null
}

/**
 * Live grants: open status AND not expired/closed. Every dashboard filter
 * builds on this — a closed or deadline-passed grant is never listed.
 */
const liveGrants = computed<MixedGrant[]>(() =>
  (props.filteredScrapedGrants as MixedGrant[]).filter(
    (g) => isOpenStatus(g) && !isExpiredGrant(g),
  ),
)

const liveCount = computed(() => liveGrants.value.length)

function matchesSearch(g: MixedGrant, q: string): boolean {
  if (!q) return true
  return (
    (g.title || '').toLowerCase().includes(q) ||
    (g.funder || '').toLowerCase().includes(q) ||
    (g.country || '').toLowerCase().includes(q) ||
    (g.description || '').toLowerCase().includes(q) ||
    (g.categories || []).some((c: string) => c.toLowerCase().includes(q))
  )
}

/** Live + search (everything except the deadline/region filters). */
const searchableGrants = computed<MixedGrant[]>(() => {
  const q = props.searchQuery?.toLowerCase() ?? ''
  return liveGrants.value.filter((g) => matchesSearch(g, q))
})

/** Per-continent counts for the region dropdown (respects search). */
const continentsWithCounts = computed(() => {
  const counts = new Map<GrantContinentKey, number>()
  for (const g of searchableGrants.value) {
    const key = grantContinentOf(g.country, 'region' in g ? (g.region as string) : null)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return GRANT_CONTINENTS.map((c) => ({ ...c, count: counts.get(c.key) ?? 0 })).filter(
    (c) => c.count > 0,
  )
})

const hasActiveFilters = computed(
  () =>
    !!props.searchQuery ||
    deadlineFilter.value !== 'all' ||
    regionFilter.value !== 'all',
)

const emptyMessage = computed(() =>
  hasActiveFilters.value
    ? t('grantsPortal.noMatchingGrants')
    : t('grantsPortal.dashboardEmpty'),
)

function clearFilters() {
  emit('update:searchQuery', '')
  deadlineFilter.value = 'all'
  regionFilter.value = 'all'
}

/** Worldwide scraped grants, filtered by search + deadline + region, ordered by sortKey. */
const items = computed<MixedGrant[]>(() => {
  let filtered = searchableGrants.value
  // Closing-soon window: from today (0) up to N days out. Unknown deadlines
  // can't prove closeness, so they're excluded here — and expired grants
  // never reach this point (see liveGrants).
  if (deadlineFilter.value !== 'all') {
    const maxDays = Number(deadlineFilter.value)
    filtered = filtered.filter((g) => {
      const days = effectiveDeadlineDays(g)
      return days != null && days >= 0 && days <= maxDays
    })
  }
  if (regionFilter.value !== 'all') {
    filtered = filtered.filter(
      (g) =>
        grantContinentOf(g.country, 'region' in g ? (g.region as string) : null) ===
        regionFilter.value,
    )
  }
  const sorted = [...filtered]
  switch (sortKey.value) {
    case 'priority':
      // v2.10 absolute scope tier: EVERY worldwide (GLOBAL) call ranks above
      // EVERY single-country call, then by priority → deadline → amount → newer.
      sorted.sort((a, b) => {
        const tier = Number(isGlobalScope(b)) - Number(isGlobalScope(a))
        if (tier !== 0) return tier
        const pri = (b.priority_score ?? -1) - (a.priority_score ?? -1)
        if (pri !== 0) return pri
        const da = effectiveDeadlineDays(a) ?? Number.POSITIVE_INFINITY
        const db = effectiveDeadlineDays(b) ?? Number.POSITIVE_INFINITY
        if (da !== db) return da - db
        const amt = (b.amount_usd ?? -1) - (a.amount_usd ?? -1)
        if (amt !== 0) return amt
        return grantTimestamp(b) - grantTimestamp(a)
      })
      break
    case 'deadline':
      sorted.sort((a, b) => {
        const da = effectiveDeadlineDays(a) ?? Number.POSITIVE_INFINITY
        const db = effectiveDeadlineDays(b) ?? Number.POSITIVE_INFINITY
        return da - db
      })
      break
    case 'amount':
      sorted.sort((a, b) => (b.amount_usd ?? -1) - (a.amount_usd ?? -1))
      break
    case 'commented':
      sorted.sort((a, b) => {
        const diff = commentCountOf(b) - commentCountOf(a)
        return diff !== 0 ? diff : grantTimestamp(b) - grantTimestamp(a)
      })
      break
    case 'newest':
    default:
      sorted.sort((a, b) => grantTimestamp(b) - grantTimestamp(a))
      break
  }
  return sorted
})
</script>

<style scoped>
.gstore {
  --accent: var(--success);
  --accent-dim: var(--success-bg);
  --accent-glow: rgba(39, 174, 96, 0.06);
  --glass: var(--glass-bg);
  --glass-hover: rgba(255, 255, 255, 0.07);
  --text: var(--text-primary);
  --text-tertiary: var(--text-muted);
  --surface: var(--bg-secondary);
  background: transparent;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.gstore-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
:global(.dark) .gstore-header {
  background: rgba(255, 255, 255, 0.03);
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.gstore-header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 28px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.gstore-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.gstore-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  text-decoration: none;
}

.gstore-logo-icon {
  width: 20px;
  height: 20px;
  color: var(--accent);
}

.gstore-logo-text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.gstore-header-divider {
  width: 1px;
  height: 18px;
  background: var(--glass-border);
}

.gstore-badge {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.gstore-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.gstore-search {
  position: relative;
  max-width: 280px;
  width: 100%;
}

.gstore-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.gstore-search-input {
  width: 100%;
  padding: 7px 12px 7px 34px;
  background: var(--surface);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  font-weight: 400;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.gstore-search-input:focus {
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.04);
}

.gstore-search-input::placeholder {
  color: var(--text-tertiary);
}

.gstore-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  border-radius: 50%;
  color: var(--text-tertiary);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.gstore-search-clear:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text);
}

.gstore-user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px 3px 3px;
  background: var(--surface);
  border: 1px solid var(--glass-border);
  border-radius: 9999px;
  flex-shrink: 0;
}

.gstore-user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.gstore-user-avatar.manager {
  background: var(--accent-dim);
  color: var(--accent);
}

.gstore-user-email {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gstore-signout-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 13px;
  cursor: pointer;
  padding: clamp(6px, 0.8vw, 10px) clamp(8px, 1vw, 12px);
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.15s;
}

.gstore-signout-btn:hover {
  color: var(--text);
}

.gstore-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: clamp(8px, 1vw, 12px) clamp(12px, 1.5vw, 18px);
  min-height: 44px;
  background: var(--accent);
  border: none;
  border-radius: 9999px;
  color: var(--bg-primary);
  font-size: clamp(11px, 1.2vw, 13px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.gstore-create-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 16px rgba(0, 255, 133, 0.3);
}

.gstore-create-btn svg {
  width: 14px;
  height: 14px;
}

.gstore-google-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  background: var(--surface);
  border: 1px solid var(--glass-border);
  border-radius: 9999px;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.gstore-google-btn:hover {
  background: var(--glass-hover);
  border-color: rgba(255, 255, 255, 0.12);
}

.gstore-main {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 28px 48px;
  width: 100%;
}

.gstore-skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  padding: 24px 0 8px;
}

.gstore-skel-card {
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 14px;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--glass);
  overflow: hidden;
  position: relative;
}

.gstore-skel-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%);
  animation: skel-shimmer 1.4s ease-in-out infinite;
}

@keyframes skel-shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

.gstore-skel-line {
  height: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
}

.gstore-skel-line.short {
  width: 40%;
  height: 16px;
}

.gstore-skel-footer {
  margin-top: auto;
  height: 24px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
}

.gstore-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.gstore-empty p {
  margin: 0 0 16px;
}

.gstore-empty-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  background: var(--surface);
  border: 1px solid var(--glass-border);
  border-radius: 9999px;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.gstore-empty-btn:hover {
  background: var(--glass-hover);
  border-color: rgba(255, 255, 255, 0.12);
}

.gstore-section-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.gstore-sort {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.gstore-sort-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.gstore-sort-select {
  appearance: none;
  -webkit-appearance: none;
  padding: 7px 28px 7px 12px;
  background-color: var(--surface);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.gstore-sort-select:hover,
.gstore-sort-select:focus {
  border-color: var(--accent);
}

.gstore-sort-select option {
  background: #111;
  color: #f5f5f5;
}

.gstore-section {
  margin-bottom: 36px;
}

.gstore-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 0 2px;
}

.gstore-section-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gstore-section-icon {
  font-size: 20px;
  line-height: 1;
}

.gstore-section-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
}

.gstore-section-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 9999px;
  background: var(--surface);
}

.gstore-section-count-badge {
  font-size: clamp(11px, 1.2vw, 13px);
  font-weight: 500;
  color: var(--text-tertiary);
  padding: clamp(2px, 0.3vw, 4px) clamp(8px, 1vw, 12px);
  border-radius: 9999px;
  background: var(--surface);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.gstore-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 14px;
  padding: 0 2px;
}

.gstore-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  padding: 4px 2px 8px;
}

.gstore-card {
  background: var(--glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: transform 0.25s, background 0.25s, border-color 0.25s;
  display: flex;
  flex-direction: column;
  min-height: 160px;
  animation: card-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .gstore-card {
    animation: none;
  }
}

.gstore-card:hover {
  background: var(--glass-hover);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.gstore-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 6px;
}

.gstore-card-type {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.gstore-card-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.gstore-card-priority {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
}

.gstore-card-priority.high {
  background: color-mix(in srgb, var(--accent) 62%, black);
  color: #fff;
}

.gstore-card-priority.mid {
  background: color-mix(in srgb, var(--warning) 62%, black);
  color: #fff;
}

.gstore-card-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gstore-card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: auto;
}

.gstore-card-meta-item {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gstore-card-meta-item.deadline {
  font-weight: 600;
}

.gstore-card-meta-item.deadline.urgent {
  color: var(--danger);
}

.gstore-card-meta-item.deadline.soon {
  color: var(--warning);
}

.gstore-card-meta-item.deadline.expired {
  color: var(--text-tertiary);
  text-decoration: line-through;
}

.gstore-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid var(--glass-border);
}

.gstore-card-amount {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gstore-card-amount.muted {
  color: var(--text-tertiary);
  font-weight: 400;
}

.gstore-card-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.gstore-card-tag {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 4px;
  white-space: nowrap;
}

.gstore-card-tag.eg_core,
.gstore-card-tag.high_value {
  background: var(--accent-dim);
  color: var(--accent);
}

.gstore-card-tag.urgent {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.gstore-card-tag.soon {
  background: rgba(234, 179, 8, 0.15);
  color: var(--warning);
}

@media (max-width: 768px) {
  .gstore-header-inner {
    padding: 0 16px;
    height: 48px;
  }

  .gstore-main {
    padding: 16px 16px 32px;
  }

  .gstore-search {
    max-width: 160px;
  }

  .gstore-user-email {
    display: none;
  }

  .gstore-card {
    min-height: 140px;
    padding: 12px;
  }

  .gstore-section-title {
    font-size: 17px;
  }

  .gstore-badge {
    display: none;
  }

  .gstore-grid,
  .gstore-skel-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .gstore-section-header {
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>
