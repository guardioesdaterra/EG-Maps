<template>
  <main id="main-content" class="home-shell">
    <div class="home-atmosphere" aria-hidden="true">
      <div class="home-noise" :style="{ backgroundImage: `url('${baseURL}noise.png')` }" />
      <div class="home-orbit home-orbit-one" />
      <div class="home-orbit home-orbit-two" />
      <div class="home-glow home-glow-one" />
      <div class="home-glow home-glow-two" />
    </div>

    <div class="relative z-10">
      <nav class="home-topbar" aria-label="Primary navigation">
        <NuxtLink to="/" class="home-brand" aria-label="EG-Maps home">
          <span class="home-brand-mark">
            <img :src="`${baseURL}eg-logo.png`" alt="" />
          </span>
          <span class="hidden xs:flex flex-col">
            <span class="home-brand-name">EG–Maps</span>
            <span class="home-brand-meta">Open field intelligence</span>
          </span>
        </NuxtLink>

        <div class="flex items-center gap-1.5 xs:gap-2">
          <NuxtLink to="/info" class="home-top-link hidden sm:inline-flex">
            <Icon name="lucide:info" class="h-3.5 w-3.5" />
            About
          </NuxtLink>
          <button
            type="button"
            class="home-icon-button"
            :aria-label="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
            @click="toggleDarkMode"
          >
            <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="h-4 w-4" />
          </button>
        </div>
      </nav>

      <!-- ── Hero ── -->
      <section class="home-hero home-container">
        <div class="home-hero-copy">
          <div class="home-kicker">
            <span class="home-kicker-dot" />
            <span>Earth Guardians / interactive field atlas</span>
          </div>
          <h1 class="home-title home-animate-in">
            EG–Maps<span class="home-title-mark">.</span>
          </h1>
          <p class="home-lede home-animate-in home-animate-in-delay">
            Four interactive maps tracking environmental action worldwide — project grants, endangered species, rare earth extraction and active crews.
          </p>
          <div class="home-signal-line">
            <span>Built for attention</span>
            <span class="home-signal-line-rule" />
            <span>Designed for action</span>
          </div>
        </div>
      </section>

      <!-- ── Map Carousel ── -->
      <section class="home-container" aria-label="Interactive map selector">
        <div
          class="map-carousel__track"
          ref="carouselTrack"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <article
            v-for="(dataset, index) in datasets"
            :key="dataset.path"
            class="map-carousel__card"
            :class="{ 'is-active': activeSlide === index }"
            :style="{ '--card-accent': dataset.accent }"
            @click="activeSlide = index"
          >
            <div class="map-carousel__card-glow" />
            <div class="map-carousel__card-inner">
              <div class="map-carousel__card-head">
                <span class="map-carousel__card-badge" :style="{ background: dataset.accent + '18', color: dataset.accent }">
                  {{ dataset.label }}
                </span>
                <span class="map-carousel__card-index">0{{ index + 1 }}</span>
              </div>
              <div class="map-carousel__card-icon">
                <Icon :name="dataset.icon" />
              </div>
              <h2 class="map-carousel__card-title">{{ dataset.title }}</h2>
              <p class="map-carousel__card-desc">{{ dataset.description }}</p>
              <div class="map-carousel__card-stats">
                <div v-for="stat in dataset.stats" :key="stat.label" class="map-carousel__card-stat">
                  <strong :style="{ color: dataset.accent }">{{ stat.value }}</strong>
                  <span>{{ stat.label }}</span>
                </div>
              </div>
              <div class="map-carousel__card-actions">
                <NuxtLink :to="dataset.path" class="map-carousel__cta" :aria-label="dataset.ariaLabel">
                  <span>Open 2D map</span>
                  <Icon name="lucide:arrow-up-right" class="h-4 w-4" />
                </NuxtLink>
                <NuxtLink :to="`${dataset.path}/3d`" class="map-carousel__cta map-carousel__cta--ghost" :aria-label="`${dataset.title} 3D globe`">
                  <Icon name="lucide:globe" class="h-3.5 w-3.5" />
                  <span>3D Globe</span>
                </NuxtLink>
              </div>
            </div>
          </article>
        </div>

        <div class="map-carousel__controls">
          <button
            type="button"
            class="map-carousel__nav-btn"
            :disabled="activeSlide === 0"
            aria-label="Previous map"
            @click="prevSlide"
          >
            <Icon name="lucide:chevron-left" class="h-5 w-5" />
          </button>
          <div class="map-carousel__dots">
            <button
              v-for="(_, idx) in datasets"
              :key="idx"
              type="button"
              class="map-carousel__dot"
              :class="{ 'is-active': activeSlide === idx }"
              :aria-label="`Go to ${datasets[idx].title}`"
              @click="activeSlide = idx"
            />
          </div>
          <button
            type="button"
            class="map-carousel__nav-btn"
            :disabled="activeSlide === datasets.length - 1"
            aria-label="Next map"
            @click="nextSlide"
          >
            <Icon name="lucide:chevron-right" class="h-5 w-5" />
          </button>
        </div>

        <p class="map-carousel__hint">
          <Icon name="lucide:move-horizontal" class="h-3.5 w-3.5" />
          Drag or use arrows to explore all maps
        </p>
      </section>

      <!-- ── Stats ── -->
      <section class="home-container home-telemetry" aria-label="Atlas coverage">
        <div class="telemetry-grid">
          <div v-for="stat in overviewStats" :key="stat.label" class="telemetry-stat">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </section>

      <footer class="home-container home-footer">
        <div class="home-footer-brand">
          <span class="home-footer-mark">EG</span>
          <span>{{ t('home.footer') }}</span>
        </div>
        <span class="home-footer-meta">Earth Guardians / EG–Maps / {{ currentYear }}</span>
      </footer>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from 'vue'
import { allProjectsData } from '@/lib/project-data'
import { crewOverallStats } from '@/lib/crew-data'
import { formatCompact } from '@/lib/utils'

const { t } = useI18n()
const { isDark, toggle: toggleDarkMode } = useDarkMode()
const baseURL = useRuntimeConfig().app.baseURL
const currentYear = new Date().getFullYear()

useHead({
  title: computed(() => `EG–Maps — ${t('home.subtitle')}`),
  meta: [
    { name: 'description', content: 'Interactive data visualization platform for Earth Guardians — project grants, endangered species, rare earth extraction and active crews worldwide.' },
    { name: 'keywords', content: 'earth guardians, environmental, endangered species, project grants, climate action, data visualization, EG-Maps' },
    { property: 'og:title', content: 'EG–Maps — Interactive Field Atlas' },
    { property: 'og:description', content: 'Interactive data visualization platform for Earth Guardians.' },
    { property: 'og:type', content: 'website' },
  ],
})

const speciesCount = ref(4815)
const taxonomicGroupCount = ref(7)
const abortController = new AbortController()

/* ── Carousel state ── */
const activeSlide = ref(0)
const carouselTrack = ref<HTMLElement | null>(null)
const isDragging = ref(false)
let dragStartX = 0
let dragStartScroll = 0

function prevSlide() {
  if (activeSlide.value > 0) activeSlide.value--
}
function nextSlide() {
  if (activeSlide.value < datasets.value.length - 1) activeSlide.value++
}

function onPointerDown(e: PointerEvent) {
  if (!carouselTrack.value) return
  isDragging.value = true
  dragStartX = e.clientX
  dragStartScroll = carouselTrack.value.scrollLeft
  carouselTrack.value.setPointerCapture(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (!isDragging.value || !carouselTrack.value) return
  const dx = e.clientX - dragStartX
  carouselTrack.value.scrollLeft = dragStartScroll - dx
}
function onPointerUp() {
  if (!isDragging.value || !carouselTrack.value) return
  isDragging.value = false
  const card = carouselTrack.value.children[0] as HTMLElement | undefined
  const cardWidth = card?.getBoundingClientRect().width ?? 300
  const gap = 24
  const scrollCenter = carouselTrack.value.scrollLeft + carouselTrack.value.clientWidth / 2
  const idx = Math.round(scrollCenter / (cardWidth + gap))
  activeSlide.value = Math.max(0, Math.min(idx, datasets.value.length - 1))
}

watch(activeSlide, (idx) => {
  if (!carouselTrack.value) return
  const card = carouselTrack.value.children[idx] as HTMLElement | undefined
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
})

/* ── Data ── */
const projectStats = computed(() => {
  const totalDirect = allProjectsData.reduce((s, p) => s + p.direct_beneficiaries, 0)
  const totalIndirect = allProjectsData.reduce((s, p) => s + p.indirect_beneficiaries, 0)
  return { totalProjects: allProjectsData.length, totalBeneficiaries: totalDirect + totalIndirect }
})

const overviewStats = computed(() => [
  { value: crewOverallStats.totalActiveCrews, label: t('home.crewsCount') },
  { value: projectStats.value.totalProjects, label: t('home.projectsCount') },
  { value: speciesCount.value || '—', label: t('home.speciesCount') },
  { value: crewOverallStats.totalCountries, label: 'countries connected' },
])

const datasets = computed(() => [
  {
    path: '/project-grants',
    icon: 'lucide:hand-heart',
    label: 'Communities',
    accent: '#8e44ad',
    title: t('home.projectGrantsTitle'),
    description: t('home.projectGrantsDesc'),
    ariaLabel: 'View Project Grants data visualization',
    stats: [
      { value: projectStats.value.totalProjects, label: t('home.projectsCount') },
      { value: `${formatCompact(projectStats.value.totalBeneficiaries)}+`, label: t('home.beneficiariesCount') },
    ],
  },
  {
    path: '/endangered-species',
    icon: 'lucide:bird',
    label: 'Biodiversity',
    accent: '#27ae60',
    title: t('home.speciesTitle'),
    description: t('home.speciesDesc'),
    ariaLabel: 'View Endangered Species data visualization',
    stats: [
      { value: speciesCount.value || '—', label: t('home.speciesCount') },
      { value: taxonomicGroupCount.value || '—', label: t('home.groupsCount') },
    ],
  },
  {
    path: '/vulcan-observatory',
    icon: 'lucide:microscope',
    label: 'Extraction',
    accent: '#e67e22',
    title: t('home.observatoryTitle'),
    description: t('home.observatoryDesc'),
    ariaLabel: 'View Vulcan Observatory data visualization',
    stats: [
      { value: '20K+', label: 'mining processes' },
      { value: '06', label: 'signal categories' },
    ],
  },
  {
    path: '/active-crews',
    icon: 'lucide:users-round',
    label: 'Solidarity',
    accent: '#06b6d4',
    title: t('home.activeCrewsTitle'),
    description: t('home.activeCrewsDesc'),
    ariaLabel: 'View Active Crews data visualization',
    stats: [
      { value: crewOverallStats.totalActiveCrews, label: t('home.activeCrewsCount') },
      { value: crewOverallStats.totalMembers.toLocaleString(), label: t('home.crewMembersCount') },
    ],
  },
])

onMounted(async () => {
  await nextTick()
  try {
    const res = await fetch(`${baseURL}data/species/index.json`, { signal: abortController.signal })
    if (res.ok) {
      const index = await res.json()
      const datasetsIndex = index.datasets ?? []
      let total = 0
      const allGroups = new Set<string>()
      for (const ds of datasetsIndex) {
        total += ds.speciesCount ?? 0
        for (const g of Object.keys(ds.taxonomicGroups ?? {})) allGroups.add(g)
      }
      speciesCount.value = total
      taxonomicGroupCount.value = allGroups.size
    }
  } catch { /* keep defaults */ }
})

onUnmounted(() => abortController.abort())
</script>

<style scoped>
/* ══════════════════════════════════════════════
   EG-Maps Platform Home
   ══════════════════════════════════════════════ */
.home-shell {
  --home-bg: #f1f2e9;
  --home-ink: #10231b;
  --home-muted: #596960;
  --home-card: rgba(255, 255, 250, 0.76);
  --home-card-strong: #fffef8;
  --home-line: rgba(16, 35, 27, 0.14);
  --home-accent: #d7f56a;
  --home-accent-strong: #b9da46;
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  isolation: isolate;
  background-color: var(--home-bg);
  color: var(--home-ink);
}
.home-shell, .home-shell * { box-sizing: border-box; }

/* ── Atmosphere ── */
.home-atmosphere, .home-noise, .home-orbit, .home-glow {
  position: absolute; pointer-events: none;
}
.home-atmosphere { inset: 0; overflow: hidden; }
.home-noise { inset: 0; z-index: 1; opacity: 0.05; }
:global(.dark) .home-noise { opacity: 0.09; }

.home-orbit {
  z-index: 0;
  width: min(60rem, 80vw); height: min(60rem, 80vw);
  border: 1px solid var(--home-line); border-radius: 50%;
}
.home-orbit-one { top: -22rem; right: -16rem; }
.home-orbit-two { top: -13rem; right: -8rem; opacity: 0.45; transform: rotate(28deg) scale(0.83); }

.home-glow { z-index: 0; border-radius: 50%; filter: blur(90px); opacity: 0.28; }
.home-glow-one { top: 2rem; right: 15%; width: 18rem; height: 18rem; background: var(--home-accent); }
.home-glow-two { bottom: 12%; left: -10rem; width: 22rem; height: 22rem; background: #78d3b3; opacity: 0.12; }

/* ── Container ── */
.home-container {
  width: min(100% - 2rem, 78rem);
  margin: 0 auto;
}

/* ── Topbar ── */
.home-topbar {
  position: relative; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  width: min(100% - 2rem, 78rem); margin: 0 auto;
  padding: 1.15rem 0;
  border-bottom: 1px solid var(--home-line);
}
.home-brand {
  display: inline-flex; align-items: center; gap: 0.7rem;
  color: var(--home-ink); text-decoration: none;
  transition: transform 180ms ease;
}
.home-brand-mark {
  display: grid; width: 2.2rem; height: 2.2rem; place-items: center;
  overflow: hidden; border: 1px solid var(--home-line); border-radius: 0.65rem;
  background: #101c24;
}
.home-brand-mark img { width: 1.65rem; height: 1.9rem; object-fit: contain; }
.home-brand-name {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
}
.home-brand-meta {
  margin-top: 0.16rem; color: var(--home-muted);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase;
}

.home-top-link, .home-icon-button {
  align-items: center; justify-content: center;
  border: 1px solid var(--home-line); border-radius: 999px;
  color: var(--home-ink);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 0.66rem; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase;
  transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}
.home-top-link { gap: 0.4rem; padding: 0.6rem 0.8rem; border-color: transparent; }
.home-top-link:hover { background: var(--home-card); border-color: var(--home-line); }
.home-icon-button { display: inline-flex; width: 2rem; height: 2rem; background: var(--home-card); }
.home-icon-button:hover { background: var(--home-ink); color: var(--home-bg); }

/* ── Hero ── */
.home-hero {
  padding-top: clamp(3rem, 8vh, 7rem);
  padding-bottom: clamp(2rem, 5vh, 4rem);
  text-align: center;
}
.home-hero-copy { max-width: 48rem; margin: 0 auto; }

.home-kicker {
  display: flex; align-items: center; justify-content: center; gap: 0.55rem;
  margin-bottom: 1.6rem; color: var(--home-muted);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 0.67rem; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase;
}
.home-kicker-dot {
  display: inline-block; width: 0.45rem; height: 0.45rem; border-radius: 50%;
  background: var(--home-accent-strong);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--home-accent-strong) 18%, transparent);
}

.home-title {
  max-width: 34rem; margin: 0 auto;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(3.2rem, 9vw, 8.25rem); font-weight: 900;
  letter-spacing: -0.065em; line-height: 0.89;
}
.home-title-mark { color: var(--home-accent-strong); }

.home-lede {
  max-width: 36rem; margin: 1.55rem auto 0;
  color: var(--home-muted);
  font-size: clamp(1rem, 1.5vw, 1.2rem); line-height: 1.55;
}

.home-signal-line {
  display: flex; align-items: center; justify-content: center; gap: 0.65rem;
  margin-top: 2.5rem; color: var(--home-muted);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
}
.home-signal-line-rule { width: 3rem; height: 1px; background: var(--home-line); }

/* ── Map Carousel ── */
.map-carousel__track {
  display: flex; gap: 1.5rem;
  overflow-x: auto; scroll-snap-type: x mandatory;
  scrollbar-width: none; -ms-overflow-style: none;
  padding: 0.5rem 0; cursor: grab;
  touch-action: pan-y;
}
.map-carousel__track::-webkit-scrollbar { display: none; }
.map-carousel__track:active { cursor: grabbing; }

.map-carousel__card {
  flex: 0 0 clamp(280px, 38vw, 380px);
  scroll-snap-align: center;
  position: relative; border-radius: 16px; overflow: hidden;
  background: var(--home-card); border: 1px solid var(--home-line);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  cursor: pointer;
}
.map-carousel__card:hover, .map-carousel__card.is-active {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.12);
  border-color: var(--card-accent, var(--home-accent));
}

.map-carousel__card-glow {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--card-accent, var(--home-accent));
  opacity: 0; transition: opacity 0.3s ease;
}
.map-carousel__card.is-active .map-carousel__card-glow { opacity: 1; }

.map-carousel__card-inner {
  padding: 1.25rem 1.5rem 1.5rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.map-carousel__card-head {
  display: flex; align-items: center; justify-content: space-between;
}
.map-carousel__card-badge {
  font-size: 0.65rem; font-weight: 700;
  padding: 0.15rem 0.55rem; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.map-carousel__card-index {
  font-size: 0.75rem; font-weight: 800;
  color: var(--home-muted); font-variant-numeric: tabular-nums;
}
.map-carousel__card-icon {
  width: 2.5rem; height: 2.5rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px; background: var(--card-accent, var(--home-accent));
  color: #fff; margin: 0.25rem 0;
}
.map-carousel__card-title {
  font-size: 1.15rem; font-weight: 800; line-height: 1.25; margin: 0;
  color: var(--home-ink);
}
.map-carousel__card-desc {
  font-size: 0.8rem; line-height: 1.5; color: var(--home-muted); margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.map-carousel__card-stats { display: flex; gap: 1.25rem; margin-top: 0.5rem; }
.map-carousel__card-stat { display: flex; flex-direction: column; gap: 0; }
.map-carousel__card-stat strong {
  font-size: 1rem; font-weight: 800; font-variant-numeric: tabular-nums;
}
.map-carousel__card-stat span {
  font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--home-muted); font-weight: 600;
}
.map-carousel__card-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.map-carousel__cta {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.5rem 1rem; border-radius: 8px;
  font-size: 0.75rem; font-weight: 700; text-decoration: none;
  background: var(--card-accent, var(--home-accent)); color: #fff;
  transition: opacity 0.15s, transform 0.15s;
}
.map-carousel__cta:hover { opacity: 0.85; transform: translateY(-1px); }
.map-carousel__cta--ghost {
  background: transparent; color: var(--home-ink);
  border: 1px solid var(--home-line);
}
.map-carousel__cta--ghost:hover { background: var(--home-line); opacity: 1; }

.map-carousel__controls {
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  margin-top: 1.25rem;
}
.map-carousel__nav-btn {
  width: 2.25rem; height: 2.25rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; border: 1px solid var(--home-line);
  background: var(--home-card); color: var(--home-ink); cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.map-carousel__nav-btn:hover:not(:disabled) { background: var(--home-line); border-color: var(--home-ink); }
.map-carousel__nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.map-carousel__dots { display: flex; gap: 0.4rem; }
.map-carousel__dot {
  width: 0.5rem; height: 0.5rem; border-radius: 50%; border: none;
  background: var(--home-line); cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.map-carousel__dot.is-active { background: var(--home-ink); transform: scale(1.3); }
.map-carousel__hint {
  display: flex; align-items: center; justify-content: center; gap: 0.35rem;
  font-size: 0.7rem; color: var(--home-muted); margin-top: 0.75rem;
}

@media (max-width: 640px) {
  .map-carousel__card { flex: 0 0 85vw; }
}

/* ── Stats ── */
.home-telemetry {
  padding: 1.35rem 0;
  border-top: 1px solid var(--home-line);
  border-bottom: 1px solid var(--home-line);
}
.telemetry-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
}
.telemetry-stat { padding: 0 1rem; border-left: 1px solid var(--home-line); }
.telemetry-stat:first-child { border-left: none; }
.telemetry-stat strong {
  display: block;
  font-family: Montserrat, Inter, sans-serif;
  font-size: clamp(1.35rem, 2.6vw, 2.2rem); font-weight: 900;
  letter-spacing: -0.07em; line-height: 1;
}
.telemetry-stat span {
  display: block; margin-top: 0.35rem; color: var(--home-muted);
  font-size: 0.58rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
}

/* ── Footer ── */
.home-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.5rem 0;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.home-footer-brand { display: flex; align-items: center; gap: 0.6rem; }
.home-footer-mark {
  display: grid; width: 1.6rem; height: 1.6rem; place-items: center;
  border-radius: 0.45rem; background: var(--home-ink); color: var(--home-bg);
  font-size: 0.5rem; font-weight: 900; letter-spacing: 0.05em;
}
.home-footer-meta {
  font-size: 0.6rem; color: var(--home-muted);
  letter-spacing: 0.06em; text-transform: uppercase;
}

/* ── Animations ── */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
}
.home-animate-in { animation: fade-in-up 0.7s ease both; }
.home-animate-in-delay { animation-delay: 0.15s; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .telemetry-grid { grid-template-columns: repeat(2, 1fr); }
  .telemetry-stat { padding: 0.6rem 0; border-left: none; border-bottom: 1px solid var(--home-line); }
  .home-footer { flex-direction: column; gap: 0.5rem; text-align: center; }
}

/* ── Dark mode ── */
:global(.dark) .home-shell {
  --home-bg: #0c1117;
  --home-ink: #e8ede9;
  --home-muted: #8a9890;
  --home-card: rgba(20, 30, 24, 0.76);
  --home-card-strong: #141e18;
  --home-line: rgba(232, 237, 233, 0.1);
}
:global(.dark) .home-glow-two { opacity: 0.08; }
:global(.dark) .home-brand-mark { background: #1a2a22; }
:global(.dark) .map-carousel__card { background: var(--home-card); }
:global(.dark) .map-carousel__card:hover,
:global(.dark) .map-carousel__card.is-active {
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
}

/* ── High-contrast / forced colors ── */
@media (forced-colors: active) {
  .home-shell, :global(html.dark) .home-shell {
    background: Canvas !important;
    color: CanvasText !important;
  }
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .home-title { font-size: clamp(2.5rem, 14vw, 4rem); }
  .home-topbar { padding: 0.85rem 0; }
}
</style>
