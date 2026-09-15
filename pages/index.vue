<template>
  <main id="main-content" class="home">
    <PageTopbar />

    <div class="home-layout">
      <!-- Left Panel -->
      <section class="home-left">
        <div class="home-left-inner">
          <img :src="`${baseURL}eg-logo.png`" alt="Earth Guardians" class="home-logo" />
          <h1 class="home-title"><span class="glass-line">EG–Maps<span class="home-title-dot">.</span></span></h1>
          <p class="home-subtitle"><span class="glass-line">{{ t('home.subtitle') }}</span></p>
          <p class="home-submore"><span class="glass-line">{{ t('home.subtitleMore') }}</span></p>
          <div class="home-orgline">
            <a href="https://www.earthguardians.org" target="_blank" rel="noopener noreferrer" class="home-orglink">
              <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" />
              earthguardians.org
            </a>
            <NuxtLink to="/info" class="home-orglink home-orglink--muted">
              {{ t('nav.info') }}
            </NuxtLink>
          </div>
          <div class="home-divider" />
          <div class="home-stats">
            <div v-for="stat in overviewStats" :key="stat.label" class="home-stat">
              <span class="home-stat-value">{{ stat.value }}</span>
              <span class="home-stat-label">{{ stat.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Panel: Bento Grid -->
      <section class="home-right" aria-label="Sections">
        <div class="bento">

          <!-- 1. Project Grants — tall -->
          <article class="bento-card bento-tall" style="--accent: #8e44ad" @mousemove="trackGlow" @mouseleave="clearGlow">
            <div class="bento-glow" />
            <div class="bento-accent" />
            <div class="bento-body">
              <div class="bento-icon" style="background: #8e44ad14; color: #8e44ad">
                <Icon name="lucide:hand-heart" />
              </div>
              <h2 class="bento-title">{{ t('home.projectGrantsTitle') }}</h2>
              <p class="bento-desc">{{ t('home.projectGrantsDesc') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #8e44ad">{{ projectStats.totalProjects }}</strong>
                  <span>{{ t('home.projectsCount') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #8e44ad">{{ formatCompact(projectStats.totalBeneficiaries) }}+</strong>
                  <span>{{ t('home.beneficiariesCount') }}</span>
                </div>
              </div>
              <div class="bento-links">
                <NuxtLink to="/project-grants" class="bento-link bento-link--primary" style="background: #8e44ad; border-color: #8e44ad">
                  <Icon name="lucide:map" class="h-3.5 w-3.5" />
                  2D Map
                </NuxtLink>
                <NuxtLink to="/project-grants/3d" class="bento-link">
                  <Icon name="lucide:globe" class="h-3.5 w-3.5" />
                  3D Globe
                </NuxtLink>
              </div>
            </div>
          </article>

          <!-- 2. Campaigns — tall (species map lives inside: Biodiversity Day) -->
          <article class="bento-card bento-tall" style="--accent: #27ae60" @mousemove="trackGlow" @mouseleave="clearGlow">
            <div class="bento-glow" />
            <div class="bento-accent" />
            <div class="bento-body">
              <div class="bento-icon" style="background: #27ae6014; color: #27ae60">
                <Icon name="lucide:bird" />
              </div>
              <h2 class="bento-title">{{ t('home.campaignsTitle') }}</h2>
              <p class="bento-desc">{{ t('home.campaignsDesc') }}</p>
              <p class="bento-kicker" style="color: #27ae60">{{ t('home.campaignsKicker') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #27ae60">{{ speciesCount || '—' }}</strong>
                  <span>{{ t('home.speciesCount') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #27ae60">{{ t('home.allValue') }}</strong>
                  <span>{{ t('home.countries') }}</span>
                </div>
              </div>
              <div class="bento-links">
                <NuxtLink to="/campaigns" class="bento-link bento-link--primary" style="background: #27ae60; border-color: #27ae60">
                  <Icon name="lucide:megaphone" class="h-3.5 w-3.5" />
                  {{ t('home.campaignsTitle') }}
                </NuxtLink>
                <NuxtLink to="/endangered-species" class="bento-link">
                  <Icon name="lucide:map" class="h-3.5 w-3.5" />
                  Species Map
                </NuxtLink>
              </div>
            </div>
          </article>

          <!-- 3. Masterclasses -->
          <article class="bento-card" style="--accent: #f39c12" @mousemove="trackGlow" @mouseleave="clearGlow">
            <div class="bento-glow" />
            <div class="bento-accent" />
            <div class="bento-body">
              <div class="bento-icon" style="background: #f39c1214; color: #f39c12">
                <Icon name="lucide:graduation-cap" />
              </div>
              <h2 class="bento-title">{{ t('home.masterclassesTitle') }}</h2>
              <p class="bento-desc">{{ t('home.masterclassesDesc') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #f39c12">{{ t('home.seriesStatusValue') }}</strong>
                  <span>{{ t('home.seriesStatusLabel') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #f39c12">{{ t('home.archiveValue') }}</strong>
                  <span>{{ t('home.archiveLabel') }}</span>
                </div>
              </div>
              <div class="bento-links">
                <NuxtLink to="/masterclasses" class="bento-link bento-link--primary" style="background: #f39c12; border-color: #f39c12">
                  <Icon name="lucide:book-open" class="h-3.5 w-3.5" />
                  All Classes
                </NuxtLink>
              </div>
            </div>
          </article>

          <!-- 4. Start a Crew -->
          <article class="bento-card" style="--accent: #8b5cf6" @mousemove="trackGlow" @mouseleave="clearGlow">
            <div class="bento-glow" />
            <div class="bento-accent" />
            <div class="bento-body">
              <div class="bento-icon" style="background: #8b5cf614; color: #8b5cf6">
                <Icon name="lucide:heart-handshake" />
              </div>
              <h2 class="bento-title">{{ t('home.startACrewTitle') }}</h2>
              <p class="bento-desc">{{ t('home.startACrewDesc') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #8b5cf6">{{ crewOverallStats.totalActiveCrews }}</strong>
                  <span>{{ t('home.crewsCount') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #8b5cf6">{{ crewOverallStats.totalCountries }}</strong>
                  <span>{{ t('home.countries') }}</span>
                </div>
              </div>
              <div class="bento-links">
                <NuxtLink to="/active-crews" class="bento-link bento-link--primary" style="background: #8b5cf6; border-color: #8b5cf6">
                  <Icon name="lucide:users" class="h-3.5 w-3.5" />
                  Our Crews
                </NuxtLink>
                <a
                  href="https://www.earthguardians.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="bento-link"
                >
                  <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" />
                  Join EG
                </a>
              </div>
            </div>
          </article>

          <!-- 5. Crew Projects -->
          <article class="bento-card" style="--accent: #10b981" @mousemove="trackGlow" @mouseleave="clearGlow">
            <div class="bento-glow" />
            <div class="bento-accent" />
            <div class="bento-body">
              <div class="bento-icon" style="background: #10b98114; color: #10b981">
                <Icon name="lucide:briefcase" />
              </div>
              <h2 class="bento-title">{{ t('home.crewProjectsTitle') }}</h2>
              <p class="bento-desc">{{ t('home.crewProjectsDesc') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #10b981">{{ t('home.crewProjectsStatValue') }}</strong>
                  <span>{{ t('home.crewProjectsStatLabel') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #10b981">{{ t('home.crewProjectsPlaceValue') }}</strong>
                  <span>{{ t('home.crewProjectsPlaceLabel') }}</span>
                </div>
              </div>
              <div class="bento-links">
                <NuxtLink to="/crew-projects" class="bento-link bento-link--primary" style="background: #10b981; border-color: #10b981">
                  <Icon name="lucide:mountain" class="h-3.5 w-3.5" />
                  Crew Projects
                </NuxtLink>
              </div>
            </div>
          </article>

          <!-- 6. Vulcan Observatory — community-driven map -->
          <article class="bento-card" style="--accent: #f59e0b" @mousemove="trackGlow" @mouseleave="clearGlow">
            <div class="bento-glow" />
            <div class="bento-accent" />
            <div class="bento-body">
              <div class="bento-icon" style="background: #f59e0b14; color: #f59e0b">
                <Icon name="lucide:microscope" />
              </div>
              <h2 class="bento-title">{{ t('home.vulcanTitle') }}</h2>
              <p class="bento-desc">{{ t('home.vulcanDesc') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #f59e0b">{{ t('home.vulcanFocusValue') }}</strong>
                  <span>{{ t('home.vulcanFocusLabel') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #f59e0b">{{ t('home.vulcanDataValue') }}</strong>
                  <span>{{ t('home.vulcanDataLabel') }}</span>
                </div>
              </div>
              <div class="bento-links">
                <NuxtLink to="/vulcan-observatory" class="bento-link bento-link--primary" style="background: #f59e0b; border-color: #f59e0b">
                  <Icon name="lucide:map" class="h-3.5 w-3.5" />
                  2D Map
                </NuxtLink>
                <NuxtLink to="/vulcan-observatory/3d" class="bento-link">
                  <Icon name="lucide:globe" class="h-3.5 w-3.5" />
                  3D Globe
                </NuxtLink>
              </div>
            </div>
          </article>

        </div>
      </section>
    </div>

    <footer class="home-footer">
      <span class="home-footer-text">{{ t('home.footer') }}</span>
      <nav class="home-footer-links" aria-label="Footer">
        <a href="https://www.earthguardians.org" target="_blank" rel="noopener noreferrer">earthguardians.org</a>
        <NuxtLink to="/info">{{ t('nav.info') }}</NuxtLink>
        <NuxtLink to="/campaigns">{{ t('home.campaignsTitle') }}</NuxtLink>
        <NuxtLink to="/masterclasses">{{ t('home.masterclassesTitle') }}</NuxtLink>
      </nav>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import { allProjectsData } from '@/lib/project-data'
import { crewOverallStats } from '@/lib/crew-data'
import { formatCompact } from '@/lib/utils'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: computed(() => `EG–Maps — ${t('home.subtitle')}`),
  meta: [
    { name: 'description', content: 'Official maps of Earth Guardians — project grants, endangered species, active crews, crew projects and the Vulcan Observatory community map.' },
    { property: 'og:title', content: 'EG–Maps — Official maps of Earth Guardians' },
    { property: 'og:description', content: 'Crews, grants, species and crew projects on interactive maps and globes.' },
    { property: 'og:type', content: 'website' },
  ],
})

const speciesCount = ref(4815)
const abortController = new AbortController()

const projectStats = computed(() => {
  const totalDirect = allProjectsData.reduce((s, p) => s + p.direct_beneficiaries, 0)
  const totalIndirect = allProjectsData.reduce((s, p) => s + p.indirect_beneficiaries, 0)
  return { totalProjects: allProjectsData.length, totalBeneficiaries: totalDirect + totalIndirect }
})

const overviewStats = computed(() => [
  { value: crewOverallStats.totalActiveCrews, label: t('home.crewsCount') },
  { value: projectStats.value.totalProjects, label: t('home.projectsCount') },
  { value: speciesCount.value || '—', label: t('home.speciesCount') },
  { value: crewOverallStats.totalCountries, label: t('home.countries') },
])

onMounted(async () => {
  await nextTick()
  try {
    const res = await fetch(`${baseURL}data/species/index.json`, { signal: abortController.signal })
    if (res.ok) {
      const index = await res.json()
      const datasetsIndex = index.datasets ?? []
      let total = 0
      for (const ds of datasetsIndex) total += ds.speciesCount ?? 0
      speciesCount.value = total
    }
  } catch { /* keep defaults */ }
})

onUnmounted(() => abortController.abort())

const trackGlow = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
  card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
}

const clearGlow = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement
  card.style.setProperty('--mx', '50%')
  card.style.setProperty('--my', '50%')
}
</script>

<style scoped>
/* ══════════════════════════════════════════════
   EG-Maps Home — Half-Screen + Bento Grid
   ══════════════════════════════════════════════ */
.home {
  min-height: 100svh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: var(--text-primary);
}

/* ── Split Layout ── */
.home-layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.42fr) minmax(0, 0.58fr);
  min-height: 0;
}

/* ── Left Panel ── */
.home-left {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(2rem, 5vh, 5rem) clamp(1.5rem, 4vw, 4rem);
  border-right: 1px solid var(--border-color);
}
.home-left-inner { max-width: 28rem; width: 100%; }
.home-logo {
  display: block;
  width: clamp(5.5rem, 10vw, 7.5rem);
  height: clamp(5.5rem, 10vw, 7.5rem);
  object-fit: contain;
  border-radius: 10px;
  margin: 0 auto 1.5rem;
}
.home-title {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(2.5rem, 5.5vw, 4.5rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.9;
  margin: 0;
}
.home-title-dot { color: var(--primary); }
/* Per-line glass chips: each wrapped line gets its own frosted background
   sized to the text (box-decoration-break clones the chip per fragment). */
.glass-line {
  display: inline;
  padding: 0.08em 0.28em;
  border-radius: 0.35em;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(14px) saturate(1.5);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.55);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
:global(.dark) .glass-line {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
/* Breathing room so cloned line chips don't touch when text wraps */
.home-subtitle, .home-submore { line-height: 1.9; }
.home-subtitle {
  margin: 1rem 0 0;
  font-size: clamp(0.9rem, 1.3vw, 1.1rem);
  line-height: 1.5;
  color: var(--text-primary);
  font-weight: 600;
  max-width: 26rem;
}
.home-submore {
  margin: 0.6rem 0 0;
  font-size: clamp(0.8rem, 1.1vw, 0.95rem);
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 26rem;
}
.home-orgline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
}
.home-orglink {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  padding: 0.55rem 0.7rem;
  min-height: 44px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.home-orglink:hover { background: var(--text-primary); color: var(--bg-primary); }
.home-orglink--muted { color: var(--text-secondary); }
.home-orglink--muted:hover { color: var(--bg-primary); }
.home-divider {
  width: 3rem;
  height: 1px;
  background: var(--border-color);
  margin: 2rem 0;
}

/* ── Stats ── */
.home-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem 1.5rem;
}
.home-stat { display: flex; flex-direction: column; gap: 0.15rem; }
.home-stat-value {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 900;
  letter-spacing: -0.06em;
  line-height: 1;
  color: var(--text-primary);
}
.home-stat-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ── Right Panel ── */
.home-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 2.5vh, 2.5rem) clamp(1rem, 2.5vw, 2rem);
}

/* ══════════════════════════════════════
   Bento Grid
   ══════════════════════════════════════ */
.bento {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 0.75rem;
  width: 100%;
}

/* ── Card base — glassmorphism ── */
.bento-card {
  --mx: 50%;
  --my: 50%;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
:global(.dark) .bento-card {
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.bento-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  background: radial-gradient(
    circle 200px at var(--mx) var(--my),
    var(--accent, var(--primary)),
    transparent 70%
  );
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 0;
}
:global(.dark) .bento-glow {
  opacity: 0;
}
.bento-card:hover .bento-glow {
  opacity: 0.12;
}
:global(.dark) .bento-card:hover .bento-glow {
  opacity: 0.18;
}

.bento-accent {
  position: relative;
  z-index: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent, var(--primary)), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}
.bento-card:hover .bento-accent { opacity: 1; }

.bento-body {
  position: relative;
  z-index: 1;
  padding: 1rem 1.125rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.bento-badge {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.bento-kicker {
  font-size: 0.62rem;
  font-weight: 700;
  margin: 0;
}
.bento-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  margin: 0.1rem 0;
  transition: background 0.2s;
}
.bento-card:hover .bento-icon {
  background: rgba(255, 255, 255, 0.08);
}
.bento-title {
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
}
.bento-desc {
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.bento-stats {
  display: flex;
  gap: 1rem;
  margin-top: 0.35rem;
}
.bento-stat { display: flex; flex-direction: column; gap: 0; }
.bento-stat strong {
  font-size: 0.9rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.bento-stat span {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 600;
}

/* ── Links ── */
.bento-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.5rem;
}
.bento-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.55rem 0.6rem;
  min-height: 44px;
  border-radius: 6px;
  font-size: 0.62rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.bento-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-color: var(--accent, var(--primary));
}
.bento-link--primary {
  color: #fff;
}
.bento-link--primary:hover {
  opacity: 0.85;
  color: #fff;
}

/* ── Tall cards span 2 rows ── */
.bento-tall {
  grid-row: span 2;
}

/* ── Wide card spans full width ── */
.bento-wide {
  grid-column: 1 / -1;
}

/* ── Wide card inner layout ── */
.bento-wide-body {
  flex-direction: row;
  align-items: flex-start;
  gap: 2rem;
}
.bento-wide-left { flex: 1; min-width: 0; }
.bento-wide-right {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex-shrink: 0;
  padding-top: 1.2rem;
}

/* ── Footer ── */
.home-footer {
  border-top: 1px solid var(--border-color);
  padding: 1rem 0 calc(1rem + env(safe-area-inset-bottom));
  padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}
.home-footer-text {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.home-footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem 1rem;
}
.home-footer-links a {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
}
.home-footer-links a:hover { color: var(--text-primary); }

/* ══════════════════════════════════════
   Responsive
   ══════════════════════════════════════ */

/* Tablet: stack left/right */
@media (max-width: 960px) {
  .home-layout {
    grid-template-columns: 1fr;
  }
  .home-left {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding: clamp(2rem, 5vh, 3rem) clamp(1.5rem, 4vw, 3rem);
  }
  .home-right {
    padding: clamp(1rem, 2vh, 2rem) clamp(1rem, 2.5vw, 2rem);
  }
}

/* Mobile: bento becomes single column */
@media (max-width: 600px) {
  .bento {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
  .bento-tall {
    grid-row: span 1;
  }
  .bento-wide-body {
    flex-direction: column;
    gap: 0.75rem;
  }
  .bento-wide-right {
    flex-direction: row;
    flex-wrap: wrap;
    padding-top: 0;
    gap: 0.3rem;
  }
  .home-title {
    font-size: clamp(2rem, 12vw, 3rem);
  }
  .home-logo {
    width: 5rem;
    height: 5rem;
    margin: 0 auto 1.25rem;
  }
}

/* Desktop wide: wider bento */
@media (min-width: 1400px) {
  .bento {
    gap: 1rem;
  }
}
</style>
