/**
 * pages/index.vue
 * @why Landing page — "Our Maps" brand, hero + dataset explorer + red book databases
 * @component index
 * @deps vue (computed, ref, onMounted, onUnmounted); @vueuse/core (useIntersectionObserver, useTransition, usePreferredReducedMotion); @/composables/useBreakpoint (useEGBreakpoints); @/lib/crew-data (crewOverallStats); @/composables/useI18n (useI18n)
 */
<template>
  <main id="main-content" tabindex="-1" class="min-h-[100svh] bg-[#0a0a0a] text-white">

    <!-- ─── HERO ─────────────────────────────────────────────── -->
    <section
      ref="heroRef"
      class="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[clamp(5rem,14vh,8rem)]"
    >
      <!-- bg layers -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="hero-orb hero-orb--teal" />
        <div class="hero-orb hero-orb--purple" />
        <div class="hero-orb hero-orb--green" />
        <div class="hero-grid" />
        <div class="hero-vignette" />
      </div>

      <div class="relative z-10 flex w-full max-w-5xl flex-col items-center gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">

        <!-- left: copy -->
        <header class="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          <div
            v-motion
            :initial="{ opacity: 0, y: 12 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 350 } }"
            class="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.06] px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/60 backdrop-blur-md sm:text-[0.75rem]"
          >
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-eg-teal" />
            {{ t('home.subtitle') }}
          </div>

          <h1
            v-motion
            :initial="{ opacity: 0, y: 16 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 60 } }"
            class="font-heading text-[clamp(2.25rem,8vw,4.5rem)] font-black leading-[1.05] tracking-tight"
          >
            <span class="bg-gradient-to-r from-eg-teal via-cyber-cyan to-cyber-green bg-clip-text text-transparent">{{ t('home.ourWork') }}</span>
          </h1>

          <p
            v-motion
            :initial="{ opacity: 0, y: 14 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 380, delay: 130 } }"
            class="mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/55 sm:text-[1rem]"
          >
            {{ t('home.ourWorkDesc') }}
          </p>

          <!-- stat pills -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 14 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 380, delay: 200 } }"
            class="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
          >
            <div v-for="stat in heroStats" :key="stat.label" class="hero-stat">
              <span class="text-[1.15rem] font-black tabular-nums text-eg-teal">{{ stat.display }}</span>
              <span class="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/40">{{ stat.label }}</span>
            </div>
          </div>

          <!-- CTAs -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 14 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 380, delay: 280 } }"
            class="mt-7 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start"
          >
            <NuxtLink to="/project-grants" class="cta-primary" :aria-label="t('home.ctaGrants')">
              <Icon name="lucide:map" class="h-4 w-4" />
              {{ t('home.ctaGrants') }}
            </NuxtLink>
            <NuxtLink to="/project-grants/3d" class="cta-secondary" :aria-label="t('home.view3d')">
              <Icon name="lucide:globe" class="h-4 w-4" />
              {{ t('home.view3d') }}
            </NuxtLink>
          </div>
        </header>

        <!-- right: decorative globe (lg+ only) -->
        <div
          v-if="isDesktop"
          v-motion
          :initial="{ opacity: 0, scale: 0.92 }"
          :enter="{ opacity: 1, scale: 1, transition: { duration: 600, delay: 200 } }"
          class="pointer-events-none relative aspect-square w-full max-w-[28rem]"
          aria-hidden="true"
        >
          <div class="globe-ring globe-ring--outer" />
          <div class="globe-ring globe-ring--mid" />
          <div class="globe-ring globe-ring--inner" />
          <div class="globe-core" />
          <div v-for="dot in globeDots" :key="dot.id" class="globe-dot" :style="dot.style" />
          <div class="globe-pulse" />
        </div>
      </div>

      <!-- scroll hint -->
      <div
        v-if="!isDesktop"
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 800, duration: 400 } }"
        class="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/25"
      >
        <span class="text-[0.6rem] font-medium uppercase tracking-[0.14em]">{{ t('home.exploreTitle') }}</span>
        <Icon name="lucide:chevrons-down" class="h-5 w-5 animate-bounce" />
      </div>
    </section>

    <!-- ─── EXPLORE ─────────────────────────────────────────── -->
    <section class="relative px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
      <div class="mx-auto max-w-6xl">
        <header class="mb-8 max-w-2xl sm:mb-10">
          <span
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 350 } }"
            class="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-eg-teal/80"
          >
            {{ t('nav.home') }}
          </span>
          <h2
            v-motion
            :initial="{ opacity: 0, y: 14 }"
            :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 380, delay: 60 } }"
            class="font-heading text-[clamp(1.5rem,4vw,2.5rem)] font-black leading-tight tracking-tight"
          >
            {{ t('home.exploreTitle') }}
          </h2>
          <p
            v-motion
            :initial="{ opacity: 0, y: 12 }"
            :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 380, delay: 120 } }"
            class="mt-2 max-w-lg text-[0.875rem] leading-relaxed text-white/45"
          >
            {{ t('home.exploreDesc') }}
          </p>
        </header>

        <!-- mobile: horizontal snap carousel -->
        <div v-if="isMobile" class="relative -mx-4 px-4">
          <div ref="carouselRef" class="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <article
              v-for="(ds, i) in datasets"
              :key="ds.path"
              v-motion
              :initial="{ opacity: 0, x: 30 }"
              :visibleOnce="{ opacity: 1, x: 0, transition: { duration: 380, delay: i * 80 } }"
              class="dataset-card snap-center flex-shrink-0 w-[80vw] max-w-xs"
            >
              <DatasetCard :dataset="ds" />
            </article>
          </div>
          <!-- edge fades -->
          <div class="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent sm:hidden" aria-hidden="true" />
          <div class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent sm:hidden" aria-hidden="true" />
        </div>
        <!-- carousel dots -->
        <div v-if="isMobile" class="mt-3 flex justify-center gap-1.5" role="tablist" :aria-label="t('home.exploreTitle')">
          <span
            v-for="(_, i) in datasets"
            :key="i"
            class="h-1.5 rounded-full transition-all duration-300"
            :class="carouselIndex === i ? 'w-5 bg-eg-teal' : 'w-1.5 bg-white/20'"
            role="tab"
            :aria-selected="carouselIndex === i"
          />
        </div>

        <!-- tablet: 2-col grid -->
        <div v-else-if="!isDesktop" class="grid grid-cols-2 gap-3 sm:gap-4">
          <article
            v-for="(ds, i) in datasets"
            :key="ds.path"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 380, delay: i * 70 } }"
            class="dataset-card"
          >
            <DatasetCard :dataset="ds" />
          </article>
        </div>

        <!-- desktop: bento grid -->
        <div v-else class="bento-grid">
          <article
            v-for="(ds, i) in datasets"
            :key="ds.path"
            v-motion
            :initial="{ opacity: 0, y: 24 }"
            :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 400, delay: i * 80 } }"
            :class="i === 0 ? 'bento-featured' : 'dataset-card'"
          >
            <DatasetCard :dataset="ds" :featured="i === 0" />
          </article>
        </div>
      </div>
    </section>

    <!-- ─── RED BOOK DATABASES ───────────────────────────────── -->
    <RedBookDatabases />

    <!-- ─── FOOTER ──────────────────────────────────────────── -->
    <footer class="border-t border-white/[0.06] px-4 py-6 text-center sm:py-8">
      <p class="text-[0.7rem] leading-relaxed text-white/30">
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
  title: computed(() => `${t('home.ourWork')} — ${t('home.title')}`),
  meta: [
    { name: 'description', content: computed(() => t('home.ourWorkDesc')) },
    { name: 'keywords', content: 'earth guardians, environmental, endangered species, project grants, climate action, data visualization, interactive maps' },
    { property: 'og:title', content: computed(() => t('home.ourWork')) },
    { property: 'og:description', content: computed(() => t('home.ourWorkDesc')) },
    { property: 'og:type', content: 'website' },
  ],
})

/* ── Count-up hero stats ── */
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
  rawStats.forEach((s, i) => {
    sourceValues[i].value = s.value
  })
}

onMounted(() => {
  if (!heroRef.value) return
  useIntersectionObserver(
    heroRef,
    ([entry]) => { if (entry?.isIntersecting) startCountUp() },
    { threshold: 0.3 }
  )
})

/* ── Decorative globe dots (desktop) ── */
const globeDots = computed(() => {
  const positions = [
    { top: '18%', left: '55%' },
    { top: '32%', left: '28%' },
    { top: '48%', left: '70%' },
    { top: '62%', left: '35%' },
    { top: '75%', left: '58%' },
    { top: '25%', left: '72%' },
    { top: '55%', left: '20%' },
  ]
  return positions.map((pos, i) => ({
    id: i,
    style: { ...pos, animationDelay: `${i * 0.8}s` } as Record<string, string>,
  }))
})

/* ── Datasets ── */
interface Dataset {
  path: string
  icon: string
  label: string
  title: string
  description: string
  ariaLabel: string
  stats: string[]
  accent: string
  single?: boolean
  campaignHub?: boolean
  external?: boolean
}

const datasets = computed<Dataset[]>(() => [
  {
    path: '/project-grants',
    icon: 'lucide:hand-heart',
    label: 'Grants',
    title: t('home.projectGrantsTitle'),
    description: t('home.projectGrantsDesc'),
    ariaLabel: 'View Project Grants data visualization',
    accent: 'from-eg-teal/20 to-cyber-cyan/10',
    stats: [
      `$190K+ ${t('home.dispersed')}`,
      `${t('home.120projects')}`,
      `${t('home.300kTrees')}`,
      `${t('home.131crews')}`,
    ],
  },
  {
    path: '/campaigns',
    icon: 'lucide:bird',
    label: 'Campaigns',
    title: t('home.campaignsTitle'),
    description: t('home.campaignsDesc'),
    ariaLabel: 'View Campaigns and Endangered Species',
    accent: 'from-cyber-green/20 to-eg-teal/10',
    campaignHub: true,
    stats: [
      `${t('home.speciesCampaigns')}`,
      `${t('home.globalAction')}`,
    ],
  },
  {
    path: '/active-crews',
    icon: 'lucide:users-round',
    label: 'Crew Projects',
    title: t('home.crewProjectsTitle'),
    description: t('home.crewProjectsDesc'),
    ariaLabel: 'View Crew Projects',
    accent: 'from-cyber-cyan/20 to-eg-sky/10',
    stats: [
      `${t('home.largeScale')}`,
      `${t('home.smallScale')}`,
    ],
    single: true,
  },
  {
    path: '/masterclasses',
    icon: 'lucide:graduation-cap',
    label: 'Masterclasses',
    title: t('home.masterclassesTitle'),
    description: t('home.masterclassesDesc'),
    ariaLabel: 'View Masterclasses',
    accent: 'from-eg-warning/20 to-amber-400/10',
    stats: [
      `${t('home.pastTrainings')}`,
      `${t('home.skillBuilding')}`,
    ],
    single: true,
  },
  {
    path: 'https://www.earthguardians.org/crews',
    icon: 'lucide:rocket',
    label: 'Start a Crew',
    title: t('home.startACrewTitle'),
    description: t('home.startACrewDesc'),
    ariaLabel: 'Start a Crew',
    accent: 'from-cyber-purple/20 to-violet-400/10',
    stats: [
      `${t('home.joinGlobal')}`,
      `${t('home.youthLed')}`,
    ],
    single: true,
    external: true,
  },
])

/* ── Carousel scroll tracking ── */
const carouselRef = ref<HTMLElement | null>(null)
const carouselIndex = ref(0)

function updateCarouselIndex() {
  const el = carouselRef.value
  if (!el) return
  const cardWidth = el.querySelector<HTMLElement>('.dataset-card')?.offsetWidth ?? 280
  carouselIndex.value = Math.round(el.scrollLeft / (cardWidth + 12))
}

onMounted(() => {
  const el = carouselRef.value
  if (!el) return
  el.addEventListener('scroll', updateCarouselIndex, { passive: true })
  onUnmounted(() => el.removeEventListener('scroll', updateCarouselIndex))
})
</script>

<style scoped>
/* ─── Hero orbs ─── */
.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  will-change: transform;
}
.hero-orb--teal {
  width: clamp(18rem, 40vw, 32rem);
  height: clamp(18rem, 40vw, 32rem);
  background: #10bfae;
  top: -8%;
  right: -10%;
  animation: drift 18s ease-in-out infinite alternate;
}
.hero-orb--purple {
  width: clamp(14rem, 30vw, 24rem);
  height: clamp(14rem, 30vw, 24rem);
  background: #a855f7;
  bottom: 5%;
  left: -8%;
  animation: drift 22s ease-in-out infinite alternate-reverse;
}
.hero-orb--green {
  width: clamp(10rem, 22vw, 18rem);
  height: clamp(10rem, 22vw, 18rem);
  background: #10b981;
  top: 40%;
  left: 50%;
  animation: drift 16s ease-in-out infinite alternate;
}

@keyframes drift {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, -20px) scale(1.08); }
}

/* ─── Hero grid ─── */
.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 70%);
}

.hero-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 40%, #0a0a0a 100%);
}

/* ─── Stat pills ─── */
.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  min-width: 5.5rem;
}

/* ─── CTAs ─── */
.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #10bfae, #06b6d4);
  color: #000;
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: all 200ms ease;
  min-height: 2.75rem;
}
.cta-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 0 24px rgba(16,191,174,0.3);
}
.cta-primary:focus-visible {
  outline: 2px solid #10bfae;
  outline-offset: 2px;
}
.cta-primary:active {
  transform: scale(0.97);
}

.cta-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  font-size: 0.8125rem;
  font-weight: 700;
  text-decoration: none;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 200ms ease;
  min-height: 2.75rem;
}
.cta-secondary:hover {
  border-color: rgba(255,255,255,0.2);
  color: #fff;
  background: rgba(255,255,255,0.08);
}
.cta-secondary:focus-visible {
  outline: 2px solid rgba(255,255,255,0.5);
  outline-offset: 2px;
}
.cta-secondary:active {
  transform: scale(0.97);
}

/* ─── Globe decoration ─── */
.globe-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.06);
  will-change: transform;
}
.globe-ring--outer {
  inset: 0;
  animation: spin 40s linear infinite;
}
.globe-ring--mid {
  inset: 12%;
  border-color: rgba(16,191,174,0.12);
  animation: spin 30s linear infinite reverse;
}
.globe-ring--inner {
  inset: 24%;
  border-color: rgba(6,182,212,0.15);
  animation: spin 20s linear infinite;
}
.globe-core {
  position: absolute;
  inset: 35%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16,191,174,0.15), transparent 70%);
  box-shadow: 0 0 60px rgba(16,191,174,0.08);
}
.globe-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10bfae;
  box-shadow: 0 0 10px rgba(16,191,174,0.5);
  animation: pulse-dot 3s ease-in-out infinite;
  will-change: transform, opacity;
}
.globe-pulse {
  position: absolute;
  inset: 35%;
  border-radius: 50%;
  border: 1px solid rgba(16,191,174,0.15);
  animation: ring-pulse 3s ease-out infinite;
  will-change: transform, opacity;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.5); }
}
@keyframes ring-pulse {
  0%   { transform: scale(1);   opacity: 0.3; }
  100% { transform: scale(1.6); opacity: 0; }
}

/* ─── Dataset cards ─── */
.dataset-card {
  border-radius: 1rem;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
  will-change: transform;
}
.dataset-card:hover {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

/* ─── Bento grid (desktop) ─── */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.bento-featured {
  grid-column: span 2;
  border-radius: 1rem;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1);
}
.bento-featured:hover {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

/* ─── Reduced motion ─── */
@media (prefers-reduced-motion: reduce) {
  .hero-orb,
  .globe-ring,
  .globe-dot,
  .globe-pulse {
    animation: none !important;
  }
}
</style>
