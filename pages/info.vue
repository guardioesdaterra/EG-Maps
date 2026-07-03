<template>
  <main class="flex min-h-[100svh] items-center justify-center bg-black section-padding-x py-[max(4.75rem,8vh)] pb-[max(7rem,env(safe-area-inset-bottom))] text-white">
    <section class="w-container-narrow max-h-[calc(100svh-9rem)] overflow-hidden rounded-fluid-lg border-2 border-white bg-white text-black shadow-[0_0_0_1px_#000]">
      <header class="border-b-2 border-black card-padding-lg">
        <div class="flex flex-col gap-fluid sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-[10px] xs:text-xs font-black uppercase tracking-[0.24em] text-black/55">{{ t('home.title') }}</p>
            <h1 class="mt-1.5 xs:mt-2 text-fluid-4xl font-black leading-tight tracking-normal">{{ t('home.title') }}</h1>
            <p class="mt-1.5 xs:mt-2 max-w-[min(100%,44rem)] text-fluid-sm leading-6 text-black/65">{{ t('home.subtitle') }}</p>
          </div>
          <NuxtLink
            to="/"
            class="inline-flex h-10 xs:h-11 shrink-0 items-center justify-center gap-1.5 xs:gap-2 rounded-fluid border-2 border-black px-3 xs:px-4 text-xs xs:text-sm font-black transition-colors hover:bg-black hover:text-white"
          >
            <Icon name="lucide:arrow-left" class="h-4 w-4" />
            <span class="hidden xs:inline">{{ t('info.homeLink') }}</span>
          </NuxtLink>
        </div>
      </header>

      <div class="grid grid-cols-2 border-b-2 border-black sm:grid-cols-4">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="flex min-w-0 items-center justify-center gap-1.5 xs:gap-2 border-b border-r border-black px-2 xs:px-3 py-2.5 xs:py-3 text-[11px] xs:text-sm font-black transition-colors even:border-r-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          :class="activeTab === tab.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'"
          :aria-pressed="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          <Icon :name="tab.icon" class="h-4 w-4" />
          <span class="hidden xs:inline">{{ tab.label }}</span>
        </button>
      </div>

      <div class="max-h-[min(65vh,42rem)] xs:max-h-[min(68vh,42rem)] overflow-y-auto card-padding-lg">
        <section v-if="activeTab === 'overview'" class="grid gap-fluid-lg lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.projectGrants') }} + {{ t('info.endangeredSpecies') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-black/70">
              The app brings Earth Guardians project grant locations and endangered species records into the same map language: searchable points, 2D views, globe views, shared connection lines, and animated particles.
            </p>
          </div>
          <div class="grid min-w-0 grid-cols-2 border-2 border-black text-center">
            <div class="border-b border-r border-black p-3 xs:p-4">
              <p class="text-fluid-3xl font-black leading-none">{{ projectCount }}</p>
              <p class="mt-1 text-[10px] xs:text-[11px] font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.projects') }}</p>
            </div>
            <div class="border-b border-black p-3 xs:p-4">
              <p class="text-fluid-3xl font-black leading-none">{{ speciesCount }}</p>
              <p class="mt-1 text-[10px] xs:text-[11px] font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.speciesLabel') }}</p>
            </div>
            <div class="border-r border-black p-3 xs:p-4">
              <p class="text-fluid-3xl font-black leading-none">{{ taxonomicGroupCount }}</p>
              <p class="mt-1 text-[10px] xs:text-[11px] font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.taxonomicGroups') }}</p>
            </div>
            <div class="p-3 xs:p-4">
              <p class="text-fluid-3xl font-black leading-none">{{ compactBeneficiaries }}</p>
              <p class="mt-1 text-[10px] xs:text-[11px] font-black uppercase tracking-[0.16em] text-black/55">{{ t('home.beneficiariesCount') }}</p>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'grants'" class="grid gap-fluid-lg lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.projectGrants') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-black/70">
              {{ t('info.projectGrantsDesc', { count: projectCount }) }}
            </p>
            <dl class="mt-4 xs:mt-5 grid gap-fluid sm:grid-cols-2">
              <div class="min-w-0 rounded-fluid-lg border-2 border-black p-3 xs:p-4">
                <dt class="text-[10px] xs:text-xs font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.directBeneficiaries') }}</dt>
                <dd class="mt-1.5 xs:mt-2 break-words text-fluid-xl font-black">{{ totalDirectBeneficiaries }}</dd>
              </div>
              <div class="min-w-0 rounded-fluid-lg border-2 border-black p-3 xs:p-4">
                <dt class="text-[10px] xs:text-xs font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.indirectBeneficiaries') }}</dt>
                <dd class="mt-1.5 xs:mt-2 break-words text-fluid-xl font-black">{{ totalIndirectBeneficiaries }}</dd>
              </div>
            </dl>
          </div>
          <div class="flex w-full flex-col gap-2 xs:gap-3 sm:min-w-44 lg:w-auto">
            <NuxtLink to="/project-grants" class="inline-flex items-center justify-center gap-1.5 xs:gap-2 rounded-fluid bg-black px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black text-white">
              <Icon name="lucide:map" class="h-4 w-4" />
              {{ t('info.view2dMap') }}
            </NuxtLink>
            <NuxtLink to="/project-grants/3d" class="inline-flex items-center justify-center gap-1.5 xs:gap-2 rounded-fluid border-2 border-black px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black text-black hover:bg-black hover:text-white">
              <Icon name="lucide:globe" class="h-4 w-4" />
              {{ t('info.view3dGlobe') }}
            </NuxtLink>
          </div>
        </section>

        <section v-else-if="activeTab === 'species'" class="grid gap-fluid-lg lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.endangeredSpecies') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-black/70">
              {{ t('info.endangeredSpeciesDesc', { speciesCount, groupCount: taxonomicGroupCount }) }}
            </p>
            <div class="mt-4 xs:mt-5 flex flex-wrap gap-1.5 xs:gap-2">
              <span
                v-for="group in taxonomicGroups"
                :key="group"
                class="rounded-fluid-lg border-2 border-black chip-fluid font-black"
              >
                {{ group }}
              </span>
            </div>
          </div>
          <div class="flex w-full flex-col gap-2 xs:gap-3 sm:min-w-44 lg:w-auto">
            <NuxtLink to="/endangered-species" class="inline-flex items-center justify-center gap-1.5 xs:gap-2 rounded-fluid bg-black px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black text-white">
              <Icon name="lucide:map" class="h-4 w-4" />
              {{ t('info.view2dMap') }}
            </NuxtLink>
            <NuxtLink to="/endangered-species/3d" class="inline-flex items-center justify-center gap-1.5 xs:gap-2 rounded-fluid border-2 border-black px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black text-black hover:bg-black hover:text-white">
              <Icon name="lucide:globe" class="h-4 w-4" />
              {{ t('info.view3dGlobe') }}
            </NuxtLink>
          </div>
        </section>

        <section v-else-if="activeTab === 'mains'" class="grid gap-fluid-lg lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.mains') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-black/70">{{ t('info.mainsDesc') }}</p>
            <dl class="mt-4 xs:mt-5 grid gap-fluid sm:grid-cols-2">
              <div class="min-w-0 rounded-fluid-lg border-2 border-black p-3 xs:p-4">
                <dt class="text-[10px] xs:text-xs font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.rccLoukaLabel') }}</dt>
                <dd class="mt-1.5 xs:mt-2 break-words font-black">{{ t('info.rccLouka') }}</dd>
              </div>
              <div class="min-w-0 rounded-fluid-lg border-2 border-black p-3 xs:p-4">
                <dt class="text-[10px] xs:text-xs font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.rccTupaLeviLabel') }}</dt>
                <dd class="mt-1.5 xs:mt-2 break-words font-black">{{ t('info.rccTupaLevi') }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section v-else class="grid gap-fluid-lg lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.feedback') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-black/70">
              Share corrections, missing data, or interaction ideas for the maps.
            </p>
            <a
              href="https://www.earthguardians.org/crews"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-4 xs:mt-5 inline-flex items-center gap-1.5 xs:gap-2 rounded-fluid border-2 border-black px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black transition-colors hover:bg-black hover:text-white"
            >
              <Icon name="lucide:users" class="h-4 w-4" />
              {{ t('info.joinUs') }}
            </a>
          </div>

          <form class="space-y-fluid" @submit.prevent="submitFeedback">
            <label class="block">
              <span class="mb-1 block text-[10px] xs:text-xs font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.feedbackName') }}</span>
              <input
                v-model="feedback.name"
                type="text"
                :placeholder="t('info.feedbackNamePlaceholder')"
                class="w-full rounded-fluid-lg border-2 border-black px-2.5 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm text-black placeholder-black/40 focus:outline-none focus:ring-4 focus:ring-black/15"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[10px] xs:text-xs font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.feedbackType') }}</span>
              <select
                v-model="feedback.type"
                class="w-full rounded-fluid-lg border-2 border-black bg-white px-2.5 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm text-black focus:outline-none focus:ring-4 focus:ring-black/15"
              >
                <option value="bug">{{ t('info.bugReport') }}</option>
                <option value="feature">{{ t('info.featureRequest') }}</option>
                <option value="improvement">{{ t('info.improvementSuggestion') }}</option>
                <option value="general">{{ t('info.generalFeedback') }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-[10px] xs:text-xs font-black uppercase tracking-[0.16em] text-black/55">{{ t('info.yourFeedback') }}</span>
              <textarea
                v-model="feedback.message"
                maxlength="2000"
                :placeholder="t('info.feedbackPlaceholder')"
                class="min-h-[clamp(6rem,18vh,11rem)] w-full resize-none rounded-fluid-lg border-2 border-black px-2.5 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm text-black placeholder-black/40 focus:outline-none focus:ring-4 focus:ring-black/15"
                required
              />
            </label>
            <div class="flex items-center justify-between gap-2 xs:gap-3">
              <p class="text-[10px] xs:text-xs font-bold text-black/55">{{ feedback.message.length }}/2000</p>
              <button type="submit" class="rounded-fluid bg-black px-4 xs:px-5 py-2 xs:py-2.5 text-xs xs:text-sm font-black text-white">
                {{ t('info.submitFeedback') }}
              </button>
            </div>
            <p v-if="feedbackSubmitted" class="rounded-fluid-lg border-2 border-black p-2.5 xs:p-3 text-xs xs:text-sm font-black">
              {{ t('info.feedbackSubmitted') }}
            </p>
          </form>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { allProjectsData } from '@/lib/project-data'
import { formatCompact } from '@/lib/utils'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: computed(() => t('info.title')),
  meta: [
    { name: 'description', content: computed(() => t('info.description')) },
    { property: 'og:title', content: computed(() => t('info.title')) },
    { property: 'og:description', content: computed(() => t('info.description')) },
  ],
})

type InfoTab = 'overview' | 'grants' | 'species' | 'mains' | 'feedback'

const activeTab = ref<InfoTab>('overview')
const tabs = computed<Array<{ id: InfoTab; label: string; icon: string }>>(() => [
  { id: 'overview', label: t('info.tabs.overview'), icon: 'lucide:layout-dashboard' },
  { id: 'grants', label: t('info.tabs.grants'), icon: 'lucide:hand-heart' },
  { id: 'species', label: t('info.tabs.species'), icon: 'lucide:bird' },
  { id: 'mains', label: t('info.tabs.mains'), icon: 'lucide:crown' },
  { id: 'feedback', label: t('info.tabs.feedback'), icon: 'lucide:message-square' },
])

const speciesCount = ref(0)
const taxonomicGroups = ref<string[]>([])
const taxonomicGroupCount = ref(0)

const abortController = new AbortController()
onBeforeUnmount(() => abortController.abort())

onMounted(async () => {
  try {
    const res = await fetch(`${baseURL}data/species/index.json`, { signal: abortController.signal })
    if (res.ok) {
      const index = await res.json()
      const datasets = index.datasets ?? []
      let total = 0
      const allGroups = new Set<string>()
      for (const ds of datasets) {
        total += ds.speciesCount ?? 0
        for (const grp of Object.keys(ds.taxonomicGroups ?? {})) {
          allGroups.add(grp)
        }
      }
      speciesCount.value = total
      taxonomicGroups.value = [...allGroups].sort()
      taxonomicGroupCount.value = allGroups.size
    }
  } catch {
    // Species data might not be available
  }
})

const projectCount = computed(() => allProjectsData.length)
const directBeneficiaryCount = computed(() => allProjectsData.reduce((sum, p) => sum + p.direct_beneficiaries, 0))
const indirectBeneficiaryCount = computed(() => allProjectsData.reduce((sum, p) => sum + p.indirect_beneficiaries, 0))
const totalDirectBeneficiaries = computed(() => directBeneficiaryCount.value.toLocaleString())
const totalIndirectBeneficiaries = computed(() => indirectBeneficiaryCount.value.toLocaleString())
const compactBeneficiaries = computed(() => formatCompact(directBeneficiaryCount.value + indirectBeneficiaryCount.value))

const feedback = ref({
  name: '',
  type: 'general',
  message: '',
})

const feedbackSubmitted = ref(false)
let feedbackTimeout: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  if (feedbackTimeout) clearTimeout(feedbackTimeout)
})

function submitFeedback() {
  feedback.value.name = feedback.value.name.trim()
  feedback.value.message = feedback.value.message.trim()

  if (!feedback.value.message) return

  if (typeof window !== 'undefined') {
    try {
      const saved = JSON.parse(localStorage.getItem('eg-maps-feedback') || '[]')
      saved.unshift({ ...feedback.value, submittedAt: new Date().toISOString() })
      localStorage.setItem('eg-maps-feedback', JSON.stringify(saved.slice(0, 20)))
    } catch {
      localStorage.setItem('eg-maps-feedback', JSON.stringify([{ ...feedback.value, submittedAt: new Date().toISOString() }]))
    }
  }

  feedbackSubmitted.value = true
  feedbackTimeout = setTimeout(() => {
    feedbackSubmitted.value = false
    feedback.value = { name: '', type: 'general', message: '' }
  }, 5000)
}
</script>
