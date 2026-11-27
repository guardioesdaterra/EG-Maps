import { ref, computed, watch, onMounted } from 'vue'
import type { GrantRecord, ScrapedGrant } from '~/composables/useGrants'
import type { DetailGrantData } from '~/lib/types'
import { useI18n } from '~/composables/useI18n'
import { useSupabaseAuth } from '~/composables/useSupabaseAuth'
import { useHostEmbed } from '~/composables/useHostEmbed'
import { useToast } from '~/composables/useToast'
import { useGrants } from '~/composables/useGrants'

export interface UseGrantsPortalOptions {
  autoSignIn?: boolean
  langToast?: boolean
  showBackground?: boolean
  hashNoDock?: boolean
}

export function useGrantsPortal(opts: UseGrantsPortalOptions = {}) {
  const {
    autoSignIn = true,
    langToast = false,
    showBackground = true,
    hashNoDock = false,
  } = opts

  const { isEmbedded } = useHostEmbed()
  const { t } = useI18n()
  const {
    user,
    isManager,
    isManagerReady,
    managerCheckError,
    retryManagerCheck,
    signIn,
    signInWithNewAccount,
    switchAccount,
    signOut,
    sessionReady,
    autoSignInIfRequested,
    isPostbackTab,
    postbackDone,
  } = useSupabaseAuth()
  const toast = useToast()

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

  const localShowBackground = ref(showBackground)

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
    if (autoSignIn) autoSignInIfRequested()
    if (hashNoDock && typeof window !== 'undefined' && !window.location.hash.includes('no-dock')) {
      history.replaceState(null, '', '#no-dock')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
    if (langToast) {
      setTimeout(() => {
        if (!import.meta.client) return
        try {
          if (localStorage.getItem('langToastSeen')) return
          const { locale, localeNames } = useI18n()
          const name = localeNames[locale.value] || locale.value
          toast.info(`Viewing in ${name}`, 'Need a different language? Click the translation icon in the dock to change.')
          localStorage.setItem('langToastSeen', '1')
        } catch { /* localStorage unavailable */ }
      }, 3000)
    }
  })

  return {
    isEmbedded,
    t,
    user,
    isManager,
    isManagerReady,
    managerCheckError,
    retryManagerCheck,
    signIn,
    signInWithNewAccount,
    switchAccount,
    signOut,
    sessionReady,
    isPostbackTab,
    postbackDone,
    confirmSignOut,
    accessGranted,
    scrapedGrants,
    scrapedLoading,
    commentCounts,
    showCreateGrantModal,
    detailGrant,
    detailUserVote,
    editSavingDetail,
    editErrDetail,
    dashboardSearch,
    showBackground: localShowBackground,
    openScrapedDetail,
    closeGrantDetail,
    loadScrapedGrants,
    openCreateGrantModal,
    closeCreateGrantModal,
    onGrantCreated,
    handleSaveEditFromDetail,
    handleVoteDetail,
    handleSignOut,
  }
}
