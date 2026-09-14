/**
 * pages/info.vue
 * @why Info and feedback page — about the project, team, submission form, FAQ
 * @component info
 * @deps vue (computed, ref, onMounted, onBeforeUnmount); @/lib/project-data (allProjectsData); @/lib/utils (formatCompact)
 */
<template>
  <main id="main-content" tabindex="-1" class="flex min-h-[100svh] items-center justify-center bg-[var(--bg-primary)] section-padding-x py-[max(4.75rem,8vh)] pb-[max(7rem,env(safe-area-inset-bottom))] text-[var(--text-primary)]">
    <section class="w-container-narrow max-h-[calc(100svh-9rem)] overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.06] backdrop-blur-[20px] backdrop-saturate-[1.5] text-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <header class="border-b-2 border-[var(--border-color)] card-padding-lg">
        <div class="flex flex-col gap-fluid sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-[clamp(10px,1.5vw,13px)] xs:text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">{{ t('home.title') }}</p>
            <h1 class="mt-1.5 xs:mt-2 text-fluid-4xl font-black leading-tight tracking-normal">{{ t('home.title') }}</h1>
            <p class="mt-1.5 xs:mt-2 max-w-[min(100%,44rem)] text-fluid-sm leading-6 text-[var(--text-secondary)]">{{ t('home.subtitle') }}</p>
          </div>
          <NuxtLink
            to="/"
            class="inline-flex h-10 xs:h-11 shrink-0 items-center justify-center gap-1.5 xs:gap-2 rounded-fluid border-2 border-[var(--border-color)] px-3 xs:px-4 text-xs xs:text-sm font-black transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)]"
          >
            <Icon name="lucide:arrow-left" class="h-4 w-4" />
            <span class="hidden xs:inline">{{ t('info.homeLink') }}</span>
          </NuxtLink>
        </div>
      </header>

      <div class="grid grid-cols-2 border-b border-white/10 dark:border-white/[0.06] sm:grid-cols-5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="flex min-w-0 items-center justify-center gap-1.5 xs:gap-2 border-b border-r border-[var(--border-color)] px-2 xs:px-3 py-2.5 xs:py-3 text-[clamp(11px,1.6vw,14px)] xs:text-sm font-black transition-colors even:border-r-0 last:col-span-2 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:last:col-span-1"
          :class="activeTab === tab.id ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'"
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
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-[var(--text-secondary)]">
              The app brings Earth Guardians project grant locations and endangered species records into the same map language: searchable points, 2D views, globe views, shared connection lines, and animated particles.
            </p>
          </div>
          <div class="grid min-w-0 grid-cols-2 border border-white/10 dark:border-white/[0.06] text-center">
            <div class="border-b border-r border-[var(--border-color)] p-3 xs:p-4">
              <p class="text-fluid-3xl font-black leading-none">{{ projectCount }}</p>
              <p class="mt-1 text-[clamp(10px,1.5vw,13px)] xs:text-[clamp(11px,1.6vw,14px)] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('info.projects') }}</p>
            </div>
            <div class="border-b border-[var(--border-color)] p-3 xs:p-4">
              <p class="text-fluid-3xl font-black leading-none">{{ speciesCount }}</p>
              <p class="mt-1 text-[clamp(10px,1.5vw,13px)] xs:text-[clamp(11px,1.6vw,14px)] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('info.speciesLabel') }}</p>
            </div>
            <div class="border-r border-[var(--border-color)] p-3 xs:p-4">
              <p class="text-fluid-3xl font-black leading-none">{{ taxonomicGroupCount }}</p>
              <p class="mt-1 text-[clamp(10px,1.5vw,13px)] xs:text-[clamp(11px,1.6vw,14px)] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('info.taxonomicGroups') }}</p>
            </div>
            <div class="p-3 xs:p-4">
              <p class="text-fluid-3xl font-black leading-none">{{ compactBeneficiaries }}</p>
              <p class="mt-1 text-[clamp(10px,1.5vw,13px)] xs:text-[clamp(11px,1.6vw,14px)] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('home.beneficiariesCount') }}</p>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'grants'" class="grid gap-fluid-lg lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.projectGrants') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-[var(--text-secondary)]">
              {{ t('info.projectGrantsDesc', { count: projectCount }) }}
            </p>
            <dl class="mt-4 xs:mt-5 grid gap-fluid sm:grid-cols-2">
              <div class="min-w-0 rounded-fluid-lg border-2 border-[var(--border-color)] p-3 xs:p-4">
                <dt class="text-[clamp(10px,1.5vw,13px)] xs:text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('info.directBeneficiaries') }}</dt>
                <dd class="mt-1.5 xs:mt-2 break-words text-fluid-xl font-black">{{ totalDirectBeneficiaries }}</dd>
              </div>
              <div class="min-w-0 rounded-fluid-lg border-2 border-[var(--border-color)] p-3 xs:p-4">
                <dt class="text-[clamp(10px,1.5vw,13px)] xs:text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('info.indirectBeneficiaries') }}</dt>
                <dd class="mt-1.5 xs:mt-2 break-words text-fluid-xl font-black">{{ totalIndirectBeneficiaries }}</dd>
              </div>
            </dl>
          </div>
          <div class="flex w-full flex-col gap-2 xs:gap-3 sm:min-w-44 lg:w-auto">
            <NuxtLink to="/project-grants" class="inline-flex items-center justify-center gap-1.5 xs:gap-2 rounded-fluid bg-[var(--text-primary)] px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black text-[var(--bg-primary)]">
              <Icon name="lucide:map" class="h-4 w-4" />
              {{ t('info.view2dMap') }}
            </NuxtLink>
            <NuxtLink to="/project-grants/3d" class="inline-flex items-center justify-center gap-1.5 xs:gap-2 rounded-fluid border-2 border-[var(--border-color)] px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)]">
              <Icon name="lucide:globe" class="h-4 w-4" />
              {{ t('info.view3dGlobe') }}
            </NuxtLink>
          </div>
        </section>

        <section v-else-if="activeTab === 'species'" class="grid gap-fluid-lg lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.endangeredSpecies') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-[var(--text-secondary)]">
              {{ t('info.endangeredSpeciesDesc', { speciesCount, groupCount: taxonomicGroupCount }) }}
            </p>
            <div class="mt-4 xs:mt-5 flex flex-wrap gap-1.5 xs:gap-2">
              <span
                v-for="group in taxonomicGroups"
                :key="group"
                class="rounded-fluid-lg border-2 border-[var(--border-color)] chip-fluid font-black"
              >
                {{ group }}
              </span>
            </div>
          </div>
          <div class="flex w-full flex-col gap-2 xs:gap-3 sm:min-w-44 lg:w-auto">
            <NuxtLink to="/endangered-species" class="inline-flex items-center justify-center gap-1.5 xs:gap-2 rounded-fluid bg-[var(--text-primary)] px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black text-[var(--bg-primary)]">
              <Icon name="lucide:map" class="h-4 w-4" />
              {{ t('info.view2dMap') }}
            </NuxtLink>
            <NuxtLink to="/endangered-species/3d" class="inline-flex items-center justify-center gap-1.5 xs:gap-2 rounded-fluid border-2 border-[var(--border-color)] px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)]">
              <Icon name="lucide:globe" class="h-4 w-4" />
              {{ t('info.view3dGlobe') }}
            </NuxtLink>
          </div>
        </section>

        <section v-else-if="activeTab === 'sources'" class="grid gap-fluid-lg">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.sources.title') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-[var(--text-secondary)]">
              {{ t('info.sources.intro') }}
            </p>
          </div>

          <div v-for="group in sourceGroups" :key="group.title">
            <h3 class="text-[clamp(10px,1.5vw,13px)] xs:text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ group.title }}</h3>
            <ul class="mt-2 xs:mt-3 grid gap-fluid sm:grid-cols-2">
              <li
                v-for="item in group.items"
                :key="item.name"
                class="flex min-w-0 flex-col gap-1.5 xs:gap-2 rounded-fluid-lg border-2 border-[var(--border-color)] p-3 xs:p-4"
              >
                <div class="flex flex-wrap items-center gap-1.5 xs:gap-2">
                  <p class="min-w-0 flex-1 break-words text-xs xs:text-sm font-black">{{ item.name }}</p>
                  <span class="shrink-0 rounded-fluid border border-[var(--border-color)] px-1.5 xs:px-2 py-0.5 text-[clamp(9px,1.4vw,11px)] xs:text-[11px] font-black uppercase tracking-[0.08em] text-[var(--text-muted)]">{{ item.license }}</span>
                </div>
                <p class="text-[clamp(10px,1.5vw,13px)] xs:text-xs font-bold text-[var(--text-muted)]">{{ item.publisher }}</p>
                <p class="text-[clamp(10px,1.5vw,13px)] xs:text-xs leading-6 text-[var(--text-secondary)]">{{ item.note }}</p>
                <a
                  v-if="item.url"
                  :href="item.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-auto inline-flex w-fit items-center gap-1 text-[clamp(10px,1.5vw,13px)] xs:text-xs font-black underline underline-offset-2 hover:opacity-80"
                >
                  {{ t('info.sources.openSource') }}
                  <Icon name="lucide:external-link" class="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          <div class="rounded-fluid-lg border-2 border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 xs:p-4">
            <h3 class="flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm font-black">
              <Icon name="lucide:scale" class="h-4 w-4" />
              {{ t('info.sources.reuseTitle') }}
            </h3>
            <ul class="mt-2 xs:mt-3 grid gap-1.5 xs:gap-2 text-[clamp(11px,1.6vw,14px)] xs:text-sm leading-6 text-[var(--text-secondary)]">
              <li><strong class="text-[var(--text-primary)]">Research &amp; education.</strong> Every layer may be reused for non-commercial research and teaching — credit EG-Maps and the original publisher listed above.</li>
              <li><strong class="text-[var(--text-primary)]">Community tools.</strong> Crews and communities may reuse map exports, screenshots, evidence dossiers and field observations for advocacy and territorial monitoring, with source credit.</li>
              <li><strong class="text-[var(--text-primary)]">Mining claims are an investigative aid.</strong> Verify any claim against the official ANM SIGMINE record before legal, administrative or press use — this observatory is not legal advice.</li>
              <li><strong class="text-[var(--text-primary)]">Commercial products.</strong> MapTiler tiles and IUCN Red List data require their own commercial licenses; check each publisher's terms before commercial reuse.</li>
              <li><strong class="text-[var(--text-primary)]">Corrections welcome.</strong> Report missing sources, stale data or wrong attributions via the Feedback tab.</li>
            </ul>
          </div>
        </section>

        <section v-else class="grid gap-fluid-lg lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <div>
            <h2 class="text-fluid-3xl font-black leading-tight">{{ t('info.feedback') }}</h2>
            <p class="mt-2 xs:mt-3 text-fluid-sm leading-7 text-[var(--text-secondary)]">
              Share corrections, missing data, or interaction ideas for the maps.
            </p>
            <a
              href="https://www.earthguardians.org/crews"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-4 xs:mt-5 inline-flex items-center gap-1.5 xs:gap-2 rounded-fluid border-2 border-[var(--border-color)] px-4 xs:px-5 py-2.5 xs:py-3 text-xs xs:text-sm font-black transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)]"
            >
              <Icon name="lucide:users" class="h-4 w-4" />
              {{ t('info.joinUs') }}
            </a>
          </div>

          <form class="space-y-fluid" @submit.prevent="submitFeedback">
            <label class="block">
              <span class="mb-1 block text-[clamp(10px,1.5vw,13px)] xs:text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('info.feedbackName') }}</span>
              <input
                v-model="feedback.name"
                type="text"
                :placeholder="t('info.feedbackNamePlaceholder')"
                class="w-full rounded-fluid-lg border-2 border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--border-color)]"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[clamp(10px,1.5vw,13px)] xs:text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('info.feedbackType') }}</span>
              <select
                v-model="feedback.type"
                class="w-full rounded-fluid-lg border-2 border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--border-color)]"
              >
                <option value="bug">{{ t('info.bugReport') }}</option>
                <option value="feature">{{ t('info.featureRequest') }}</option>
                <option value="improvement">{{ t('info.improvementSuggestion') }}</option>
                <option value="general">{{ t('info.generalFeedback') }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-[clamp(10px,1.5vw,13px)] xs:text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ t('info.yourFeedback') }}</span>
              <textarea
                v-model="feedback.message"
                maxlength="2000"
                :placeholder="t('info.feedbackPlaceholder')"
                class="min-h-[clamp(6rem,18vh,11rem)] w-full resize-none rounded-fluid-lg border-2 border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--border-color)]"
                required
              />
            </label>
            <div class="flex items-center justify-between gap-2 xs:gap-3">
              <p class="text-[clamp(10px,1.5vw,13px)] xs:text-xs font-bold text-[var(--text-muted)]">{{ feedback.message.length }}/2000</p>
              <button type="submit" class="rounded-fluid bg-[var(--text-primary)] px-4 xs:px-5 py-2 xs:py-2.5 text-xs xs:text-sm font-black text-[var(--bg-primary)]">
                {{ t('info.submitFeedback') }}
              </button>
            </div>
            <p v-if="feedbackSubmitted" class="rounded-fluid-lg border-2 border-[var(--border-color)] p-2.5 xs:p-3 text-xs xs:text-sm font-black">
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

type InfoTab = 'overview' | 'grants' | 'species' | 'sources' | 'feedback'

const activeTab = ref<InfoTab>('overview')
const tabs = computed<Array<{ id: InfoTab; label: string; icon: string }>>(() => [
  { id: 'overview', label: t('info.tabs.overview'), icon: 'lucide:layout-dashboard' },
  { id: 'grants', label: t('info.tabs.grants'), icon: 'lucide:hand-heart' },
  { id: 'species', label: t('info.tabs.species'), icon: 'lucide:bird' },
  { id: 'sources', label: t('info.tabs.sources'), icon: 'lucide:database' },
  { id: 'feedback', label: t('info.tabs.feedback'), icon: 'lucide:message-square' },
])

interface SourceItem {
  name: string
  publisher: string
  license: string
  url?: string
  note: string
}

const sourceGroups = computed<Array<{ title: string; items: SourceItem[] }>>(() => [
  {
    title: t('info.sources.observatory'),
    items: [
      { name: 'ANM SIGMINE mining claims', publisher: 'Agência Nacional de Mineração (ANM), Brazil', license: 'Open data · cite ANM', url: 'https://dadosabertos.anm.gov.br/', note: 'Mining process records for the Poços de Caldas region, synced daily from the official open-data dumps and ArcGIS service.' },
      { name: 'Indigenous Lands', publisher: 'FUNAI — Fundação Nacional dos Povos Indígenas', license: 'Open data · attribution', url: 'https://www.gov.br/funai', note: 'Terra Indígena boundaries, simplified for web display.' },
      { name: 'Quilombola territories', publisher: 'INCRA — Instituto Nacional de Colonização e Reforma Agrária', license: 'Open data · attribution', url: 'https://www.gov.br/incra', note: 'Quilombola territory boundaries, simplified for web display.' },
      { name: 'Conservation units', publisher: 'ICMBio / MMA — Instituto Chico Mendes', license: 'Open data · attribution', url: 'https://www.gov.br/icmbio', note: 'Federal protected-area boundaries, simplified for web display.' },
      { name: 'Mapa Cultura agents', publisher: 'Ministry of Culture (MinC), Brazil', license: 'Public registry · attribution', url: 'https://mapa.cultura.gov.br/', note: 'Cultural spaces and agents mapped around the mining region.' },
      { name: 'Floresta Ativista network', publisher: 'Floresta Ativista collective', license: 'Community data · attribution', url: 'https://rede.florestaativista.org/', note: 'Activist and community agents, deduplicated against Mapa Cultura.' },
      { name: 'Water bodies', publisher: 'OpenStreetMap contributors', license: 'ODbL · © OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', note: 'Reservoirs, lakes and rivers, plus EG-Maps mining-pressure analysis (2 km direct pressure / 5 km aquifer watch).' },
    ],
  },
  {
    title: t('info.sources.species'),
    items: [
      { name: 'IUCN Red List', publisher: 'International Union for Conservation of Nature', license: 'Non-commercial research · attribution', url: 'https://www.iucnredlist.org/', note: 'Global threatened-species assessments; commercial reuse needs IUCN permission.' },
      { name: 'Brazilian threatened fauna', publisher: 'ICMBio — Instituto Chico Mendes', license: 'Open data · attribution', url: 'https://www.gov.br/icmbio', note: 'National red-list data for Brazilian species.' },
      { name: 'Species images', publisher: 'Wikimedia Commons contributors', license: 'Per-file CC / public domain', url: 'https://commons.wikimedia.org/', note: 'Freely licensed media — check the file page on Commons for the exact license.' },
    ],
  },
  {
    title: t('info.sources.grants'),
    items: [
      { name: 'Project grants', publisher: 'Earth Guardians crews & staff', license: 'Curated dataset · credit EG', url: 'https://www.earthguardians.org/crews', note: 'Grant locations and beneficiary figures as reported by the crews.' },
    ],
  },
  {
    title: t('info.sources.basemap'),
    items: [
      { name: 'Satellite & hybrid tiles', publisher: 'MapTiler', license: 'Commercial tiles · key required', url: 'https://www.maptiler.com/', note: 'Default basemap; the app falls back to a built-in style when tiles are slow or offline.' },
      { name: 'Map engine', publisher: 'MapLibre GL', license: 'BSD-3 open source', url: 'https://maplibre.org/', note: 'Open-source WebGL map rendering for the 2D maps and 3D globes.' },
      { name: 'EG-Maps app code', publisher: 'Earth Guardians', license: 'ISC open source', note: 'Open-source conservation tooling (see package.json).' },
    ],
  },
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
  } catch { /* ignore */ }
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

  const subject = encodeURIComponent(`EG-Maps Feedback — ${feedback.value.type}`)
  const body = encodeURIComponent(
    `Name: ${feedback.value.name || '(anonymous)'}\nType: ${feedback.value.type}\n\n${feedback.value.message}`
  )
  window.location.href = `mailto:tupa@earthguardians.org?subject=${subject}&body=${body}`

  feedbackSubmitted.value = true
  feedbackTimeout = setTimeout(() => {
    feedbackSubmitted.value = false
    feedback.value = { name: '', type: 'general', message: '' }
  }, 5000)
}

</script>

<style scoped>
/* On phones the card flows with the page instead of nesting fixed-height scrollers */
@media (max-width: 640px) {
  #main-content {
    align-items: flex-start;
    min-height: 100dvh;
  }
  #main-content > section {
    max-height: none;
    overflow: visible;
    margin-bottom: calc(5rem + env(safe-area-inset-bottom));
  }
  #main-content > section > div:last-child {
    max-height: none;
    overflow: visible;
  }
}
</style>
