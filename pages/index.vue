<template>
  <main id="main-content" class="home-shell" :style="gridStyle">
    <div class="home-atmosphere" aria-hidden="true">
      <div class="home-noise" />
      <div class="home-orbit home-orbit-one" />
      <div class="home-orbit home-orbit-two" />
      <div class="home-glow home-glow-one" />
      <div class="home-glow home-glow-two" />
    </div>

    <div class="relative z-10">
      <nav class="home-topbar" aria-label="Primary navigation">
        <NuxtLink to="/" class="home-brand" aria-label="Earth Guardians home">
          <span class="home-brand-mark">
            <img :src="`${baseURL}eg-logo.png`" alt="" />
          </span>
          <span class="hidden xs:flex flex-col">
            <span class="home-brand-name">Earth Guardians</span>
            <span class="home-brand-meta">Open field intelligence</span>
          </span>
        </NuxtLink>

        <div class="flex items-center gap-1.5 xs:gap-2">
          <a href="#explore" class="home-top-link hidden sm:inline-flex">
            <Icon name="lucide:compass" class="h-3.5 w-3.5" />
            Explore atlas
          </a>
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
          <NuxtLink to="/eg-grants" class="home-top-cta hidden xs:inline-flex">
            Open EG Grants
            <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </nav>

      <section class="home-hero home-container">
        <div class="home-hero-copy">
          <div class="home-kicker">
            <span class="home-kicker-dot" />
            <span>Earth Guardians / 2026 field atlas</span>
          </div>

          <div class="home-mark-frame" aria-hidden="true">
            <img :src="`${baseURL}eg-logo.png`" alt="" class="home-mark" loading="eager" />
            <div class="home-mark-stamp">EG–MAPS<br /><span>FIELD NOTE 01</span></div>
          </div>

          <h1
            v-motion
            :initial="{ opacity: 0, y: 24 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 520 } }"
            class="home-title"
          >
            {{ t('home.title') }}<span class="home-title-mark">.</span>
          </h1>
          <p
            v-motion
            :initial="{ opacity: 0, y: 18 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 520, delay: 80 } }"
            class="home-lede"
          >
            A living atlas for the people, places and species shaping environmental action worldwide.
          </p>

          <div class="home-hero-actions">
            <a href="#explore" class="home-primary-button">
              <span>Start exploring</span>
              <Icon name="lucide:arrow-down-right" class="h-4 w-4" />
            </a>
            <NuxtLink to="/info" class="home-secondary-button">
              <Icon name="lucide:layers-3" class="h-4 w-4" />
              <span>How this atlas works</span>
            </NuxtLink>
          </div>

          <div class="home-signal-line">
            <span>Built for attention</span>
            <span class="home-signal-line-rule" />
            <span>Designed for action</span>
          </div>
        </div>

        <aside class="home-hero-signal" aria-label="Atlas overview">
          <div class="signal-card-header">
            <span class="signal-label"><span class="signal-live-dot" /> Live signal</span>
            <span class="signal-code">EG / 01</span>
          </div>

          <div class="signal-map" aria-hidden="true">
            <div class="signal-map-grid" />
            <div class="signal-map-contour signal-map-contour-one" />
            <div class="signal-map-contour signal-map-contour-two" />
            <div class="signal-map-contour signal-map-contour-three" />
            <span v-for="point in signalPoints" :key="point.id" class="signal-map-point" :style="point.style">
              <span />
            </span>
            <div class="signal-map-crosshair signal-map-crosshair-one">+</div>
            <div class="signal-map-crosshair signal-map-crosshair-two">+</div>
            <div class="signal-map-coordinates">07° 12′ 14″ S<br />35° 52′ 08″ W</div>
            <div class="signal-map-caption">Connected territories / selected signals</div>
          </div>

          <div class="signal-card-footer">
            <div>
              <span class="signal-footer-label">World view</span>
              <strong>Action leaves a trace.</strong>
            </div>
            <div class="signal-arrow"><Icon name="lucide:arrow-up-right" class="h-4 w-4" /></div>
          </div>
        </aside>
      </section>

      <section class="home-container home-telemetry" aria-label="Atlas coverage">
        <div class="telemetry-intro">
          <span class="section-index">01 / Coverage</span>
          <p>Five lenses. One shared picture of what is changing on the ground.</p>
        </div>
        <div class="telemetry-grid">
          <div v-for="stat in overviewStats" :key="stat.label" class="telemetry-stat">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </section>

      <section id="explore" class="home-container home-explorer" aria-labelledby="explorer-title">
        <header class="explorer-header">
          <div>
            <span class="section-index">02 / Explore the atlas</span>
            <h2 id="explorer-title">Choose a lens.<br /><em>See the pattern.</em></h2>
          </div>
          <p>Start with the question that matters to you. Each map turns a different layer of Earth Guardians’ work into something you can investigate, share and act on.</p>
        </header>

        <div class="atlas-grid">
          <article
            v-for="(dataset, index) in datasets"
            :key="dataset.path"
            v-motion
            :initial="{ opacity: 0, y: 24 }"
            :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 460, delay: index * 70 } }"
            class="atlas-card"
            :class="`atlas-card-${dataset.tone}`"
          >
            <div class="atlas-card-topline">
              <span class="atlas-card-index">0{{ index + 1 }}</span>
              <span class="atlas-card-type"><span class="atlas-card-type-dot" />{{ dataset.label }}</span>
            </div>

            <div class="atlas-card-icon"><Icon :name="dataset.icon" class="h-5 w-5" /></div>
            <h3>{{ dataset.title }}</h3>
            <p>{{ dataset.description }}</p>

            <div class="atlas-card-stats">
              <div v-for="stat in dataset.stats" :key="stat.label" class="atlas-card-stat">
                <strong>{{ stat.value }}</strong>
                <span>{{ stat.label }}</span>
              </div>
            </div>

            <div class="atlas-card-actions">
              <NuxtLink :to="dataset.path" class="atlas-card-main-action" :aria-label="dataset.ariaLabel">
                <span>{{ dataset.single ? 'Open app' : 'Open map' }}</span>
                <Icon name="lucide:arrow-up-right" class="h-4 w-4" />
              </NuxtLink>
              <template v-if="!dataset.single">
                <NuxtLink :to="dataset.path" class="atlas-card-view-action" :aria-label="`${dataset.title} 2D map`">
                  2D
                </NuxtLink>
                <NuxtLink :to="`${dataset.path}/3d`" class="atlas-card-view-action" :aria-label="`${dataset.title} 3D globe`">
                  3D
                </NuxtLink>
              </template>
            </div>
          </article>
        </div>
      </section>

      <section class="home-container home-manifesto" aria-labelledby="manifesto-title">
        <div class="manifesto-rule"><span /> <span /> <span /></div>
        <div class="manifesto-grid">
          <span class="section-index">03 / The point of the map</span>
          <div>
            <h2 id="manifesto-title">Data is not the destination.<br /><em>Attention is.</em></h2>
            <p>These maps make the invisible easier to notice: the networks behind extraction, the species at the edge, the people building another future. Follow a thread. Bring someone with you.</p>
            <NuxtLink to="/info" class="manifesto-link">Read the field notes <Icon name="lucide:arrow-up-right" class="h-4 w-4" /></NuxtLink>
          </div>
        </div>
      </section>

      <RedBookDatabases />

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

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { allProjectsData } from '@/lib/project-data'
import { crewOverallStats } from '@/lib/crew-data'
import { formatCompact } from '@/lib/utils'

const { t } = useI18n()
const { isDark, toggle: toggleDarkMode } = useDarkMode()
const baseURL = useRuntimeConfig().app.baseURL
const currentYear = new Date().getFullYear()

useHead({
  title: computed(() => `${t('home.title')} — ${t('home.subtitle')}`),
  meta: [
    { name: 'description', content: computed(() => t('home.projectGrantsDesc')) },
    { name: 'keywords', content: 'earth guardians, environmental, endangered species, project grants, climate action, data visualization' },
    { property: 'og:title', content: computed(() => t('home.title')) },
    { property: 'og:description', content: computed(() => t('home.projectGrantsDesc')) },
    { property: 'og:type', content: 'website' },
  ],
})

// Keep the first paint informative; the client refreshes these values from the source index.
const speciesCount = ref(4815)
const taxonomicGroupCount = ref(7)
const abortController = new AbortController()

const signalPoints = [
  { id: 'one', style: { left: '22%', top: '35%' } },
  { id: 'two', style: { left: '37%', top: '59%' } },
  { id: 'three', style: { left: '54%', top: '27%' } },
  { id: 'four', style: { left: '68%', top: '47%' } },
  { id: 'five', style: { left: '79%', top: '70%' } },
  { id: 'six', style: { left: '61%', top: '76%' } },
]

const projectStats = computed(() => {
  const totalDirectBeneficiaries = allProjectsData.reduce((sum, project) => sum + project.direct_beneficiaries, 0)
  const totalIndirectBeneficiaries = allProjectsData.reduce((sum, project) => sum + project.indirect_beneficiaries, 0)

  return {
    totalProjects: allProjectsData.length,
    totalBeneficiaries: totalDirectBeneficiaries + totalIndirectBeneficiaries,
  }
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
    tone: 'lime',
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
    tone: 'blue',
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
    tone: 'orange',
    title: t('home.observatoryTitle'),
    description: t('home.observatoryDesc'),
    ariaLabel: 'View Observatory of Vulcan data visualization',
    stats: [
      { value: '20K+', label: 'mining processes' },
      { value: '06', label: 'signal categories' },
    ],
  },
  {
    path: '/active-crews',
    icon: 'lucide:users-round',
    label: 'Solidarity',
    tone: 'violet',
    title: t('home.activeCrewsTitle'),
    description: t('home.activeCrewsDesc'),
    ariaLabel: 'View Active Crews data visualization',
    stats: [
      { value: crewOverallStats.totalActiveCrews, label: t('home.activeCrewsCount') },
      { value: crewOverallStats.totalMembers.toLocaleString(), label: t('home.crewMembersCount') },
    ],
  },
  {
    path: '/eg-grants',
    icon: 'lucide:hand-coins',
    label: 'Participate',
    tone: 'coral',
    title: 'EG Grants',
    description: 'A shared space to submit, review and move socio-environmental work forward.',
    ariaLabel: 'Open EG Grants app',
    stats: [
      { value: 'Submit', label: 'a proposal' },
      { value: 'Review', label: 'with your crew' },
    ],
    single: true,
  },
])

const gridStyle = computed(() => ({
  '--home-grid-line': isDark.value ? 'rgba(210, 235, 218, 0.055)' : 'rgba(17, 42, 31, 0.065)',
}))

onMounted(async () => {
  try {
    const res = await fetch(`${baseURL}data/species/index.json`, { signal: abortController.signal })
    if (res.ok) {
      const index = await res.json()
      const datasetsIndex = index.datasets ?? []
      let total = 0
      const allGroups = new Set<string>()
      for (const dataset of datasetsIndex) {
        total += dataset.speciesCount ?? 0
        for (const group of Object.keys(dataset.taxonomicGroups ?? {})) allGroups.add(group)
      }
      speciesCount.value = total
      taxonomicGroupCount.value = allGroups.size
    }
  } catch {
    // The home remains useful while the species index is unavailable or still loading.
  }
})

onUnmounted(() => abortController.abort())

</script>

<style scoped>
.home-shell {
  --home-bg: #f1f2e9;
  --home-ink: #10231b;
  --home-muted: #596960;
  --home-card: rgba(255, 255, 250, 0.76);
  --home-card-strong: #fffef8;
  --home-line: rgba(16, 35, 27, 0.14);
  --home-accent: #d7f56a;
  --home-accent-strong: #b9da46;
  --home-blue: #2447a8;
  --home-orange: #e96f3d;
  --home-violet: #7754c8;
  --home-coral: #db5268;
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  background-color: var(--home-bg);
  color: var(--home-ink);
}

:global(.dark) .home-shell {
  --home-bg: #0b1511;
  --home-ink: #eaf1e6;
  --home-muted: #a9b9ab;
  --home-card: rgba(19, 34, 27, 0.78);
  --home-card-strong: #14271f;
  --home-line: rgba(229, 246, 225, 0.16);
  --home-accent: #d7f56a;
  --home-accent-strong: #b9da46;
  --home-blue: #8faaf8;
  --home-orange: #ff9a69;
  --home-violet: #b5a0f0;
  --home-coral: #ff8b9c;
}

.home-shell,
.home-shell * {
  box-sizing: border-box;
}

.home-atmosphere,
.home-noise,
.home-orbit,
.home-glow {
  position: absolute;
  pointer-events: none;
}

.home-atmosphere {
  inset: 0;
  overflow: hidden;
}

.home-noise {
  inset: 0;
  z-index: 1;
  opacity: 0.05;
  background-image: url('/noise.png');
  mix-blend-mode: multiply;
}

:global(.dark) .home-noise {
  opacity: 0.09;
  mix-blend-mode: screen;
}

.home-orbit {
  z-index: 0;
  width: min(60rem, 80vw);
  height: min(60rem, 80vw);
  border: 1px solid var(--home-line);
  border-radius: 50%;
  transform: rotate(-22deg);
}

.home-orbit-one {
  top: -22rem;
  right: -16rem;
}

.home-orbit-two {
  top: -13rem;
  right: -8rem;
  opacity: 0.45;
  transform: rotate(28deg) scale(0.83);
}

.home-glow {
  z-index: 0;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.28;
}

.home-glow-one {
  top: 2rem;
  right: 15%;
  width: 18rem;
  height: 18rem;
  background: var(--home-accent);
}

.home-glow-two {
  bottom: 12%;
  left: -10rem;
  width: 22rem;
  height: 22rem;
  background: #78d3b3;
  opacity: 0.12;
}

.home-container {
  width: min(100% - 2rem, 78rem);
  margin: 0 auto;
}

.home-topbar {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(100% - 2rem, 78rem);
  margin: 0 auto;
  padding: 1.15rem 0;
  border-bottom: 1px solid var(--home-line);
}

.home-brand,
.home-top-link,
.home-top-cta,
.home-icon-button,
.home-primary-button,
.home-secondary-button,
.home-card-main-action,
.home-card-view-action,
.manifesto-link {
  transition: transform 180ms ease, background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.home-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  color: var(--home-ink);
  text-decoration: none;
}

.home-brand-mark {
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--home-line);
  border-radius: 0.65rem;
  background: #101c24;
}

.home-brand-mark img {
  width: 1.65rem;
  height: 1.9rem;
  object-fit: contain;
}

.home-brand-name,
.home-brand-meta,
.home-top-link,
.home-top-cta,
.home-kicker,
.home-signal-line,
.section-index,
.signal-label,
.signal-code,
.signal-footer-label,
.signal-map-caption,
.signal-map-coordinates,
.atlas-card-topline,
.atlas-card-stat span,
.home-footer,
.home-mark-stamp {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.home-brand-name {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-brand-meta {
  margin-top: 0.16rem;
  color: var(--home-muted);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-top-link,
.home-top-cta,
.home-icon-button {
  align-items: center;
  justify-content: center;
  border: 1px solid var(--home-line);
  border-radius: 999px;
  color: var(--home-ink);
  font-size: 0.66rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.home-top-link {
  gap: 0.4rem;
  padding: 0.6rem 0.8rem;
  border-color: transparent;
}

.home-top-link:hover {
  background: var(--home-card);
  border-color: var(--home-line);
}

.home-top-cta {
  gap: 0.4rem;
  padding: 0.6rem 0.8rem 0.6rem 0.95rem;
  background: var(--home-ink);
  color: var(--home-bg);
}

.home-top-cta:hover,
.home-primary-button:hover {
  transform: translateY(-2px);
  background: var(--home-accent-strong);
  color: #112319;
}

.home-icon-button {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  background: var(--home-card);
}

.home-icon-button:hover,
.home-secondary-button:hover {
  background: var(--home-ink);
  color: var(--home-bg);
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(20rem, 0.9fr);
  gap: clamp(2rem, 7vw, 7rem);
  align-items: center;
  min-height: min(47rem, calc(100svh - 5rem));
  padding-top: clamp(3rem, 8vh, 7rem);
  padding-bottom: clamp(4rem, 10vh, 8rem);
}

.home-hero-copy {
  position: relative;
  z-index: 2;
  max-width: 41rem;
}

.home-kicker {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1.6rem;
  color: var(--home-muted);
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.home-kicker-dot,
.signal-live-dot,
.atlas-card-type-dot {
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--home-accent-strong);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--home-accent-strong) 18%, transparent);
}

.home-mark-frame {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: clamp(7rem, 14vw, 10rem);
  height: clamp(5.1rem, 10vw, 7.2rem);
  margin-bottom: 1.2rem;
  overflow: hidden;
  border: 1px solid rgba(234, 241, 230, 0.18);
  border-radius: 1.1rem;
  background: #101c24;
  box-shadow: 0 1.5rem 3rem rgba(19, 40, 28, 0.16);
}

.home-mark {
  width: 100%;
  height: 100%;
  padding: 0.7rem;
  object-fit: contain;
  object-position: center;
}

.home-mark-stamp {
  position: absolute;
  right: 0.55rem;
  bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.43rem;
  font-weight: 750;
  line-height: 1.35;
  letter-spacing: 0.13em;
  text-align: right;
}

.home-mark-stamp span {
  color: var(--home-accent);
  font-size: 0.36rem;
}

.home-title,
.explorer-header h2,
.manifesto-grid h2 {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 900;
  letter-spacing: -0.065em;
}

.home-title {
  max-width: 34rem;
  margin: 0;
  font-size: clamp(3.2rem, 9vw, 8.25rem);
  line-height: 0.89;
}

.home-title-mark {
  color: var(--home-accent-strong);
}

.home-lede {
  max-width: 31rem;
  margin: 1.55rem 0 0;
  color: var(--home-muted);
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  line-height: 1.55;
}

.home-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 2rem;
}

.home-primary-button,
.home-secondary-button {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 2.85rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-decoration: none;
  text-transform: uppercase;
}

.home-primary-button {
  padding: 0.8rem 1.05rem 0.8rem 1.15rem;
  background: var(--home-ink);
  color: var(--home-bg);
}

.home-secondary-button {
  padding: 0.8rem 1rem;
  border: 1px solid var(--home-line);
  color: var(--home-ink);
}

.home-signal-line {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 3rem;
  color: var(--home-muted);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-signal-line-rule {
  width: 3rem;
  height: 1px;
  background: var(--home-line);
}

.home-hero-signal {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border: 1px solid var(--home-line);
  border-radius: 1.5rem;
  background: var(--home-card);
  box-shadow: 0 2rem 5rem rgba(18, 42, 28, 0.12);
  backdrop-filter: blur(12px);
}

.signal-card-header,
.signal-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.15rem;
}

.signal-card-header {
  border-bottom: 1px solid var(--home-line);
}

.signal-label,
.signal-code {
  font-size: 0.61rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.signal-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.signal-code {
  color: var(--home-muted);
}

.signal-map {
  position: relative;
  min-height: clamp(19rem, 34vw, 28rem);
  overflow: hidden;
  background: #12231f;
}

.signal-map::before,
.signal-map::after {
  position: absolute;
  content: '';
  inset: 0;
  pointer-events: none;
}

.signal-map::before {
  opacity: 0.6;
  background: radial-gradient(circle at 56% 44%, rgba(213, 245, 106, 0.25), transparent 23%), radial-gradient(circle at 80% 75%, rgba(49, 105, 221, 0.28), transparent 30%);
}

.signal-map::after {
  background: linear-gradient(120deg, transparent 0 40%, rgba(231, 244, 224, 0.1) 40.2% 40.35%, transparent 40.5% 100%);
  opacity: 0.6;
}

.signal-map-grid {
  position: absolute;
  inset: 0;
  opacity: 0.2;
  background-image: linear-gradient(rgba(229, 246, 225, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(229, 246, 225, 0.2) 1px, transparent 1px);
  background-size: 2.5rem 2.5rem;
  transform: perspective(28rem) rotateX(58deg) scale(1.7) translateY(12%);
  transform-origin: center bottom;
}

.signal-map-contour {
  position: absolute;
  border: 1px solid rgba(215, 245, 106, 0.6);
  border-radius: 49% 51% 39% 61% / 57% 42% 58% 43%;
  transform: rotate(-24deg);
}

.signal-map-contour-one {
  top: 19%;
  left: 18%;
  width: 70%;
  height: 42%;
}

.signal-map-contour-two {
  top: 31%;
  left: 28%;
  width: 55%;
  height: 34%;
  border-color: rgba(122, 186, 233, 0.7);
  transform: rotate(18deg);
}

.signal-map-contour-three {
  top: 43%;
  left: 8%;
  width: 76%;
  height: 32%;
  border-color: rgba(236, 130, 85, 0.58);
  transform: rotate(-8deg);
}

.signal-map-point {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 0.75rem;
  height: 0.75rem;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 50%;
  background: var(--home-accent);
  box-shadow: 0 0 0 5px rgba(215, 245, 106, 0.12), 0 0 1rem rgba(215, 245, 106, 0.7);
}

.signal-map-point span {
  width: 0.2rem;
  height: 0.2rem;
  border-radius: 50%;
  background: #173224;
}

.signal-map-crosshair {
  position: absolute;
  z-index: 3;
  color: rgba(255, 255, 255, 0.75);
  font-family: ui-monospace, monospace;
  font-size: 1rem;
}

.signal-map-crosshair-one { top: 18%; right: 20%; }
.signal-map-crosshair-two { bottom: 22%; left: 17%; }

.signal-map-coordinates,
.signal-map-caption {
  position: absolute;
  z-index: 3;
  color: rgba(237, 245, 232, 0.72);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
}

.signal-map-coordinates { top: 1rem; left: 1.15rem; }
.signal-map-caption { right: 1.15rem; bottom: 1rem; text-align: right; }

.signal-card-footer {
  gap: 1rem;
  border-top: 1px solid var(--home-line);
}

.signal-footer-label {
  display: block;
  margin-bottom: 0.3rem;
  color: var(--home-muted);
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.signal-card-footer strong {
  display: block;
  font-family: Montserrat, Inter, sans-serif;
  font-size: 0.86rem;
  letter-spacing: -0.02em;
}

.signal-arrow {
  display: grid;
  width: 2.1rem;
  height: 2.1rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--home-accent);
  color: #112319;
}

.home-telemetry {
  display: grid;
  grid-template-columns: 1fr 2.2fr;
  gap: 2rem;
  padding: 1.35rem 0;
  border-top: 1px solid var(--home-line);
  border-bottom: 1px solid var(--home-line);
}

.telemetry-intro {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-index {
  display: inline-block;
  color: var(--home-muted);
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  white-space: nowrap;
}

.telemetry-intro p {
  max-width: 15rem;
  margin: 0;
  color: var(--home-muted);
  font-size: 0.71rem;
  line-height: 1.4;
}

.telemetry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.telemetry-stat {
  padding: 0 1rem;
  border-left: 1px solid var(--home-line);
}

.telemetry-stat strong {
  display: block;
  font-family: Montserrat, Inter, sans-serif;
  font-size: clamp(1.35rem, 2.6vw, 2.2rem);
  font-weight: 900;
  letter-spacing: -0.07em;
  line-height: 1;
}

.telemetry-stat span {
  display: block;
  margin-top: 0.35rem;
  color: var(--home-muted);
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.home-explorer {
  padding-top: clamp(5rem, 10vw, 9rem);
  padding-bottom: clamp(4rem, 9vw, 8rem);
}

.explorer-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 26rem);
  gap: 3rem;
  align-items: end;
  margin-bottom: 2rem;
}

.explorer-header h2,
.manifesto-grid h2 {
  margin: 0.7rem 0 0;
  font-size: clamp(2.45rem, 6vw, 5.5rem);
  line-height: 0.93;
}

.explorer-header h2 em,
.manifesto-grid h2 em {
  color: var(--home-muted);
  font-style: normal;
}

.explorer-header > p {
  max-width: 24rem;
  margin: 0 0 0.35rem auto;
  color: var(--home-muted);
  font-size: 0.86rem;
  line-height: 1.6;
}

.atlas-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 0.8rem;
}

.atlas-card {
  position: relative;
  display: flex;
  min-height: 23rem;
  flex-direction: column;
  grid-column: span 4;
  overflow: hidden;
  border: 1px solid var(--home-line);
  border-radius: 1.25rem;
  padding: 1.2rem;
  background: var(--home-card);
  box-shadow: 0 1rem 2.5rem rgba(18, 42, 28, 0.06);
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.atlas-card:nth-child(4) { grid-column: span 6; }
.atlas-card:nth-child(5) { grid-column: span 6; }

.atlas-card::before {
  position: absolute;
  top: -4rem;
  right: -3rem;
  width: 12rem;
  height: 12rem;
  border-radius: 50%;
  background: var(--card-accent);
  content: '';
  opacity: 0.16;
  filter: blur(30px);
}

.atlas-card:hover {
  z-index: 2;
  transform: translateY(-0.35rem);
  border-color: color-mix(in srgb, var(--card-accent) 62%, var(--home-line));
  box-shadow: 0 1.6rem 3.5rem rgba(18, 42, 28, 0.14);
}

.atlas-card-lime { --card-accent: var(--home-accent-strong); }
.atlas-card-blue { --card-accent: var(--home-blue); }
.atlas-card-orange { --card-accent: var(--home-orange); }
.atlas-card-violet { --card-accent: var(--home-violet); }
.atlas-card-coral { --card-accent: var(--home-coral); }

.atlas-card-topline {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--home-muted);
  font-size: 0.59rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.atlas-card-index {
  color: var(--card-accent);
}

.atlas-card-type {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.atlas-card-type-dot {
  width: 0.38rem;
  height: 0.38rem;
  background: var(--card-accent);
  box-shadow: none;
}

.atlas-card-icon {
  position: relative;
  z-index: 1;
  display: grid;
  width: 3rem;
  height: 3rem;
  margin-top: 2.3rem;
  place-items: center;
  border-radius: 0.95rem;
  background: color-mix(in srgb, var(--card-accent) 18%, transparent);
  color: var(--card-accent);
}

.atlas-card h3 {
  position: relative;
  z-index: 1;
  max-width: 18rem;
  margin: 1rem 0 0;
  font-family: Montserrat, Inter, sans-serif;
  font-size: clamp(1.25rem, 2.2vw, 1.8rem);
  font-weight: 850;
  letter-spacing: -0.055em;
  line-height: 1;
}

.atlas-card p {
  position: relative;
  z-index: 1;
  max-width: 28rem;
  margin: 0.65rem 0 0;
  color: var(--home-muted);
  font-size: 0.77rem;
  line-height: 1.55;
}

.atlas-card-stats {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  margin-top: auto;
  padding-top: 1.5rem;
}

.atlas-card-stat strong {
  display: block;
  font-family: Montserrat, Inter, sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.06em;
}

.atlas-card-stat span {
  display: block;
  margin-top: 0.15rem;
  color: var(--home-muted);
  font-size: 0.52rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.atlas-card-actions {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 1.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--home-line);
}

.atlas-card-main-action,
.atlas-card-view-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.25rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 850;
  letter-spacing: 0.07em;
  text-decoration: none;
  text-transform: uppercase;
}

.atlas-card-main-action {
  flex: 1;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  background: var(--card-accent);
  color: #10231b;
}

.atlas-card-main-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.atlas-card-view-action {
  width: 2.25rem;
  border: 1px solid var(--home-line);
  color: var(--home-ink);
}

.atlas-card-view-action:hover {
  border-color: var(--card-accent);
  background: var(--card-accent);
  color: #10231b;
}

.home-manifesto {
  padding-bottom: clamp(5rem, 10vw, 9rem);
}

.manifesto-rule {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 2rem;
}

.manifesto-rule span {
  display: block;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: var(--home-accent-strong);
}

.manifesto-rule span:nth-child(2) { opacity: 0.5; }
.manifesto-rule span:nth-child(3) { opacity: 0.25; }

.manifesto-grid {
  display: grid;
  grid-template-columns: minmax(11rem, 0.7fr) minmax(0, 1.5fr);
  gap: 2rem;
  padding: 2.2rem 0;
  border-top: 1px solid var(--home-line);
  border-bottom: 1px solid var(--home-line);
}

.manifesto-grid h2 {
  margin-top: 0;
  font-size: clamp(2.25rem, 5.7vw, 5.3rem);
}

.manifesto-grid p {
  max-width: 37rem;
  margin: 1.5rem 0 0;
  color: var(--home-muted);
  font-size: 1rem;
  line-height: 1.7;
}

.manifesto-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.45rem;
  color: var(--home-ink);
  font-size: 0.69rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
}

.manifesto-link:hover {
  color: var(--home-accent-strong);
  transform: translateX(0.2rem);
}

.home-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.2rem;
  padding-bottom: 8rem;
  color: var(--home-muted);
  font-size: 0.61rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.home-footer-mark {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 50%;
  background: var(--home-ink);
  color: var(--home-bg);
  font-size: 0.5rem;
  font-weight: 900;
}

.home-footer-meta {
  text-align: right;
}

@media (max-width: 900px) {
  .home-hero {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 3rem;
  }

  .home-hero-signal {
    max-width: 38rem;
  }

  .home-telemetry {
    grid-template-columns: 1fr;
  }

  .telemetry-intro {
    justify-content: space-between;
  }
}

@media (max-width: 700px) {
  .home-container,
  .home-topbar {
    width: min(100% - 1.25rem, 78rem);
  }

  .home-topbar {
    padding-top: 0.8rem;
    padding-bottom: 0.8rem;
  }

  .home-hero {
    padding-top: 3.5rem;
  }

  .home-title {
    max-width: 22rem;
    font-size: clamp(3.45rem, 18vw, 6rem);
  }

  .home-lede {
    max-width: 25rem;
    font-size: 0.98rem;
  }

  .home-hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .home-primary-button,
  .home-secondary-button {
    justify-content: center;
  }

  .home-signal-line {
    margin-top: 2rem;
  }

  .telemetry-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem 0;
  }

  .telemetry-stat:nth-child(3) {
    border-left: 0;
  }

  .telemetry-stat:nth-child(n + 3) {
    padding-top: 1rem;
  }

  .explorer-header,
  .manifesto-grid {
    grid-template-columns: 1fr;
    gap: 1.4rem;
  }

  .explorer-header > p {
    margin-left: 0;
  }

  .atlas-card,
  .atlas-card:nth-child(4),
  .atlas-card:nth-child(5) {
    grid-column: span 12;
    min-height: 20rem;
  }

  .home-footer {
    align-items: flex-start;
    flex-direction: column;
    padding-bottom: 7rem;
  }

  .home-footer-meta {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-brand,
  .home-top-link,
  .home-top-cta,
  .home-icon-button,
  .home-primary-button,
  .home-secondary-button,
  .atlas-card,
  .atlas-card-main-action,
  .atlas-card-view-action,
  .manifesto-link {
    transition: none;
  }
}
</style>
