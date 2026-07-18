/**
 * components/grants/GrantsDashboard.vue
 * @why Grants management dashboard — App Store-style full-screen category browser
 * @component GrantsDashboard
 * @emits signIn, signOut, 'update:activeTab', 'update:searchQuery', 'toggle:showHistory',
 *   vote, 'view-detail', leaderboardDetail, 'review:grant', 'review:scraped'
 * @deps vue (computed, ref, watch), ~/lib/project-data (allProjectsData)
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
            <span class="gstore-logo-text">Grants</span>
          </div>
          <div class="gstore-header-divider" />
          <span class="gstore-badge">Dashboard</span>
        </div>
        <div class="gstore-header-right">
          <div class="gstore-search">
            <svg class="gstore-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              :value="searchQuery"
              @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
              placeholder="Search grants, funders, countries…"
              class="gstore-search-input"
              aria-label="Search grants"
            />
          </div>
          <template v-if="user">
            <div class="gstore-user-pill">
              <span class="gstore-user-avatar" :class="isManager ? 'manager' : ''">{{ isManager ? 'M' : 'C' }}</span>
              <span class="gstore-user-email">{{ user.email }}</span>
              <button class="gstore-signout-btn" @click="$emit('signOut')" aria-label="Sign out">✕</button>
            </div>
          </template>
          <template v-else>
            <button class="gstore-google-btn" @click="$emit('signIn')">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign In
            </button>
          </template>
        </div>
      </div>
    </header>

    <nav class="gstore-nav">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="gstore-nav-pill"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        <span class="gstore-nav-pill-icon">{{ cat.icon }}</span>
        <span class="gstore-nav-pill-label">{{ cat.label }}</span>
        <span class="gstore-nav-pill-count">{{ cat.count }}</span>
      </button>
    </nav>

    <main class="gstore-main">
      <div v-if="isLoading" class="gstore-loading">
        <div class="gstore-loading-dot" />
        <span>Loading grants…</span>
      </div>

      <template v-else-if="!user">
        <section class="gstore-hero">
          <div class="gstore-hero-chip">Earth Guardians</div>
          <h1 class="gstore-hero-title">Grants &amp; Opportunities</h1>
          <p class="gstore-hero-subtitle">Discover funding for climate action, conservation, and community projects worldwide.</p>
          <div class="gstore-hero-stats">
            <div class="gstore-hero-stat">
              <span class="gstore-hero-stat-num">{{ totalAll }}</span>
              <span class="gstore-hero-stat-label">Total Grants</span>
            </div>
            <div class="gstore-hero-stat">
              <span class="gstore-hero-stat-num">{{ categoryCount }}</span>
              <span class="gstore-hero-stat-label">Categories</span>
            </div>
            <div class="gstore-hero-stat">
              <span class="gstore-hero-stat-num">{{ countriesCount }}+</span>
              <span class="gstore-hero-stat-label">Countries</span>
            </div>
          </div>
          <p class="gstore-hero-hint">Sign in to vote, track, and manage grants.</p>
          <button class="gstore-hero-btn" @click="$emit('signIn')">Sign in with Google</button>
        </section>
      </template>

      <template v-else>
        <section
          v-for="cat in visibleCategories"
          :key="cat.key"
          class="gstore-section"
        >
          <div class="gstore-section-header">
            <div class="gstore-section-header-left">
              <span class="gstore-section-icon">{{ cat.icon }}</span>
              <h2 class="gstore-section-title">{{ cat.label }}</h2>
              <span class="gstore-section-count">{{ cat.count }}</span>
            </div>
            <button class="gstore-section-seeall" @click="scrollSection(cat.key)">{{ cat.count > 6 ? 'Show all' : '' }}<svg v-if="cat.count > 6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="gstore-chevron"><path d="M9 18l6-6-6-6"/></svg></button>
          </div>
          <div
            :ref="el => { if (el) sectionRefs[cat.key] = el as HTMLElement }"
            class="gstore-section-scroll"
          >
            <div
              v-for="g in cat.items"
              :key="g.id"
              class="gstore-card"
              @click="($emit as any)('view-detail', g)"
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
              </div>
              <div class="gstore-card-footer">
                <div v-if="g.amount_max" class="gstore-card-amount">{{ g.amount_max }} {{ g.currency }}</div>
                <div v-else-if="'direct_beneficiaries' in g && g.direct_beneficiaries != null" class="gstore-card-amount">{{ formatCompact(g.direct_beneficiaries) }} beneficiaries</div>
                <div v-else class="gstore-card-amount muted">—</div>
                <div v-if="g.highlights?.length" class="gstore-card-tags">
                  <span v-for="hl in g.highlights.slice(0, 2)" :key="hl" class="gstore-card-tag" :class="hl.toLowerCase().replace(/\s+/g, '_')">{{ hl }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showLoginPopup" class="gstore-overlay" role="dialog" aria-modal="true" @click.self="showLoginPopup = false">
          <div class="gstore-popup">
            <h3 class="gstore-popup-title">Sign In Required</h3>
            <p class="gstore-popup-desc">Sign in to vote on grants and track your favorites.</p>
            <button class="gstore-hero-btn" @click="$emit('signIn'); showLoginPopup = false">Sign in with Google</button>
            <button class="gstore-popup-cancel" @click="showLoginPopup = false">Cancel</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue'
import type { GrantRecord, ScrapedGrant, LeaderboardEntry } from '~/composables/useGrants'
import { allProjectsData } from '~/lib/project-data'
import type { ProjectData } from '~/lib/types'

const props = defineProps<{
  user: { email?: string } | null
  isManager: boolean
  pendingCount: number
  openCount: number
  closedCount: number
  activeTab: string
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

const emit = defineEmits<{
  signIn: []
  signOut: []
  'update:activeTab': [tab: string]
  'update:searchQuery': [q: string]
  'toggle:showHistory': []
  vote: [id: string, stars: number]
  'view-detail': [grant: ScrapedGrant | GrantRecord]
  leaderboardDetail: [entry: LeaderboardEntry]
  'review:grant': [id: string, decision: 'pending' | 'open' | 'closed']
  'review:scraped': [id: string, decision: 'approved' | 'hidden' | 'closed' | 'pending', table: string]
}>()

const { t } = useI18n()

const showLoginPopup = ref(false)
const activeCategory = ref('community')
const sectionRefs = reactive<Record<string, HTMLElement>>({})

watch(() => props.user, (u) => {
  if (u) showLoginPopup.value = false
})

function scrollSection(key: string) {
  const el = sectionRefs[key]
  if (el) el.scrollTo({ left: 300, behavior: 'smooth' })
}

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

const scrapedItems = computed<MixedGrant[]>(() => {
  return props.filteredScrapedGrants as MixedGrant[]
})

const projectItems = computed(() => {
  return allProjectsData.map((p, i) => ({
    id: `project-${i}`,
    title: p.project_title,
    funder: 'Earth Guardians',
    country: p.country_province.split(',').pop()?.trim() || p.country_province,
    amount_max: '',
    currency: '',
    grant_type: 'conservation' as const,
    priority_score: 50,
    highlights: ['eg_core'] as string[],
    direct_beneficiaries: p.direct_beneficiaries + p.indirect_beneficiaries,
    description: `Project in ${p.country_province}`,
    categories: ['environment', 'community'],
    status: 'open',
  }))
})

const totalAll = computed(() => scrapedItems.value.length + projectItems.value.length)

const countriesCount = computed(() => {
  const countries = new Set<string>()
  scrapedItems.value.forEach(g => g.country && countries.add(g.country))
  projectItems.value.forEach(g => g.country && countries.add(g.country))
  return countries.size
})

const categories = computed(() => {
  const community = scrapedItems.value.filter(g =>
    g.categories?.some(c => c.toLowerCase().includes('community')) ||
    g.grant_type === 'climate_justice' ||
    g.grant_type === 'indigenous_rights'
  )
  const partners = scrapedItems.value.filter(g =>
    g.funder && ['foundation', 'fund', 'trust', 'programme', 'UN', 'EU', 'UNESCO', 'Commonwealth'].some(k =>
      g.funder!.toLowerCase().includes(k.toLowerCase())
    )
  )
  const worldwide = scrapedItems.value.filter(g =>
    !community.includes(g) && !partners.includes(g)
  )
  const crew = props.filteredInternalGrants || []
  const egProjects = projectItems.value

  return [
    { key: 'community', icon: '🌱', label: 'Community Opportunities', count: community.length, items: community.slice(0, 20) },
    { key: 'crew', icon: '👥', label: 'Crew Projects', count: crew.length, items: crew.slice(0, 20) },
    { key: 'partners', icon: '🤝', label: 'Partner Grants', count: partners.length, items: partners.slice(0, 20) },
    { key: 'worldwide', icon: '🌍', label: 'Worldwide Grants', count: worldwide.length, items: worldwide.slice(0, 20) },
    { key: 'egprojects', icon: '🌿', label: 'EG Project Grants', count: egProjects.length, items: egProjects.slice(0, 20) },
  ]
})

const categoryCount = computed(() => categories.value.filter(c => c.count > 0).length)

const visibleCategories = computed(() => {
  const q = props.searchQuery?.toLowerCase()
  if (!q) return categories.value.filter(c => c.count > 0)
  return categories.value.map(cat => ({
    ...cat,
    items: cat.items.filter(g =>
      (g.title || '').toLowerCase().includes(q) ||
      (g.funder || '').toLowerCase().includes(q) ||
      (g.country || '').toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q) ||
      (g.categories || []).some(c => c.toLowerCase().includes(q))
    ),
  })).filter(cat => cat.items.length > 0)
})
</script>

<style scoped>
.gstore {
  --accent: #00ff85;
  --accent-dim: rgba(0, 255, 133, 0.15);
  --accent-glow: rgba(0, 255, 133, 0.06);
  --glass: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-hover: rgba(255, 255, 255, 0.07);
  --text: #f0f0f0;
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-tertiary: rgba(255, 255, 255, 0.28);
  --surface: rgba(255, 255, 255, 0.02);
  background: #000;
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
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--glass-border);
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
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.gstore-signout-btn:hover {
  color: var(--text);
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

.gstore-nav {
  display: flex;
  gap: 6px;
  padding: 12px 28px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  position: sticky;
  top: 52px;
  z-index: 99;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.gstore-nav::-webkit-scrollbar {
  display: none;
}

.gstore-nav-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--glass-border);
  border-radius: 9999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.gstore-nav-pill:hover {
  background: var(--glass-hover);
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.1);
}

.gstore-nav-pill.active {
  background: var(--accent-dim);
  color: var(--accent);
  border-color: rgba(0, 255, 133, 0.25);
}

.gstore-nav-pill-icon {
  font-size: 14px;
  line-height: 1;
}

.gstore-nav-pill-label {
  font-size: 13px;
  font-weight: 500;
}

.gstore-nav-pill-count {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.gstore-nav-pill.active .gstore-nav-pill-count {
  background: rgba(0, 255, 133, 0.15);
  color: var(--accent);
}

.gstore-main {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 28px 48px;
  width: 100%;
  overflow-y: auto;
}

.gstore-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 400;
}

.gstore-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

.gstore-hero {
  text-align: center;
  padding: 60px 0 40px;
  max-width: 600px;
  margin: 0 auto;
}

.gstore-hero-chip {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid var(--accent-dim);
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.gstore-hero-title {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0 0 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
}

.gstore-hero-subtitle {
  font-size: 17px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 32px;
  font-weight: 400;
}

.gstore-hero-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 32px;
}

.gstore-hero-stat {
  text-align: center;
}

.gstore-hero-stat-num {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.gstore-hero-stat-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  margin-top: 4px;
  letter-spacing: 0.02em;
}

.gstore-hero-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0 0 20px;
}

.gstore-hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 24px;
  background: var(--accent);
  border: none;
  border-radius: 9999px;
  color: #000;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.gstore-hero-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 24px rgba(0, 255, 133, 0.25);
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

.gstore-section-seeall {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.gstore-section-seeall:hover {
  background: var(--accent-dim);
}

.gstore-chevron {
  width: 14px;
  height: 14px;
}

.gstore-section-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  padding: 4px 2px 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.06) transparent;
}

.gstore-section-scroll::-webkit-scrollbar {
  height: 4px;
}

.gstore-section-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.gstore-section-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 9999px;
}

.gstore-card {
  flex: 0 0 240px;
  scroll-snap-align: start;
  background: var(--glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  flex-direction: column;
  min-height: 160px;
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
  background: rgba(0, 255, 133, 0.15);
  color: var(--accent);
}

.gstore-card-priority.mid {
  background: rgba(250, 204, 21, 0.15);
  color: #facc15;
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
  color: #f87171;
}

.gstore-card-tag.soon {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
}

.gstore-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.gstore-popup {
  background: #111;
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 32px;
  max-width: 340px;
  width: 100%;
  text-align: center;
}

.gstore-popup-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
}

.gstore-popup-desc {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.gstore-popup-cancel {
  display: block;
  width: 100%;
  margin-top: 10px;
  background: none;
  border: 1px solid var(--glass-border);
  border-radius: 9999px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  padding: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.gstore-popup-cancel:hover {
  background: var(--glass-hover);
  color: var(--text);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .gstore-header-inner {
    padding: 0 16px;
    height: 48px;
  }

  .gstore-main {
    padding: 0 16px 32px;
  }

  .gstore-nav {
    padding: 10px 16px;
    top: 48px;
  }

  .gstore-search {
    max-width: 160px;
  }

  .gstore-user-email {
    display: none;
  }

  .gstore-hero-title {
    font-size: 28px;
  }

  .gstore-hero-stats {
    gap: 24px;
  }

  .gstore-hero-stat-num {
    font-size: 22px;
  }

  .gstore-card {
    flex: 0 0 200px;
    min-height: 140px;
    padding: 12px;
  }

  .gstore-section-title {
    font-size: 17px;
  }

  .gstore-badge {
    display: none;
  }
}
</style>
