<template>
  <main id="main-content" class="home">
    <PageTopbar />

    <div class="home-layout">
      <!-- Left Panel -->
      <section class="home-left">
        <div class="home-left-inner">
          <img :src="`${baseURL}eg-logo.png`" alt="Earth Guardians" class="home-logo" />
          <h1 class="home-title">EG–Maps<span class="home-title-dot">.</span></h1>
          <p class="home-subtitle">{{ t('home.subtitle') }}</p>
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
          <article class="bento-card bento-tall" style="--accent: #8e44ad">
            <div class="bento-accent" />
            <div class="bento-body">
              <span class="bento-badge" style="color: #8e44ad">Communities</span>
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

          <!-- 2. Campaigns — tall -->
          <article class="bento-card bento-tall" style="--accent: #27ae60">
            <div class="bento-accent" />
            <div class="bento-body">
              <span class="bento-badge" style="color: #27ae60">Biodiversity</span>
              <div class="bento-icon" style="background: #27ae6014; color: #27ae60">
                <Icon name="lucide:bird" />
              </div>
              <h2 class="bento-title">{{ t('home.campaignsTitle') }}</h2>
              <p class="bento-desc">{{ t('home.campaignsDesc') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #27ae60">{{ speciesCount || '—' }}</strong>
                  <span>{{ t('home.speciesCount') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #27ae60">47</strong>
                  <span>{{ t('home.countries') }}</span>
                </div>
              </div>
              <div class="bento-links">
                <NuxtLink to="/endangered-species" class="bento-link bento-link--primary" style="background: #27ae60; border-color: #27ae60">
                  <Icon name="lucide:map" class="h-3.5 w-3.5" />
                  Species Map
                </NuxtLink>
                <NuxtLink to="/campaigns" class="bento-link">
                  <Icon name="lucide:megaphone" class="h-3.5 w-3.5" />
                  Campaigns
                </NuxtLink>
              </div>
            </div>
          </article>

          <!-- 3. Masterclasses -->
          <article class="bento-card" style="--accent: #f39c12">
            <div class="bento-accent" />
            <div class="bento-body">
              <span class="bento-badge" style="color: #f39c12">Training</span>
              <div class="bento-icon" style="background: #f39c1214; color: #f39c12">
                <Icon name="lucide:graduation-cap" />
              </div>
              <h2 class="bento-title">{{ t('home.masterclassesTitle') }}</h2>
              <p class="bento-desc">{{ t('home.masterclassesDesc') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #f39c12">4</strong>
                  <span>{{ t('home.pastTrainings') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #f39c12">3</strong>
                  <span>{{ t('home.skillBuilding') }}</span>
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
          <article class="bento-card" style="--accent: #8b5cf6">
            <div class="bento-accent" />
            <div class="bento-body">
              <span class="bento-badge" style="color: #8b5cf6">Join</span>
              <div class="bento-icon" style="background: #8b5cf614; color: #8b5cf6">
                <Icon name="lucide:heart-handshake" />
              </div>
              <h2 class="bento-title">{{ t('home.startACrewTitle') }}</h2>
              <p class="bento-desc">{{ t('home.startACrewDesc') }}</p>
              <div class="bento-stats">
                <div class="bento-stat">
                  <strong style="color: #8b5cf6">131</strong>
                  <span>{{ t('home.crewsCount') }}</span>
                </div>
                <div class="bento-stat">
                  <strong style="color: #8b5cf6">47</strong>
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

          <!-- 5. Crew Projects — full width -->
          <article class="bento-card bento-wide" style="--accent: #10b981">
            <div class="bento-accent" />
            <div class="bento-body bento-wide-body">
              <div class="bento-wide-left">
                <span class="bento-badge" style="color: #10b981">Impact</span>
                <div class="bento-icon" style="background: #10b98114; color: #10b981">
                  <Icon name="lucide:briefcase" />
                </div>
                <h2 class="bento-title">{{ t('home.crewProjectsTitle') }}</h2>
                <p class="bento-desc">{{ t('home.crewProjectsDesc') }}</p>
                <div class="bento-stats">
                  <div class="bento-stat">
                    <strong style="color: #10b981">252</strong>
                    <span>acres restored</span>
                  </div>
                  <div class="bento-stat">
                    <strong style="color: #10b981">4</strong>
                    <span>countries</span>
                  </div>
                </div>
              </div>
              <div class="bento-wide-right">
                <NuxtLink to="/crew-projects" class="bento-link bento-link--primary" style="background: #10b981; border-color: #10b981">
                  <Icon name="lucide:mountain" class="h-3.5 w-3.5" />
                  Large-Scale Projects
                </NuxtLink>
                <NuxtLink to="/crew-projects#small-scale" class="bento-link">
                  <Icon name="lucide:sprout" class="h-3.5 w-3.5" />
                  Small-Scale Projects
                </NuxtLink>
              </div>
            </div>
          </article>

        </div>
      </section>
    </div>

    <footer class="home-footer">
      <span class="home-footer-text">Earth Guardians / EG–Maps / {{ currentYear }}</span>
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
const currentYear = new Date().getFullYear()

useHead({
  title: computed(() => `EG–Maps — ${t('home.subtitle')}`),
  meta: [
    { name: 'description', content: 'Interactive data visualization platform for Earth Guardians — project grants, endangered species, rare earth extraction and active crews worldwide.' },
    { property: 'og:title', content: 'EG–Maps — Interactive Field Atlas' },
    { property: 'og:description', content: 'Interactive data visualization platform for Earth Guardians.' },
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
</script>

<style scoped>
/* ══════════════════════════════════════════════
   EG-Maps Home — Half-Screen + Bento Grid
   ══════════════════════════════════════════════ */
.home {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
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
  width: clamp(3.5rem, 6vw, 5rem);
  height: clamp(3.5rem, 6vw, 5rem);
  object-fit: contain;
  border-radius: 10px;
  margin-bottom: 1.5rem;
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
.home-subtitle {
  margin: 1rem 0 0;
  font-size: clamp(0.9rem, 1.3vw, 1.1rem);
  line-height: 1.5;
  color: var(--text-secondary);
  max-width: 26rem;
}
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

/* ── Card base ── */
.bento-card {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.bento-card:hover {
  border-color: var(--accent, var(--primary));
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
:global(.dark) .bento-card:hover {
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.3);
}

.bento-accent {
  height: 3px;
  background: var(--accent, var(--primary));
  opacity: 0;
  transition: opacity 0.2s;
}
.bento-card:hover .bento-accent { opacity: 1; }

.bento-body {
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
.bento-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  margin: 0.1rem 0;
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
  padding: 0.3rem 0.6rem;
  border-radius: 5px;
  font-size: 0.62rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.bento-link:hover {
  background: var(--bg-tertiary);
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
  padding: 1rem 0;
  text-align: center;
}
.home-footer-text {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

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
    width: 3rem;
    height: 3rem;
  }
}

/* Desktop wide: wider bento */
@media (min-width: 1400px) {
  .bento {
    gap: 1rem;
  }
}
</style>
