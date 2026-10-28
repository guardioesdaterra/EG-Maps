<template>
  <main id="main-content" ref="homeRoot" tabindex="-1" class="home">
    <PageTopbar />

    <section class="home-hero" aria-label="EG-Maps">
      <div class="home-layout">
        <section class="home-left" aria-labelledby="home-title">
          <div class="home-left-inner">
            <img :src="`${baseURL}eg-logo.png`" alt="Earth Guardians" class="home-logo" />
            <h1 id="home-title" class="home-title"><span class="glass-line">EG–Maps<span class="home-title-dot">.</span></span></h1>
            <p class="home-subtitle"><span class="glass-line">{{ t('home.subtitle') }}</span></p>
            <p class="home-submore"><span class="glass-line">{{ t('home.subtitleMore') }}</span></p>
            <div class="home-orgline">
              <a href="https://www.earthguardians.org" target="_blank" rel="noopener noreferrer" class="home-orglink">
                <Icon name="lucide:arrow-up-right" aria-hidden="true" />
                earthguardians.org
              </a>
              <NuxtLink to="/info" class="home-orglink home-orglink--muted">
                {{ t('nav.info') }}
              </NuxtLink>
            </div>
            <div class="home-divider" />
            <div class="home-stats" role="group" :aria-label="t('home.dataMaps')">
              <div v-for="stat in overviewStats" :key="stat.label" class="home-stat">
                <span class="home-stat-value">{{ stat.value }}</span>
                <span class="home-stat-label">{{ stat.label }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="home-right" :aria-label="t('home.exploreTitle')">
          <div class="bento">
            <article class="bento-card bento-tall" style="--accent: #7e22ce" @mousemove="trackGlow" @mouseleave="clearGlow">
              <div class="bento-glow" aria-hidden="true" />
              <div class="bento-accent" aria-hidden="true" />
              <div class="bento-body">
                <div class="bento-icon" aria-hidden="true"><Icon name="lucide:hand-heart" /></div>
                <h2 class="bento-title">{{ t('home.projectGrantsTitle') }}</h2>
                <p class="bento-desc">{{ t('home.projectGrantsDesc') }}</p>
                <div class="bento-stats">
                  <div class="bento-stat">
                    <strong>{{ projectStats.totalProjects }}</strong>
                    <span>{{ t('home.projectsCount') }}</span>
                  </div>
                  <div class="bento-stat">
                    <strong>{{ formatCompact(projectStats.totalBeneficiaries) }}+</strong>
                    <span>{{ t('home.beneficiariesCount') }}</span>
                  </div>
                </div>
                <div class="bento-links">
                  <NuxtLink to="/project-grants" class="bento-link bento-link--primary" :aria-label="`${t('home.projectGrantsTitle')} — ${t('globe.view2D')}`">
                    <Icon name="lucide:map" aria-hidden="true" />
                    {{ t('globe.view2D') }}
                  </NuxtLink>
                  <NuxtLink to="/project-grants/3d" class="bento-link" :aria-label="`${t('home.projectGrantsTitle')} — ${t('globe.view3D')}`">
                    <Icon name="lucide:globe" aria-hidden="true" />
                    {{ t('globe.view3D') }}
                  </NuxtLink>
                </div>
              </div>
            </article>

            <article class="bento-card bento-tall" style="--accent: #15803d" @mousemove="trackGlow" @mouseleave="clearGlow">
              <div class="bento-glow" aria-hidden="true" />
              <div class="bento-accent" aria-hidden="true" />
              <div class="bento-body">
                <div class="bento-icon" aria-hidden="true"><Icon name="lucide:bird" /></div>
                <h2 class="bento-title">{{ t('home.campaignsTitle') }}</h2>
                <p class="bento-desc">{{ t('home.campaignsDesc') }}</p>
                <p class="bento-kicker">{{ t('home.campaignsKicker') }}</p>
                <div class="bento-stats">
                  <div class="bento-stat">
                    <strong>{{ speciesCount ?? '—' }}</strong>
                    <span>{{ t('home.speciesCount') }}</span>
                  </div>
                  <div class="bento-stat">
                    <strong>{{ t('home.allValue') }}</strong>
                    <span>{{ t('home.countries') }}</span>
                  </div>
                </div>
                <div class="bento-links">
                  <NuxtLink to="/campaigns" class="bento-link bento-link--primary">
                    <Icon name="lucide:megaphone" aria-hidden="true" />
                    {{ t('home.campaignsTitle') }}
                  </NuxtLink>
                  <NuxtLink to="/endangered-species" class="bento-link">
                    <Icon name="lucide:map" aria-hidden="true" />
                    {{ t('home.speciesTitle') }}
                  </NuxtLink>
                </div>
              </div>
            </article>

            <article class="bento-card" style="--accent: #96600a" @mousemove="trackGlow" @mouseleave="clearGlow">
              <div class="bento-glow" aria-hidden="true" />
              <div class="bento-accent" aria-hidden="true" />
              <div class="bento-body">
                <div class="bento-icon" aria-hidden="true"><Icon name="lucide:graduation-cap" /></div>
                <h2 class="bento-title">{{ t('home.masterclassesTitle') }}</h2>
                <p class="bento-desc">{{ t('home.masterclassesDesc') }}</p>
                <div class="bento-stats">
                  <div class="bento-stat">
                    <strong>{{ t('home.seriesStatusValue') }}</strong>
                    <span>{{ t('home.seriesStatusLabel') }}</span>
                  </div>
                  <div class="bento-stat">
                    <strong>{{ t('home.archiveValue') }}</strong>
                    <span>{{ t('home.archiveLabel') }}</span>
                  </div>
                </div>
                <div class="bento-links">
                  <NuxtLink to="/masterclasses" class="bento-link bento-link--primary">
                    <Icon name="lucide:book-open" aria-hidden="true" />
                    {{ t('home.masterclassesTitle') }}
                  </NuxtLink>
                </div>
              </div>
            </article>

            <article class="bento-card" style="--accent: #0e7490" @mousemove="trackGlow" @mouseleave="clearGlow">
              <div class="bento-glow" aria-hidden="true" />
              <div class="bento-accent" aria-hidden="true" />
              <div class="bento-body">
                <div class="bento-icon" aria-hidden="true"><Icon name="lucide:heart-handshake" /></div>
                <h2 class="bento-title">{{ t('home.startACrewTitle') }}</h2>
                <p class="bento-desc">{{ t('home.startACrewDesc') }}</p>
                <div class="bento-stats">
                  <div class="bento-stat">
                    <strong>{{ crewOverallStats.totalActiveCrews }}</strong>
                    <span>{{ t('home.crewsCount') }}</span>
                  </div>
                  <div class="bento-stat">
                    <strong>{{ crewOverallStats.totalCountries }}</strong>
                    <span>{{ t('home.countries') }}</span>
                  </div>
                </div>
                <div class="bento-links">
                  <NuxtLink to="/active-crews" class="bento-link bento-link--primary">
                    <Icon name="lucide:users-round" aria-hidden="true" />
                    {{ t('home.activeCrewsTitle') }}
                  </NuxtLink>
                  <a href="https://www.earthguardians.org/crews" target="_blank" rel="noopener noreferrer" class="bento-link">
                    <Icon name="lucide:arrow-up-right" aria-hidden="true" />
                    {{ t('home.startACrewTitle') }}
                  </a>
                </div>
              </div>
            </article>

            <article class="bento-card" style="--accent: #15803d" @mousemove="trackGlow" @mouseleave="clearGlow">
              <div class="bento-glow" aria-hidden="true" />
              <div class="bento-accent" aria-hidden="true" />
              <div class="bento-body">
                <div class="bento-icon" aria-hidden="true"><Icon name="lucide:mountain" /></div>
                <h2 class="bento-title">{{ t('home.crewProjectsTitle') }}</h2>
                <p class="bento-desc">{{ t('home.crewProjectsDesc') }}</p>
                <div class="bento-stats">
                  <div class="bento-stat">
                    <strong>{{ t('home.crewProjectsStatValue') }}</strong>
                    <span>{{ t('home.crewProjectsStatLabel') }}</span>
                  </div>
                  <div class="bento-stat">
                    <strong>{{ t('home.crewProjectsPlaceValue') }}</strong>
                    <span>{{ t('home.crewProjectsPlaceLabel') }}</span>
                  </div>
                </div>
                <div class="bento-links">
                  <NuxtLink data-testid="home-hero-crew-projects-link" to="/crew-projects" class="bento-link bento-link--primary">
                    <Icon name="lucide:mountain" aria-hidden="true" />
                    {{ t('home.crewProjectsTitle') }}
                  </NuxtLink>
                </div>
              </div>
            </article>

            <article class="bento-card" style="--accent: #96600a" @mousemove="trackGlow" @mouseleave="clearGlow">
              <div class="bento-glow" aria-hidden="true" />
              <div class="bento-accent" aria-hidden="true" />
              <div class="bento-body">
                <div class="bento-icon" aria-hidden="true"><Icon name="lucide:microscope" /></div>
                <h2 class="bento-title">{{ t('home.vulcanTitle') }}</h2>
                <p class="bento-desc">{{ t('home.vulcanDesc') }}</p>
                <div class="bento-stats">
                  <div class="bento-stat">
                    <strong>{{ t('home.vulcanFocusValue') }}</strong>
                    <span>{{ t('home.vulcanFocusLabel') }}</span>
                  </div>
                  <div class="bento-stat">
                    <strong>{{ t('home.vulcanDataValue') }}</strong>
                    <span>{{ t('home.vulcanDataLabel') }}</span>
                  </div>
                </div>
                <div class="bento-links">
                  <NuxtLink to="/vulcan-observatory" class="bento-link bento-link--primary" :aria-label="`${t('home.vulcanTitle')} — ${t('globe.view2D')}`">
                    <Icon name="lucide:map" aria-hidden="true" />
                    {{ t('globe.view2D') }}
                  </NuxtLink>
                  <NuxtLink to="/vulcan-observatory/3d" class="bento-link" :aria-label="`${t('home.vulcanTitle')} — ${t('globe.view3D')}`">
                    <Icon name="lucide:globe" aria-hidden="true" />
                    {{ t('globe.view3D') }}
                  </NuxtLink>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>

    <section id="home-story" class="story-section" aria-labelledby="story-title" data-reveal>
      <div class="section-index"><span>01</span><span>{{ t('home.ourWork') }}</span></div>
      <div class="story-split">
        <h2 id="story-title">{{ t('home.ourWorkDesc') }}</h2>
        <div class="story-copy">
          <p>{{ t('home.subtitleMore') }}</p>
          <NuxtLink to="/info" class="text-link">
            {{ t('nav.info') }}
            <Icon name="lucide:arrow-up-right" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
      <ul class="story-principles">
        <li><Icon name="lucide:users-round" aria-hidden="true" />{{ t('home.youthLed') }}</li>
        <li><Icon name="lucide:heart-handshake" aria-hidden="true" />{{ t('home.globalAction') }}</li>
        <li><Icon name="lucide:map-pin" aria-hidden="true" />{{ t('home.largeScale') }}</li>
      </ul>
    </section>

    <section class="pathways-section" aria-labelledby="pathways-title" data-reveal>
      <header class="pathways-heading">
        <div>
          <p class="eyebrow"><span class="eyebrow-mark" aria-hidden="true" />{{ t('home.exploreTitle') }}</p>
          <h2 id="pathways-title">{{ t('home.ourWork') }}</h2>
        </div>
        <p class="pathways-intro">{{ t('home.subtitle') }}</p>
      </header>

      <div class="pathway-list">
        <article class="pathway-row">
          <div class="pathway-icon pathway-icon--grants"><Icon name="lucide:hand-heart" aria-hidden="true" /></div>
          <div class="pathway-copy">
            <h3>{{ t('home.projectGrantsTitle') }}</h3>
            <p>{{ t('home.projectGrantsDesc') }}</p>
          </div>
          <nav class="pathway-actions" :aria-label="`${t('home.projectGrantsTitle')} — ${t('home.dataMaps')}`">
            <NuxtLink data-testid="home-project-grants-2d" to="/project-grants" class="pathway-view-link" :aria-label="`${t('home.projectGrantsTitle')} — ${t('home.view2d')}`">{{ t('home.view2d') }}</NuxtLink>
            <NuxtLink data-testid="home-project-grants-3d" to="/project-grants/3d" class="pathway-view-link" :aria-label="`${t('home.projectGrantsTitle')} — ${t('home.view3d')}`">{{ t('home.view3d') }}</NuxtLink>
          </nav>
        </article>
        <article class="pathway-row">
          <div class="pathway-icon pathway-icon--species"><Icon name="lucide:bird" aria-hidden="true" /></div>
          <div class="pathway-copy">
            <h3>{{ t('home.speciesTitle') }}</h3>
            <p>{{ t('home.speciesDesc') }}</p>
          </div>
          <nav class="pathway-actions" :aria-label="`${t('home.speciesTitle')} — ${t('home.dataMaps')}`">
            <NuxtLink data-testid="home-species-2d" to="/endangered-species" class="pathway-view-link" :aria-label="`${t('home.speciesTitle')} — ${t('home.view2d')}`">{{ t('home.view2d') }}</NuxtLink>
            <NuxtLink data-testid="home-species-3d" to="/endangered-species/3d" class="pathway-view-link" :aria-label="`${t('home.speciesTitle')} — ${t('home.view3d')}`">{{ t('home.view3d') }}</NuxtLink>
          </nav>
        </article>
        <article class="pathway-row">
          <div class="pathway-icon pathway-icon--campaigns"><Icon name="lucide:megaphone" aria-hidden="true" /></div>
          <div class="pathway-copy">
            <h3>{{ t('home.campaignsTitle') }}</h3>
            <p>{{ t('home.campaignsDesc') }}</p>
          </div>
          <NuxtLink data-testid="home-campaigns-link" to="/campaigns" class="pathway-link" :aria-label="`${t('home.campaignsTitle')} — ${t('home.exploreTitle')}`">
            <Icon name="lucide:arrow-up-right" aria-hidden="true" />
          </NuxtLink>
        </article>
        <article class="pathway-row">
          <div class="pathway-icon pathway-icon--crews"><Icon name="lucide:users-round" aria-hidden="true" /></div>
          <div class="pathway-copy">
            <h3>{{ t('home.activeCrewsTitle') }}</h3>
            <p>{{ t('home.activeCrewsDesc') }}</p>
          </div>
          <nav class="pathway-actions" :aria-label="`${t('home.activeCrewsTitle')} — ${t('home.dataMaps')}`">
            <NuxtLink data-testid="home-active-crews-2d" to="/active-crews" class="pathway-view-link" :aria-label="`${t('home.activeCrewsTitle')} — ${t('home.view2d')}`">{{ t('home.view2d') }}</NuxtLink>
            <NuxtLink data-testid="home-active-crews-3d" to="/active-crews/3d" class="pathway-view-link" :aria-label="`${t('home.activeCrewsTitle')} — ${t('home.view3d')}`">{{ t('home.view3d') }}</NuxtLink>
          </nav>
        </article>
        <article class="pathway-row">
          <div class="pathway-icon pathway-icon--projects"><Icon name="lucide:mountain" aria-hidden="true" /></div>
          <div class="pathway-copy">
            <h3>{{ t('home.crewProjectsTitle') }}</h3>
            <p>{{ t('home.crewProjectsDesc') }}</p>
          </div>
          <NuxtLink data-testid="home-crew-projects-link" to="/crew-projects" class="pathway-link" :aria-label="`${t('home.crewProjectsTitle')} — ${t('home.exploreTitle')}`">
            <Icon name="lucide:arrow-up-right" aria-hidden="true" />
          </NuxtLink>
        </article>
        <article class="pathway-row">
          <div class="pathway-icon pathway-icon--vulcan"><Icon name="lucide:microscope" aria-hidden="true" /></div>
          <div class="pathway-copy">
            <h3>{{ t('home.vulcanTitle') }}</h3>
            <p>{{ t('home.vulcanDesc') }}</p>
          </div>
          <nav class="pathway-actions" :aria-label="`${t('home.vulcanTitle')} — ${t('home.dataMaps')}`">
            <NuxtLink data-testid="home-vulcan-2d" to="/vulcan-observatory" class="pathway-view-link" :aria-label="`${t('home.vulcanTitle')} — ${t('home.view2d')}`">{{ t('home.view2d') }}</NuxtLink>
            <NuxtLink data-testid="home-vulcan-3d" to="/vulcan-observatory/3d" class="pathway-view-link" :aria-label="`${t('home.vulcanTitle')} — ${t('home.view3d')}`">{{ t('home.view3d') }}</NuxtLink>
          </nav>
        </article>
      </div>
    </section>

    <section class="join-section" aria-labelledby="join-title" data-reveal>
      <div class="join-mark" aria-hidden="true"><Icon name="lucide:heart-handshake" /></div>
      <div class="join-copy">
        <p class="eyebrow">{{ t('home.youthLed') }}</p>
        <h2 id="join-title">{{ t('home.startACrewTitle') }}</h2>
        <p>{{ t('home.startACrewDesc') }}</p>
      </div>
      <a href="https://www.earthguardians.org/crews" target="_blank" rel="noopener noreferrer" class="join-link">
        {{ t('home.startACrewTitle') }}
        <Icon name="lucide:arrow-up-right" aria-hidden="true" />
      </a>
    </section>

    <footer class="home-footer">
      <span class="home-footer-text">{{ t('home.footer') }}</span>
      <nav class="home-footer-links" :aria-label="t('home.exploreTitle')">
        <a href="https://www.earthguardians.org" target="_blank" rel="noopener noreferrer">earthguardians.org</a>
        <NuxtLink to="/info">{{ t('nav.info') }}</NuxtLink>
        <NuxtLink to="/campaigns">{{ t('home.campaignsTitle') }}</NuxtLink>
        <NuxtLink to="/masterclasses">{{ t('home.masterclassesTitle') }}</NuxtLink>
        <NuxtLink to="/privacy">{{ t('nav.privacy') }}</NuxtLink>
        <NuxtLink to="/terms">{{ t('nav.terms') }}</NuxtLink>
      </nav>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { allProjectsData } from '@/lib/project-data'
import { crewOverallStats } from '@/lib/crew-data'
import { formatCompact } from '@/lib/utils'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL
const homeRoot = ref<HTMLElement | null>(null)
const speciesCount = ref<number | null>(null)
let revealObserver: IntersectionObserver | null = null
const abortController = new AbortController()

const projectStats = computed(() => {
  const totalDirect = allProjectsData.reduce((sum, project) => sum + project.direct_beneficiaries, 0)
  const totalIndirect = allProjectsData.reduce((sum, project) => sum + project.indirect_beneficiaries, 0)
  return { totalProjects: allProjectsData.length, totalBeneficiaries: totalDirect + totalIndirect }
})
const overviewStats = computed(() => [
  { value: crewOverallStats.totalActiveCrews, label: t('home.crewsCount') },
  { value: projectStats.value.totalProjects, label: t('home.projectsCount') },
  { value: speciesCount.value ?? '—', label: t('home.speciesCount') },
  { value: crewOverallStats.totalCountries, label: t('home.countries') },
])

useHead({
  title: computed(() => `EG–Maps — ${t('home.subtitle')}`),
  meta: [
    { name: 'description', content: 'Explore Earth Guardians maps of youth-led Crews, community projects, climate campaigns and biodiversity — then act with the people behind the work.' },
    { property: 'og:title', content: 'EG–Maps — Official maps of Earth Guardians' },
    { property: 'og:description', content: 'Explore youth-led Crews, community projects, climate campaigns and biodiversity, mapped with the people behind the work.' },
    { property: 'og:type', content: 'website' },
  ],
})

onMounted(() => {
  const root = homeRoot.value
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // The bento hero is intentionally static; only content below it reveals on scroll.
  if (root && 'IntersectionObserver' in window && !reducedMotion) {
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (targets.length) {
      root.classList.add('reveal-ready')
      revealObserver = new IntersectionObserver((entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
      targets.forEach(target => revealObserver?.observe(target))
    }
  }

  void fetch(`${baseURL}data/species/index.json`, { signal: abortController.signal })
    .then(response => response.ok ? response.json() : null)
    .then(index => {
      if (!index) return
      const datasets = Array.isArray(index.datasets) ? index.datasets : []
      speciesCount.value = datasets.reduce((total: number, dataset: { speciesCount?: number }) => total + (dataset.speciesCount ?? 0), 0)
    })
    .catch(() => {
      // Keep the count unavailable when the static species index cannot be loaded.
    })
})

onUnmounted(() => {
  revealObserver?.disconnect()
  abortController.abort()
})

function trackGlow(event: MouseEvent) {
  const card = event.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  card.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
  card.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`)
}

function clearGlow(event: MouseEvent) {
  const card = event.currentTarget as HTMLElement
  card.style.setProperty('--mx', '50%')
  card.style.setProperty('--my', '50%')
}
</script>

<style scoped>
.home {
  min-height: 100svh;
  color: var(--text-primary);
  overflow: clip;
}
.home-hero {
  min-height: calc(100svh - 3.75rem);
  min-height: calc(100dvh - 3.75rem);
}
.home-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.42fr) minmax(0, 0.58fr);
  min-height: inherit;
}
.home-left {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(2rem, 5vh, 5rem) clamp(1.5rem, 4vw, 4rem);
  border-right: 1px solid var(--border-color);
}
.home-left-inner { width: 100%; max-width: 28rem; }
.home-logo {
  display: block;
  width: clamp(5.5rem, 10vw, 7.5rem);
  height: clamp(5.5rem, 10vw, 7.5rem);
  margin: 0 auto 1.5rem;
  border-radius: 10px;
  object-fit: contain;
}
.home-title {
  margin: 0;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(2.5rem, 5.5vw, 4.5rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.9;
}
.home-title-dot { color: var(--primary); }
.glass-line {
  display: inline;
  padding: 0.08em 0.28em;
  border: 1px solid color-mix(in srgb, var(--border-color) 48%, transparent);
  border-radius: 0.35em;
  background: color-mix(in srgb, var(--card) 82%, transparent);
  box-shadow: 0 1px 3px color-mix(in srgb, var(--shadow-color) 40%, transparent), inset 0 1px 0 color-mix(in srgb, var(--text-primary) 5%, transparent);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
.home-subtitle,
.home-submore { line-height: 1.9; }
.home-subtitle {
  max-width: 26rem;
  margin: 1rem 0 0;
  color: var(--text-primary);
  font-size: clamp(0.9rem, 1.3vw, 1.1rem);
  font-weight: 700;
  line-height: 1.5;
}
.home-submore {
  max-width: 26rem;
  margin: 0.6rem 0 0;
  color: var(--text-secondary);
  font-size: clamp(0.8rem, 1.1vw, 0.95rem);
  line-height: 1.65;
}
.home-orgline { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; }
.home-orglink {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 0.3rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 800;
  text-decoration: none;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}
.home-orglink :deep(svg) { width: 0.9rem; height: 0.9rem; }
.home-orglink:hover { border-color: var(--text-primary); background: var(--text-primary); color: var(--bg-primary); }
.home-orglink--muted { color: var(--text-secondary); }
.home-orglink--muted:hover { color: var(--bg-primary); }
.home-divider { width: 3rem; height: 1px; margin: 2rem 0; background: var(--border-color); }
.home-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem 1.5rem; }
.home-stat { display: flex; flex-direction: column; gap: 0.15rem; }
.home-stat-value {
  color: var(--text-primary);
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  letter-spacing: -0.06em;
  line-height: 1;
}
.home-stat-label { color: var(--text-muted); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.home-right { display: flex; align-items: center; justify-content: center; padding: clamp(1rem, 2.5vh, 2.5rem) clamp(1rem, 2.5vw, 2rem); }
.bento {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(9.6rem, auto);
  gap: 0.75rem;
}
.bento-card {
  --mx: 50%;
  --my: 50%;
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: color-mix(in srgb, var(--card) 91%, transparent);
  box-shadow: 0 1px 3px color-mix(in srgb, var(--shadow-color) 35%, transparent), inset 0 1px 0 color-mix(in srgb, var(--text-primary) 4%, transparent);
  backdrop-filter: blur(20px) saturate(1.35);
  -webkit-backdrop-filter: blur(20px) saturate(1.35);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
.bento-card:hover { transform: translateY(-2px); border-color: var(--accent); box-shadow: 0 12px 32px color-mix(in srgb, var(--shadow-color) 62%, transparent); }
.bento-glow {
  position: absolute;
  z-index: 0;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle 220px at var(--mx) var(--my), color-mix(in srgb, var(--accent) 28%, transparent), transparent 72%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 250ms ease;
}
.bento-card:hover .bento-glow { opacity: 0.7; }
.bento-accent {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.72;
}
.bento-body { position: relative; z-index: 1; display: flex; height: 100%; flex-direction: column; gap: 0.5rem; padding: 1rem; }
.bento-tall { grid-row: span 2; }
.bento-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  margin: 0.1rem 0;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 12%, var(--card));
  color: var(--accent);
}
.bento-icon :deep(svg) { width: 1.15rem; height: 1.15rem; }
.bento-title { margin: 0; color: var(--text-primary); font-size: 0.95rem; font-weight: 850; line-height: 1.25; }
.bento-desc {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.72rem;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.bento-kicker { margin: 0.1rem 0 0; color: var(--accent); font-size: 0.62rem; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; }
.bento-stats { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.25rem; }
.bento-stat { display: flex; min-width: 0; flex-direction: column; gap: 0.08rem; }
.bento-stat strong { color: var(--accent); font-size: 0.9rem; font-variant-numeric: tabular-nums; font-weight: 850; line-height: 1.2; }
.bento-stat span { color: var(--text-muted); font-size: 0.55rem; font-weight: 750; letter-spacing: 0.05em; text-transform: uppercase; }
.bento-links { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: auto; padding-top: 0.5rem; }
.bento-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.64rem;
  font-weight: 800;
  line-height: 1.15;
  text-decoration: none;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease, transform 150ms ease;
}
.bento-link :deep(svg) { width: 0.9rem; height: 0.9rem; flex: 0 0 auto; }
.bento-link:hover { transform: translateY(-1px); border-color: var(--accent); }
.bento-link--primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.bento-link--primary:hover { background: color-mix(in srgb, var(--accent) 90%, #000); color: #fff; }

.story-section,
.pathways-section,
.join-section { width: min(100% - 3rem, 76rem); margin-inline: auto; }
.story-section { padding: clamp(3.5rem, 8vw, 7rem) 0 clamp(4rem, 8vw, 7.5rem); border-top: 1px solid var(--border-color); }
.section-index { display: flex; align-items: center; gap: 0.7rem; color: var(--text-muted); font-size: 0.68rem; font-weight: 850; letter-spacing: 0.13em; text-transform: uppercase; }
.section-index span:first-child { display: grid; width: 1.75rem; aspect-ratio: 1; place-items: center; border: 1px solid var(--border-color); border-radius: 50%; color: var(--primary); letter-spacing: 0; }
.story-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.7fr); align-items: start; gap: clamp(2rem, 7vw, 7rem); margin-top: 1.5rem; }
.story-split h2,
.pathways-heading h2,
.join-copy h2 { margin: 0; font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif; font-size: clamp(1.8rem, 3.5vw, 3.4rem); font-weight: 900; letter-spacing: -0.055em; line-height: 1.08; text-wrap: balance; }
.story-copy p { margin: 0; color: var(--text-secondary); font-size: clamp(0.95rem, 1.35vw, 1.1rem); line-height: 1.8; }
.text-link { display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 1.2rem; color: var(--primary); font-size: 0.82rem; font-weight: 850; text-decoration: none; }
.text-link :deep(svg) { width: 0.95rem; height: 0.95rem; }
.text-link:hover { text-decoration: underline; text-underline-offset: 0.25em; }
.story-principles { display: flex; flex-wrap: wrap; gap: 0.65rem; margin: clamp(2rem, 5vw, 3.5rem) 0 0; padding: 0; list-style: none; }
.story-principles li { display: inline-flex; min-height: 2.65rem; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border: 1px solid var(--border-color); border-radius: 999px; background: var(--card); color: var(--text-secondary); font-size: 0.72rem; font-weight: 750; }
.story-principles :deep(svg) { width: 0.95rem; height: 0.95rem; color: var(--primary); }

.pathways-section { padding: clamp(3.5rem, 8vw, 7rem) 0; }
.pathways-heading { display: flex; align-items: end; justify-content: space-between; gap: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); }
.pathways-heading .eyebrow { margin: 0 0 0.6rem; }
.eyebrow { display: flex; align-items: center; gap: 0.55rem; color: var(--text-secondary); font-size: 0.7rem; font-weight: 850; letter-spacing: 0.13em; line-height: 1.4; text-transform: uppercase; }
.eyebrow-mark { width: 0.55rem; height: 0.55rem; flex: 0 0 auto; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 0.28rem color-mix(in srgb, var(--success) 16%, transparent); }
.pathways-heading h2 { font-size: clamp(2rem, 4vw, 3.8rem); }
.pathways-intro { max-width: 26rem; margin: 0 0 0.2rem; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.7; }
.pathway-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; margin-top: 1.4rem; }
.pathway-row {
  display: flex;
  min-width: 0;
  min-height: 15rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.15rem;
  border: 1px solid var(--border-color);
  border-radius: 0.9rem;
  background: var(--card);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--shadow-color) 24%, transparent);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.pathway-row:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--primary) 70%, var(--border-color)); box-shadow: 0 12px 24px color-mix(in srgb, var(--shadow-color) 26%, transparent); }
.pathway-icon { display: grid; width: 2.8rem; flex: 0 0 auto; aspect-ratio: 1; place-items: center; border-radius: 0.85rem; background: var(--bg-secondary); color: var(--primary); }
.pathway-icon :deep(svg) { width: 1.25rem; height: 1.25rem; }
.pathway-icon--species { color: var(--success); }
.pathway-icon--campaigns { color: var(--accent); }
.pathway-icon--crews { color: var(--warning); }
.pathway-icon--projects { color: #0d966b; }
.pathway-icon--vulcan { color: #96600a; }
.pathway-copy h3 { margin: 0; color: var(--text-primary); font-size: 0.96rem; font-weight: 850; line-height: 1.3; }
.pathway-copy p { margin: 0.35rem 0 0; color: var(--text-secondary); font-size: 0.75rem; line-height: 1.55; }
.pathway-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-top: auto; padding-top: 0.55rem; }
.pathway-view-link {
  display: inline-flex;
  min-height: 2.55rem;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.65rem;
  font-weight: 850;
  line-height: 1.1;
  text-decoration: none;
  white-space: nowrap;
  transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease;
}
.pathway-view-link:hover { transform: translateY(-1px); border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); }
.pathway-link { display: grid; width: 2.65rem; min-height: 2.65rem; place-items: center; align-self: flex-end; margin-top: auto; border: 1px solid var(--border-color); border-radius: 50%; color: var(--text-primary); transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease; }
.pathway-link :deep(svg) { width: 1rem; height: 1rem; }
.pathway-link:hover { transform: translate(2px, -2px); border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); }

.join-section { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: clamp(1rem, 3vw, 2.5rem); margin-top: clamp(2rem, 5vw, 4rem); margin-bottom: clamp(3rem, 7vw, 6rem); padding: clamp(1.5rem, 4vw, 3rem); border: 1px solid color-mix(in srgb, var(--primary) 55%, var(--border-color)); border-radius: 1.2rem; background: linear-gradient(115deg, color-mix(in srgb, var(--primary) 14%, var(--bg-secondary)), var(--card) 72%); }
.join-mark { display: grid; width: clamp(3rem, 6vw, 4.5rem); aspect-ratio: 1; place-items: center; border-radius: 50%; background: var(--primary); color: var(--primary-foreground); }
.join-mark :deep(svg) { width: 45%; height: 45%; }
.join-copy .eyebrow { margin: 0 0 0.45rem; }
.join-copy h2 { font-size: clamp(1.5rem, 2.5vw, 2.2rem); }
.join-copy > p:last-child { max-width: 34rem; margin: 0.45rem 0 0; color: var(--text-secondary); font-size: 0.82rem; line-height: 1.65; }
.join-link { display: inline-flex; min-height: 2.8rem; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem 0.9rem; border-radius: 0.7rem; background: var(--primary); color: var(--primary-foreground); font-size: 0.78rem; font-weight: 850; text-decoration: none; white-space: nowrap; transition: transform 160ms ease, filter 160ms ease; }
.join-link:hover { transform: translateY(-2px); filter: brightness(1.08); }
.join-link :deep(svg) { width: 0.95rem; height: 0.95rem; }
.home-footer { display: flex; flex-direction: column; align-items: center; gap: 0.65rem; padding: 1.2rem 1.5rem calc(5.5rem + env(safe-area-inset-bottom)); border-top: 1px solid var(--border-color); text-align: center; }
.home-footer-text { color: var(--text-muted); font-size: 0.62rem; font-weight: 750; letter-spacing: 0.07em; text-transform: uppercase; }
.home-footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem 1rem; }
.home-footer-links a { color: var(--text-secondary); font-size: 0.72rem; font-weight: 700; text-decoration: none; }
.home-footer-links a:hover { color: var(--text-primary); text-decoration: underline; text-underline-offset: 0.2em; }

.reveal-ready [data-reveal] { opacity: 0; transform: translateY(1.25rem); transition: opacity 650ms ease, transform 650ms cubic-bezier(0.2, 0.7, 0.2, 1); }
.reveal-ready [data-reveal].is-visible { opacity: 1; transform: translateY(0); }

@media (max-width: 960px) {
  .home-hero { min-height: auto; }
  .home-layout { grid-template-columns: 1fr; }
  .home-left { border-right: 0; border-bottom: 1px solid var(--border-color); padding: clamp(2rem, 5vh, 3rem) clamp(1.5rem, 4vw, 3rem); }
  .home-right { padding: clamp(1rem, 2vh, 2rem) clamp(1rem, 2.5vw, 2rem); }
  .home-left-inner { max-width: 42rem; }
  .home-logo { margin-inline: 0; }
  .pathways-heading { align-items: flex-start; flex-direction: column; gap: 0.85rem; }
  .pathway-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .home-left { padding: 2rem 1rem; }
  .home-logo { width: 5rem; height: 5rem; margin-bottom: 1.25rem; }
  .home-title { font-size: clamp(2rem, 12vw, 3rem); }
  .home-right { padding: 1rem; }
  .bento { grid-template-columns: 1fr; gap: 0.6rem; }
  .bento-tall { grid-row: span 1; }
  .bento-card { min-height: 11rem; }
  .story-section,
  .pathways-section,
  .join-section { width: min(100% - 2rem, 76rem); }
  .story-split { grid-template-columns: 1fr; gap: 1.2rem; }
  .pathway-list { grid-template-columns: 1fr; }
  .pathway-row { min-height: 12rem; }
  .join-section { grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 1rem; }
  .join-mark { width: 2.8rem; }
  .join-link { grid-column: 2; justify-self: start; }
}
@media (min-width: 1400px) {
  .bento { gap: 1rem; }
}
@media (prefers-reduced-motion: reduce) {
  .bento-card,
  .bento-glow,
  .bento-link,
  .home-orglink,
  .pathway-row,
  .pathway-link,
  .pathway-view-link,
  .join-link { transition: none; }
  .bento-card:hover,
  .pathway-row:hover,
  .pathway-link:hover,
  .pathway-view-link:hover,
  .join-link:hover { transform: none; }
  .bento-glow { display: none; }
  .reveal-ready [data-reveal] { opacity: 1; transform: none; transition: none; }
}
</style>
