/**
 * pages/eg-grants/fullscreen.vue
 * @why Fullscreen worldwide grants view — dashboard with detail panel, no dock
 * @component fullscreen
 * @deps vue (ref, computed, watch, onMounted); ~/composables/useI18n (useI18n); ~/composables/useSupabase (useSupabase); ~/composables/useSupabaseAuth (useSupabaseAuth)
 */
<template>
  <div id="main-content" tabindex="-1" class="fs-grants min-h-screen bg-black text-white" :class="{ 'is-embedded': isEmbedded }">
    <div v-if="!sessionReady" class="eg-gate fixed inset-0 flex items-center justify-center bg-black" style="z-index: 99999">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
          <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
        </path>
      </svg>
    </div>

    <div v-else-if="!user" class="eg-gate fixed inset-0 flex items-center justify-center bg-black" style="z-index: 99999">
      <div class="text-center max-w-sm mx-4">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <h2 class="text-white text-xl font-bold mb-2">{{ t('grantsPortal.signInRequiredTitle') }}</h2>
        <p class="text-white/50 text-sm mb-6">{{ t('grantsPortal.grantsSignInSection') }}</p>
        <button class="px-6 py-3 text-sm font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors border border-green-500/20" @click="() => signIn()">
          {{ t('grantsPortal.signInShort') }}
        </button>
        <p class="mt-4 text-[11px] leading-relaxed text-white/35">
          {{ t('grantsPortal.signInAgreesPrefix') }}
          <NuxtLink to="/privacy" class="underline underline-offset-2 hover:text-white/60">{{ t('nav.privacy') }}</NuxtLink>
          {{ t('grantsPortal.signInAgreesAnd') }}
          <NuxtLink to="/terms" class="underline underline-offset-2 hover:text-white/60">{{ t('nav.terms') }}</NuxtLink>.
        </p>
        <div>
          <button class="mt-3 text-xs font-semibold text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors" @click="() => signInWithNewAccount()">
            {{ t('grantsPortal.useAnotherAccount') }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="!isManager" class="eg-gate fixed inset-0 flex items-center justify-center bg-black" style="z-index: 99999">
      <div class="text-center max-w-sm mx-4">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18.36 6.64a9 9 0 11-12.73 0M12 9v.01M12 13v.01"/></svg>
        </div>
        <h2 class="text-white text-xl font-bold mb-2">{{ t('grantsPortal.accessRestrictedTitle') }}</h2>
        <p class="text-white/50 text-sm mb-6">{{ t('grantsPortal.accessRestrictedDesc') }}</p>
        <div class="flex flex-col items-center gap-2">
          <button class="px-6 py-3 text-sm font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors border border-green-500/20" @click="() => switchAccount()">
            {{ t('grantsPortal.switchAccountBtn') }}
          </button>
          <button class="px-6 py-3 text-sm font-bold bg-white/10 text-white/70 hover:bg-white/15 rounded-lg transition-colors" @click="signOut">
            {{ t('grantsPortal.signOut') }}
          </button>
        </div>
      </div>
    </div>

    <template v-else>
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
              <h1 class="fs-title">{{ t('grantsPortal.fullscreenTitle') }}</h1>
              <span class="fs-badge">{{ t('grantsPortal.fullscreenBadge') }}</span>
            </div>
          </div>
          <div class="fs-header-right">
            <NuxtLink to="/eg-grants" class="fs-back-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              <span>{{ t('grantsPortal.exitFullscreen') }}</span>
            </NuxtLink>
          </div>
        </div>
      </header>

      <main class="fs-main flex-1 pb-12">
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
      </main>

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
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch, onMounted } from 'vue'
import type { GrantRecord, ScrapedGrant } from '~/composables/useGrants'
import type { DetailGrantData } from '~/lib/types'
import GrantsDashboard from '~/components/grants/GrantsDashboard.vue'
import GrantDetailModal from '~/components/grants/GrantDetailModal.vue'
import CreateGrantModal from '~/components/grants/CreateGrantModal.vue'
import { useI18n } from '~/composables/useI18n'
import { useSupabaseAuth } from '~/composables/useSupabaseAuth'
import { useHostEmbed } from '~/composables/useHostEmbed'

useHead({ title: 'EG Grants · Fullscreen | Earth Guardians' })

const { isEmbedded } = useHostEmbed()

const { t } = useI18n()
const { user, isManager, signIn, signInWithNewAccount, switchAccount, signOut, sessionReady } = useSupabaseAuth()
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
      title: form.title, funder: form.funder, description: form.description,
      deadline: form.deadline, amount_max: form.amount_max, amount_min: form.amount_min,
      currency: form.currency, country: form.country, grant_link: form.url,
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
      if (isScraped) { await deleteVote('', id) } else { await deleteVote(id) }
      detailUserVote.value = 0
    } else {
      if (isScraped) { await voteScrapedGrant(id, stars) } else { await voteGrant(id, stars) }
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
  if (import.meta.server) return
  if (typeof window !== 'undefined' && !window.location.hash.includes('no-dock')) {
    history.replaceState(null, '', '#no-dock')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
})

</script>

<style>
.fs-grants.is-embedded {
  padding-top: var(--eg-embed-offset, 64px);
}

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

.fs-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

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
