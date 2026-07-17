<template>
  <div class="fs-grants min-h-screen bg-black text-white">
    <div v-if="!sessionReady" class="fixed inset-0 flex items-center justify-center bg-black" style="z-index: 99999">
      <div class="w-5 h-5 border border-white/30 border-t-white rounded-full animate-spin" />
    </div>

    <GrantsAuth v-if="sessionReady" :user="user" :is-manager="isManager" @sign-in="signIn" @sign-out="handleSignOut" />

    <Transition name="modal-fade">
      <div v-if="confirmSignOut" class="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm" :style="{ zIndex: 10000 }" @click.self="confirmSignOut = false">
        <div class="glass-panel p-6 max-w-sm w-full mx-4">
          <h3 class="text-white font-bold text-sm mb-2">{{ t('grantsPortal.signOutConfirmTitle') }}</h3>
          <p class="text-white/50 text-xs mb-5">{{ t('grantsPortal.signOutConfirmDesc') }}</p>
          <div class="flex gap-2 justify-end">
            <button class="px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors" @click="confirmSignOut = false">{{ t('grantsPortal.cancel') }}</button>
            <button class="px-3 py-1.5 text-xs font-bold border border-white/20 text-red-400 hover:bg-white/5 rounded-sm transition-colors" @click="signOut(); confirmSignOut = false">{{ t('grantsPortal.signOut') }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <div class="fs-container min-h-screen flex flex-col">
      <header class="fs-header">
        <div class="fs-header-inner">
          <div class="fs-header-left">
            <NuxtLink to="/eg-grants" class="fs-logo">
              <svg viewBox="0 0 32 32" fill="none" class="w-5 h-5">
                <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M10 20c2-6 6-10 6-10s4 4 6 10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                <path d="M7 16c3-4 9-4 9-4s6 0 9 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
              </svg>
              <span class="fs-logo-text">EG</span>
            </NuxtLink>
            <div class="fs-header-divider" />
            <div class="fs-header-meta">
              <h1 class="fs-title">Dashboard</h1>
              <span class="fs-badge">Full Screen</span>
            </div>
          </div>
          <div class="fs-header-right">
            <NuxtLink to="/eg-grants" class="fs-back-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              <span>Exit Full Screen</span>
            </NuxtLink>
          </div>
        </div>
      </header>

      <main class="fs-main flex-1 pb-12">
        <GrantsDashboard
          :user="user"
          :is-manager="isManager"
          :pending-count="scrapedPendingCount"
          :open-count="scrapedOpenCount"
          :closed-count="scrapedClosedCount"
          :active-tab="activePortalTab"
          :show-history="showHistory"
          :search-query="dashboardSearch"
          :is-loading="scrapedLoading"
          :scraped-loading="scrapedLoading"
          :internal-grants="grants"
          :filtered-scraped-grants="filteredScrapedGrants"
          :filtered-internal-grants="filteredGrants"
          :user-votes="scrapedUserVotes"
          :leaderboard="leaderboard"
          :leaderboard-loading="leaderboardLoading"
          :removing-grants="removingGrants"
          @sign-in="signIn"
          @sign-out="handleSignOut"
          @update:active-tab="activePortalTab = $event"
          @update:search-query="dashboardSearch = $event"
          @toggle:show-history="showHistory = !showHistory"
          @vote="handleVoteScraped"
          @view-detail="openScrapedDetail"
          @leaderboard-detail="openLeaderboardDetail"
          @review:grant="handleReview"
          @review:scraped="handleReviewScraped"
        />
      </main>

      <RegistryModal
        :show="showRegistry"
        :loading="registryLoading"
        :grants="registry"
        @close="closeRegistryModal"
        @view-detail="openGrantDetail"
      />

      <GrantDetailModal
        :grant="detailGrant"
        :user-vote="detailUserVote"
        :user="user"
        :is-manager="isManager"
        :saving="editSavingDetail"
        :edit-error="editErrDetail"
        @close="closeGrantDetail"
        @vote="handleVoteDetail"
        @save="handleSaveEditFromDetail"
      />

      <GrantEditModal
        :grant="editGrant"
        :saving="editSaving"
        :error="editErr"
        @close="closeEditScraped"
        @save="handleSaveEditFromModal"
      />

      <GrantsFooter :country-count="countryCount" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import type { GrantRecord, ScrapedGrant, LeaderboardEntry } from '~/composables/useGrants'
import { allProjectsData } from '~/lib/project-data'
import type { ProjectData, DetailGrantData } from '~/lib/types'
import GrantsAuth from '~/components/grants/GrantsAuth.vue'
import GrantsDashboard from '~/components/grants/GrantsDashboard.vue'
import GrantDetailModal from '~/components/grants/GrantDetailModal.vue'
import GrantEditModal from '~/components/grants/GrantEditModal.vue'
import RegistryModal from '~/components/grants/RegistryModal.vue'
import GrantsFooter from '~/components/grants/GrantsFooter.vue'
import { useI18n } from '~/composables/useI18n'
import { useSupabase } from '~/composables/useSupabase'
import { useSupabaseAuth } from '~/composables/useSupabaseAuth'

const { t } = useI18n()
const { user, isManager, isManagerReady, signIn, signOut, sessionReady } = useSupabaseAuth()
const confirmSignOut = ref(false)
const { client } = useSupabase()
const { listGrants, listScrapedGrants, reviewGrant: apiReviewGrant, reviewScrapedGrant: apiReviewScraped, updateScrapedGrant: apiUpdateScrapedGrant, getStats, voteGrant, voteScrapedGrant, deleteVote, getLeaderboard } = useGrants()

const grants = ref<GrantRecord[]>([])
const registry = ref<Array<GrantRecord & { relevant?: boolean }>>([])
const stats = reactive({ pending: 0, open: 0, closed: 0, hidden: 0, total: 0 })
const loading = ref(true)
const projectStats = computed(() => {
  const countries = new Set(allProjectsData.map(p => p.country_province.split(',').pop()?.trim()).filter(Boolean))
  const direct = allProjectsData.reduce((s, p) => s + (p.direct_beneficiaries || 0), 0)
  const indirect = allProjectsData.reduce((s, p) => s + (p.indirect_beneficiaries || 0), 0)
  return { total: allProjectsData.length, countries: countries.size, beneficiaries: direct + indirect }
})
const showHistory = ref(false)

const scrapedGrants = ref<ScrapedGrant[]>([])
const scrapedLoading = ref(false)
const scrapedUserVotes = reactive<Record<string, number>>({})
const removingGrants = ref<string[]>([])
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function matchSearch(g: { title?: string; funder?: string; country?: string; description?: string; source?: string; categories?: string[] }, q: string): boolean {
  if (!q) return true
  const lq = q.toLowerCase()
  return (g.title?.toLowerCase() || '').includes(lq)
    || (g.funder?.toLowerCase() || '').includes(lq)
    || (g.country?.toLowerCase() || '').includes(lq)
    || (g.description?.toLowerCase() || '').includes(lq)
    || (g.source?.toLowerCase() || '').includes(lq)
    || (g.categories?.some(c => c.toLowerCase().includes(lq)) ?? false)
}

const filteredScrapedGrants = computed(() => {
  const q = dashboardSearch.value
  const tab = activePortalTab.value
  if (tab === 'tabPending') return scrapedGrants.value.filter(g => g.status === 'pending' && matchSearch(g, q))
  if (tab === 'tabOpen') return grants.value.filter(g => g.status === 'open' && matchSearch(g, q))
  if (tab === 'tabClosed') return scrapedGrants.value.filter(g => g.status === 'closed' && matchSearch(g, q))
  return scrapedGrants.value.filter(g => matchSearch(g, q))
})

const leaderboard = ref<LeaderboardEntry[]>([])
const leaderboardLoading = ref(false)

const editGrant = ref<ScrapedGrant | null>(null)
const editSaving = ref(false)
const editSavingDetail = ref(false)
const editErrDetail = ref('')
const editForm = reactive({
  title: '', funder: '', description: '', deadline: '',
  amount_max: '', amount_min: '', currency: '', country: '', url: '', categories: '',
})

const activePortalTab = ref('tabOpen')
const showRegistry = ref(false)
const registryLoading = ref(false)
const detailGrant = ref<DetailGrantData | null>(null)
const detailUserVote = ref(0)
const dashboardSearch = ref('')

const filteredGrants = computed(() => {
  const q = dashboardSearch.value
  return grants.value.filter(g => g.status === 'open' && matchSearch(g, q))
})

const scrapedPendingCount = computed(() => stats.pending)
const scrapedOpenCount = computed(() => grants.value.filter(g => g.status === 'open').length)
const scrapedClosedCount = computed(() => stats.closed)
const countryCount = computed(() => Math.max(stats.open > 0 ? 47 : 0, projectStats.value.countries) + '+')

async function loadRegistry() {
  registryLoading.value = true
  try {
    const result = await listGrants('open')
    registry.value = (result.grants ?? []).slice().sort((a, b) => (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0))
  } catch (e) {
    console.error('Failed to load registry:', e)
  } finally {
    registryLoading.value = false
  }
}

function openRegistryModal() {
  showRegistry.value = true
  loadRegistry()
}

function closeRegistryModal() { showRegistry.value = false }

function openGrantDetail(grant: GrantRecord) {
  detailGrant.value = grant
  detailUserVote.value = 0
}

function openLeaderboardDetail(entry: LeaderboardEntry) {
  detailGrant.value = entry
  detailUserVote.value = 0
}

function closeGrantDetail() {
  detailGrant.value = null
  detailUserVote.value = 0
}

function openScrapedDetail(g: ScrapedGrant | GrantRecord) {
  detailGrant.value = {
    ...g,
    source_type: 'scraped',
    source_id: g.id,
    created_at: ('fetched_at' in g ? g.fetched_at : null) || g.created_at,
  }
}

async function loadGrants() {
  loading.value = true
  try {
    const result = await listGrants()
    grants.value = result.grants ?? []
  } catch (e) {
    console.error('Failed to load grants:', e)
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const s = await getStats()
    if (s.total > 0) {
      Object.assign(stats, s)
    } else {
      Object.assign(stats, { pending: 0, open: projectStats.value.total, closed: 0, hidden: 0, total: projectStats.value.total })
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
    Object.assign(stats, { pending: 0, open: projectStats.value.total, closed: 0, hidden: 0, total: projectStats.value.total })
  }
}

function projectToScrapedGrant(p: ProjectData, i: number): ScrapedGrant {
  return {
    id: `project-${i}`, source_id: `project-${i}`, title: p.project_title,
    funder: 'Earth Guardians', source: 'project-grants', url: '',
    description: `Project in ${p.country_province} with ${p.direct_beneficiaries} direct and ${p.indirect_beneficiaries} indirect beneficiaries.`,
    deadline: '', amount_max: '', amount_min: '', currency: '',
    country: p.country_province.split(',').pop()?.trim() || p.country_province,
    region: p.country_province, categories: ['environment', 'community'],
    language: 'en', status: 'open', fetched_at: new Date().toISOString(),
    created_at: new Date('2024-01-01').toISOString(), grant_type: 'conservation',
    highlights: ['eg_core', 'high_value'], urgency: 'unknown',
    amount_usd: null, priority_score: 50, reviewed: false,
  }
}

async function loadScrapedGrants() {
  scrapedLoading.value = true
  try {
    const result = await listScrapedGrants()
    scrapedGrants.value = result.grants ?? []
    if (scrapedGrants.value.length === 0) {
      scrapedGrants.value = allProjectsData.map(projectToScrapedGrant)
    }
  } catch (e) {
    console.error('Failed to load scraped grants:', e)
    if (scrapedGrants.value.length === 0) {
      scrapedGrants.value = allProjectsData.map(projectToScrapedGrant)
    }
  } finally {
    scrapedLoading.value = false
  }
}

async function loadLeaderboardData() {
  leaderboardLoading.value = true
  try {
    const result = await getLeaderboard('all', 'open')
    leaderboard.value = result.grants ?? []
  } catch (e) {
    console.error('Failed to load leaderboard:', e)
  } finally {
    leaderboardLoading.value = false
  }
}

async function handleReview(grantId: string, decision: string) {
  try {
    await apiReviewGrant(grantId, decision as 'open' | 'closed')
    await Promise.all([refreshGrantsSilent(), loadStats()])
    if (showRegistry.value) await loadRegistry()
  } catch (e) {
    console.error('Failed to review grant:', e)
  }
}

async function refreshScrapedGrantsSilent() {
  try {
    const result = await listScrapedGrants()
    scrapedGrants.value = result.grants ?? []
    if (scrapedGrants.value.length === 0) {
      scrapedGrants.value = allProjectsData.map(projectToScrapedGrant)
    }
  } catch (e) {
    console.error('Failed to refresh scraped grants:', e)
    if (scrapedGrants.value.length === 0) {
      scrapedGrants.value = allProjectsData.map(projectToScrapedGrant)
    }
  }
}

async function refreshGrantsSilent() {
  try {
    const result = await listGrants()
    grants.value = result.grants ?? []
  } catch (e) {
    console.error('Failed to refresh grants:', e)
  }
}

async function handleReviewScraped(grantId: string, decision: string, table = 'scraped_grants') {
  removingGrants.value = [...removingGrants.value, grantId]
  try {
    const [apiResult] = await Promise.all([
      apiReviewScraped(grantId, decision as 'approved' | 'hidden' | 'closed' | 'pending', undefined, table),
      sleep(700),
    ])
    if (apiResult.error) {
      console.error('Review scraped grant failed:', apiResult.error)
      removingGrants.value = removingGrants.value.filter(id => id !== grantId)
      return
    }
    scrapedGrants.value = scrapedGrants.value.filter(g => g.id !== grantId)
    removingGrants.value = removingGrants.value.filter(id => id !== grantId)
    await Promise.all([refreshScrapedGrantsSilent(), refreshGrantsSilent(), loadStats()])
  } catch (e) {
    console.error('Failed to review scraped grant:', e)
    removingGrants.value = removingGrants.value.filter(id => id !== grantId)
  }
}

const editErr = ref('')

function closeEditScraped() {
  editGrant.value = null
  editErr.value = ''
}

async function handleSaveEdit() {
  if (!editGrant.value) return
  editSaving.value = true
  editErr.value = ''
  try {
    const updates: Record<string, unknown> = {
      title: editForm.title, funder: editForm.funder, description: editForm.description,
      deadline: editForm.deadline, amount_max: editForm.amount_max, amount_min: editForm.amount_min,
      currency: editForm.currency, country: editForm.country, url: editForm.url,
      categories: editForm.categories.split(',').map(c => c.trim()).filter(Boolean),
    }
    const result = await apiUpdateScrapedGrant(editGrant.value.id, updates)
    if ('error' in result && result.error) {
      editErr.value = result.error as string
      return
    }
    closeEditScraped()
    await refreshScrapedGrantsSilent()
  } catch (e) {
    editErr.value = 'An unexpected error occurred. Please try again.'
    console.error('Failed to save edit:', e)
  } finally {
    editSaving.value = false
  }
}

function handleSaveEditFromModal(form: Record<string, string>) {
  Object.assign(editForm, form)
  handleSaveEdit()
}

async function handleSaveEditFromDetail(grantId: string, form: Record<string, string>) {
  editSavingDetail.value = true
  editErrDetail.value = ''
  try {
    const updates: Record<string, unknown> = {
      title: form.title, funder: form.funder, description: form.description,
      deadline: form.deadline, amount_max: form.amount_max, amount_min: form.amount_min,
      currency: form.currency, country: form.country, url: form.url,
      categories: form.categories.split(',').map(c => c.trim()).filter(Boolean),
    }
    const result = await apiUpdateScrapedGrant(grantId, updates)
    if ('error' in result && result.error) {
      editErrDetail.value = result.error as string
      return
    }
    closeGrantDetail()
    await refreshScrapedGrantsSilent()
  } catch (e) {
    editErrDetail.value = 'An unexpected error occurred. Please try again.'
    console.error('Failed to save edit from detail:', e)
  } finally {
    editSavingDetail.value = false
  }
}

async function handleVoteScraped(scrapedId: string, stars: number) {
  if (!user.value) return
  try {
    const current = scrapedUserVotes[scrapedId]
    if (current === stars) {
      await deleteVote(scrapedId, scrapedId)
      scrapedUserVotes[scrapedId] = 0
    } else {
      await voteScrapedGrant(scrapedId, stars)
      scrapedUserVotes[scrapedId] = stars
    }
    await loadLeaderboardData()
  } catch (e) {
    console.error('Failed to vote:', e)
  }
}

async function handleVoteDetail(stars: number) {
  if (!user.value || !detailGrant.value) return
  try {
    const id = detailGrant.value.id
    const isScraped = detailGrant.value.source_type === 'scraped' || 'source_id' in detailGrant.value
    if (detailUserVote.value === stars) {
      if (isScraped) { await deleteVote('', id) } else { await deleteVote(id) }
      detailUserVote.value = 0
    } else {
      if (isScraped) { await voteScrapedGrant(id, stars) } else { await voteGrant(id, stars) }
      detailUserVote.value = stars
    }
    await loadLeaderboardData()
  } catch (e) {
    console.error('Failed to vote on detail:', e)
  }
}

function handleSignOut() {
  confirmSignOut.value = true
}

watch(activePortalTab, (tab) => {
  if (['tabPending', 'tabOpen', 'tabClosed'].includes(tab)) loadScrapedGrants()
  if (tab === 'tabLeaderboard') loadLeaderboardData()
})

onMounted(async () => {
  if (import.meta.server) return
  await Promise.all([loadGrants(), loadStats(), loadScrapedGrants()])
  if (typeof window !== 'undefined' && !window.location.hash.includes('no-dock')) {
    history.replaceState(null, '', '#no-dock')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
})
</script>

<style>
.fs-grants {
  --glass-bg: rgba(255, 255, 255, 0.025);
  --glass-border: rgba(255, 255, 255, 0.07);
  --glass-border-hover: rgba(255, 255, 255, 0.15);
  --text-primary: #f5f5f5;
  --text-secondary: rgba(255, 255, 255, 0.5);
  --text-tertiary: rgba(255, 255, 255, 0.3);
  background: #000;
  min-height: 100vh;
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
}

/* ── Container ── */

.fs-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* ── Header ── */

.fs-header {
  padding: 1.25rem 0 1rem;
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: 2rem;
  position: sticky;
  top: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  z-index: 100;
}

.fs-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fs-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.fs-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  text-decoration: none;
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.fs-logo:hover {
  border-color: var(--glass-border-hover);
}

.fs-logo-text {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.fs-header-divider {
  width: 1px;
  height: 1.5rem;
  background: var(--glass-border);
}

.fs-header-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fs-title {
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin: 0;
}

.fs-badge {
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--glass-border);
  border-radius: 3px;
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}

.fs-header-right {
  display: flex;
  align-items: center;
}

.fs-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
}

.fs-back-btn:hover {
  border-color: var(--glass-border-hover);
  color: var(--text-primary);
}

.fs-main {
  min-height: 0;
}

/* ── GrantsDashboard Theme Overrides ── */

.fs-grants .gdash {
  --gdash-bg: transparent;
}

.fs-grants .gdash-card.glass,
.fs-grants .gdash-user.glass,
.fs-grants .gdash-pagination.glass {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 8px !important;
  transition: border-color 0.2s ease, background 0.2s ease !important;
}

.fs-grants .gdash-card.glass:hover {
  border-color: rgba(255, 255, 255, 0.12) !important;
  background: rgba(255, 255, 255, 0.03) !important;
}

.fs-grants .gdash-tabs button {
  color: var(--text-secondary) !important;
  border-bottom: 2px solid transparent !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  padding: 0.5rem 0.75rem !important;
  transition: color 0.2s, border-color 0.2s !important;
}

.fs-grants .gdash-tabs button:hover {
  color: var(--text-primary) !important;
}

.fs-grants .gdash-tabs button.gdash-tab-active {
  color: var(--text-primary) !important;
  border-bottom-color: var(--text-primary) !important;
}

.fs-grants .gdash-search input {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--text-primary) !important;
  border-radius: 6px !important;
  font-size: 0.8rem !important;
  padding: 0.5rem 0.75rem !important;
  outline: none !important;
  transition: border-color 0.2s !important;
}

.fs-grants .gdash-search input:focus {
  border-color: var(--glass-border-hover) !important;
}

.fs-grants .gdash-search input::placeholder {
  color: var(--text-tertiary) !important;
}

.fs-grants .gdash-pagination {
  padding: 0.75rem !important;
}

.fs-grants .gdash-pagination button {
  background: transparent !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--text-secondary) !important;
  border-radius: 4px !important;
  font-size: 0.75rem !important;
  padding: 0.3rem 0.6rem !important;
  transition: all 0.15s ease !important;
  min-width: 2rem;
}

.fs-grants .gdash-pagination button:hover {
  border-color: var(--glass-border-hover) !important;
  color: var(--text-primary) !important;
}

.fs-grants .gdash-pagination button.gdash-page-active {
  background: rgba(255, 255, 255, 0.08) !important;
  color: var(--text-primary) !important;
  border-color: var(--glass-border-hover) !important;
}

.fs-grants .gdash-card .gdash-action-btn {
  border: 1px solid var(--glass-border) !important;
  border-radius: 4px !important;
  font-size: 0.65rem !important;
  padding: 0.25rem 0.5rem !important;
  transition: all 0.15s ease !important;
}

.fs-grants .gdash-card .gdash-action-btn:hover {
  border-color: var(--glass-border-hover) !important;
}

.fs-grants .gdash-user {
  border-radius: 8px !important;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .fs-container { padding: 0 1rem; }
  .fs-header-meta .fs-badge { display: none; }
  .fs-back-btn span { display: none; }
}
</style>
