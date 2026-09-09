<template>
  <main id="main-content" tabindex="-1" class="min-h-[100svh] bg-[#111] text-white">

    <!-- HERO -->
    <section ref="heroRef" class="relative min-h-[100svh] px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[clamp(3.5rem,10vh,5rem)]">
      <div class="mx-auto w-full max-w-6xl">

        <!-- Title -->
        <header class="mb-8 max-w-xl sm:mb-10">
          <p class="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/30">
            {{ t('home.subtitle') }}
          </p>
          <h1 class="font-heading text-[clamp(2.2rem,8vw,4.5rem)] font-black leading-[1.05] tracking-tight">
            {{ t('home.ourWork') }}
          </h1>
          <p class="mt-2 max-w-md text-[0.85rem] leading-relaxed text-white/40 sm:text-[0.9rem]">
            {{ t('home.ourWorkDesc') }}
          </p>

          <!-- Stats -->
          <div class="mt-5 flex gap-5 sm:gap-7">
            <div v-for="stat in heroStats" :key="stat.label" class="flex items-baseline gap-1.5">
              <span class="text-[1.05rem] font-black tabular-nums text-white">{{ stat.display }}</span>
              <span class="text-[0.6rem] font-medium text-white/30">{{ stat.label }}</span>
            </div>
          </div>
        </header>

        <!-- Map Gallery -->
        <div>
          <!-- Mobile: snap carousel -->
          <div v-if="isMobile" class="relative -mx-4 px-4">
            <div
              ref="carouselRef"
              class="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <NuxtLink
                v-for="map in maps"
                :key="map.path"
                :to="map.path"
                :target="map.external ? '_blank' : undefined"
                :rel="map.external ? 'noopener noreferrer' : undefined"
                class="snap-center flex-shrink-0 w-[82vw] max-w-[20rem] rounded-xl border border-white/[0.06] bg-[#1a1a1a] overflow-hidden transition-colors duration-200 hover:border-white/[0.12] active:scale-[0.98]"
                :aria-label="map.ariaLabel"
              >
                <div class="relative h-[clamp(7rem,22vw,10rem)] bg-[#191919]">
                  <div class="absolute bottom-3 left-3">
                    <Icon :name="map.icon" class="h-5 w-5 text-white/20" />
                  </div>
                  <div
                    class="absolute bottom-3 right-3 h-1.5 w-1.5 rounded-full"
                    :style="{ background: map.color, opacity: 0.5 }"
                  />
                </div>
                <div class="p-3.5">
                  <div class="flex items-center gap-2">
                    <span class="text-[0.85rem] font-bold text-white">{{ map.title }}</span>
                    <Icon name="lucide:arrow-right" class="h-3 w-3 text-white/20" />
                  </div>
                  <p class="mt-1 text-[0.7rem] leading-snug text-white/35">{{ map.description }}</p>
                </div>
              </NuxtLink>
            </div>
            <!-- Edge fades -->
            <div class="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#111] to-transparent" aria-hidden="true" />
            <div class="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#111] to-transparent" aria-hidden="true" />
          </div>

          <!-- Carousel dots -->
          <div v-if="isMobile" class="mt-3 flex justify-center gap-1.5">
            <span
              v-for="(_, i) in maps"
              :key="i"
              class="h-1 rounded-full transition-all duration-300"
              :class="carouselIndex === i ? 'w-4 bg-white/50' : 'w-1 bg-white/10'"
            />
          </div>

          <!-- Tablet: 3-col grid -->
          <div v-else-if="!isDesktop" class="grid grid-cols-3 gap-3">
            <NuxtLink
              v-for="map in maps"
              :key="map.path"
              :to="map.path"
              :target="map.external ? '_blank' : undefined"
              :rel="map.external ? 'noopener noreferrer' : undefined"
              class="rounded-xl border border-white/[0.06] bg-[#1a1a1a] overflow-hidden transition-colors duration-200 hover:border-white/[0.12]"
              :aria-label="map.ariaLabel"
            >
              <div class="relative h-[clamp(6rem,16vw,8rem)] bg-[#191919]">
                <Icon :name="map.icon" class="absolute bottom-2.5 left-2.5 h-4 w-4 text-white/20" />
              </div>
              <div class="p-3">
                <span class="text-[0.78rem] font-bold text-white">{{ map.title }}</span>
                <p class="mt-0.5 text-[0.65rem] leading-snug text-white/35">{{ map.description }}</p>
              </div>
            </NuxtLink>
          </div>

          <!-- Desktop: row -->
          <div v-else class="grid grid-cols-5 gap-3">
            <NuxtLink
              v-for="map in maps"
              :key="map.path"
              :to="map.path"
              :target="map.external ? '_blank' : undefined"
              :rel="map.external ? 'noopener noreferrer' : undefined"
              class="rounded-xl border border-white/[0.06] bg-[#1a1a1a] overflow-hidden transition-colors duration-200 hover:border-white/[0.12] hover:-translate-y-0.5"
              :aria-label="map.ariaLabel"
            >
              <div class="relative h-[clamp(6rem,14vw,8rem)] bg-[#191919]">
                <Icon :name="map.icon" class="absolute bottom-2.5 left-2.5 h-4 w-4 text-white/20" />
                <div
                  class="absolute bottom-2.5 right-2.5 h-1.5 w-1.5 rounded-full"
                  :style="{ background: map.color, opacity: 0.4 }"
                />
              </div>
              <div class="p-3">
                <span class="text-[0.78rem] font-bold text-white">{{ map.title }}</span>
                <p class="mt-0.5 text-[0.65rem] leading-snug text-white/35">{{ map.description }}</p>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- RED BOOK DATABASES -->
    <RedBookDatabases />

    <!-- FOOTER -->
    <footer class="border-t border-white/[0.05] px-4 py-6 text-center sm:py-8">
      <p class="text-[0.65rem] leading-relaxed text-white/20">
        {{ t('home.footer') }}
      </p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useIntersectionObserver, useTransition, usePreferredReducedMotion } from '@vueuse/core'
import { crewOverallStats } from '@/lib/crew-data'
import { useEGBreakpoints } from '@/composables/useBreakpoint'

const { t } = useI18n()
const { isMobile, isDesktop } = useEGBreakpoints()
const prefersReduced = usePreferredReducedMotion()

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
  { value: crewOverallStats.totalActiveCrews, label: t('home.activeCrewsCount') },
  { value: crewOverallStats.totalMembers, label: t('home.crewMembersCount') },
  { value: crewOverallStats.totalCountries, label: t('home.countries') },
]

const sourceValues = rawStats.map(() => ref(0))
const displayValues = rawStats.map((_, i) =>
  useTransition(sourceValues[i], {
    duration: 1400,
    transition: (n: number) => 1 - Math.pow(1 - n, 3),
  })
)

const heroStats = computed(() =>
  rawStats.map((s, i) => ({
    display: prefersReduced.value ? String(s.value) : String(Math.round(displayValues[i].value)),
    label: s.label,
  }))
)

function startCountUp() {
  if (counted.value) return
  counted.value = true
  rawStats.forEach((s, i) => { sourceValues[i].value = s.value })
}

onMounted(() => {
  if (!heroRef.value) return
  useIntersectionObserver(
    heroRef,
    ([entry]) => { if (entry?.isIntersecting) startCountUp() },
    { threshold: 0.3 },
  )
})

/* ── Maps gallery data ── */
interface MapItem {
  path: string
  icon: string
  title: string
  description: string
  ariaLabel: string
  color: string
  external?: boolean
}

const maps = computed<MapItem[]>(() => [
  {
    path: '/project-grants',
    icon: 'lucide:hand-heart',
    title: t('home.projectGrantsTitle'),
    description: t('home.projectGrantsDesc'),
    ariaLabel: 'Open Project Grants map',
    color: '#10bfae',
  },
  {
    path: '/endangered-species',
    icon: 'lucide:bird',
    title: t('home.speciesTitle'),
    description: t('home.speciesDesc'),
    ariaLabel: 'Open Endangered Species map',
    color: '#22c55e',
  },
  {
    path: '/vulcan-observatory',
    icon: 'lucide:microscope',
    title: t('home.observatoryTitle'),
    description: t('home.observatoryDesc'),
    ariaLabel: 'Open Observatory of Vulcan map',
    color: '#f59e0b',
  },
  {
    path: '/active-crews',
    icon: 'lucide:users-round',
    title: t('home.activeCrewsTitle'),
    description: t('home.activeCrewsDesc'),
    ariaLabel: 'Open Active Crews map',
    color: '#38bdf8',
  },
  {
    path: '/crew-projects',
    icon: 'lucide:rocket',
    title: t('home.crewProjectsTitle'),
    description: t('home.crewProjectsDesc'),
    ariaLabel: 'Open Crew Projects map',
    color: '#a78bfa',
  },
])

/* ── Carousel tracking ── */
const carouselRef = ref<HTMLElement | null>(null)
const carouselIndex = ref(0)

function updateCarouselIndex() {
  const el = carouselRef.value
  if (!el) return
  const card = el.querySelector<HTMLElement>('.snap-center')
  if (!card) return
  carouselIndex.value = Math.round(el.scrollLeft / (card.offsetWidth + 12))
}

onMounted(() => {
  const el = carouselRef.value
  if (!el) return
  el.addEventListener('scroll', updateCarouselIndex, { passive: true })
  onUnmounted(() => el.removeEventListener('scroll', updateCarouselIndex))
})
</script>
