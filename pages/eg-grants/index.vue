/**
 * pages/eg-grants/index.vue
 * @why EG grants portal — 3D globe backdrop with the worldwide grants dashboard
 * @component index
 * @deps vue (ref, computed, watch, onMounted); ~/lib/project-data (allProjectsData); ~/composables/useToast (useToast); ~/composables/useSupabase (useSupabase); ~/composables/useSupabaseAuth (useSupabaseAuth); ~/composables/useI18n (useI18n); ~/composables/useDeviceCapabilities (useDeviceCapabilities); ~/composables/useAdaptiveQuality (useAdaptiveQuality)
 */
<template>
  <div id="main-content" tabindex="-1" role="main" class="grants-portal relative min-h-screen overflow-hidden bg-[#08080a]" :class="{ 'is-embedded': isEmbedded }">
    <div v-if="!sessionReady" class="eg-gate fixed inset-0 flex items-center justify-center bg-[#08080a]" style="z-index: 99999">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-green-400" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
          <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
        </path>
      </svg>
    </div>

    <div v-else-if="!user" class="eg-gate fixed inset-0 flex items-center justify-center bg-[#08080a]" style="z-index: 99999">
      <div class="text-center max-w-sm mx-4">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <h2 class="text-white text-xl font-bold mb-2">{{ t('grantsPortal.signInRequiredTitle') }}</h2>
        <p class="text-white/50 text-sm mb-6">{{ t('grantsPortal.grantsSignInSection') }}</p>
        <button class="px-6 py-3 text-sm font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors border border-green-500/20" @click="() => signIn()">
          {{ t('grantsPortal.signInBtn') }}
        </button>
      </div>
    </div>

    <div v-else-if="!isManager" class="eg-gate fixed inset-0 flex items-center justify-center bg-[#08080a]" style="z-index: 99999">
      <div class="text-center max-w-sm mx-4">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18.36 6.64a9 9 0 11-12.73 0M12 9v.01M12 13v.01"/></svg>
        </div>
        <h2 class="text-white text-xl font-bold mb-2">{{ t('grantsPortal.accessRestrictedTitle') }}</h2>
        <p class="text-white/50 text-sm mb-6">{{ t('grantsPortal.accessRestrictedDesc') }}</p>
        <button class="px-6 py-3 text-sm font-bold bg-white/10 text-white/70 hover:bg-white/15 rounded-lg transition-colors" @click="signOut">
          {{ t('grantsPortal.signOut') }}
        </button>
      </div>
    </div>

    <template v-else>
      <GlobeView v-if="showBackground" :projects="allProjectsData" />

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
        <section class="grants-dashboard-section" id="grants-portal">
          <div class="dashboard-topbar">
            <button
              type="button"
              class="fs-toggle-btn"
              :aria-pressed="(!showBackground).toString()"
              :aria-label="showBackground ? t('grantsPortal.disableBackground') : t('grantsPortal.enableBackground')"
              @click="showBackground = !showBackground"
            >
              <svg v-if="showBackground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>{{ showBackground ? t('grantsPortal.disableBackground') : t('grantsPortal.enableBackground') }}</span>
            </button>
          </div>

          <GrantsDashboard
            :user="user"
            :is-manager="isManager"
            :search-query="dashboardSearch"
            :is-loading="scrapedLoading"
            :filtered-scraped-grants="scrapedGrants"
            :comment-counts="commentCounts"
            @sign-in="() => signIn()"
            @sign-out="handleSignOut"
            @update:search-query="dashboardSearch = $event"
            @view-detail="openScrapedDetail"
            @open-create-grant="openCreateGrantModal"
          />
        </section>
      </div>

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

      <CreateGrantModal
        :show="showCreateGrantModal"
        @close="closeCreateGrantModal"
        @created="onGrantCreated"
      />
    </template>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch, onMounted } from 'vue'
import type { GrantRecord, ScrapedGrant } from '~/composables/useGrants'
import type { DetailGrantData } from '~/lib/types'
import { allProjectsData } from '~/lib/project-data'
import GrantsDashboard from '~/components/grants/GrantsDashboard.vue'
import GrantDetailModal from '~/components/grants/GrantDetailModal.vue'
import CreateGrantModal from '~/components/grants/CreateGrantModal.vue'
import GlobeView from '~/components/GlobeView.vue'
import { useToast } from '~/composables/useToast'
import { useI18n } from '~/composables/useI18n'
import { useDeviceCapabilities } from '~/composables/useDeviceCapabilities'
import { useAdaptiveQuality } from '~/composables/useAdaptiveQuality'
import { useHostEmbed } from '~/composables/useHostEmbed'

const { isEmbedded } = useHostEmbed()

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

const { user, isManager, signIn, signOut, sessionReady } = useSupabaseAuth()
const confirmSignOut = ref(false)

const accessGranted = computed(() => sessionReady.value && !!user.value && isManager.value)

const { listScrapedGrants, updateScrapedGrant: apiUpdateScrapedGrant, voteGrant, voteScrapedGrant, deleteVote, getCommentCounts } = useGrants()

const scrapedGrants = ref<ScrapedGrant[]>([])
const scrapedLoading = ref(false)
const commentCounts = ref<Record<string, number>>({})

const showCreateGrantModal = ref(false)

const detailGrant = ref<DetailGrantData | null>(null)
const detailUserVote = ref(0)
const editSavingDetail = ref(false)
const editErrDetail = ref('')

const showBackground = ref(true)

const dashboardSearch = ref('')

function openScrapedDetail(g: ScrapedGrant | GrantRecord) {
  detailGrant.value = {
    ...g,
    source_type: 'scraped',
    source_id: g.id,
    created_at: ('fetched_at' in g ? g.fetched_at : null) || g.created_at,
  }
}

function closeGrantDetail() {
  detailGrant.value = null
  detailUserVote.value = 0
  // Comments may have been added/removed in the modal — refresh counts (cheap single query)
  getCommentCounts().then((r) => { commentCounts.value = r.counts ?? {} }).catch(() => {})
}

async function loadScrapedGrants() {
  scrapedLoading.value = true
  try {
    const [result, counts] = await Promise.all([listScrapedGrants(), getCommentCounts()])
    scrapedGrants.value = result.grants ?? []
    commentCounts.value = counts.counts ?? {}
  } catch (e) {
    console.error('Failed to load scraped grants:', e)
  } finally {
    scrapedLoading.value = false
  }
}

function openCreateGrantModal() {
  showCreateGrantModal.value = true
}

function closeCreateGrantModal() {
  showCreateGrantModal.value = false
}

function onGrantCreated() {
  loadScrapedGrants()
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
      grant_link: form.url,
      categories: form.categories.split(',').map(c => c.trim()).filter(Boolean),
    }
    const result = await apiUpdateScrapedGrant(grantId, updates)
    if ('error' in result && result.error) {
      editErrDetail.value = result.error as string
      return
    }
    closeGrantDetail()
    await loadScrapedGrants()
  } catch (e) {
    editErrDetail.value = 'An unexpected error occurred. Please try again.'
    console.error('Failed to save edit from detail:', e)
  } finally {
    editSavingDetail.value = false
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
  } catch (e) {
    console.error('Failed to vote on detail:', e)
  }
}

function handleSignOut() {
  confirmSignOut.value = true
}

watch(accessGranted, (granted) => {
  if (!granted) return
  loadScrapedGrants()
}, { immediate: true })

onMounted(() => {
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

</script>

<style scoped>
.grants-portal.is-embedded {
  padding-top: var(--eg-embed-offset, 64px);
}

.grants-portal {
  --obsidian: #08080a;
  --tectonic-white: #f0f0f0;
  --glass: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.1);
  --accent: #00ff85;
  --z-canvas: 0;
  --z-ui: 10;
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

.grants-dashboard-section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 10% 4rem;
  pointer-events: auto;
}

.dashboard-topbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.fs-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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
  cursor: pointer;
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

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .grants-dashboard-section { padding: 1rem 6% 3rem; }
}
</style>

<style>
html[data-page="/eg-grants"] header,
header {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
</style>
