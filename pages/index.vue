<template>
  <main class="bg-white text-black">
    <section class="mx-auto flex min-h-[100svh] w-[min(100%,78rem)] flex-col justify-center px-[clamp(0.875rem,4vw,2.5rem)] py-[clamp(5.75rem,10vh,8rem)]">
      <div class="grid gap-[clamp(1.5rem,4vw,3.25rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:items-end">
        <header class="max-w-[min(100%,38rem)]">
          <div class="mb-[clamp(1.25rem,4vw,2.5rem)] flex items-center gap-[clamp(0.75rem,3vw,1.5rem)]">
            <img
              :src="`${baseURL}eg-logo.png`"
              alt="Earth Guardians"
              class="h-[clamp(4rem,12vw,7rem)] w-[clamp(4rem,12vw,7rem)] rounded-full object-cover"
              loading="eager"
            />
            <div>
              <p class="text-[10px] xs:text-xs font-bold uppercase tracking-[0.26em] text-black/60">Earth Guardians</p>
              <p class="mt-1 text-xs xs:text-sm font-semibold text-black">{{ t('home.dataMaps') || 'Data maps' }}</p>
            </div>
          </div>

          <h1 class="text-[clamp(1.75rem,5.5vw,4rem)] font-black leading-[1.1] tracking-normal">
            {{ t('home.title') }}
          </h1>
          <p class="mt-[clamp(1rem,3vw,1.75rem)] max-w-[min(100%,34rem)] text-[clamp(0.9rem,2.2vw,1.2rem)] leading-[1.65] text-black/70">
            {{ t('home.subtitle') }}
          </p>

          <div class="mt-[clamp(1.25rem,4vw,2rem)] grid grid-cols-3 divide-x divide-black border-y border-black text-center">
            <div class="px-0.5 py-[clamp(0.75rem,2vw,1rem)]">
              <p class="text-[clamp(1.1rem,6vw,2rem)] font-black leading-none">{{ projectStats.totalProjects }}</p>
              <p class="mt-0.5 xs:mt-1 text-[9px] xs:text-[11px] font-bold uppercase tracking-[0.16em] xs:tracking-[0.18em] text-black/55">{{ t('home.projectsCount') }}</p>
            </div>
            <div class="px-0.5 py-[clamp(0.75rem,2vw,1rem)]">
              <p class="text-[clamp(1.1rem,6vw,2rem)] font-black leading-none">{{ speciesCount }}</p>
              <p class="mt-0.5 xs:mt-1 text-[9px] xs:text-[11px] font-bold uppercase tracking-[0.16em] xs:tracking-[0.18em] text-black/55">{{ t('home.speciesCount') }}</p>
            </div>
            <div class="px-0.5 py-[clamp(0.75rem,2vw,1rem)]">
              <p class="text-[clamp(1.1rem,6vw,2rem)] font-black leading-none">{{ taxonomicGroupCount }}</p>
              <p class="mt-0.5 xs:mt-1 text-[9px] xs:text-[11px] font-bold uppercase tracking-[0.16em] xs:tracking-[0.18em] text-black/55">{{ t('home.groupsCount') }}</p>
            </div>
          </div>
        </header>

        <div class="grid gap-[clamp(0.75rem,2vw,1rem)]">
          <article
            v-for="dataset in datasets"
            :key="dataset.path"
            class="group grid min-h-[clamp(11rem,30vh,17rem)] overflow-hidden rounded-lg border-2 border-black bg-white transition-transform duration-200 hover:-translate-y-1 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div class="flex min-w-0 flex-col justify-between p-[clamp(0.875rem,3vw,1.75rem)]">
              <div>
                <div class="mb-[clamp(0.75rem,3vw,1.25rem)] flex items-center justify-between gap-3 xs:gap-4">
                  <div class="flex h-[clamp(2.25rem,7vw,3rem)] w-[clamp(2.25rem,7vw,3rem)] shrink-0 items-center justify-center rounded-full border-2 border-black bg-black text-white">
                    <Icon :name="dataset.icon" class="h-5 w-5 xs:h-6 xs:w-6" />
                  </div>
                  <span class="max-w-[60%] truncate rounded-full border border-black px-2 xs:px-3 py-0.5 xs:py-1 text-[10px] xs:text-xs font-black uppercase tracking-[0.16em] xs:tracking-[0.18em]">
                    {{ dataset.label }}
                  </span>
                </div>
                <h2 class="text-[clamp(1.25rem,4vw,2rem)] font-black leading-tight tracking-normal">{{ dataset.title }}</h2>
                <p class="mt-2 xs:mt-3 max-w-[min(100%,40rem)] text-xs xs:text-sm leading-6 text-black/65">{{ dataset.description }}</p>
              </div>

              <div class="mt-4 xs:mt-6 flex flex-wrap gap-1.5 xs:gap-2">
                <span
                  v-for="stat in dataset.stats"
                  :key="stat"
                  class="rounded-md border border-black px-2 xs:px-3 py-1.5 xs:py-2 text-[10px] xs:text-xs font-bold text-black"
                >
                  {{ stat }}
                </span>
              </div>
            </div>

            <div class="flex border-t-2 border-black bg-black text-white sm:w-[clamp(6.25rem,9vw,7rem)] sm:flex-col sm:border-l-2 sm:border-t-0">
              <NuxtLink
                :to="dataset.path"
                class="flex flex-1 items-center justify-center gap-1.5 xs:gap-2 border-r border-white/25 px-3 xs:px-4 py-2.5 xs:py-3 text-[12px] xs:text-sm font-black transition-colors hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black/20 sm:border-b sm:border-r-0"
                :aria-label="dataset.ariaLabel"
              >
                <Icon name="lucide:map" class="h-3.5 w-3.5" />
                <span class="sm:hidden">{{ t('home.2d') || '2D' }}</span>
                <span class="hidden sm:inline">{{ t('home.view2d') }}</span>
              </NuxtLink>
              <NuxtLink
                :to="`${dataset.path}/3d`"
                class="flex flex-1 items-center justify-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2.5 xs:py-3 text-[12px] xs:text-sm font-black transition-colors hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black/20"
              >
                <Icon name="lucide:globe" class="h-3.5 w-3.5" />
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
    const res = await fetch('/data/species/index.json')
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
])
</script>
