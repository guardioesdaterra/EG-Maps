<template>
  <main id="main-content" tabindex="-1" class="min-h-[100svh] bg-[#111] text-white">

    <!-- DARK VEIL BACKGROUND -->
    <div class="fixed inset-0 z-0">
      <ClientOnly>
        <DarkVeil />
      </ClientOnly>
    </div>

    <!-- HERO: half-screen layout -->
    <div class="relative z-10 mx-auto w-full max-w-7xl px-4 pt-10 sm:pt-14">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[70vh]">

        <!-- LEFT: Text + Stats -->
        <div class="flex flex-col justify-center">
          <p class="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/30">
            {{ t('home.subtitle') }}
          </p>
          <h1 class="font-heading text-[clamp(2rem,6vw,4rem)] font-black leading-[1.05] tracking-tight">
            <BlurText
              :text="t('home.ourWork')"
              :delay="120"
              animate-by="words"
              direction="top"
              tag="span"
            />
          </h1>
          <p class="mt-3 max-w-md text-[0.85rem] leading-relaxed text-white/40 sm:text-[0.9rem]">
            <BlurText
              :text="t('home.ourWorkDesc')"
              :delay="200"
              animate-by="words"
              direction="top"
              tag="span"
            />
          </p>

          <!-- Stats -->
          <div ref="heroRef" class="mt-8 flex flex-wrap gap-x-8 gap-y-6 sm:gap-x-12">
            <div v-for="stat in heroStats" :key="stat.label" class="flex flex-col">
              <Counter
                :value="stat.current"
                :places="stat.places"
                :font-size="counterFontSize"
                :padding="4"
                :gap="6"
                text-color="white"
                :font-weight="900"
                :gradient-from="'#111'"
                gradient-to="transparent"
              />
              <span class="mt-1.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white/30">
                {{ stat.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- RIGHT: Carousel -->
        <div class="flex items-center justify-center">
          <ClientOnly>
            <Carousel
              :items="maps"
              :base-width="carouselWidth"
              :autoplay="true"
              :autoplay-delay="3000"
              :pause-on-hover="true"
              :loop="true"
              :round="counterFontSize > 32"
            />
          </ClientOnly>
        </div>

      </div>
    </div>

    <!-- MARQUEE -->
    <section class="relative z-10 overflow-hidden" aria-hidden="true">
      <CurvedLoop
        marquee-text="Welcome to EG-Maps ✦"
        :speed="2"
        :curve-amount="400"
        direction="left"
        :interactive="true"
      />
    </section>

    <!-- CAMPAIGNS AND ACTIONS -->
    <section class="relative z-10 px-4 py-12 sm:py-16">
      <div class="mx-auto w-full max-w-6xl">
        <h2 class="mb-2 text-lg font-bold text-white sm:text-xl">
          {{ t('home.campaignsTitle') }}
        </h2>
        <p class="mb-8 max-w-lg text-sm text-white/40">
          {{ t('home.campaignsDesc') }}
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NuxtLink
            v-for="campaign in campaigns"
            :key="campaign.path"
            :to="campaign.path"
            class="group flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.05] hover:border-white/[0.12]"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex items-center justify-center w-9 h-9 rounded-lg"
                :style="{ background: `${campaign.color}18` }"
              >
                <Icon :name="campaign.icon" class="w-4.5 h-4.5" :style="{ color: campaign.color }" />
              </span>
              <h3 class="text-sm font-semibold text-white">{{ campaign.title }}</h3>
            </div>
            <p class="text-xs leading-relaxed text-white/40">{{ campaign.description }}</p>
            <div class="mt-auto flex gap-2">
              <span
                v-if="campaign.path2d"
                class="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors"
                :style="{ borderColor: `${campaign.color}30`, color: campaign.color, background: `${campaign.color}08` }"
              >
                <Icon name="lucide:map" class="w-2.5 h-2.5" />
                2D
              </span>
              <span
                v-if="campaign.path3d"
                class="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors"
                :style="{ borderColor: `${campaign.color}30`, color: campaign.color, background: `${campaign.color}08` }"
              >
                <Icon name="lucide:globe" class="w-2.5 h-2.5" />
                3D
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- RED BOOK DATABASES -->
    <RedBookDatabases />

    <!-- BOTTOM MARQUEE -->
    <section class="relative z-10 border-t border-white/[0.05] overflow-hidden" aria-hidden="true">
      <CurvedLoop
        marquee-text="YOUTH POWER ✦ ENVIRONMENTAL PROTECTION ✦ CREWS ✦ INDIGENOUS YOUTH ✦"
        :speed="3"
        :curve-amount="500"
        direction="right"
        :interactive="true"
      />
    </section>

    <!-- FOOTER -->
    <footer class="relative z-10 border-t border-white/[0.05] px-4 py-6 text-center sm:py-8">
      <p class="text-[0.65rem] leading-relaxed text-white/20">
        {{ t('home.footer') }}
      </p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import { crewOverallStats } from '@/lib/crew-data'
import type { CarouselItem } from '@/components/Carousel.vue'

const { t } = useI18n()

const counterFontSize = ref(44)
const carouselWidth = ref(500)

/* ── SEO ── */
useHead({
  title: computed(() => `Maps — ${t('home.title')}`),
  meta: [
    { name: 'description', content: computed(() => t('home.ourWorkDesc')) },
    { name: 'keywords', content: 'earth guardians, environmental, endangered species, project grants, climate action, data visualization, interactive maps' },
    { property: 'og:title', content: 'Maps — Earth Guardians' },
    { property: 'og:description', content: computed(() => t('home.ourWorkDesc')) },
    { property: 'og:type', content: 'website' },
  ],
})

/* ── Count-up stats ── */
const heroRef = ref<HTMLElement | null>(null)
const counted = ref(false)

const rawStats = [
  { value: crewOverallStats.totalActiveCrews, label: t('home.activeCrewsCount'), places: [100, 10, 1] as (number | '.')[] },
  { value: crewOverallStats.totalMembers, label: t('home.crewMembersCount'), places: [1000, 100, 10, 1] as (number | '.')[] },
  { value: crewOverallStats.totalCountries, label: t('home.countries'), places: [10, 1] as (number | '.')[] },
]

const sourceValues = rawStats.map(() => ref(0))

const heroStats = computed(() =>
  rawStats.map((s, i) => ({
    current: sourceValues[i].value,
    label: s.label,
    places: s.places,
  }))
)

function startCountUp() {
  if (counted.value) return
  counted.value = true
  rawStats.forEach((s, i) => { sourceValues[i].value = s.value })
}

onMounted(() => {
  counterFontSize.value = window.innerWidth < 640 ? 32 : 44
  carouselWidth.value = window.innerWidth < 640 ? 320 : 500
  if (!heroRef.value) return
  useIntersectionObserver(
    heroRef,
    ([entry]) => { if (entry?.isIntersecting) startCountUp() },
    { threshold: 0.3 },
  )
})

/* ── Maps gallery data ── */
const maps = computed<CarouselItem[]>(() => [
  {
    id: 1,
    path2d: '/project-grants',
    path3d: '/project-grants/3d',
    icon: 'lucide:hand-heart',
    title: t('home.projectGrantsTitle'),
    description: t('home.projectGrantsDesc'),
    color: '#10bfae',
  },
  {
    id: 2,
    path2d: '/endangered-species',
    path3d: '/endangered-species/3d',
    icon: 'lucide:bird',
    title: t('home.speciesTitle'),
    description: t('home.speciesDesc'),
    color: '#22c55e',
  },
  {
    id: 3,
    path2d: '/vulcan-observatory',
    path3d: '/vulcan-observatory/3d',
    icon: 'lucide:microscope',
    title: t('home.observatoryTitle'),
    description: t('home.observatoryDesc'),
    color: '#f59e0b',
  },
  {
    id: 4,
    path: '/active-crews',
    icon: 'lucide:users-round',
    title: t('home.activeCrewsTitle'),
    description: t('home.activeCrewsDesc'),
    color: '#38bdf8',
  },
  {
    id: 5,
    path: '/crew-projects',
    icon: 'lucide:rocket',
    title: t('home.crewProjectsTitle'),
    description: t('home.crewProjectsDesc'),
    color: '#a78bfa',
  },
])

/* ── Campaigns data ── */
const campaigns = computed(() => [
  {
    title: t('home.projectGrantsTitle'),
    description: t('home.projectGrantsDesc'),
    path: '/project-grants',
    path2d: '/project-grants',
    path3d: '/project-grants/3d',
    icon: 'lucide:hand-heart',
    color: '#10bfae',
  },
  {
    title: t('home.speciesTitle'),
    description: t('home.speciesDesc'),
    path: '/endangered-species',
    path2d: '/endangered-species',
    path3d: '/endangered-species/3d',
    icon: 'lucide:bird',
    color: '#22c55e',
  },
  {
    title: t('home.observatoryTitle'),
    description: t('home.observatoryDesc'),
    path: '/vulcan-observatory',
    path2d: '/vulcan-observatory',
    path3d: '/vulcan-observatory/3d',
    icon: 'lucide:microscope',
    color: '#f59e0b',
  },
  {
    title: t('home.activeCrewsTitle'),
    description: t('home.activeCrewsDesc'),
    path: '/active-crews',
    icon: 'lucide:users-round',
    color: '#38bdf8',
  },
  {
    title: t('home.crewProjectsTitle'),
    description: t('home.crewProjectsDesc'),
    path: '/crew-projects',
    icon: 'lucide:rocket',
    color: '#a78bfa',
  },
])
</script>
