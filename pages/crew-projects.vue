<template>
  <main id="main-content" tabindex="-1" class="page">
    <PageTopbar show-back />

    <div class="page-shell">
      <!-- Header -->
      <header class="page-header">
        <img :src="`${baseURL}eg-logo.png`" alt="Earth Guardians" class="page-header-logo" />
        <h1 class="page-title">Crew Projects</h1>
        <p class="page-desc">
          Large-scale and small-scale projects led by EG Crews around the world, demonstrating the impact of youth-led climate action.
        </p>
      </header>

      <!-- Impact Summary -->
      <div class="impact-bar">
        <div class="impact-item">
          <strong>252</strong>
          <span>acres restored</span>
        </div>
        <div class="impact-divider" />
        <div class="impact-item">
          <strong>150K+</strong>
          <span>mangroves planted</span>
        </div>
        <div class="impact-divider" />
        <div class="impact-item">
          <strong>4</strong>
          <span>countries</span>
        </div>
        <div class="impact-divider" />
        <div class="impact-item">
          <strong>50+</strong>
          <span>women trained</span>
        </div>
      </div>

      <!-- Large-Scale Projects -->
      <section class="section" aria-labelledby="large-scale-title">
        <div class="section-head">
          <div class="section-label">
            <div class="section-icon section-icon--dark">
              <Icon name="lucide:mountain" class="h-5 w-5" />
            </div>
            <div>
              <span class="eyebrow">Major initiatives</span>
              <h2 id="large-scale-title" class="section-title">Large-Scale Crew Impact</h2>
            </div>
          </div>
          <p class="section-side">Major Crew initiatives that have created significant environmental and community impact across multiple countries.</p>
        </div>

        <div class="project-grid">
          <!-- Sherbro Island -->
          <article class="project-card">
            <div class="project-head">
              <h3 class="project-name">{{ t('crewProjects.sherbroTitle') }}</h3>
              <span class="project-location">{{ t('crewProjects.sherbroLocation') }}</span>
            </div>
            <ul class="project-list">
              <li><span class="bullet" />{{ t('crewProjects.sherbroItem1') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.sherbroItem2') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.sherbroItem3') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.sherbroItem4') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.sherbroItem5') }}</li>
            </ul>
          </article>

          <!-- Tagba -->
          <article class="project-card">
            <div class="project-head">
              <h3 class="project-name">{{ t('crewProjects.tagbaTitle') }}</h3>
              <span class="project-location">{{ t('crewProjects.tagbaLocation') }}</span>
            </div>
            <ul class="project-list">
              <li><span class="bullet" />{{ t('crewProjects.tagbaItem1') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.tagbaItem2') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.tagbaItem3') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.tagbaItem4') }}</li>
            </ul>
          </article>

          <!-- Matchalè -->
          <article class="project-card">
            <div class="project-head">
              <h3 class="project-name">{{ t('crewProjects.matchaleTitle') }}</h3>
              <span class="project-location">{{ t('crewProjects.matchaleLocation') }}</span>
            </div>
            <ul class="project-list">
              <li><span class="bullet" />{{ t('crewProjects.matchaleItem1') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.matchaleItem2') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.matchaleItem3') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.matchaleItem4') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.matchaleItem5') }}</li>
            </ul>
          </article>

          <!-- Amegnran -->
          <article class="project-card">
            <div class="project-head">
              <h3 class="project-name">{{ t('crewProjects.amegnranTitle') }}</h3>
              <span class="project-location">{{ t('crewProjects.amegnranLocation') }}</span>
            </div>
            <ul class="project-list">
              <li><span class="bullet" />{{ t('crewProjects.amegnranItem1') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.amegnranItem2') }}</li>
              <li><span class="bullet" />{{ t('crewProjects.amegnranItem3') }}</li>
            </ul>
          </article>
        </div>

        <div class="impact-callout">
          <p>{{ t('crewProjects.combinedImpact') }}</p>
        </div>
      </section>

      <!-- Small-Scale Projects -->
      <section class="section" aria-labelledby="small-scale-title">
        <div class="section-head">
          <div class="section-label">
            <div class="section-icon section-icon--light">
              <Icon name="lucide:sprout" class="h-5 w-5" />
            </div>
            <div>
              <span class="eyebrow">Grassroots work</span>
              <h2 id="small-scale-title" class="section-title">Small-Scale Crew Projects</h2>
            </div>
          </div>
          <p class="section-side">Crew work that isn't yet at the large-scale level but still makes a meaningful impact in communities worldwide.</p>
        </div>

        <div class="small-grid">
          <div class="small-card">
            <Icon name="lucide:book-open" class="h-5 w-5" />
            <h3>{{ t('crewProjects.educationTitle') }}</h3>
            <p>{{ t('crewProjects.educationDesc') }}</p>
          </div>
          <div class="small-card">
            <Icon name="lucide:palette" class="h-5 w-5" />
            <h3>{{ t('crewProjects.artivismTitle') }}</h3>
            <p>{{ t('crewProjects.artivismDesc') }}</p>
          </div>
          <div class="small-card">
            <Icon name="lucide:heart-handshake" class="h-5 w-5" />
            <h3>{{ t('crewProjects.communityTitle') }}</h3>
            <p>{{ t('crewProjects.communityDesc') }}</p>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="section">
        <div class="cta-block">
          <h2 class="cta-title">{{ t('crewProjects.ctaTitle') }}</h2>
          <p class="cta-desc">{{ t('crewProjects.ctaDesc') }}</p>
          <a
            href="https://www.earthguardians.org/crews"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-btn"
          >
            <Icon name="lucide:rocket" class="h-4 w-4" />
            {{ t('crewProjects.startCrew') }}
          </a>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n()

useHead({
  title: computed(() => `${t('crewProjects.title')} — Earth Guardians`),
  meta: [
    { name: 'description', content: computed(() => t('crewProjects.description')) },
    { property: 'og:title', content: computed(() => t('crewProjects.title')) },
    { property: 'og:description', content: computed(() => t('crewProjects.description')) },
  ],
})
</script>

<style scoped>
/* ══════════════════════════════════════════════
   Crew Projects Page — Theme-Aware
   ══════════════════════════════════════════════ */
.page {
  min-height: 100svh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* ── Shell ── */
.page-shell {
  width: min(100% - 2rem, 72rem);
  margin: 0 auto;
  padding: clamp(2rem, 5vh, 4rem) 0 clamp(4rem, 8vh, 6rem);
}

/* ── Shared ── */
.eyebrow {
  display: block;
  margin: 0;
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* ── Header ── */
.page-header { margin-bottom: clamp(2rem, 4vh, 3rem); }
.page-header-logo { height: clamp(2rem, 5vw, 3.5rem); width: auto; margin-bottom: 1.5rem; }
.page-title {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.95;
  margin: 0;
}
.page-desc {
  margin: 1rem 0 0;
  font-size: clamp(0.9rem, 1.3vw, 1.05rem);
  line-height: 1.6;
  color: var(--text-secondary);
  max-width: 42rem;
}

/* ── Impact Bar ── */
.impact-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  margin-bottom: clamp(2rem, 4vh, 3rem);
}
.impact-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  text-align: center;
}
.impact-item strong {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  color: var(--primary);
}
.impact-item span {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.impact-divider {
  width: 1px;
  height: 2rem;
  background: var(--border-color);
  flex-shrink: 0;
}

/* ── Sections ── */
.section {
  margin-bottom: clamp(2.5rem, 5vh, 4rem);
}
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 1.5rem;
}
.section-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.section-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}
.section-icon--dark {
  background: var(--text-primary);
  color: var(--bg-primary);
}
.section-icon--light {
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
}
.section-title {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  margin: 0.25rem 0 0;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 900;
  letter-spacing: -0.03em;
}
.section-side {
  max-width: 340px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.55;
}

/* ── Project Cards ── */
.project-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.project-card {
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: border-color 0.2s;
}
.project-card:hover { border-color: var(--primary); }
.project-head { margin-bottom: 0.75rem; }
.project-name {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0 0 0.2rem;
}
.project-location {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.project-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.project-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-secondary);
}
.bullet {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-primary);
  margin-top: 0.4rem;
}

/* ── Impact Callout ── */
.impact-callout {
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.impact-callout p {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
  color: var(--text-primary);
}

/* ── Small-Scale Grid ── */
.small-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.small-card {
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.small-card > svg {
  color: var(--primary);
  margin-bottom: 0.75rem;
}
.small-card h3 {
  font-size: 0.85rem;
  font-weight: 800;
  margin: 0 0 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.small-card p {
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0;
}

/* ── CTA Block ── */
.cta-block {
  padding: clamp(1.5rem, 3vw, 2.5rem);
  border-radius: 10px;
  background: var(--text-primary);
  color: var(--bg-primary);
  text-align: center;
}
.cta-title {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  margin: 0 0 0.5rem;
}
.cta-desc {
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0 0 1.25rem;
  max-width: 36rem;
  margin-left: auto;
  margin-right: auto;
}
.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.25rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: opacity 0.15s;
}
.cta-btn:hover { opacity: 0.85; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .section-head { display: block; }
  .section-side { margin-top: 0.75rem; }
  .project-grid { grid-template-columns: 1fr; }
  .small-grid { grid-template-columns: 1fr; }
  .impact-bar { flex-wrap: wrap; gap: 0.75rem; }
  .impact-divider { display: none; }
  .impact-item { min-width: 40%; }
}
</style>
