/**
 * pages/index.vue
 * @why Landing page — hero section, global stats, featured projects, call-to-action
 * @component index
 * @deps vue (computed, ref, onMounted, onUnmounted); @/lib/project-data (allProjectsData); @/lib/crew-data (crewOverallStats); @/lib/utils (formatCompact)
 */
<template>
  <main class="bg-white dark:bg-[var(--bg-primary)] text-black dark:text-[var(--text-primary)]">
    <section class="mx-auto flex min-h-auto lg:min-h-[100svh] w-container flex-col justify-center px-4 py-8 sm:px-fluid-sm sm:section-padding pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-section">
      <div class="grid gap-fluid-xl lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <header class="max-w-[min(100%,38rem)]">
            <div class="mb-4 sm:mb-fluid-lg flex flex-col items-center text-center">
              <img
                :src="`${baseURL}eg-logo.png`"
                alt="Earth Guardians"
                class="h-[clamp(3rem,18vw,8rem)] w-auto"
                loading="eager"
              />
            </div>

          <h1
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
            class="text-[1.75rem] xs:text-fluid-5xl font-black leading-[1.1] tracking-normal text-center sm:text-left"
          >
            {{ t('home.title') }}
          </h1>
          <p
            v-motion
            :initial="{ opacity: 0, y: 15 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 100 } }"
            class="mt-2 sm:mt-fluid-sm max-w-[min(100%,34rem)] text-[0.95rem] xs:text-fluid-lg leading-[1.6] text-black/70 dark:text-[var(--text-secondary)] text-center sm:text-left"
          >
            {{ t('home.subtitle') }}
          </p>

          <div
            v-motion
            :initial="{ opacity: 0, y: 15 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 200 } }"
            class="mt-4 sm:mt-fluid-md grid grid-cols-3 gap-1.5 sm:gap-2 border-y border-black dark:border-[var(--border-color)] text-center"
          >
            <div class="py-2.5 sm:py-fluid-sm">
              <p class="text-[1.25rem] sm:text-fluid-3xl font-black leading-none">{{ crewOverallStats.totalActiveCrews }}</p>
              <p class="mt-0.5 text-[clamp(10px,1.5vw,13px)] xs:text-[clamp(11px,1.6vw,14px)] sm:text-[clamp(12px,1.8vw,15px)] font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)]">{{ t('home.crewsCount') }}</p>
            </div>
            <div class="py-2.5 sm:py-fluid-sm">
              <p class="text-[1.25rem] sm:text-fluid-3xl font-black leading-none">{{ projectStats.totalProjects }}</p>
              <p class="mt-0.5 text-[clamp(10px,1.5vw,13px)] xs:text-[clamp(11px,1.6vw,14px)] sm:text-[clamp(12px,1.8vw,15px)] font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)]">{{ t('home.projectsCount') }}</p>
            </div>
            <div class="py-2.5 sm:py-fluid-sm">
              <p class="text-[1.25rem] sm:text-fluid-3xl font-black leading-none">{{ speciesCount }}</p>
              <p class="mt-0.5 text-[clamp(10px,1.5vw,13px)] xs:text-[clamp(11px,1.6vw,14px)] sm:text-[clamp(12px,1.8vw,15px)] font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)]">{{ t('home.speciesCount') }}</p>
            </div>
          </div>
        </header>

        <div class="grid gap-2.5 sm:gap-fluid">
          <article
            v-for="(dataset, index) in datasets"
            :key="dataset.path"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 150 + index * 100 } }"
            class="group flex flex-col overflow-hidden rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div class="flex min-w-0 flex-col justify-between px-3.5 py-3 sm:card-padding">
              <div>
                <div class="mb-2 sm:mb-fluid flex items-center justify-between gap-2 xs:gap-3">
                  <div class="flex h-[clamp(2rem,6vw,2.5rem)] w-[clamp(2rem,6vw,2.5rem)] shrink-0 items-center justify-center rounded-full border-2 border-black bg-black dark:bg-[var(--text-primary)] text-white dark:text-black">
                    <Icon :name="dataset.icon" class="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <span class="max-w-[60%] truncate rounded-full border border-black dark:border-[var(--border-color)] px-2 py-0.5 sm:chip-fluid text-[clamp(10px,1.5vw,13px)] sm:text-[clamp(11px,1.6vw,14px)] font-black uppercase tracking-[0.16em]">
                    {{ dataset.label }}
                  </span>
                </div>
                <h2 class="text-[1.15rem] xs:text-fluid-2xl font-black leading-tight tracking-normal">{{ dataset.title }}</h2>
                <p class="mt-1 xs:mt-1.5 max-w-[min(100%,40rem)] text-[0.8rem] xs:text-fluid-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ dataset.description }}</p>
              </div>

              <div class="mt-2 sm:mt-fluid-xs flex flex-wrap gap-1 xs:gap-1.5">
                <span
                  v-for="stat in dataset.stats"
                  :key="stat"
                  class="rounded-fluid border border-black dark:border-[var(--border-color)] px-1.5 py-0.5 sm:chip-fluid text-[clamp(10px,1.5vw,13px)] sm:text-[clamp(11px,1.6vw,14px)] font-bold text-black dark:text-[var(--text-primary)]"
                >
                  {{ stat }}
                </span>
              </div>
            </div>

            <div class="flex border-t-2 border-black dark:border-[var(--border-color)]">
              <NuxtLink
                :to="dataset.path"
                class="flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-3 py-2.5 sm:py-2 text-xs sm:text-xs font-black transition-colors bg-black dark:bg-[var(--text-primary)] text-white dark:text-black hover:bg-white dark:hover:bg-[var(--bg-primary)] hover:text-black dark:hover:text-[var(--text-primary)] focus:outline-none focus:ring-4 focus:ring-black/20 dark:focus:ring-[var(--text-primary)]/20 active:scale-[0.97]"
                :class="!dataset.single && 'border-r border-white/25 dark:border-[var(--border-color)]'"
                :aria-label="dataset.ariaLabel"
              >
                <Icon :name="dataset.single ? 'lucide:arrow-right' : 'lucide:map'" class="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                <span>{{ dataset.single ? 'Open' : (t('home.2d') || '2D') }}</span>
              </NuxtLink>
              <NuxtLink
                v-if="!dataset.single"
                :to="`${dataset.path}/3d`"
                class="flex flex-1 items-center justify-center gap-1.5 min-h-[44px] px-3 py-2.5 sm:py-2 text-xs sm:text-xs font-black transition-colors bg-black dark:bg-[var(--text-primary)] text-white dark:text-black hover:bg-white dark:hover:bg-[var(--bg-primary)] hover:text-black dark:hover:text-[var(--text-primary)] focus:outline-none focus:ring-4 focus:ring-black/20 dark:focus:ring-[var(--text-primary)]/20 active:scale-[0.97]"
              >
                <Icon name="lucide:globe" class="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                <span>{{ t('home.3d') || '3D' }}</span>
              </NuxtLink>
            </div>
          </article>
        </div>
      </div>
    </section>

    <RedBookDatabases />
  </main>
</template>

<script setup lang="ts">

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { allProjectsData } from '@/lib/project-data'
import { crewOverallStats } from '@/lib/crew-data'
import { formatCompact } from '@/lib/utils'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: computed(() => `${t('home.title')} - ${t('home.subtitle')}`),
  meta: [
    { name: 'description', content: computed(() => t('home.projectGrantsDesc')) },
    { name: 'keywords', content: 'earth guardians, environmental, endangered species, project grants, climate action, data visualization' },
    { property: 'og:title', content: computed(() => t('home.title')) },
    { property: 'og:description', content: computed(() => t('home.projectGrantsDesc')) },
    { property: 'og:type', content: 'website' },
  ],
})

const speciesCount = ref(0)
const taxonomicGroupCount = ref(0)

const abortController = new AbortController()
onUnmounted(() => abortController.abort())

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
      taxonomicGroupCount.value = allGroups.size
    }
  } catch {
  }
})

const projectStats = computed(() => {
  const totalProjects = allProjectsData.length
  const totalDirectBeneficiaries = allProjectsData.reduce((sum, p) => sum + p.direct_beneficiaries, 0)
  const totalIndirectBeneficiaries = allProjectsData.reduce((sum, p) => sum + p.indirect_beneficiaries, 0)

  return {
    totalProjects,
    totalDirectBeneficiaries,
    totalIndirectBeneficiaries,
  }
})

const datasets = computed(() => [
  {
    path: '/project-grants',
    icon: 'lucide:hand-heart',
    label: 'Grants',
    title: t('home.projectGrantsTitle'),
    description: t('home.projectGrantsDesc'),
    ariaLabel: 'View Project Grants data visualization',
    stats: [
      `${projectStats.value.totalProjects} ${t('home.projectsCount')}`,
      `${formatCompact(projectStats.value.totalDirectBeneficiaries + projectStats.value.totalIndirectBeneficiaries)}+ ${t('home.beneficiariesCount')}`,
    ],
  },
  {
    path: '/endangered-species',
    icon: 'lucide:bird',
    label: 'Species',
    title: t('home.speciesTitle'),
    description: t('home.speciesDesc'),
    ariaLabel: 'View Endangered Species data visualization',
    stats: [
      `${speciesCount.value} ${t('home.speciesCount')}`,
      `${taxonomicGroupCount.value} ${t('home.groupsCount')}`,
    ],
  },
  {
    path: '/vulcan-observatory',
    icon: 'lucide:microscope',
    label: 'Vulcan',
    title: t('home.observatoryTitle'),
    description: t('home.observatoryDesc'),
    ariaLabel: 'View Observatory of Vulcan data visualization',
    stats: [
      '20K+ mining processes',
      '6 categories',
    ],
  },
  {
    path: '/active-crews',
    icon: 'lucide:users-round',
    label: 'Crews',
    title: t('home.activeCrewsTitle'),
    description: t('home.activeCrewsDesc'),
    ariaLabel: 'View Active Crews data visualization',
    stats: [
      `${crewOverallStats.totalActiveCrews} ${t('home.activeCrewsCount')}`,
      `${crewOverallStats.totalMembers.toLocaleString()}+ ${t('home.crewMembersCount')}`,
    ],
  },
  {
    path: '/eg-grants',
    icon: 'lucide:hand-heart',
    label: 'EG Grants',
    title: 'EG Grants',
    description: 'Worldwide socio-environmental grants. Sign in to submit or review.',
    ariaLabel: 'Open EG Grants app',
    stats: ['Submit & Review', 'Crew Access'],
    single: true,
  },
])

</script>
