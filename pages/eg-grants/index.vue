<template>
  <div class="grants-dashboard">
    <!-- ── Header ─────────────────────────────────────── -->
    <header class="dash-header">
      <div class="header-left">
        <span class="header-logo">EG <span class="text-accent">OPEN GRANTS</span></span>
      </div>
      <div class="header-stats">
        <button v-for="s in statusStats" :key="s.key" class="stat-pill" :class="[s.key, activeStatusFilter === s.key ? 'active' : '']" @click="toggleStatusFilter(s.key)">
          <span class="stat-pill-num">{{ s.count }}</span>
          <span class="stat-pill-label">{{ s.label }}</span>
        </button>
      </div>
      <div class="header-right">
        <div class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" :placeholder="t('grantsPortal.searchPlaceholder')" class="search-input" />
        </div>
        <GrantsAuth :user="user" :is-manager="isManager" @sign-in="signIn" @sign-out="confirmSignOut = true" />
      </div>
    </header>

    <!-- ── Body ───────────────────────────────────────── -->
    <div class="dash-body">
      <!-- ── Filter Sidebar ───────────────────────────── -->
      <aside class="filter-sidebar">
        <div class="filter-section">
          <h3 class="filter-heading">{{ t('grantsPortal.status') }}</h3>
          <div class="status-filter-tabs">
            <button v-for="s in statusOptions" :key="s.key" class="status-tab" :class="{ active: activeStatusFilter === s.key }" @click="activeStatusFilter = s.key">
              <span class="status-dot" :class="s.key" />
              {{ s.label }}
            </button>
          </div>
        </div>

        <div v-if="isManager" class="filter-section">
          <label class="filter-check">
            <input v-model="showPendingOnly" type="checkbox" />
            <span>{{ t('grantsPortal.pendingReview') }}</span>
          </label>
        </div>

        <div class="filter-section">
          <h3 class="filter-heading">{{ t('grantsPortal.type') }}</h3>
          <div class="filter-check-group">
            <label v-for="gt in grantTypes" :key="gt.key" class="filter-check">
              <input v-model="filterTypes" type="checkbox" :value="gt.key" />
              <span>{{ gt.icon }} {{ gt.label }}</span>
            </label>
          </div>
        </div>

        <div class="filter-section">
          <h3 class="filter-heading">{{ t('grantsPortal.country') }}</h3>
          <select v-model="filterCountry" class="filter-select">
            <option value="">{{ t('grantsPortal.allCountries') }}</option>
            <option v-for="c in availableCountries" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="filter-section">
          <h3 class="filter-heading">{{ t('grantsPortal.urgency') }}</h3>
          <div class="filter-check-group">
            <label v-for="u in urgencyOptions" :key="u.key" class="filter-check">
              <input v-model="filterUrgency" type="checkbox" :value="u.key" />
              <span>{{ u.label }}</span>
            </label>
          </div>
        </div>

        <div class="filter-section">
          <h3 class="filter-heading">{{ t('grantsPortal.priority') }}</h3>
          <div class="range-row">
            <input v-model.number="filterPriorityMin" type="number" min="0" max="100" :placeholder="t('grantsPortal.min')" class="filter-input sm" />
            <span class="range-sep">—</span>
            <input v-model.number="filterPriorityMax" type="number" min="0" max="100" :placeholder="t('grantsPortal.max')" class="filter-input sm" />
          </div>
        </div>

        <div class="filter-section">
          <h3 class="filter-heading">{{ t('grantsPortal.sortBy') }}</h3>
          <select v-model="sortBy" class="filter-select">
            <option value="newest">{{ t('grantsPortal.sortNewest') }}</option>
            <option value="oldest">{{ t('grantsPortal.sortOldest') }}</option>
            <option value="priority">{{ t('grantsPortal.sortPriority') }}</option>
            <option value="votes">{{ t('grantsPortal.sortVotes') }}</option>
            <option value="amount">{{ t('grantsPortal.sortAmount') }}</option>
            <option value="deadline">{{ t('grantsPortal.sortDeadline') }}</option>
          </select>
        </div>

        <button class="filter-clear" @click="clearFilters">{{ t('grantsPortal.clearFilters') }}</button>
      </aside>

      <!-- ── Main Content ─────────────────────────── -->
      <main class="main-content">
        <div class="results-toolbar">
          <span class="results-count">{{ t('grantsPortal.showingResults', { count: filteredGrants.length, total: scrapedGrants.length }) }}</span>
          <div class="toolbar-actions">
            <button v-if="user" class="action-btn-outline" @click="showSubmitModal = true">+ {{ t('grantsPortal.submitGrant') }}</button>
          </div>
        </div>

        <div v-if="scrapedLoading" class="loading-state">
          <span class="loading-spinner" />
          {{ t('grantsPortal.loadingOpenGrants') }}
        </div>

        <div v-else-if="filteredGrants.length === 0" class="empty-state">
          <p>{{ t('grantsPortal.noGrants') }}</p>
          <button v-if="Object.values(filtersActive).some(Boolean)" class="action-btn-outline" @click="clearFilters">{{ t('grantsPortal.clearFilters') }}</button>
        </div>

        <div v-else class="grants-grid">
          <div v-for="g in filteredGrants" :key="g.id" class="grant-card" :class="{ selected: selectedGrant?.id === g.id, [g.status]: true }" @click="selectedGrant = g" @dblclick="openDetail(g)">
            <div class="card-top">
              <span class="card-type-badge" :class="g.grant_type || 'general'">{{ typeEmoji(g.grant_type) }} {{ g.grant_type || 'general' }}</span>
              <div class="card-top-right">
                <span v-if="g.priority_score != null" class="card-priority" :class="priorityClass(g.priority_score)">{{ g.priority_score }}</span>
                <span class="card-status-dot" :class="g.status" :title="g.status" />
              </div>
            </div>
            <h4 class="card-title">{{ g.title }}</h4>
            <p class="card-desc">{{ truncate(g.description, 120) }}</p>
            <div class="card-meta">
              <span v-if="g.funder" class="meta-item">🏛 {{ g.funder }}</span>
              <span v-if="g.country" class="meta-item">📍 {{ g.country }}</span>
              <span v-if="g.deadline" class="meta-item">📅 {{ g.deadline }}</span>
              <span v-if="g.amount_max" class="meta-item">💰 {{ g.amount_max }} {{ g.currency }}</span>
            </div>
            <div v-if="g.urgency && g.urgency !== 'unknown'" class="urgency-badge" :class="g.urgency">
              {{ urgencyLabel(g.urgency) }}
            </div>
            <div class="card-footer">
              <div class="star-voter">
                <button v-for="n in 8" :key="n" @click.stop="handleVote(g.id, n)" class="star-btn" :class="getStarClass(g.id, n)" :title="n + ' ' + t('grantsPortal.stars')">★</button>
                <span class="vote-count">{{ getVoteCount(g.id) }}</span>
              </div>
              <div class="card-actions">
                <button class="card-action-btn" @click.stop="openDetail(g)" :title="t('grantsPortal.details')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </button>
                <a v-if="g.url" :href="g.url" target="_blank" @click.stop class="card-action-btn apply" :title="t('grantsPortal.apply')">
                  ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- ── Manager Bottom Panel ─────────────────────── -->
    <Transition name="slide-up">
      <div v-if="isManager && selectedGrant" class="manager-panel">
        <div class="manager-panel-inner">
          <div class="panel-grant-info">
            <strong class="panel-grant-title">{{ selectedGrant.title }}</strong>
            <span class="panel-grant-status" :class="selectedGrant.status">{{ selectedGrant.status }}</span>
          </div>
          <div class="panel-actions">
            <button v-if="selectedGrant.status !== 'approved'" class="panel-btn approve" @click="handleReview(selectedGrant.id, 'approved')">✓ {{ t('grantsPortal.approve') }}</button>
            <button v-if="selectedGrant.status !== 'rejected'" class="panel-btn reject" @click="handleReview(selectedGrant.id, 'rejected')">✗ {{ t('grantsPortal.reject') }}</button>
            <button v-if="selectedGrant.status !== 'hidden'" class="panel-btn hidden-action" @click="handleReview(selectedGrant.id, 'hidden')">👁 {{ t('grantsPortal.hide') }}</button>
            <button v-if="selectedGrant.status !== 'pending'" class="panel-btn restore" @click="handleReview(selectedGrant.id, 'pending')">↩ {{ t('grantsPortal.restore') }}</button>
            <button class="panel-btn edit" @click="openEdit(selectedGrant)">✎ {{ t('grantsPortal.edit') }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Modals ──────────────────────────────────────── -->
    <GrantDetailModal :grant="detailGrant" :user-vote="detailUserVote" @close="detailGrant = null; detailUserVote = 0" @vote="handleVoteDetail" />

    <GrantEditModal v-if="editGrantData" :grant="editGrantData" :saving="editSaving" :error="editErr" @close="closeEdit" @save="handleSaveEdit" />

    <Teleport v-if="showSubmitModal" to="body">
      <div class="modal-overlay" @click.self="showSubmitModal = false">
        <div class="modal-content modal-content--sm">
          <div class="modal-header">
            <h3>{{ t('grantsPortal.submitGrantTitle') }}</h3>
            <button class="modal-close" @click="showSubmitModal = false">✕</button>
          </div>
          <form @submit.prevent="handleSubmitGrant" class="submit-form">
            <input v-model="form.title" :placeholder="t('grantsPortal.formTitle')" required class="form-input" />
            <textarea v-model="form.description" :placeholder="t('grantsPortal.formDescription')" required rows="3" class="form-input" />
            <input v-model="form.location_name" :placeholder="t('grantsPortal.formLocation')" required class="form-input" />
            <div class="form-row">
              <input v-model.number="form.latitude" type="number" step="any" :placeholder="t('grantsPortal.formLatitude')" required class="form-input" />
              <input v-model.number="form.longitude" type="number" step="any" :placeholder="t('grantsPortal.formLongitude')" required class="form-input" />
            </div>
            <select v-model="form.category" class="form-input">
              <option value="environment">{{ t('grantsPortal.categoryEnvironment') }}</option>
              <option value="social">{{ t('grantsPortal.categorySocial') }}</option>
              <option value="art">{{ t('grantsPortal.categoryArt') }}</option>
              <option value="education">{{ t('grantsPortal.categoryEducation') }}</option>
              <option value="health">{{ t('grantsPortal.categoryHealth') }}</option>
            </select>
            <button type="submit" :disabled="submitting" class="submit-btn">
              {{ submitting ? t('grantsPortal.submitting') : t('grantsPortal.submitBtn') }}
            </button>
            <p v-if="submitMsg" class="submit-msg" :class="submitOk ? 'ok' : 'err'">{{ submitMsg }}</p>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Sign-out confirmation -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="confirmSignOut" class="modal-overlay" @click.self="confirmSignOut = false">
          <div class="modal-content modal-content--xs">
            <h3 class="text-white font-bold text-sm mb-2">{{ t('grantsPortal.signOutConfirmTitle') }}</h3>
            <p class="text-white/50 text-xs mb-5">{{ t('grantsPortal.signOutConfirmDesc') }}</p>
            <div class="flex gap-2 justify-end">
              <button class="modal-btn-secondary" @click="confirmSignOut = false">{{ t('grantsPortal.cancel') }}</button>
              <button class="modal-btn-danger" @click="signOut(); confirmSignOut = false">{{ t('grantsPortal.signOut') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import type { ScrapedGrant, LeaderboardEntry } from '~/composables/useGrants'
import type { DetailGrantData } from '~/lib/types'
import { debounce } from '~/lib/utils'
import GrantsAuth from '~/components/grants/GrantsAuth.vue'
import GrantDetailModal from '~/components/grants/GrantDetailModal.vue'
import GrantEditModal from '~/components/grants/GrantEditModal.vue'

useHead({
  title: 'EG Open Grants Dashboard | Earth Guardians',
  meta: [{ name: 'description', content: 'Earth Guardians Open Grants Collaborative Dashboard — browse, filter, vote, and manage global funding opportunities for youth-led climate action.' }],
})

const { t } = useI18n()
const { user, isManager, signIn, signOut } = useSupabaseAuth()
const { listScrapedGrants, submitGrant: apiSubmitGrant, reviewScrapedGrant: apiReviewScraped, updateScrapedGrant: apiUpdateScrapedGrant, voteScrapedGrant, deleteVote, getLeaderboard } = useGrants()
const route = useRoute()
const router = useRouter()

// Data
const scrapedGrants = ref<ScrapedGrant[]>([])
const leaderboard = ref<LeaderboardEntry[]>([])
const scrapedLoading = ref(false)
const scrapedUserVotes = reactive<Record<string, number>>({})

// Selection
const selectedGrant = ref<ScrapedGrant | null>(null)
const detailGrant = ref<DetailGrantData | null>(null)
const detailUserVote = ref(0)

// Filters
const searchQuery = ref('')
const activeStatusFilter = ref('')
const showPendingOnly = ref(false)
const filterTypes = ref<string[]>([])
const filterCountry = ref('')
const filterUrgency = ref<string[]>([])
const filterPriorityMin = ref(0)
const filterPriorityMax = ref(100)
const sortBy = ref('newest')

const statusOptions = computed(() => [
  { key: '', label: t('grantsPortal.all') },
  { key: 'pending', label: t('grantsPortal.statOpen') },
  { key: 'approved', label: t('grantsPortal.statApproved') },
  { key: 'closed', label: t('grantsPortal.statClosed') },
  { key: 'rejected', label: t('grantsPortal.statDeclined') },
])

const statusStats = computed(() => [
  { key: 'pending', count: statusCount('pending'), label: t('grantsPortal.statOpen') },
  { key: 'approved', count: statusCount('approved'), label: t('grantsPortal.statApproved') },
  { key: 'closed', count: statusCount('closed'), label: t('grantsPortal.statClosed') },
  { key: 'rejected', count: statusCount('rejected') + statusCount('hidden'), label: t('grantsPortal.statDeclined') },
])

const grantTypes = [
  { key: 'conservation', icon: '🌿', label: 'Conservation' },
  { key: 'climate_justice', icon: '🌍', label: 'Climate Justice' },
  { key: 'artivism', icon: '🎨', label: 'Artivism' },
  { key: 'human_rights', icon: '⚖️', label: 'Human Rights' },
  { key: 'indigenous_rights', icon: '🏹', label: 'Indigenous Rights' },
  { key: 'youth', icon: '🌟', label: 'Youth' },
  { key: 'general', icon: '📋', label: 'General' },
]

const urgencyOptions = [
  { key: 'urgent', label: '🔴 Urgent (<30d)' },
  { key: 'soon', label: '🟡 Soon (<90d)' },
  { key: 'expired', label: '⚫ Expired' },
]

function statusCount(status: string) {
  return scrapedGrants.value.filter(g => g.status === status).length
}

const availableCountries = computed(() => {
  const countries = new Set(scrapedGrants.value.map(g => g.country).filter(Boolean))
  return [...countries].sort()
})

const filteredGrants = computed(() => {
  let result = scrapedGrants.value

  if (activeStatusFilter.value) {
    const statuses = activeStatusFilter.value === 'rejected' ? ['rejected', 'hidden'] : [activeStatusFilter.value]
    result = result.filter(g => statuses.includes(g.status))
  }

  if (showPendingOnly.value && isManager.value) {
    result = result.filter(g => g.status === 'pending')
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.funder?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.country?.toLowerCase().includes(q)
    )
  }

  if (filterTypes.value.length) {
    result = result.filter(g => filterTypes.value.includes(g.grant_type || 'general'))
  }

  if (filterCountry.value) {
    result = result.filter(g => g.country === filterCountry.value)
  }

  if (filterUrgency.value.length) {
    result = result.filter(g => filterUrgency.value.includes(g.urgency || 'unknown'))
  }

  if (filterPriorityMin.value > 0 || filterPriorityMax.value < 100) {
    result = result.filter(g => {
      const p = g.priority_score ?? 50
      return p >= filterPriorityMin.value && p <= filterPriorityMax.value
    })
  }

  switch (sortBy.value) {
    case 'oldest': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break
    case 'priority': result.sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0)); break
    case 'votes': result.sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id)); break
    case 'amount': result.sort((a, b) => (b.amount_usd ?? 0) - (a.amount_usd ?? 0)); break
    case 'deadline': result.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')); break
    default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break
  }

  return result
})

const filtersActive = computed(() => ({
  search: searchQuery.value,
  status: activeStatusFilter.value,
  types: filterTypes.value.length,
  country: filterCountry.value,
  urgency: filterUrgency.value.length,
  priority: filterPriorityMin.value > 0 || filterPriorityMax.value < 100,
}))

// Edit state
const editGrantData = ref<ScrapedGrant | null>(null)
const editSaving = ref(false)
const editErr = ref('')

// Submit state
const showSubmitModal = ref(false)
const submitting = ref(false)
const submitMsg = ref('')
const submitOk = ref(false)

const form = reactive({
  title: '',
  description: '',
  location_name: '',
  latitude: null as number | null,
  longitude: null as number | null,
  category: 'environment',
})

const confirmSignOut = ref(false)

// URL-synced filters
function readFiltersFromURL() {
  if (route.query.q) searchQuery.value = route.query.q as string
  if (route.query.status) activeStatusFilter.value = route.query.status as string
  if (route.query.pending === '1') showPendingOnly.value = true
  if (route.query.types) filterTypes.value = (route.query.types as string).split(',')
  if (route.query.country) filterCountry.value = route.query.country as string
  if (route.query.urgency) filterUrgency.value = (route.query.urgency as string).split(',')
  if (route.query.pmin) filterPriorityMin.value = Number(route.query.pmin)
  if (route.query.pmax) filterPriorityMax.value = Number(route.query.pmax)
  if (route.query.sort) sortBy.value = route.query.sort as string
}

const syncFiltersToURL = debounce(() => {
  const query: Record<string, string> = {}
  if (searchQuery.value) query.q = searchQuery.value
  if (activeStatusFilter.value) query.status = activeStatusFilter.value
  if (showPendingOnly.value) query.pending = '1'
  if (filterTypes.value.length) query.types = filterTypes.value.join(',')
  if (filterCountry.value) query.country = filterCountry.value
  if (filterUrgency.value.length) query.urgency = filterUrgency.value.join(',')
  if (filterPriorityMin.value > 0) query.pmin = String(filterPriorityMin.value)
  if (filterPriorityMax.value < 100) query.pmax = String(filterPriorityMax.value)
  if (sortBy.value !== 'newest') query.sort = sortBy.value
  router.replace({ query: Object.keys(query).length ? query : undefined })
}, 400)

function clearFilters() {
  searchQuery.value = ''
  activeStatusFilter.value = ''
  showPendingOnly.value = false
  filterTypes.value = []
  filterCountry.value = ''
  filterUrgency.value = []
  filterPriorityMin.value = 0
  filterPriorityMax.value = 100
  sortBy.value = 'newest'
}

function toggleStatusFilter(key: string) {
  activeStatusFilter.value = activeStatusFilter.value === key ? '' : key
}

function typeEmoji(type?: string): string {
  const map: Record<string, string> = { artivism: '🎨', climate_justice: '🌍', conservation: '🌿', human_rights: '⚖️', indigenous_rights: '🏹', youth: '🌟' }
  return map[type || ''] || '📋'
}

function priorityClass(score: number): string {
  if (score >= 60) return 'high'
  if (score >= 30) return 'mid'
  return 'low'
}

function urgencyLabel(urgency: string): string {
  const map: Record<string, string> = { urgent: '🔴 ' + t('grantsPortal.urgencyUrgent'), soon: '🟡 ' + t('grantsPortal.urgencySoon'), expired: '⚫ ' + t('grantsPortal.urgencyExpired') }
  return map[urgency] || urgency
}

function truncate(text: string, len: number): string {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '…' : text
}

// Voting
function getStarClass(grantId: string, n: number) {
  return n <= (scrapedUserVotes[grantId] || 0) ? 'active' : ''
}

function getVoteCount(grantId: string) {
  const entry = leaderboard.value.find(e => e.id === grantId)
  return entry?.vote_count || 0
}

async function handleVote(grantId: string, stars: number) {
  if (!user.value) return
  try {
    const current = scrapedUserVotes[grantId]
    if (current === stars) {
      await deleteVote('', grantId)
      scrapedUserVotes[grantId] = 0
    } else {
      await voteScrapedGrant(grantId, stars)
      scrapedUserVotes[grantId] = stars
    }
    loadLeaderboardData()
  } catch (e) {
    console.error('Vote error:', e)
  }
}

async function handleVoteDetail(stars: number) {
  if (!user.value || !detailGrant.value) return
  const id = detailGrant.value.id
  try {
    if (detailUserVote.value === stars) {
      await deleteVote('', id)
      detailUserVote.value = 0
    } else {
      await voteScrapedGrant(id, stars)
      detailUserVote.value = stars
    }
    loadLeaderboardData()
  } catch (e) {
    console.error('Detail vote error:', e)
  }
}

// Detail
function openDetail(g: ScrapedGrant) {
  detailGrant.value = {
    ...g,
    source_type: 'scraped',
    source_id: g.id,
    created_at: g.fetched_at || g.created_at,
  } as DetailGrantData
}

// Edit
function openEdit(g: ScrapedGrant) {
  editGrantData.value = g
  editErr.value = ''
}

function closeEdit() {
  editGrantData.value = null
  editErr.value = ''
}

async function handleSaveEdit(formData: Record<string, string>) {
  if (!editGrantData.value) return
  editSaving.value = true
  editErr.value = ''
  try {
    const updates: Record<string, unknown> = {
      title: formData.title,
      funder: formData.funder,
      description: formData.description,
      deadline: formData.deadline,
      amount_max: formData.amount_max,
      amount_min: formData.amount_min,
      currency: formData.currency,
      country: formData.country,
      url: formData.url,
      categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean),
    }
    const result = await apiUpdateScrapedGrant(editGrantData.value.id, updates)
    if ('error' in result && result.error) {
      editErr.value = result.error as string
      return
    }
    closeEdit()
    loadData()
  } catch (e) {
    editErr.value = 'Save failed'
    console.error(e)
  } finally {
    editSaving.value = false
  }
}

// Submit
async function handleSubmitGrant() {
  submitting.value = true
  submitMsg.value = ''
  try {
    const result = await apiSubmitGrant(form)
    if ('error' in result && result.error) {
      submitMsg.value = result.error as string
      submitOk.value = false
    } else {
      submitMsg.value = t('grantsPortal.submittedSuccess')
      submitOk.value = true
      form.title = ''
      form.description = ''
      form.location_name = ''
      form.latitude = null
      form.longitude = null
      form.category = 'environment'
      setTimeout(() => { showSubmitModal.value = false; submitMsg.value = '' }, 1500)
    }
  } catch (e) {
    submitMsg.value = 'Submission failed'
    submitOk.value = false
  } finally {
    submitting.value = false
  }
}

// Review
async function handleReview(grantId: string, decision: 'approved' | 'rejected' | 'hidden' | 'pending') {
  try {
    await apiReviewScraped(grantId, decision)
    loadData()
  } catch (e) {
    console.error('Review error:', e)
  }
}

// Data loading
async function loadData() {
  scrapedLoading.value = true
  try {
    const statusParam = isManager.value ? undefined : 'approved'
    const result = await listScrapedGrants(statusParam)
    scrapedGrants.value = result.grants ?? []
  } catch (e) {
    console.error('Failed to load grants:', e)
  } finally {
    scrapedLoading.value = false
  }
}

async function loadLeaderboardData() {
  try {
    const result = await getLeaderboard('all', 'approved')
    leaderboard.value = result.grants ?? []
  } catch (e) {
    console.error('Leaderboard error:', e)
  }
}

// Sync filters to URL on change
watch([searchQuery, activeStatusFilter, showPendingOnly, filterTypes, filterCountry, filterUrgency, filterPriorityMin, filterPriorityMax, sortBy], syncFiltersToURL, { deep: true })

// Init
onMounted(async () => {
  readFiltersFromURL()
  await loadData()
  await loadLeaderboardData()
})

// Watch for user changes to reload with correct permissions
watch(user, () => { loadData(); loadLeaderboardData() }, { deep: false })
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────── */
.grants-dashboard {
  --dash-bg: #08080a;
  --dash-surface: rgba(255,255,255,0.03);
  --dash-border: rgba(255,255,255,0.08);
  --dash-border-hover: rgba(255,255,255,0.15);
  --dash-text: #f0f0f0;
  --dash-text-dim: rgba(255,255,255,0.4);
  --dash-accent: #00ff85;
  --dash-open: #eab308;
  --dash-approved: #00ff85;
  --dash-closed: rgba(255,255,255,0.3);
  --dash-rejected: #ef4444;
  --dash-hidden: rgba(255,255,255,0.2);
  --header-h: 56px;
  --sidebar-w: 250px;
  --panel-h: 64px;

  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--dash-bg);
  color: var(--dash-text);
  font-family: 'Inter', system-ui, sans-serif;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────── */
.dash-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: var(--header-h);
  padding: 0 1.25rem;
  border-bottom: 1px solid var(--dash-border);
  background: rgba(8,8,10,0.95);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
  z-index: 10;
}

.header-left { flex-shrink: 0; }
.header-logo {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.text-accent { color: var(--dash-accent); }

.header-stats {
  display: flex;
  gap: 0.375rem;
  flex: 1;
  justify-content: center;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border: 1px solid transparent;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  background: transparent;
  color: var(--dash-text-dim);
  transition: all 0.15s;
  white-space: nowrap;
}
.stat-pill:hover { border-color: var(--dash-border-hover); color: var(--dash-text); }
.stat-pill.active {
  background: rgba(255,255,255,0.08);
  border-color: var(--dash-border-hover);
  color: var(--dash-text);
}
.stat-pill.pending.active { border-color: var(--dash-open); }
.stat-pill.approved.active { border-color: var(--dash-approved); }
.stat-pill.closed.active { border-color: var(--dash-closed); }
.stat-pill.rejected.active { border-color: var(--dash-rejected); }

.stat-pill-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 0.625rem;
  width: 14px;
  height: 14px;
  color: var(--dash-text-dim);
  pointer-events: none;
}
.search-input {
  width: 180px;
  padding: 0.35rem 0.75rem 0.35rem 2rem;
  background: var(--dash-surface);
  border: 1px solid var(--dash-border);
  border-radius: 9999px;
  color: var(--dash-text);
  font-size: 0.75rem;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: var(--dash-accent); }
.search-input::placeholder { color: var(--dash-text-dim); }

/* ── Body ───────────────────────────────────────────── */
.dash-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Filter Sidebar ─────────────────────────────────── */
.filter-sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  border-right: 1px solid var(--dash-border);
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: rgba(255,255,255,0.01);
}

.filter-section { display: flex; flex-direction: column; gap: 0.375rem; }

.filter-heading {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--dash-text-dim);
}

.filter-check-group { display: flex; flex-direction: column; gap: 0.125rem; }

.filter-check {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.7rem;
  color: var(--dash-text-dim);
  cursor: pointer;
  padding: 0.2rem 0.25rem;
  border-radius: 4px;
  transition: all 0.1s;
}
.filter-check:hover { background: rgba(255,255,255,0.04); color: var(--dash-text); }
.filter-check input { accent-color: var(--dash-accent); }

.filter-select, .filter-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: var(--dash-surface);
  border: 1px solid var(--dash-border);
  border-radius: 6px;
  color: var(--dash-text);
  font-size: 0.7rem;
  outline: none;
}
.filter-select:focus, .filter-input:focus { border-color: var(--dash-accent); }
.filter-input.sm { width: 60px; }
.range-row { display: flex; align-items: center; gap: 0.375rem; }
.range-sep { color: var(--dash-text-dim); font-size: 0.7rem; }

/* Status tabs */
.status-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.status-tab {
  padding: 0.25rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  background: transparent;
  color: var(--dash-text-dim);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.status-tab:hover { border-color: var(--dash-border-hover); color: var(--dash-text); }
.status-tab.active {
  background: rgba(255,255,255,0.08);
  border-color: var(--dash-border-hover);
  color: var(--dash-text);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.status-dot.pending { background: var(--dash-open); }
.status-dot.approved { background: var(--dash-approved); }
.status-dot.closed { background: var(--dash-closed); }
.status-dot.rejected { background: var(--dash-rejected); }

.filter-clear {
  margin-top: auto;
  padding: 0.5rem;
  border: 1px solid var(--dash-border);
  border-radius: 6px;
  background: transparent;
  color: var(--dash-text-dim);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.filter-clear:hover { border-color: var(--dash-rejected); color: var(--dash-rejected); }

/* ── Main Content ───────────────────────────────────── */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

.results-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.results-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: var(--dash-text-dim);
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn-outline {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--dash-border);
  border-radius: 6px;
  background: transparent;
  color: var(--dash-text-dim);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.action-btn-outline:hover { border-color: var(--dash-accent); color: var(--dash-accent); }

/* Loading / Empty */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 1rem;
  color: var(--dash-text-dim);
  font-size: 0.8rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--dash-border);
  border-top-color: var(--dash-accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Grant Cards ────────────────────────────────────── */
.grants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 0.75rem;
}

.grant-card {
  background: var(--dash-surface);
  border: 1px solid var(--dash-border);
  border-radius: 8px;
  padding: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}
.grant-card:hover {
  border-color: var(--dash-border-hover);
  background: rgba(255,255,255,0.05);
}
.grant-card.selected {
  border-color: var(--dash-accent);
  box-shadow: 0 0 0 1px var(--dash-accent);
}
.grant-card.pending { border-left: 2px solid var(--dash-open); }
.grant-card.approved { border-left: 2px solid var(--dash-approved); }
.grant-card.closed { border-left: 2px solid var(--dash-closed); }
.grant-card.rejected, .grant-card.hidden { border-left: 2px solid var(--dash-rejected); opacity: 0.6; }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-type-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  color: var(--dash-text-dim);
}
.card-type-badge.conservation { background: rgba(34,197,94,0.12); color: #4ade80; }
.card-type-badge.climate_justice { background: rgba(34,197,94,0.12); color: #4ade80; }
.card-type-badge.artivism { background: rgba(168,85,247,0.12); color: #c084fc; }
.card-type-badge.human_rights { background: rgba(59,130,246,0.12); color: #60a5fa; }
.card-type-badge.indigenous_rights { background: rgba(234,179,8,0.12); color: #facc15; }
.card-type-badge.youth { background: rgba(236,72,153,0.12); color: #f472b6; }

.card-top-right { display: flex; align-items: center; gap: 0.375rem; }

.card-priority {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  font-weight: 800;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
}
.card-priority.high { background: rgba(34,197,94,0.15); color: #4ade80; }
.card-priority.mid { background: rgba(234,179,8,0.15); color: #facc15; }
.card-priority.low { background: rgba(255,255,255,0.06); color: var(--dash-text-dim); }

.card-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.card-status-dot.pending { background: var(--dash-open); }
.card-status-dot.approved { background: var(--dash-approved); }
.card-status-dot.closed { background: var(--dash-closed); }
.card-status-dot.rejected { background: var(--dash-rejected); }
.card-status-dot.hidden { background: var(--dash-hidden); }

.card-title {
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--dash-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-desc {
  font-size: 0.7rem;
  line-height: 1.5;
  color: var(--dash-text-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.75rem;
}
.meta-item {
  font-size: 0.6rem;
  color: var(--dash-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.urgency-badge {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  align-self: flex-start;
}
.urgency-badge.urgent { background: rgba(239,68,68,0.15); color: #f87171; }
.urgency-badge.soon { background: rgba(234,179,8,0.15); color: #facc15; }
.urgency-badge.expired { background: rgba(255,255,255,0.05); color: var(--dash-text-dim); }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--dash-border);
  margin-top: auto;
}

.star-voter {
  display: flex;
  align-items: center;
  gap: 0.0625rem;
}
.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,0.1);
  font-size: 0.7rem;
  padding: 0;
  line-height: 1;
  transition: all 0.12s;
}
.star-btn:hover { color: rgba(250,204,21,0.5); transform: scale(1.2); }
.star-btn.active { color: #facc15; text-shadow: 0 0 6px rgba(250,204,21,0.3); }
.vote-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.55rem;
  color: var(--dash-text-dim);
  margin-left: 0.25rem;
}

.card-actions { display: flex; gap: 0.25rem; }

.card-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--dash-text-dim);
  cursor: pointer;
  transition: all 0.12s;
  font-size: 0.75rem;
}
.card-action-btn:hover { background: rgba(255,255,255,0.08); color: var(--dash-text); }
.card-action-btn.apply:hover { background: rgba(0,255,133,0.1); color: var(--dash-accent); }

/* ── Manager Panel ──────────────────────────────────── */
.manager-panel {
  border-top: 1px solid var(--dash-border);
  background: rgba(8,8,10,0.98);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
  z-index: 10;
}

.manager-panel-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--panel-h);
  padding: 0 1.25rem;
  gap: 1rem;
}

.panel-grant-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}
.panel-grant-title {
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.panel-grant-status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}
.panel-grant-status.pending { background: rgba(234,179,8,0.12); color: #eab308; }
.panel-grant-status.approved { background: rgba(0,200,83,0.12); color: #00c853; }
.panel-grant-status.rejected { background: rgba(239,68,68,0.12); color: #ef4444; }
.panel-grant-status.hidden { background: rgba(255,255,255,0.05); color: var(--dash-text-dim); }
.panel-grant-status.closed { background: rgba(255,255,255,0.05); color: var(--dash-text-dim); }

.panel-actions {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.panel-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.12s;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.panel-btn.approve { background: rgba(0,200,83,0.12); color: #00c853; border-color: rgba(0,200,83,0.2); }
.panel-btn.approve:hover { background: rgba(0,200,83,0.25); }
.panel-btn.reject { background: rgba(239,68,68,0.12); color: #ef4444; border-color: rgba(239,68,68,0.2); }
.panel-btn.reject:hover { background: rgba(239,68,68,0.25); }
.panel-btn.hidden-action { background: rgba(255,255,255,0.05); color: var(--dash-text-dim); border-color: var(--dash-border); }
.panel-btn.hidden-action:hover { background: rgba(255,255,255,0.1); }
.panel-btn.restore { background: rgba(250,204,21,0.12); color: #facc15; border-color: rgba(250,204,21,0.2); }
.panel-btn.restore:hover { background: rgba(250,204,21,0.25); }
.panel-btn.edit { background: rgba(59,130,246,0.12); color: #60a5fa; border-color: rgba(59,130,246,0.2); }
.panel-btn.edit:hover { background: rgba(59,130,246,0.25); }

/* ── Modals ──────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 1rem;
}

.modal-content {
  background: #111;
  border: 1px solid var(--dash-border);
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.modal-content--xs { max-width: 360px; }
.modal-content--sm { max-width: 480px; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.modal-header h3 {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--dash-text);
}
.modal-close {
  background: none;
  border: none;
  color: var(--dash-text-dim);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}
.modal-close:hover { color: var(--dash-text); }

.modal-btn-secondary {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--dash-border);
  border-radius: 6px;
  background: transparent;
  color: var(--dash-text-dim);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
}
.modal-btn-secondary:hover { color: var(--dash-text); }
.modal-btn-danger {
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 6px;
  background: rgba(239,68,68,0.15);
  color: #ef4444;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}
.modal-btn-danger:hover { background: rgba(239,68,68,0.25); }

/* Submit form */
.submit-form { display: flex; flex-direction: column; gap: 0.625rem; }

.form-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--dash-border);
  border-radius: 6px;
  color: var(--dash-text);
  font-size: 0.75rem;
  outline: none;
}
.form-input:focus { border-color: var(--dash-accent); }
.form-input::placeholder { color: var(--dash-text-dim); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }

.submit-btn {
  width: 100%;
  padding: 0.6rem;
  background: var(--dash-accent);
  color: #000;
  font-weight: 800;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.submit-msg { font-size: 0.65rem; font-weight: 600; text-align: center; }
.submit-msg.ok { color: var(--dash-accent); }
.submit-msg.err { color: #ef4444; }

/* ── Transitions ─────────────────────────────────────── */
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 1024px) {
  .filter-sidebar { width: 200px; padding: 0.75rem; }
  .grants-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
}

@media (max-width: 768px) {
  .filter-sidebar { display: none; }
  .header-stats { gap: 0.25rem; }
  .stat-pill { padding: 0.2rem 0.4rem; font-size: 0.55rem; }
  .stat-pill-num { font-size: 0.65rem; }
  .search-input { width: 120px; }
  .grants-grid { grid-template-columns: 1fr; }
  .panel-actions { gap: 0.25rem; }
  .panel-btn { padding: 0.25rem 0.5rem; font-size: 0.55rem; }
  .manager-panel-inner { padding: 0 0.75rem; }
  .panel-grant-info { display: none; }
}

@media (max-width: 480px) {
  .dash-header { padding: 0 0.75rem; gap: 0.5rem; }
  .search-input { width: 80px; }
  .main-content { padding: 0.75rem; }
}
</style>
