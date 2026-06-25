<template>
  <main class="bg-white text-black">
    <section class="mx-auto flex h-[100svh] w-container flex-col justify-center overflow-hidden section-padding">
      <div class="grid gap-fluid-xl lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:items-center">
        <header class="max-w-[min(100%,38rem)]">
            <div class="mb-fluid-lg flex flex-col items-center text-center">
              <img
                :src="`${baseURL}eg-logo.png`"
                alt="Earth Guardians"
                class="h-[clamp(4rem,14vw,8rem)] w-auto"
                loading="eager"
              />
            </div>

          <h1 class="text-fluid-5xl font-black leading-[1.1] tracking-normal">
            {{ t('home.title') }}
          </h1>
          <p class="mt-fluid-sm max-w-[min(100%,34rem)] text-fluid-lg leading-[1.6] text-black/70">
            {{ t('home.subtitle') }}
          </p>

          <div class="mt-fluid-md grid grid-cols-3 divide-x divide-black border-y border-black text-center">
            <div class="px-0.5 py-fluid-sm">
              <p class="text-fluid-3xl font-black leading-none">{{ projectStats.totalProjects }}</p>
              <p class="mt-0.5 text-[8px] xs:text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">{{ t('home.projectsCount') }}</p>
            </div>
            <div class="px-0.5 py-fluid-sm">
              <p class="text-fluid-3xl font-black leading-none">{{ speciesCount }}</p>
              <p class="mt-0.5 text-[8px] xs:text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">{{ t('home.speciesCount') }}</p>
            </div>
            <div class="px-0.5 py-fluid-sm">
              <p class="text-fluid-3xl font-black leading-none">{{ taxonomicGroupCount }}</p>
              <p class="mt-0.5 text-[8px] xs:text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">{{ t('home.groupsCount') }}</p>
            </div>
          </div>
        </header>

        <div class="grid gap-fluid">
          <article
            v-for="dataset in datasets"
            :key="dataset.path"
            class="group grid min-h-[clamp(7rem,20vh,11rem)] overflow-hidden rounded-fluid-lg border-2 border-black bg-white transition-transform duration-200 hover:-translate-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div class="flex min-w-0 flex-col justify-between card-padding">
              <div>
                <div class="mb-fluid flex items-center justify-between gap-2 xs:gap-3">
                  <div class="flex h-[clamp(1.75rem,5vw,2.5rem)] w-[clamp(1.75rem,5vw,2.5rem)] shrink-0 items-center justify-center rounded-full border-2 border-black bg-black text-white">
                    <Icon :name="dataset.icon" class="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <span class="max-w-[60%] truncate rounded-full border border-black chip-fluid font-black uppercase tracking-[0.16em]">
                    {{ dataset.label }}
                  </span>
                </div>
                <h2 class="text-fluid-2xl font-black leading-tight tracking-normal">{{ dataset.title }}</h2>
                <p class="mt-1 xs:mt-1.5 max-w-[min(100%,40rem)] text-fluid-xs leading-5 text-black/65">{{ dataset.description }}</p>
              </div>

              <div class="mt-fluid-xs flex flex-wrap gap-1 xs:gap-1.5">
                <span
                  v-for="stat in dataset.stats"
                  :key="stat"
                  class="rounded-fluid border border-black chip-fluid font-bold text-black"
                >
                  {{ stat }}
                </span>
              </div>
            </div>

            <div class="flex border-t-2 border-black bg-black text-white sm:w-[clamp(5rem,8vw,6.5rem)] sm:flex-col sm:border-l-2 sm:border-t-0">
              <NuxtLink
                :to="dataset.path"
                class="flex flex-1 items-center justify-center gap-1 border-r border-white/25 px-2.5 xs:px-3 py-2 text-[11px] xs:text-xs font-black transition-colors hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black/20 sm:border-b sm:border-r-0"
                :aria-label="dataset.ariaLabel"
              >
                <Icon name="lucide:map" class="h-3 w-3" />
                <span class="sm:hidden">{{ t('home.2d') || '2D' }}</span>
                <span class="hidden sm:inline">{{ t('home.view2d') }}</span>
              </NuxtLink>
              <NuxtLink
                :to="`${dataset.path}/3d`"
                class="flex flex-1 items-center justify-center gap-1 px-2.5 xs:px-3 py-2 text-[11px] xs:text-xs font-black transition-colors hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black/20"
              >
                <Icon name="lucide:globe" class="h-3 w-3" />
                <span class="sm:hidden">{{ t('home.3d') || '3D' }}</span>
                <span class="hidden sm:inline">{{ t('home.view3d') }}</span>
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
import { computed, ref, onMounted } from 'vue'
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

onMounted(async () => {
  try {
    const res = await fetch(`${baseURL}data/species/index.json`)
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
    // Species data might not be available
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
    path: '/observatory-of-vulcan',
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
])
</script>
