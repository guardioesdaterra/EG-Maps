<template>
  <main id="main-content" ref="homeRoot" tabindex="-1" class="home">
    <PageTopbar />

    <section class="home-hero" aria-labelledby="home-title">
      <div class="hero-copy" data-reveal>
        <p class="eyebrow"><span class="eyebrow-mark" aria-hidden="true" />{{ t('home.title') }}</p>
        <h1 id="home-title">{{ t('home.footer') }}<span class="title-period">.</span></h1>
        <p class="hero-lede">{{ t('home.subtitleMore') }}</p>
        <p class="hero-context">{{ t('home.subtitle') }}</p>
        <nav class="hero-actions" :aria-label="t('home.exploreTitle')">
          <NuxtLink to="/project-grants" class="action-button action-button--primary">
            <Icon name="lucide:map" aria-hidden="true" />
            {{ t('home.exploreTitle') }}
            <Icon name="lucide:arrow-up-right" class="action-arrow" aria-hidden="true" />
          </NuxtLink>
          <a
            href="https://www.earthguardians.org/crews"
            target="_blank"
            rel="noopener noreferrer"
            class="action-button action-button--quiet"
          >
            <Icon name="lucide:users-round" aria-hidden="true" />
            {{ t('home.startACrewTitle') }}
            <Icon name="lucide:arrow-up-right" class="action-arrow" aria-hidden="true" />
          </a>
        </nav>
      </div>

      <div class="hero-art" aria-hidden="true" data-reveal>
        <div class="orbit orbit--outer" />
        <div class="orbit orbit--middle" />
        <div class="orbit orbit--inner" />
        <div class="hero-core">
          <img :src="`${baseURL}eg-logo.png`" alt="" class="hero-logo" />
        </div>
        <div class="orbit-node orbit-node--north"><Icon name="lucide:leaf" /></div>
        <div class="orbit-node orbit-node--east"><Icon name="lucide:users-round" /></div>
        <div class="orbit-node orbit-node--south"><Icon name="lucide:hand-heart" /></div>
        <div class="orbit-node orbit-node--west"><Icon name="lucide:globe-2" /></div>
        <div class="hero-art-caption">
          <span class="caption-dot" />
          <span>{{ t('home.youthLed') }}</span>
        </div>
        <span class="hero-art-note hero-art-note--one">{{ t('home.globalAction') }}</span>
        <span class="hero-art-note hero-art-note--two">{{ t('home.ourWork') }}</span>
      </div>

      <a class="scroll-cue" href="#home-story">
        <span>{{ t('home.exploreTitle') }}</span>
        <Icon name="lucide:arrow-down" aria-hidden="true" />
      </a>
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
      <a
        href="https://www.earthguardians.org/crews"
        target="_blank"
        rel="noopener noreferrer"
        class="join-link"
      >
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

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL
const homeRoot = ref<HTMLElement | null>(null)
let revealObserver: IntersectionObserver | null = null

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
  if (!root || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
  if (!targets.length) return
  root.classList.add('reveal-ready')
  revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })

  targets.forEach(target => revealObserver?.observe(target))
})

onUnmounted(() => revealObserver?.disconnect())
</script>

<style scoped>
.home {
  min-height: 100svh;
  color: var(--text-primary);
  overflow: clip;
}

.home-hero {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.95fr);
  align-items: center;
  gap: clamp(1.5rem, 5vw, 5rem);
  width: min(100% - 3rem, 84rem);
  min-height: max(42rem, 100svh);
  margin-inline: auto;
  padding: clamp(7rem, 12vh, 9rem) 0 clamp(5rem, 8vh, 7rem);
}
.home-hero::before {
  position: absolute;
  z-index: -1;
  inset: 8% -10% 3% 28%;
  content: '';
  background: radial-gradient(ellipse at 50% 46%, color-mix(in srgb, var(--primary) 13%, transparent), transparent 68%);
  pointer-events: none;
}
.hero-copy { max-width: 42rem; }
.eyebrow {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 1rem;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  line-height: 1.4;
  text-transform: uppercase;
}
.eyebrow-mark {
  width: 0.55rem;
  height: 0.55rem;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 0.28rem color-mix(in srgb, var(--success) 16%, transparent);
}
.home-hero h1 {
  max-width: 12ch;
  margin: 0;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(2.8rem, 6.4vw, 6rem);
  font-weight: 900;
  letter-spacing: -0.065em;
  line-height: 0.99;
  text-wrap: balance;
}
.title-period { color: var(--primary); }
.hero-lede {
  max-width: 38rem;
  margin: clamp(1.2rem, 3vh, 1.8rem) 0 0;
  color: var(--text-primary);
  font-size: clamp(1rem, 1.45vw, 1.25rem);
  font-weight: 600;
  line-height: 1.65;
  text-wrap: pretty;
}
.hero-context {
  max-width: 34rem;
  margin: 0.85rem 0 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.7;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.8rem;
}
.action-button {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--border-color);
  border-radius: 0.7rem;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 800;
  text-decoration: none;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease, color 180ms ease;
}
.action-button:hover { transform: translateY(-2px); }
.action-button--primary {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-foreground);
}
.action-button--primary:hover { filter: brightness(1.06); }
.action-button--quiet { background: var(--card); }
.action-button--quiet:hover { border-color: var(--primary); background: var(--bg-secondary); }
.action-arrow { width: 0.9rem; height: 0.9rem; margin-left: 0.15rem; opacity: 0.72; }

.hero-art {
  position: relative;
  display: grid;
  width: min(100%, 39rem);
  aspect-ratio: 1;
  place-items: center;
  justify-self: end;
  color: var(--primary);
}
.orbit {
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border-color));
  border-radius: 50%;
  pointer-events: none;
}
.orbit--outer { inset: 4%; border-style: dashed; opacity: 0.5; }
.orbit--middle { inset: 15%; opacity: 0.72; }
.orbit--inner { inset: 26%; border-color: color-mix(in srgb, var(--primary) 20%, transparent); }
.hero-core {
  display: grid;
  width: 35%;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--primary) 48%, var(--border-color));
  border-radius: 50%;
  background: color-mix(in srgb, var(--card) 82%, transparent);
  box-shadow: 0 1.5rem 5rem color-mix(in srgb, var(--primary) 18%, transparent), inset 0 0 2.5rem color-mix(in srgb, var(--primary) 9%, transparent);
  animation: core-breathe 6s ease-in-out infinite;
}
.hero-logo { width: 56%; height: 56%; object-fit: contain; }
.orbit-node {
  position: absolute;
  display: grid;
  width: clamp(2.7rem, 5vw, 4rem);
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  background: var(--card);
  color: var(--text-primary);
  box-shadow: var(--panel-shadow);
}
.orbit-node :deep(svg) { width: 42%; height: 42%; }
.orbit-node--north { top: 12%; left: 49%; transform: translateX(-50%); }
.orbit-node--east { top: 47%; right: 4%; }
.orbit-node--south { bottom: 9%; left: 46%; }
.orbit-node--west { top: 48%; left: 4%; }
.hero-art-caption {
  position: absolute;
  right: 3%;
  bottom: 23%;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--card);
  color: var(--text-primary);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow: var(--panel-shadow);
}
.caption-dot { width: 0.45rem; height: 0.45rem; border-radius: 50%; background: var(--success); }
.hero-art-note {
  position: absolute;
  color: var(--text-muted);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.hero-art-note--one { top: 22%; left: 5%; }
.hero-art-note--two { right: 7%; top: 20%; }
.scroll-cue {
  position: absolute;
  bottom: 1.2rem;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--text-muted);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-decoration: none;
  text-transform: uppercase;
}
.scroll-cue :deep(svg) { width: 0.85rem; height: 0.85rem; color: var(--primary); }
.scroll-cue:hover { color: var(--text-primary); }

.story-section,
.pathways-section,
.join-section {
  width: min(100% - 3rem, 76rem);
  margin-inline: auto;
}
.story-section {
  padding: clamp(3.5rem, 8vw, 7rem) 0 clamp(4rem, 8vw, 7.5rem);
  border-top: 1px solid var(--border-color);
}
.section-index {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.section-index span:first-child {
  display: grid;
  width: 1.75rem;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--primary);
  letter-spacing: 0;
}
.story-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.7fr);
  align-items: start;
  gap: clamp(2rem, 7vw, 7rem);
  margin-top: 1.5rem;
}
.story-split h2,
.pathways-heading h2,
.join-copy h2 {
  margin: 0;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.8rem, 3.5vw, 3.4rem);
  font-weight: 900;
  letter-spacing: -0.055em;
  line-height: 1.08;
  text-wrap: balance;
}
.story-copy p {
  margin: 0;
  color: var(--text-secondary);
  font-size: clamp(0.95rem, 1.35vw, 1.1rem);
  line-height: 1.8;
}
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1.2rem;
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 800;
  text-decoration: none;
}
.text-link :deep(svg) { width: 0.95rem; height: 0.95rem; }
.text-link:hover { text-decoration: underline; text-underline-offset: 0.25em; }
.story-principles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: clamp(2rem, 5vw, 3.5rem);
  padding: 0;
  list-style: none;
}
.story-principles li {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.65rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--card);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 750;
}
.story-principles :deep(svg) { width: 0.95rem; height: 0.95rem; color: var(--primary); }

.pathways-section { padding: clamp(3.5rem, 8vw, 7rem) 0; }
.pathways-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}
.pathways-heading .eyebrow { margin-bottom: 0.6rem; }
.pathways-heading h2 { font-size: clamp(2rem, 4vw, 3.8rem); }
.pathways-intro {
  max-width: 26rem;
  margin: 0 0 0.2rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.7;
}
.pathway-list { display: grid; grid-template-columns: 1fr 1fr; column-gap: clamp(1.5rem, 4vw, 4rem); }
.pathway-row {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  min-height: 8.5rem;
  padding: 1.15rem 0;
  border-bottom: 1px solid var(--border-color);
}
.pathway-icon {
  display: grid;
  width: 2.8rem;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 0.85rem;
  background: var(--bg-secondary);
  color: var(--primary);
}
.pathway-icon :deep(svg) { width: 1.25rem; height: 1.25rem; }
.pathway-icon--species { color: var(--success); }
.pathway-icon--campaigns { color: var(--accent); }
.pathway-icon--crews { color: var(--warning); }
.pathway-icon--projects { color: #0d966b; }
.pathway-icon--vulcan { color: #b7791f; }
.pathway-copy h3 { margin: 0; font-size: 0.96rem; font-weight: 850; line-height: 1.3; }
.pathway-copy p { margin: 0.35rem 0 0; color: var(--text-secondary); font-size: 0.75rem; line-height: 1.55; }
.pathway-actions { display: flex; align-items: center; gap: 0.4rem; }
.pathway-view-link {
  display: inline-flex;
  min-height: 2.3rem;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.62rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--card);
  color: var(--text-secondary);
  font-size: 0.65rem;
  font-weight: 800;
  line-height: 1.1;
  text-decoration: none;
  white-space: nowrap;
  transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease;
}
.pathway-view-link:hover { transform: translateY(-1px); border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); }
.pathway-link {
  display: grid;
  width: 2.5rem;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-secondary);
  transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease;
}
.pathway-link :deep(svg) { width: 1rem; height: 1rem; }
.pathway-link:hover { transform: translate(2px, -2px); border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); }

.join-section {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(1rem, 3vw, 2.5rem);
  margin-top: clamp(2rem, 5vw, 4rem);
  margin-bottom: clamp(3rem, 7vw, 6rem);
  padding: clamp(1.5rem, 4vw, 3rem);
  border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
  border-radius: 1.2rem;
  background: linear-gradient(115deg, color-mix(in srgb, var(--primary) 18%, var(--bg-secondary)), var(--card) 72%);
}
.join-mark {
  display: grid;
  width: clamp(3rem, 6vw, 4.5rem);
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  background: var(--primary);
  color: var(--primary-foreground);
}
.join-mark :deep(svg) { width: 45%; height: 45%; }
.join-copy .eyebrow { margin-bottom: 0.45rem; }
.join-copy h2 { font-size: clamp(1.5rem, 2.5vw, 2.2rem); }
.join-copy > p:last-child { max-width: 34rem; margin: 0.45rem 0 0; color: var(--text-secondary); font-size: 0.82rem; line-height: 1.65; }
.join-link {
  display: inline-flex;
  min-height: 2.8rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 0.9rem;
  border-radius: 0.7rem;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.78rem;
  font-weight: 850;
  text-decoration: none;
  white-space: nowrap;
  transition: transform 160ms ease, filter 160ms ease;
}
.join-link:hover { transform: translateY(-2px); filter: brightness(1.08); }
.join-link :deep(svg) { width: 0.95rem; height: 0.95rem; }

.home-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 1.2rem 1.5rem calc(5.5rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-color);
  text-align: center;
}
.home-footer-text { color: var(--text-muted); font-size: 0.62rem; font-weight: 750; letter-spacing: 0.07em; text-transform: uppercase; }
.home-footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem 1rem; }
.home-footer-links a { color: var(--text-secondary); font-size: 0.72rem; font-weight: 650; text-decoration: none; }
.home-footer-links a:hover { color: var(--text-primary); text-decoration: underline; text-underline-offset: 0.2em; }

.reveal-ready [data-reveal] { opacity: 0; transform: translateY(1.25rem); transition: opacity 650ms ease, transform 650ms cubic-bezier(0.2, 0.7, 0.2, 1); }
.reveal-ready [data-reveal].is-visible { opacity: 1; transform: translateY(0); }
.hero-art[data-reveal] { transition-delay: 120ms; }
@keyframes core-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.035); }
}

@media (max-width: 850px) {
  .home-hero {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    min-height: auto;
    padding-top: 7rem;
    padding-bottom: 5rem;
  }
  .hero-copy { max-width: 44rem; }
  .hero-art { width: min(82vw, 30rem); justify-self: center; }
  .scroll-cue { bottom: 1rem; }
  .story-split { grid-template-columns: 1fr; gap: 1.2rem; }
  .pathways-heading { align-items: start; flex-direction: column; gap: 0.85rem; }
}
@media (max-width: 620px) {
  .home-hero,
  .story-section,
  .pathways-section,
  .join-section { width: min(100% - 2rem, 76rem); }
  .home-hero { padding-top: 6.4rem; padding-bottom: 4.5rem; }
  .home-hero h1 { font-size: clamp(2.55rem, 12vw, 4.1rem); }
  .hero-lede { font-size: 0.98rem; }
  .hero-context { font-size: 0.83rem; }
  .hero-art { width: min(92vw, 25rem); }
  .hero-art-caption { right: 0; bottom: 20%; font-size: 0.58rem; }
  .hero-art-note { font-size: 0.53rem; }
  .hero-art-note--one { left: 0; }
  .hero-art-note--two { right: 0; }
  .scroll-cue { left: 0; }
  .pathway-list { grid-template-columns: 1fr; }
  .pathway-row { min-height: 7.5rem; grid-template-columns: 2.7rem minmax(0, 1fr) auto; gap: 0.75rem; }
  .pathway-icon { width: 2.55rem; }
  .join-section { grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 1rem; }
  .join-mark { width: 2.8rem; }
  .join-link { grid-column: 2; justify-self: start; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-core { animation: none; }
  .action-button, .pathway-link, .pathway-view-link, .join-link { transition: none; }
  .reveal-ready [data-reveal] { opacity: 1; transform: none; transition: none; }
}
</style>
