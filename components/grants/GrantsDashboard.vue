<template>
  <div class="gdash">
    <!-- ── User bar ──────────────────────────────────── -->
    <div class="gdash-user glass">
      <template v-if="user">
        <div class="gdash-user-info">
          <div class="gdash-avatar" :class="isManager ? 'manager' : 'member'">
            {{ isManager ? 'M' : 'C' }}
          </div>
          <div>
            <p class="gdash-role">{{ isManager ? t('grantsPortal.manager') : t('grantsPortal.crewMember') }}</p>
            <p class="gdash-email">{{ user.email }}</p>
          </div>
        </div>
        <button class="gdash-signout" @click="$emit('signOut')">{{ t('grantsPortal.signOut') }}</button>
      </template>
      <template v-else>
        <div class="gdash-signin-inner">
          <svg class="gdash-heart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          <h3>{{ t('grantsPortal.signInTitle') }}</h3>
          <p>{{ t('grantsPortal.signInDesc') }}</p>
          <button class="gdash-google-btn" @click="$emit('signIn')">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {{ t('grantsPortal.signInBtn') }}
          </button>
          <a href="https://www.earthguardians.org/" target="_blank" class="gdash-join-link">{{ t('grantsPortal.notMemberJoin') }}</a>
        </div>
      </template>
    </div>

    <!--     ── Stats row ─────────────────────────────────── -->

    <!-- ── Tabs + Search ─────────────────────────────── -->
    <div v-if="user" class="gdash-controls">
      <div class="gdash-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="gdash-tab"
          :class="{ active: activeTab === tab.key }"
          @click="$emit('update:activeTab', tab.key)"
        >
          <span class="gdash-tab-emoji">{{ tab.emoji }}</span>
          {{ t(`grantsPortal.${tab.key}`) }}
          <span class="gdash-tab-count">{{ tabCount(tab.key) }}</span>
        </button>
      </div>
      <div class="gdash-search">
        <svg class="gdash-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input
          :value="searchQuery"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          :placeholder="t('grantsPortal.dashboardSearchPlaceholder')"
          class="gdash-search-input"
          :aria-label="t('grantsPortal.dashboardSearchPlaceholder')"
        />
      </div>
    </div>
    <p v-else class="gdash-signin-hint">{{ t('grantsPortal.signInDashboardDesc') }}</p>

    <!-- ── Manager: scraped-grant status sub-filters ── -->
    <div v-if="user && isManager && activeTab === 'tabPending'" class="gdash-subtabs">
      <button
        v-for="s in (['pending', 'open', 'closed'] as const)"
        :key="s"
        class="gdash-subtab"
        :class="{ active: managerSubTab === s }"
        @click="$emit('update:managerSubTab', s)"
      >{{ s === 'pending' ? t('grantsPortal.awaitingReview') : s === 'open' ? t('grantsPortal.approved') : t('grantsPortal.closed') }}</button>
      <button
        class="gdash-subtab ml-auto"
        :class="{ active: showHistory }"
        @click="$emit('toggle:showHistory')"
      >
        <svg class="inline-block w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {{ t('grantsPortal.history') }}
      </button>
    </div>

    <!-- ── Grant list ────────────────────────────────── -->
    <div class="gdash-list">
      <div v-if="isLoading" class="gdash-status">{{ t('grantsPortal.loadingGrants') }}</div>
      <div v-else-if="displayGrants.length === 0" class="gdash-status">{{ emptyMessage }}</div>

      <!-- All grants (scraped + internal) — renders pending/open/closed based on active tab -->
      <template v-if="activeTab !== 'tabLeaderboard'">
        <div
          v-for="g in paginatedGrants"
          :key="g.id"
           class="gdash-card glass"
           :class="{
             'opacity-60': activeTab === 'tabClosed',
             removing: removingGrants.includes(g.id)
           }"
        >
          <div class="gdash-card-header">
            <div class="gdash-card-title-row">
              <span v-if="g.grant_type" class="gdash-type-badge" :class="g.grant_type || 'general'">
                {{ typeEmoji(g.grant_type) }} {{ grantTypeLabel(g.grant_type) }}
              </span>
              <h4>{{ g.title }}</h4>
            </div>
            <div class="gdash-card-badges">
              <span v-if="g.priority_score != null" class="gdash-priority" :class="priorityClass(g.priority_score)">{{ g.priority_score }}</span>
              <span class="gdash-badge" :class="statusClass">{{ statusLabel }}</span>
            </div>
          </div>

          <div v-if="g.highlights?.length && activeTab === 'tabOpen'" class="gdash-highlights">
            <span v-for="hl in g.highlights.slice(0, 5)" :key="hl" class="gdash-highlight" :class="hl.toLowerCase().replace(/\s+/g, '_')">{{ hl }}</span>
          </div>

          <div v-if="activeTab === 'tabOpen' && g.urgency" class="gdash-urgency" :class="g.urgency">
            <template v-if="g.urgency === 'urgent'">⚠️ {{ t('grantsPortal.urgencyUrgent') }}</template>
            <template v-else-if="g.urgency === 'soon'">⏰ {{ t('grantsPortal.urgencySoon') }}</template>
            <template v-else-if="g.urgency === 'expired'">🔴 {{ t('grantsPortal.urgencyExpired') }}</template>
          </div>

          <p class="gdash-card-desc">{{ g.description?.slice(0, 200) }}{{ g.description?.length > 200 ? '...' : '' }}</p>

          <div class="gdash-card-meta-row">
            <span v-if="g.funder">🏛 {{ t('grantsPortal.funder') }}: {{ g.funder }}</span>
            <span v-if="g.country">📍 {{ t('grantsPortal.country') }}: {{ g.country }}</span>
            <span v-if="g.deadline">📅 {{ t('grantsPortal.deadline') }}: {{ g.deadline }}</span>
            <template v-if="g.amount_max">
              <span>💰 {{ t('grantsPortal.amount') }}: {{ g.amount_max }} {{ g.currency }}</span>
              <span v-if="g.amount_usd != null" class="text-green-400/70">≈ ${{ formatAmount(g.amount_usd) }} USD</span>
            </template>
            <span v-if="g.source">📡 {{ t('grantsPortal.source') }}: {{ g.source }}</span>
          </div>

          <div v-if="g.categories?.length && activeTab === 'tabOpen'" class="gdash-categories">
            <span v-for="cat in g.categories.slice(0, 4)" :key="cat" class="gdash-cat-tag">{{ cat }}</span>
          </div>

          <div class="gdash-card-footer">
            <div v-if="activeTab !== 'tabClosed'" class="gdash-stars">
              <button v-for="n in 8" :key="n" class="gdash-star" :class="{ active: (userVotes[g.id] || 0) >= n }" @click="user ? $emit('vote', g.id, n) : showLoginPopup = true" :aria-label="n + ' ' + t('grantsPortal.stars')" role="radio" :aria-checked="(userVotes[g.id] || 0) >= n">★</button>
              <span class="gdash-votes">{{ voteCount(g.id) }} {{ t('grantsPortal.votes') }}</span>
            </div>
            <div class="gdash-card-links">
              <button class="gdash-link-btn" @click="$emit('view-detail', g)">{{ t('grantsPortal.details') }}</button>
              <a v-if="isSafeUrl(g.url)" :href="g.url" target="_blank" class="gdash-link-btn apply" rel="noopener noreferrer">{{ t('grantsPortal.apply') }} ↗</a>
              <template v-if="isManager">
                <button v-if="activeTab === 'tabPending'" class="gdash-action approve text-[11px] py-0.5" @click="$emit('review:scraped', g.id, 'approved')">✓ {{ t('grantsPortal.approve') }}</button>
                <button v-if="activeTab === 'tabPending'" class="gdash-action reject text-[11px] py-0.5" @click="$emit('review:scraped', g.id, 'hidden')">✗ {{ t('grantsPortal.reject') }}</button>
                <button v-if="activeTab === 'tabOpen'" class="gdash-action reject text-[11px] py-0.5" @click="$emit('review:scraped', g.id, 'hidden')">✗ {{ t('grantsPortal.reject') }}</button>
                <button v-if="activeTab === 'tabClosed'" class="gdash-action restore text-[11px] py-0.5" @click="$emit('review:scraped', g.id, 'pending')">↩ {{ t('grantsPortal.restore') }}</button>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- Leaderboard -->
      <template v-if="activeTab === 'tabLeaderboard'">
        <div v-if="leaderboardLoading" class="gdash-status">{{ t('grantsPortal.loadingLeaderboard') }}</div>
        <div v-else-if="leaderboard.length === 0" class="gdash-status">{{ t('grantsPortal.noLeaderboard') }}</div>
        <div v-for="(entry, i) in leaderboard" :key="entry.id" class="gdash-card glass">
          <div class="gdash-card-header">
            <div class="gdash-lb-rank" :style="{ color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#ffffff40' }">#{{ i + 1 }}</div>
            <div class="gdash-lb-info">
              <h4>{{ entry.title }}</h4>
              <div class="gdash-lb-meta">
                <span class="text-yellow-400 text-sm">{{ safeStarRepeat(entry.avg_stars) }}</span>
                <span class="text-xs text-white/50">{{ entry.avg_stars }}/8 ({{ entry.vote_count }} votes)</span>
                <span class="text-xs text-white/30">{{ entry.view_count }} views</span>
                <span v-if="entry.source_type === 'scraped'" class="gdash-source-badge open">{{ t('grantsPortal.leaderboardOpen') }}</span>
                <span v-else class="gdash-source-badge crew">{{ t('grantsPortal.leaderboardCrew') }}</span>
              </div>
            </div>
            <button class="gdash-link-btn" @click="$emit('leaderboardDetail', entry)">{{ t('grantsPortal.details') }}</button>
          </div>
        </div>
      </template>

      <!-- ── Pagination ──────────────────────────── -->
      <div v-if="totalPages > 1" class="gdash-pagination glass">
        <button
          class="gdash-page-btn"
          :disabled="currentPage <= 1"
          @click="currentPage = Math.max(1, currentPage - 1)"
          :aria-label="t('grantsPortal.paginationPrev')"
        >‹</button>
        <template v-for="p in visiblePages" :key="p">
          <span v-if="p === '...'" class="gdash-page-ellipsis">…</span>
          <button
            v-else
            class="gdash-page-num"
            :class="{ active: p === currentPage }"
            @click="goToPage(p)"
          >{{ p }}</button>
        </template>
        <button
          class="gdash-page-btn"
          :disabled="currentPage >= totalPages"
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :aria-label="t('grantsPortal.paginationNext')"
        >›</button>
      </div>
    </div>
  </div>

  <!-- Login popup for non-authenticated actions -->
  <Teleport to="body">
    <Transition name="popup-fade">
      <div v-if="showLoginPopup" class="gdash-login-overlay" role="dialog" aria-modal="true" :aria-label="t('grantsPortal.signInTitle')" @click.self="showLoginPopup = false">
        <div class="gdash-login-popup glass">
          <div class="gdash-login-header">
            <svg class="gdash-login-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <h3>{{ t('grantsPortal.signInTitle') }}</h3>
          </div>
          <p class="gdash-login-desc">{{ t('grantsPortal.signInToVote') }}</p>
          <div class="gdash-login-actions">
            <button class="gdash-google-btn" @click="$emit('signIn'); showLoginPopup = false">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {{ t('grantsPortal.signInBtn') }}
            </button>
            <button class="gdash-cancel-btn" @click="showLoginPopup = false">{{ t('grantsPortal.cancel') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GrantRecord, ScrapedGrant, LeaderboardEntry } from '~/composables/useGrants'

const props = defineProps<{
  user: { email?: string } | null
  isManager: boolean
  pendingCount: number
  openCount: number
  closedCount: number
  activeTab: string
  managerSubTab: string
  showHistory: boolean
  searchQuery: string
  isLoading: boolean
  scrapedLoading: boolean
  internalGrants: GrantRecord[]
  filteredScrapedGrants: (ScrapedGrant | GrantRecord)[]
  filteredInternalGrants: GrantRecord[]
  userVotes: Record<string, number>
  leaderboard: LeaderboardEntry[]
  leaderboardLoading: boolean
  removingGrants: string[]
}>()

defineEmits<{
  signIn: []
  signOut: []
  'update:activeTab': [tab: string]
  'update:managerSubTab': [sub: string]
  'update:searchQuery': [q: string]
  'toggle:showHistory': []
  vote: [id: string, stars: number]
  'view-detail': [grant: ScrapedGrant | GrantRecord]
  leaderboardDetail: [entry: LeaderboardEntry]
  'review:grant': [id: string, decision: 'pending' | 'open' | 'closed']
  'review:scraped': [id: string, decision: 'approved' | 'hidden' | 'pending']
}>()

const { t } = useI18n()

const showLoginPopup = ref(false)
const currentPage = ref(1)
const perPage = 10

function goToPage(p: number | string) {
  if (typeof p === 'number') currentPage.value = p
}

watch(() => props.user, (newUser) => {
  if (newUser) showLoginPopup.value = false
})

watch([() => props.activeTab, () => props.filteredScrapedGrants, () => props.searchQuery], () => {
  currentPage.value = 1
})

const tabs = computed(() => {
  const list = [
    { key: 'tabPending', emoji: '📋' },
    { key: 'tabOpen', emoji: '🌍' },
    { key: 'tabClosed', emoji: '🔒' },
    { key: 'tabLeaderboard', emoji: '🏆' },
  ]
  if (!props.user) return list.filter(tab => tab.key === 'tabOpen')
  if (!props.isManager) return list.filter(tab => tab.key === 'tabOpen' || tab.key === 'tabLeaderboard')
  return list
})

const displayGrants = computed(() => props.filteredScrapedGrants)

const totalPages = computed(() => Math.max(1, Math.ceil(displayGrants.value.length / perPage)))

const paginatedGrants = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return displayGrants.value.slice(start, start + perPage)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const curr = currentPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (curr <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (curr >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', curr - 1, curr, curr + 1, '...', total]
})

const statusClass = computed(() => {
  const map: Record<string, string> = {
    tabPending: 'pending',
    tabOpen: 'open',
    tabClosed: 'closed',
  }
  return map[props.activeTab] || 'pending'
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    tabPending: t('grantsPortal.statusPending'),
    tabOpen: t('grantsPortal.statusOpen'),
    tabClosed: t('grantsPortal.statusClosed'),
  }
  return map[props.activeTab] || ''
})

const emptyMessage = computed(() => {
  if (props.searchQuery) return t('grantsPortal.dashboardEmptySearch')
  const map: Record<string, string> = {
    tabPending: t('grantsPortal.noGrants'),
    tabOpen: t('grantsPortal.noOpenGrants'),
    tabClosed: t('grantsPortal.noClosedGrants'),
    tabLeaderboard: t('grantsPortal.noLeaderboard'),
  }
  return map[props.activeTab] || t('grantsPortal.noGrants')
})

function tabCount(key: string): string {
  const map: Record<string, number> = {
    tabPending: props.pendingCount,
    tabOpen: props.openCount,
    tabClosed: props.closedCount,
  }
  const n = map[key]
  return n != null ? `(${n})` : ''
}

function typeEmoji(type?: string): string {
  const map: Record<string, string> = {
    artivism: '🎨',
    climate_justice: '🌍',
    conservation: '🌿',
    human_rights: '⚖️',
    indigenous_rights: '🏹',
    youth: '🌟',
  }
  return map[type || ''] || '📋'
}

function grantTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    artivism: 'Artivism',
    climate_justice: 'Climate Justice',
    conservation: 'Conservation',
    human_rights: 'Human Rights',
    indigenous_rights: 'Indigenous Rights',
    youth: 'Youth',
  }
  return map[type || ''] || 'General'
}

function priorityClass(score: number): string {
  if (score >= 60) return 'high'
  if (score >= 30) return 'mid'
  return 'low'
}

function formatAmount(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'K'
  return val.toFixed(0)
}

function isSafeUrl(url: string | undefined | null): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function safeStarRepeat(count: number): string {
  const clamped = Math.max(0, Math.min(8, Math.round(count)))
  return '★'.repeat(clamped) + '☆'.repeat(8 - clamped)
}

function voteCount(grantId: string): number {
  const entry = props.leaderboard.find(e => e.id === grantId)
  return entry?.vote_count || 0
}
</script>

<style scoped>
.gdash {
  --obsidian: #08080a;
  --tectonic-white: #f0f0f0;
  --accent: #00ff85;
  --stat-open: #eab308;
  --stat-approved: var(--accent);
  --stat-closed: rgba(255, 255, 255, 0.4);
  --stat-declined: #ef4444;
  max-width: 720px;
  margin: 0 auto;
}

/* ── Glass panels ──────────────────────────────────── */
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.glass:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

/* ── User bar ──────────────────────────────────────── */
.gdash-user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  margin-bottom: 1.5rem;
}
.gdash-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.gdash-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  flex-shrink: 0;
}
.gdash-avatar.manager { background: rgba(0,255,133,0.2); color: var(--accent); }
.gdash-avatar.member { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
.gdash-role { font-size: 0.8rem; font-weight: 700; color: var(--tectonic-white); }
.gdash-email { font-size: 0.7rem; color: rgba(255,255,255,0.3); }
.gdash-signout {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.5);
  padding: 0.4rem 1rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.gdash-signout:hover {
  color: var(--tectonic-white);
  border-color: rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.08);
}

/* Sign-in state */
.gdash-signin-inner {
  text-align: center;
  padding: 2.5rem 2rem;
  width: 100%;
}
.gdash-heart-icon {
  width: 40px;
  height: 40px;
  stroke: var(--accent);
  margin: 0 auto 1rem;
  display: block;
}
.gdash-signin-inner h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--tectonic-white);
  margin-bottom: 0.5rem;
  font-family: 'JetBrains Mono', monospace;
}
.gdash-signin-inner p {
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}
.gdash-google-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0.8rem 2rem;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--tectonic-white);
  font-weight: 700;
  font-size: 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s;
}
.gdash-google-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.02);
}
.gdash-join-link {
  display: block;
  margin-top: 1rem;
  font-size: 0.7rem;
  text-align: center;
  color: rgba(255,255,255,0.35);
  text-decoration: underline;
  text-underline-offset: 2;
  transition: color 0.2s;
}
.gdash-join-link:hover { color: rgba(255,255,255,0.6); }

/* ── Stats row ─────────────────────────────────────── */
.gdash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.gdash-stat {
  padding: 1rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.gdash-stat::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, transparent 50%);
  pointer-events: none;
}
.gdash-stat:hover {
  box-shadow: 0 0 30px rgba(0, 255, 133, 0.05);
  transform: translateY(-2px);
}
.gdash-stat-num {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  position: relative;
}
.gdash-stat-label {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.3);
  margin-top: 4px;
  position: relative;
}

/* ── Controls (tabs + search) ──────────────────────── */
.gdash-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.gdash-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.gdash-tab {
  border: none;
  cursor: pointer;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  background: transparent;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}
.gdash-tab:hover {
  color: rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.06);
}
.gdash-tab.active {
  color: #fff;
  background: rgba(255,255,255,0.1);
}
.gdash-tab-emoji { font-size: 0.85rem; }
.gdash-tab-count {
  font-size: 0.6rem;
  opacity: 0.5;
  font-family: 'JetBrains Mono', monospace;
}

.gdash-search {
  position: relative;
  max-width: 400px;
}
.gdash-search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.25);
  pointer-events: none;
}
.gdash-search-input {
  width: 100%;
  padding: 0.7rem 1rem 0.7rem 2.75rem;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--tectonic-white);
  font-size: 0.8rem;
  outline: none;
  transition: all 0.3s;
}
.gdash-search-input:focus {
  border-color: rgba(0, 255, 133, 0.3);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 25px rgba(0, 255, 133, 0.04);
}
.gdash-search-input::placeholder { color: rgba(255, 255, 255, 0.2); }

.gdash-signin-hint {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.35);
  margin-bottom: 1rem;
}

/* ── Sub-tabs (manager) ────────────────────────────── */
.gdash-subtabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}
.gdash-subtab {
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  background: transparent;
  transition: all 0.15s;
}
.gdash-subtab:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.06); }
.gdash-subtab.active { color: #fff; background: rgba(255,255,255,0.1); }

/* ── Grant list ────────────────────────────────────── */
.gdash-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.gdash-status {
  text-align: center;
  padding: 2.5rem 1rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}

/* ── Grant card (unified) ──────────────────────────── */
.gdash-card {
  padding: 1.25rem;
  transition: all 0.2s;
}
.gdash-card:hover {
  background: rgba(255, 255, 255, 0.04);
}
.gdash-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.gdash-card-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
.gdash-card-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.gdash-card-header h4 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--tectonic-white);
  margin: 0;
}
.gdash-card-desc {
  font-size: 0.78rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;
}
.gdash-card-meta {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'JetBrains Mono', monospace;
}
.gdash-card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

/* ── Badges ────────────────────────────────────────── */
.gdash-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.gdash-badge.pending { background: rgba(234, 179, 8, 0.12); color: #eab308; }
.gdash-badge.open { background: rgba(0, 200, 83, 0.12); color: #00c853; }
.gdash-badge.closed { background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4); }
.gdash-badge.hidden { background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4); }
.gdash-badge.reviewed { background: rgba(0, 255, 133, 0.12); color: #00ff85; }
.gdash-badge.neutral { background: rgba(255, 255, 255, 0.06); color: rgba(255,255,255,0.5); }

/* ── Type badges ───────────────────────────────────── */
.gdash-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 0.6rem;
  font-weight: 600;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.gdash-type-badge.artivism         { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.gdash-type-badge.climate_justice  { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.gdash-type-badge.conservation     { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.gdash-type-badge.human_rights     { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.gdash-type-badge.indigenous_rights { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.gdash-type-badge.youth            { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
.gdash-type-badge.general          { background: rgba(255, 255, 255, 0.08); color: rgba(255,255,255,0.6); }

/* ── Priority ──────────────────────────────────────── */
.gdash-priority {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 0.65rem;
  padding: 0 6px;
}
.gdash-priority.high { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.gdash-priority.mid  { background: rgba(234, 179, 8, 0.2); color: #facc15; }
.gdash-priority.low  { background: rgba(255, 255, 255, 0.06); color: rgba(255,255,255,0.5); }

/* ── Highlights ────────────────────────────────────── */
.gdash-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}
.gdash-highlight {
  display: inline-block;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.gdash-highlight.eg_core       { background: rgba(0, 255, 133, 0.15); color: #00ff85; }
.gdash-highlight.urgent        { background: rgba(239, 68, 68, 0.2);  color: #f87171; }
.gdash-highlight.soon          { background: rgba(234, 179, 8, 0.2);  color: #facc15; }
.gdash-highlight.expired       { background: rgba(239, 68, 68, 0.1);  color: #ef4444; opacity: 0.6; }
.gdash-highlight.high_value    { background: rgba(34, 197, 94, 0.2);  color: #4ade80; }
.gdash-highlight.good_value    { background: rgba(34, 197, 94, 0.12); color: #4ade80; }
.gdash-highlight.has_amount    { background: rgba(34, 197, 94, 0.08); color: #86efac; }
.gdash-highlight.artivism      { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.gdash-highlight.climate       { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.gdash-highlight.indigenous    { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.gdash-highlight.scholarship   { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }

/* ── Urgency ───────────────────────────────────────── */
.gdash-urgency {
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
}
.gdash-urgency.urgent { color: #ef4444; }
.gdash-urgency.soon { color: #facc15; }
.gdash-urgency.expired { color: #dc2626; }

/* ── Meta row ──────────────────────────────────────── */
.gdash-card-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.5rem;
}
.gdash-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}
.gdash-cat-tag {
  font-size: 0.55rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255,255,255,0.6);
}

/* ── Card footer ───────────────────────────────────── */
.gdash-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  gap: 0.75rem;
  flex-wrap: wrap;
}
.gdash-card-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* ── Stars ─────────────────────────────────────────── */
.gdash-stars {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
}
.gdash-star {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.12);
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
  font-size: 0.85rem;
}
.gdash-star:hover { color: rgba(250, 204, 21, 0.6); transform: scale(1.15); }
.gdash-star.active { color: #facc15; text-shadow: 0 0 8px rgba(250, 204, 21, 0.4); }
.gdash-votes {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.55rem;
  color: rgba(255, 255, 255, 0.3);
  margin-left: 0.375rem;
}

/* ── Link buttons ──────────────────────────────────── */
.gdash-link-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.15s;
  padding: 0;
}
.gdash-link-btn:hover { color: var(--tectonic-white); }
.gdash-link-btn.apply {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.6rem;
  color: var(--accent);
  padding: 0.3rem 0.75rem;
  border: 1px solid rgba(0, 255, 133, 0.25);
  border-radius: 6px;
  background: rgba(0, 255, 133, 0.04);
  transition: all 0.3s;
  text-decoration: none;
}
.gdash-link-btn.apply:hover {
  background: var(--accent);
  color: #000;
  box-shadow: 0 0 20px rgba(0, 255, 133, 0.3);
  border-color: var(--accent);
}

/* ── Action buttons ────────────────────────────────── */
.gdash-action {
  border: none;
  cursor: pointer;
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.15s;
  font-size: 0.7rem;
  padding: 0.25rem 0.75rem;
}
.gdash-action.approve { background: rgba(0, 200, 83, 0.15); color: #00c853; }
.gdash-action.approve:hover { background: rgba(0, 200, 83, 0.25); }
.gdash-action.reject { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.gdash-action.reject:hover { background: rgba(239, 68, 68, 0.25); }
.gdash-action.restore { background: rgba(250, 204, 21, 0.15); color: #facc15; }
.gdash-action.restore:hover { background: rgba(250, 204, 21, 0.25); }

/* ── Leaderboard ───────────────────────────────────── */
.gdash-lb-rank {
  font-size: 1.1rem;
  font-weight: 900;
  flex-shrink: 0;
}
.gdash-lb-info { flex: 1; min-width: 0; }
.gdash-lb-info h4 { font-size: 0.85rem; }
.gdash-lb-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}
.gdash-source-badge {
  font-size: 0.55rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.gdash-source-badge.open { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.gdash-source-badge.crew { background: rgba(34, 197, 94, 0.2); color: #4ade80; }

/* ── Login popup ──────────────────────────────────── */
.gdash-login-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}
.gdash-login-popup {
  max-width: 360px;
  width: 100%;
  padding: 2rem;
  text-align: center;
}
.gdash-login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.gdash-login-icon {
  width: 48px;
  height: 48px;
  stroke: var(--accent);
}
.gdash-login-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--tectonic-white);
  font-family: 'JetBrains Mono', monospace;
  margin: 0;
}
.gdash-login-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}
.gdash-login-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.gdash-cancel-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.5);
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.gdash-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--tectonic-white);
}

/* ── Pagination ──────────────────────────────────── */
.gdash-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
}
.gdash-page-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}
.gdash-page-btn:hover:not(:disabled) {
  color: var(--tectonic-white);
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.06);
}
.gdash-page-btn:disabled {
  opacity: 0.25;
  cursor: default;
}
.gdash-page-num {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.4);
  padding: 0.25rem 0.55rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 1.75rem;
  text-align: center;
}
.gdash-page-num:hover {
  color: var(--tectonic-white);
  background: rgba(255,255,255,0.06);
}
.gdash-page-num.active {
  color: #fff;
  background: rgba(0, 255, 133, 0.15);
  font-weight: 700;
}
.gdash-page-ellipsis {
  color: rgba(255,255,255,0.25);
  padding: 0.25rem 0.25rem;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
}

/* ── Popup transition ────────────────────────────── */
.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.2s ease;
}
.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}

/* ── Disintegration animation ───────────────────── */
.gdash-card.removing {
  animation: disintegrate 0.7s cubic-bezier(0.55, 0, 0.1, 1) forwards;
  pointer-events: none;
  position: relative;
  overflow: hidden;
}

.gdash-card.removing::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(0,255,133,0.15) 0%, transparent 70%);
  opacity: 0;
  pointer-events: none;
  z-index: 2;
  animation: flash-burst 0.7s ease-out forwards;
  border-radius: inherit;
}

@keyframes disintegrate {
  0% {
    transform: scale(1);
    opacity: 1;
    clip-path: inset(0);
    filter: brightness(1);
  }
  15% {
    transform: scale(1.03) rotate(-1deg);
    filter: brightness(1.4);
  }
  30% {
    transform: scale(0.97) rotate(1.5deg);
    clip-path: polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%
    );
    filter: brightness(1.6) contrast(1.2);
  }
  50% {
    transform: scale(0.82) rotate(-2.5deg) translateY(8px);
    clip-path: polygon(
      2% 1%, 98% 2%,
      96% 40%, 97% 98%,
      55% 96%, 1% 97%
    );
    opacity: 0.7;
    filter: brightness(2) contrast(1.4) hue-rotate(20deg);
  }
  72% {
    transform: scale(0.45) rotate(4deg) translateY(18px);
    clip-path: polygon(
      8% 5%, 94% 4%,
      90% 45%, 92% 92%,
      45% 90%, 6% 94%
    );
    opacity: 0.35;
    filter: brightness(2.5) blur(1.5px);
    box-shadow: 0 0 30px rgba(0,255,133,0.3);
  }
  100% {
    transform: scale(0) rotate(12deg) translateY(40px);
    opacity: 0;
    filter: brightness(4) blur(5px);
    clip-path: inset(45% 40% 45% 40%);
    box-shadow: 0 0 60px rgba(0,255,133,0);
  }
}

@keyframes flash-burst {
  0% { opacity: 0; transform: scale(0.3); }
  25% { opacity: 0.7; transform: scale(1.1); }
  55% { opacity: 0.25; transform: scale(1.4); }
  100% { opacity: 0; transform: scale(2); }
}

/* ── Responsive ────────────────────────────────────── */
@media (max-width: 768px) {
  .gdash-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .gdash-user {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
    padding: 1.5rem;
  }
  .gdash-user-info {
    justify-content: center;
  }
  .gdash-card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .gdash-card-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
