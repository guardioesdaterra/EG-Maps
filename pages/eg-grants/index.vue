/**
 * pages/eg-grants/index.vue
 * @why EG grants dashboard — table of grants with status badges, approve/close actions, search
 * @component index
 * @deps vue (ref, reactive, computed, watch, onMounted, onBeforeUnmount); ~/lib/project-data (allProjectsData); ~/composables/useToast (useToast); ~/composables/useSupabase (useSupabase); ~/composables/useI18n (useI18n); ~/composables/useDeviceCapabilities (useDeviceCapabilities); ~/composables/useAdaptiveQuality (useAdaptiveQuality)
 */
<template>
  <div class="grants-portal relative min-h-screen overflow-hidden bg-[#08080a]">
    <GlobeView :projects="allProjectsData" @ready="onGlobeReady" />
    <DotField
      class="absolute inset-0"
      :style="{ zIndex: 'var(--z-dots)' }"
      :dot-radius="2"
      :dot-spacing="18"
      :cursor-radius="350"
      :bulge-strength="35"
      :glow-radius="100"
      gradient-from="rgba(124, 255, 103, 0.25)"
      gradient-to="rgba(160, 255, 188, 0.15)"
      glow-color="rgba(0, 255, 133, 0.08)"
    />
    <div v-if="showScrollIndicator" class="scroll-indicator">{{ t('grantsPortal.scrollToExplore') }}</div>
    <div v-if="!sessionReady" class="fixed inset-0 flex items-center justify-center bg-[#08080a]" style="z-index: 99999">
      <div class="w-6 h-6 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
    </div>
    <GrantsAuth v-if="!isEmbed && sessionReady" :user="user" :is-manager="isManager" @sign-in="signIn" @sign-out="handleSignOut" />

    
    <Transition name="modal-fade">
      <div v-if="showCrewPopup && !showCrewSignup" class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" :style="{ zIndex: 'var(--z-confirm)' }" @click.self="dismissCrewPopup">
        <div class="bg-[#111] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg class="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <h3 class="text-white font-bold text-sm mb-2">{{ t('grantsPortal.crewCheckTitle') }}</h3>
          <p class="text-white/50 text-xs mb-5">{{ t('grantsPortal.crewCheckDesc') }}</p>
          <div class="flex flex-col gap-2">
            <button class="w-full px-3 py-2 text-xs font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors" @click="openCrewSignup">{{ t('grantsPortal.signUpAsCrew') }}</button>
            <button class="w-full px-3 py-2 text-xs font-semibold text-white/60 hover:text-white rounded-lg transition-colors" @click="dismissCrewPopup">{{ t('grantsPortal.continueAsViewer') }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <CrewSignupModal :show="showCrewSignup" :user-email="user?.email" @close="closeCrewSignup" @registered="onCrewRegistered" />

    
    <Transition name="modal-fade">
      <div v-if="confirmSignOut" class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" :style="{ zIndex: 'var(--z-confirm)' }" @click.self="confirmSignOut = false">
        <div class="bg-[#111] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
          <h3 class="text-white font-bold text-sm mb-2">{{ t('grantsPortal.signOutConfirmTitle') }}</h3>
          <p class="text-white/50 text-xs mb-5">{{ t('grantsPortal.signOutConfirmDesc') }}</p>
          <div class="flex gap-2 justify-end">
            <button class="px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white rounded-lg transition-colors" @click="confirmSignOut = false">{{ t('grantsPortal.cancel') }}</button>
            <button class="px-3 py-1.5 text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors" @click="signOut(); confirmSignOut = false">{{ t('grantsPortal.signOut') }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <div id="ui-overlay" class="relative" :style="{ zIndex: 'var(--z-ui)' }">
      
      <section id="hero" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <span class="data-label hero-reveal">{{ t('grantsPortal.heroLabel') }}</span>
        <h1 class="hero-reveal">{{ t('grantsPortal.heroTitle1') }}<br/>{{ t('grantsPortal.heroTitle2') }}</h1>
        <p class="hero-desc hero-reveal" v-html="t('grantsPortal.heroDesc', { strong1: '<strong>', strong2: '</strong>', strong3: '<strong>', strong4: '</strong>', strong5: '<strong>', strong6: '</strong>' })" />
      </section>

      
      <section id="details" class="min-h-screen flex flex-col justify-center px-[10%] pointer-events-auto">
        <div class="impact-grid">
          <div class="impact-content">
            <span class="data-label hero-reveal">{{ t('grantsPortal.statsLabel') }}</span>
            <h2 class="impact-heading hero-reveal">
              {{ t('grantsPortal.impactHeading1') }}
              <span class="impact-heading-accent">{{ t('grantsPortal.impactHeading2') }}</span>
            </h2>
            <p class="impact-desc hero-reveal">{{ t('grantsPortal.impactDesc') }}</p>
          </div>

          <div class="impact-stats-wall">
            <div class="impact-stat-tile" v-for="(stat, si) in impactStats" :key="si" :style="{ '--idx': si }">
              <div class="impact-stat-tile-inner">
                <span class="impact-stat-tile-num">{{ stat.num }}</span>
                <span class="impact-stat-tile-label">{{ stat.label }}</span>
              </div>
              <div class="impact-stat-tile-glow" />
            </div>
          </div>
        </div>

        <div class="impact-divider">
          <svg viewBox="0 0 1200 2" preserveAspectRatio="none" class="divider-line"><path d="M0 1h1200" stroke="url(#dividerGrad)" stroke-width="1" fill="none"/></svg>
          <svg width="0" height="0" class="sr-only"><defs><linearGradient id="dividerGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="transparent"/><stop offset="50%" stop-color="rgba(0,255,133,0.25)"/><stop offset="100%" stop-color="transparent"/></linearGradient></defs></svg>
        </div>

        <div class="impact-mission">
          <div class="mission-quote-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="quote-icon-svg"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
          </div>
          <blockquote class="mission-quote-text">{{ t('grantsPortal.missionQuote') }}</blockquote>
          <cite class="mission-quote-attr">{{ t('grantsPortal.missionAttribution') }}</cite>
        </div>

        <div class="impact-projects">
          <h3 class="impact-projects-label">{{ t('grantsPortal.impactRingLabel') }}</h3>
          <div class="impact-track">
            <article v-for="(p, i) in topProjects" :key="p.project_title" class="impact-card" :style="{ '--i': i }">
              <div class="impact-card-media">
                <svg viewBox="0 0 120 120" class="impact-ring-svg">
                  <defs>
                    <linearGradient :id="'ringGrad' + i" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#00ff85"/>
                      <stop offset="100%" stop-color="#00ccff"/>
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
                  <circle cx="60" cy="60" r="54" fill="none" :stroke="'url(#ringGrad' + i + ')'" stroke-width="2" stroke-dasharray="339.3" :stroke-dashoffset="339.3 - (339.3 * (p.direct_beneficiaries + p.indirect_beneficiaries) / maxBeneficiaries)" stroke-linecap="round" class="impact-ring-progress"/>
                </svg>
                <div class="impact-card-ring-inner">
                  <span class="impact-card-ring-num">{{ formatCompact(p.direct_beneficiaries + p.indirect_beneficiaries) }}</span>
                  <span class="impact-card-ring-unit">{{ t('grantsPortal.impactRingLabel') }}</span>
                </div>
              </div>
              <div class="impact-card-body">
                <h4 class="impact-card-title">{{ p.project_title }}</h4>
                <div class="impact-card-meta">
                  <span class="impact-card-loc">{{ p.country_province.split(',').pop()?.trim() || p.country_province }}</span>
                  <span class="impact-card-dot">·</span>
                  <span class="impact-card-type">Project Grant</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      
      <section class="grants-section" id="join">
        <div class="grants-inner">
          <span class="data-label">{{ t('grantsPortal.grantsSectionLabel') }}</span>
          <h2 class="grants-heading">{{ t('grantsPortal.howGrantsWork') }}</h2>
          <div class="grants-body">
            <div class="grants-copy">              <p>{{ t('grantsPortal.grantsCopy2') }}</p>
              <p>{{ t('grantsPortal.grantsCopy3') }}</p>
              <p>{{ t('grantsPortal.grantsCopy4') }}</p>
              <NuxtLink to="https://www.earthguardians.org/project-grants" target="_blank" class="grants-cta-btn">
                <span>{{ t('grantsPortal.grantsCta') }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </NuxtLink>
            </div>

          </div>
          <div class="contact-info">
            <p class="contact-text" v-html="contactEmailHtml" />
            <p class="contact-text">
              <a href="https://www.earthguardians.org/" target="_blank">{{ t('grantsPortal.visitEarthGuardians') }}</a>
            </p>
          </div>
        </div>
      </section>

      
      <section class="projects-section" id="grants-portal">
        <div class="nebula-bg" />
        <div class="projects-header">
          <span class="dash-label">{{ t('grantsPortal.dashboardLabel') }}</span>
          <h2>{{ t('grantsPortal.portalTitle') }}</h2>
          <p class="projects-subtitle">{{ t('grantsPortal.dashboardSubtitle') }}</p>
          <NuxtLink to="/eg-grants/fullscreen#no-dock" class="fs-toggle-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
            <span>Full Screen</span>
          </NuxtLink>
        </div>

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
      </section>

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

      <GrantsFooter
        :country-count="countryCount"
      />
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { GrantRecord, ScrapedGrant, LeaderboardEntry } from '~/composables/useGrants'
import { allProjectsData } from '~/lib/project-data'
import type { ProjectData, DetailGrantData } from '~/lib/types'
import GrantsAuth from '~/components/grants/GrantsAuth.vue'
import GrantsDashboard from '~/components/grants/GrantsDashboard.vue'
import GrantDetailModal from '~/components/grants/GrantDetailModal.vue'
import GrantEditModal from '~/components/grants/GrantEditModal.vue'
import RegistryModal from '~/components/grants/RegistryModal.vue'
import GrantsFooter from '~/components/grants/GrantsFooter.vue'
import CrewSignupModal from '~/components/grants/CrewSignupModal.vue'
import GlobeView from '~/components/GlobeView.vue'
import { useToast } from '~/composables/useToast'
import { useSupabase } from '~/composables/useSupabase'
import { useI18n } from '~/composables/useI18n'
import { useDeviceCapabilities } from '~/composables/useDeviceCapabilities'
import { useAdaptiveQuality } from '~/composables/useAdaptiveQuality'

const deviceCaps = useDeviceCapabilities()
const quality = useAdaptiveQuality()
const toast = useToast()

const isLowQuality = computed(() => quality.level.value === 'low' || quality.level.value === 'medium')

useHead({
  title: 'EG Grants | Earth Guardians',
  meta: [
    { name: 'description', content: 'Earth Guardians Grants — Community Collaborative Open Grants + Project Grants empowering youth-led climate action worldwide.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@900&family=JetBrains+Mono:wght@300;500;700;800&display=swap' },
    { rel: 'preconnect', href: 'https://cdnjs.cloudflare.com' },
    { rel: 'preconnect', href: 'https://threejs.org' },
    { rel: 'preload', href: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', as: 'script' },
    { rel: 'preload', href: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js', as: 'script' },
    { rel: 'preload', href: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js', as: 'script' },
    ...(isLowQuality.value ? [] : [
      { rel: 'preload', href: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg', as: 'image' as const },
    ]),
  ],
})

const { t, locale, localeNames } = useI18n()

const impactStats = computed(() => [
  { num: '1M+', label: t('grantsPortal.impactStat1Label') },
  { num: '20K+', label: t('grantsPortal.impactStat2Label') },
  { num: '30+', label: t('grantsPortal.impactStat3Label') },
  { num: '100%', label: t('grantsPortal.impactStat4Label') },
])
const { user, isManager, isManagerReady, signIn, signOut, sessionReady } = useSupabaseAuth()
const confirmSignOut = ref(false)
const showCrewPopup = ref(false)
const showCrewSignup = ref(false)
const viewerDismissed = ref(false)

const isEmbed = computed(() => {
  if (import.meta.server) return false
  return new URLSearchParams(window.location.search).get('embed') === 'true'
})
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
  title: '',
  funder: '',
  description: '',
  deadline: '',
  amount_max: '',
  amount_min: '',
  currency: '',
  country: '',
  url: '',
  categories: '',
})

const activePortalTab = ref('tabOpen')
const showRegistry = ref(false)
const registryLoading = ref(false)
const detailGrant = ref<DetailGrantData | null>(null)
const detailUserVote = ref(0)

const dashboardSearch = ref('')

const topProjects = computed(() =>
  [...allProjectsData]
    .map(p => ({ ...p, _total: (p.direct_beneficiaries || 0) + (p.indirect_beneficiaries || 0) }))
    .sort((a, b) => b._total - a._total)
    .slice(0, 5)
)
const maxBeneficiaries = computed(() => topProjects.value[0]?._total || 1)

function formatCompact(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}

const showScrollIndicator = ref(true)
function onPageScroll() {
  showScrollIndicator.value = window.scrollY < window.innerHeight * 0.6
}

const filteredGrants = computed(() => {
  const q = dashboardSearch.value
  return grants.value.filter(g => g.status === 'open' && matchSearch(g, q))
})

const scrapedPendingCount = computed(() => stats.pending)
const scrapedOpenCount = computed(() => grants.value.filter(g => g.status === 'open').length)
const scrapedClosedCount = computed(() => stats.closed)
const countryCount = computed(() => Math.max(stats.open > 0 ? 47 : 0, projectStats.value.countries) + '+')

const contactEmailHtml = computed(() => {
  const emailLink = '<a href="mailto:GRANTS@EARTHGUARDIANS.ORG">GRANTS@EARTHGUARDIANS.ORG</a>'
  return t('grantsPortal.contactLabel', { email: emailLink })
})

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

function closeRegistryModal() {
  showRegistry.value = false
}

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
    id: `project-${i}`,
    source_id: `project-${i}`,
    title: p.project_title,
    funder: 'Earth Guardians',
    source: 'project-grants',
    url: '',
    description: `Project in ${p.country_province} with ${p.direct_beneficiaries} direct and ${p.indirect_beneficiaries} indirect beneficiaries.`,
    deadline: '',
    amount_max: '',
    amount_min: '',
    currency: '',
    country: p.country_province.split(',').pop()?.trim() || p.country_province,
    region: p.country_province,
    categories: ['environment', 'community'],
    language: 'en',
    status: 'open',
    fetched_at: new Date().toISOString(),
    created_at: new Date('2024-01-01').toISOString(),
    grant_type: 'conservation',
    highlights: ['eg_core', 'high_value'],
    urgency: 'unknown',
    amount_usd: null,
    priority_score: 50,
    reviewed: false,
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
      title: editForm.title,
      funder: editForm.funder,
      description: editForm.description,
      deadline: editForm.deadline,
      amount_max: editForm.amount_max,
      amount_min: editForm.amount_min,
      currency: editForm.currency,
      country: editForm.country,
      url: editForm.url,
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
      title: form.title,
      funder: form.funder,
      description: form.description,
      deadline: form.deadline,
      amount_max: form.amount_max,
      amount_min: form.amount_min,
      currency: form.currency,
      country: form.country,
      url: form.url,
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
      if (isScraped) {
        await deleteVote('', id)
      } else {
        await deleteVote(id)
      }
      detailUserVote.value = 0
    } else {
      if (isScraped) {
        await voteScrapedGrant(id, stars)
      } else {
        await voteGrant(id, stars)
      }
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

function dismissCrewPopup() {
  showCrewPopup.value = false
  viewerDismissed.value = true
}

function openCrewSignup() {
  showCrewPopup.value = false
  showCrewSignup.value = true
}

function closeCrewSignup() {
  showCrewSignup.value = false
}

function onCrewRegistered(_memberId: string) {
  showCrewSignup.value = false
  viewerDismissed.value = true
}

async function checkCrewMembership() {
  if (!isManagerReady.value) {
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 50))
      if (isManagerReady.value) break
    }
  }
  if (isManager.value) return
  try {
    const { data, error: fnError } = await client.functions.invoke('crew-sync')
    if (fnError || !data?.authorized) {
      showCrewPopup.value = true
    }
  } catch { /* ignore */ }
}

watch(() => user.value?.email, (email) => {
  if (!email || viewerDismissed.value) return
  const route = useRoute()
  if (route.query.signup === '1') {
    openCrewSignup()
  } else {
    checkCrewMembership()
  }
})

watch(activePortalTab, (tab) => {
  if (['tabPending', 'tabOpen', 'tabClosed'].includes(tab)) loadScrapedGrants()
  if (tab === 'tabLeaderboard') loadLeaderboardData()
})

onMounted(async () => {
  await Promise.all([loadGrants(), loadStats(), loadScrapedGrants()])
  window.addEventListener('scroll', onPageScroll, { passive: true })
  const route = useRoute()
  if (route.query.signup === '1' && user.value?.email) {
    openCrewSignup()
  }
  setTimeout(() => {
    if (!import.meta.client) return
    try {
      if (localStorage.getItem('langToastSeen')) return
      const name = localeNames[locale.value] || locale.value
      toast.info(`Viewing in ${name}`, 'Need a different language? Click the translation icon in the dock to change.')
      localStorage.setItem('langToastSeen', '1')
    } catch { /* localStorage unavailable */ }
  }, 3000)
})

function onGlobeReady() {
  setTimeout(() => {
    document.querySelector('.grants-portal')?.classList.add('revealed')
  }, 1200)
}

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onPageScroll)
})

</script>

<style scoped>
.hero-reveal {
  opacity: 0;
  transform: translateY(40px);
  will-change: opacity, transform;
  backface-visibility: hidden;
}
.revealed .hero-reveal {
  animation: heroReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.revealed .data-label.hero-reveal { animation-delay: 0s; }
.revealed h1.hero-reveal { animation-delay: 0.2s; }
.revealed .hero-desc.hero-reveal { animation-delay: 0.4s; }
.revealed .impact-heading.hero-reveal { animation-delay: 0.1s; }
.revealed .impact-desc.hero-reveal { animation-delay: 0.25s; }

@keyframes heroReveal {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.grants-portal {
  --obsidian: #08080a;
  --tectonic-white: #f0f0f0;
  --glass: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.1);
  --accent: #00ff85;
  --stat-open: #eab308;
  --stat-approved: var(--accent);
  --stat-closed: rgba(255, 255, 255, 0.4);
  --z-canvas: 0;
  --z-dots: 1;
  --z-ui: 10;
  --z-dropdown: 9999;
  --z-dropdown-backdrop: 9998;
  --z-confirm: 10000;
}

canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  pointer-events: none;
  background-color: transparent;
}

#ui-overlay {
  position: relative;
  z-index: var(--z-ui);
}

section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 10%;
  pointer-events: auto;
}

.data-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 1rem;
  display: block;
}

h1 {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: -0.04em;
  max-width: 800px;
  color: var(--tectonic-white);
}

h2 {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  margin-bottom: 2rem;
  color: var(--tectonic-white);
}

.hero-desc {
  margin-top: 2rem;
  max-width: 600px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
}

.impact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}
.impact-content { max-width: 540px; }
.impact-heading {
  margin-top: 1rem;
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.05;
  text-transform: uppercase;
  letter-spacing: -0.03em;
  color: var(--tectonic-white);
  display: flex;
  flex-direction: column;
}
.impact-heading-accent {
  background: linear-gradient(135deg, #00ff85 0%, #00ccff 50%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-block;
}
.impact-desc {
  margin-top: 1.5rem;
  max-width: 480px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.95rem;
}
.impact-stats-wall {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  position: relative;
}
.impact-stat-tile {
  position: relative;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  overflow: hidden;
  will-change: transform;
  backface-visibility: hidden;
}
.impact-stat-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0, 255, 133, 0.03), transparent);
  opacity: 0;
  transition: opacity 0.5s ease;
}
.impact-stat-tile:hover::before { opacity: 1; }
.impact-stat-tile:hover { background: rgba(255, 255, 255, 0.04); }
.impact-stat-tile-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease;
  background: radial-gradient(ellipse at 50% 50%, rgba(0, 255, 133, 0.04) 0%, transparent 70%);
}
.impact-stat-tile:hover .impact-stat-tile-glow { opacity: 1; }
.impact-stat-tile-inner {
  position: relative;
  z-index: 1;
}
.impact-stat-tile-num {
  display: block;
  font-size: clamp(2.5rem, 4vw, 3.5rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--tectonic-white);
  margin-bottom: 0.35rem;
  transition: color 0.3s ease;
}
.impact-stat-tile:hover .impact-stat-tile-num {
  background: linear-gradient(135deg, var(--accent) 0%, #00ccff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.impact-stat-tile-label {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
}
.impact-divider {
  margin: 4rem 0;
  width: 100%;
}
.divider-line { width: 100%; height: 2px; }
.impact-mission {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.5rem;
  align-items: start;
  padding: 2rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.mission-quote-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 255, 133, 0.06);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 0.25rem;
}
.quote-icon-svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
  opacity: 0.7;
}
.mission-quote-text {
  font-size: 1.05rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.65);
  font-style: italic;
  margin: 0;
}
.mission-quote-attr {
  display: block;
  margin-top: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.25);
  font-style: normal;
}
.impact-projects {
  margin-top: 3rem;
}
.impact-projects-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.25);
  margin-bottom: 1.5rem;
  font-weight: 500;
}
.impact-track {
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 0.5rem 0 1rem;
}
.impact-track::-webkit-scrollbar { display: none; }
.impact-card {
  flex: 0 0 240px;
  scroll-snap-align: start;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 1.75rem 1.5rem;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  overflow: visible;
  cursor: default;
  will-change: transform;
  backface-visibility: hidden;
}
.impact-card:hover {
  border-color: rgba(0, 255, 133, 0.18);
  box-shadow: 0 0 50px rgba(0, 255, 133, 0.04), 0 20px 40px -10px rgba(0, 0, 0, 0.4);
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.03);
}
.impact-card-media {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 1.25rem;
}
.impact-ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.impact-ring-progress { transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1); }
.impact-card-ring-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.impact-card-ring-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent) 0%, #00ccff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}
.impact-card-ring-unit {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.25);
  margin-top: 4px;
}
.impact-card-body { text-align: center; }
.impact-card-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--tectonic-white);
  line-height: 1.3;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.impact-card-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.25);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.impact-card-dot { opacity: 0.4; }
.impact-card-type {
  color: rgba(0, 255, 133, 0.4);
}

.grants-section { min-height: auto; padding: 6rem 10%; position: relative; }
.grants-inner { max-width: 1200px; margin: 0 auto; }
.grants-heading { margin-top: 1rem; }
.grants-body { max-width: 700px; margin: 3rem auto 0; }
.grants-copy { background: rgba(0, 0, 0, 0.35); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 2rem; }
.grants-copy p { line-height: 1.8; color: rgba(255, 255, 255, 0.75); font-size: 0.95rem; margin-bottom: 1.25rem; }
.grants-copy strong { color: var(--accent); }
.grants-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, rgba(0, 255, 133, 0.1) 0%, rgba(0, 255, 133, 0.05) 100%);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  text-decoration: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  user-select: none;
}
.grants-cta-btn:hover { background: var(--accent); color: var(--obsidian); box-shadow: 0 0 40px rgba(0, 255, 133, 0.4); transform: translateY(-2px); }
.grants-cta-btn svg { width: 16px; height: 16px; }

.contact-info { margin-top: 4rem; padding: 2rem; border: 1px solid var(--border); text-align: center; }
.contact-text { margin-bottom: 0.5rem; color: rgba(255,255,255,0.7); font-size: 0.9rem; }
.contact-text a { color: var(--accent); text-decoration: none; }
.contact-text a:hover { text-decoration: underline; }

.projects-section { padding: 8rem 10%; position: relative; }
.projects-section::before {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at 30% 50%, rgba(0, 255, 133, 0.04) 0%, transparent 60%);
  pointer-events: none;
}
.projects-section::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 133, 0.12), rgba(99, 102, 241, 0.12), transparent);
  pointer-events: none;
  z-index: 1;
}
.projects-header { text-align: center; margin-bottom: 4rem; position: relative; z-index: 1; }
.projects-header h2 {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  background: linear-gradient(135deg, var(--tectonic-white) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
}
.projects-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.2em; text-transform: uppercase; }

.fs-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding: 0.55rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(16px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.fs-toggle-btn:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-1px);
}

.fs-toggle-btn svg {
  transition: transform 0.2s ease;
}

.fs-toggle-btn:hover svg {
  transform: scale(1.1);
}

.nebula-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 40%, rgba(0, 255, 133, 0.08) 0%, transparent 70%),
    radial-gradient(ellipse 60% 50% at 80% 30%, rgba(99, 102, 241, 0.06) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 50% 80%, rgba(236, 72, 153, 0.05) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.dash-label { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.4em; color: var(--accent); display: block; margin-bottom: 1rem; font-weight: 700; }

.scroll-indicator {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  opacity: 0.5;
  z-index: var(--z-ui);
  animation: bounce-arrow 2s infinite;
  color: rgba(255,255,255,0.5);
  will-change: transform;
}
@keyframes bounce-arrow {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  section, .projects-section { padding: 4rem 6%; }
  .grants-section { padding: 4rem 6%; }
  .impact-grid { grid-template-columns: 1fr; gap: 2rem; }
  .impact-content { max-width: 100%; }
  .impact-desc { max-width: 100%; }
  .impact-stat-tile { padding: 1.5rem; }
  .impact-stat-tile-num { font-size: 2rem; }
  .impact-mission { grid-template-columns: 1fr; gap: 1rem; }
  .impact-card { flex: 0 0 200px; padding: 1.5rem 1rem; }
}
</style>
