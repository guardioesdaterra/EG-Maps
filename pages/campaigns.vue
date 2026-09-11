<template>
  <main id="main-content" tabindex="-1" class="page">
    <PageTopbar show-back />

    <div class="page-shell">
      <!-- Hero -->
      <header class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Earth Guardians · campaigns &amp; action</span>
          <h1 class="hero-title">{{ t('campaigns.heroTitle') }}</h1>
          <p class="hero-lede">{{ t('campaigns.heroDesc') }}</p>
          <div class="hero-actions">
            <a class="btn btn--primary" href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer">
              {{ t('campaigns.exploreResources') }}
              <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" />
            </a>
            <NuxtLink class="btn btn--secondary" to="/active-crews">
              {{ t('campaigns.seeCrewNetwork') }}
              <Icon name="lucide:map" class="h-3.5 w-3.5" />
            </NuxtLink>
          </div>
        </div>
        <aside class="hero-note">
          <span class="hero-note-idx">01 / 04</span>
          <strong>{{ t('campaigns.heroNote') }}</strong>
          <p>{{ t('campaigns.heroNoteDesc') }}</p>
        </aside>
      </header>

      <!-- How Species Connects to Crews -->
      <section class="section" aria-labelledby="connection-title">
        <div class="section-head">
          <div>
            <span class="eyebrow">How it connects</span>
            <h2 id="connection-title" class="section-title">{{ t('campaigns.connectionTitle') }}</h2>
          </div>
          <p class="section-side">{{ t('campaigns.connectionDesc') }}</p>
        </div>
        <div class="connection-flow">
          <div class="flow-step">
            <div class="flow-icon flow-icon--discover"><Icon name="lucide:bird" /></div>
            <h3 class="flow-title">{{ t('campaigns.discover') }}</h3>
            <p class="flow-desc">{{ t('campaigns.discoverDesc') }}</p>
            <NuxtLink to="/endangered-species" class="flow-link">Open Species Map <Icon name="lucide:arrow-right" class="h-3 w-3" /></NuxtLink>
          </div>
          <div class="flow-arrow"><Icon name="lucide:arrow-right" class="h-4 w-4" /></div>
          <div class="flow-step">
            <div class="flow-icon flow-icon--organize"><Icon name="lucide:users-round" /></div>
            <h3 class="flow-title">{{ t('campaigns.organize') }}</h3>
            <p class="flow-desc">{{ t('campaigns.organizeDesc') }}</p>
            <NuxtLink to="/active-crews" class="flow-link">Find a Crew <Icon name="lucide:arrow-right" class="h-3 w-3" /></NuxtLink>
          </div>
          <div class="flow-arrow"><Icon name="lucide:arrow-right" class="h-4 w-4" /></div>
          <div class="flow-step">
            <div class="flow-icon flow-icon--act"><Icon name="lucide:rocket" /></div>
            <h3 class="flow-title">{{ t('campaigns.act') }}</h3>
            <p class="flow-desc">{{ t('campaigns.actDesc') }}</p>
            <NuxtLink to="/crew-projects" class="flow-link">See Projects <Icon name="lucide:arrow-right" class="h-3 w-3" /></NuxtLink>
          </div>
        </div>
      </section>

      <!-- Campaign Library -->
      <section class="section" aria-labelledby="library-title">
        <div class="section-head">
          <div>
            <span class="eyebrow">Campaign library</span>
            <h2 id="library-title" class="section-title">{{ t('campaigns.libraryTitle') }}</h2>
          </div>
          <p class="section-side">{{ t('campaigns.libraryDesc') }}</p>
        </div>
        <div class="campaign-grid">
          <article class="campaign-card campaign-card--featured">
            <div class="card-top">
              <span class="card-kicker">Biodiversity · live map</span>
              <Icon name="lucide:leaf" class="h-5 w-5" />
            </div>
            <h3>{{ t('campaigns.endangeredSpeciesTitle') }}</h3>
            <p>{{ t('campaigns.endangeredSpeciesDesc') }}</p>
            <div class="card-tags"><span>2D map + 3D globe</span><span>Data explorer</span></div>
            <div class="card-actions">
              <NuxtLink class="btn btn--primary" to="/endangered-species">Open 2D map <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" /></NuxtLink>
              <NuxtLink class="text-link" to="/endangered-species/3d">Open 3D globe <Icon name="lucide:globe-2" class="h-3.5 w-3.5" /></NuxtLink>
            </div>
          </article>

          <article class="campaign-card">
            <div class="card-top">
              <span class="card-kicker">Climate action · collective day</span>
              <Icon name="lucide:megaphone" class="h-5 w-5" />
            </div>
            <h3>{{ t('campaigns.chooseActionTitle') }}</h3>
            <p>{{ t('campaigns.chooseActionDesc') }}</p>
            <div class="card-tags"><span>Toolkit</span><span>Direct action</span></div>
            <div class="card-actions">
              <a class="btn btn--secondary" href="https://www.earthguardians.org/can" target="_blank" rel="noopener noreferrer">Learn about CAN <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" /></a>
            </div>
          </article>

          <article class="campaign-card">
            <div class="card-top">
              <span class="card-kicker">Systems · everyday action</span>
              <Icon name="lucide:recycle" class="h-5 w-5" />
            </div>
            <h3>{{ t('campaigns.sustainableTitle') }}</h3>
            <p>{{ t('campaigns.sustainableDesc') }}</p>
            <div class="card-tags"><span>Waste reduction</span><span>Toolkits</span></div>
            <div class="card-actions">
              <a class="btn btn--secondary" href="https://www.earthguardians.org/sustainable-solutions-waste-reduction" target="_blank" rel="noopener noreferrer">Explore solutions <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" /></a>
            </div>
          </article>

          <article class="campaign-card">
            <div class="card-top">
              <span class="card-kicker">People · network</span>
              <Icon name="lucide:users-round" class="h-5 w-5" />
            </div>
            <h3>{{ t('campaigns.crewsTitle') }}</h3>
            <p>{{ t('campaigns.crewsDesc') }}</p>
            <div class="card-tags"><span>Global network</span><span>Local projects</span></div>
            <div class="card-actions">
              <NuxtLink class="btn btn--secondary" to="/active-crews">Find a crew <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" /></NuxtLink>
            </div>
          </article>

          <article class="campaign-card">
            <div class="card-top">
              <span class="card-kicker">Resources · funding</span>
              <Icon name="lucide:hand-heart" class="h-5 w-5" />
            </div>
            <h3>{{ t('campaigns.grantsTitle') }}</h3>
            <p>{{ t('campaigns.grantsDesc') }}</p>
            <div class="card-tags"><span>Micro-grants</span><span>Project guides</span></div>
            <div class="card-actions">
              <NuxtLink class="btn btn--secondary" to="/project-grants">Explore grant projects <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" /></NuxtLink>
            </div>
          </article>
        </div>
      </section>

      <!-- Pathway -->
      <section class="section" aria-labelledby="pathway-title">
        <div class="section-head">
          <div>
            <span class="eyebrow">A simple pathway</span>
            <h2 id="pathway-title" class="section-title">{{ t('campaigns.pathwayTitle') }}</h2>
          </div>
          <p class="section-side">{{ t('campaigns.pathwayDesc') }}</p>
        </div>
        <div class="pathway-grid">
          <div class="pathway-step">
            <span class="pathway-num">01</span>
            <Icon name="lucide:book-open" class="h-6 w-6" />
            <h3>Learn</h3>
            <p>{{ t('campaigns.pathwayLearn') }}</p>
            <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer" class="text-link">{{ t('campaigns.browseResources') }} <Icon name="lucide:arrow-up-right" class="h-3 w-3" /></a>
          </div>
          <div class="pathway-step">
            <span class="pathway-num">02</span>
            <Icon name="lucide:handshake" class="h-6 w-6" />
            <h3>Organize</h3>
            <p>{{ t('campaigns.pathwayOrganize') }}</p>
            <a href="https://www.earthguardians.org/crews" target="_blank" rel="noopener noreferrer" class="text-link">{{ t('campaigns.joinACrew') }} <Icon name="lucide:arrow-up-right" class="h-3 w-3" /></a>
          </div>
          <div class="pathway-step">
            <span class="pathway-num">03</span>
            <Icon name="lucide:sparkles" class="h-6 w-6" />
            <h3>Fund</h3>
            <p>{{ t('campaigns.pathwayFund') }}</p>
            <NuxtLink to="/project-grants" class="text-link">{{ t('campaigns.seeGrants') }} <Icon name="lucide:arrow-right" class="h-3 w-3" /></NuxtLink>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="section">
        <div class="cta-block">
          <span class="eyebrow eyebrow--light">The movement is open</span>
          <h2 class="cta-title">{{ t('campaigns.ctaTitle') }}</h2>
          <p class="cta-desc">{{ t('campaigns.ctaDesc') }}</p>
          <a class="btn btn--light" href="https://www.earthguardians.org/crews" target="_blank" rel="noopener noreferrer">
            {{ t('campaigns.becomeGuardian') }}
            <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <p class="source-note">Campaign context adapted from Earth Guardians' official <a href="https://www.earthguardians.org/" target="_blank" rel="noopener noreferrer">mission</a>, <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer">resources</a>, <a href="https://www.earthguardians.org/can" target="_blank" rel="noopener noreferrer">CAN</a> and <a href="https://www.earthguardians.org/youth-leadership-training" target="_blank" rel="noopener noreferrer">youth leadership</a> pages.</p>
    </div>
  </main>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: 'Campaigns — Earth Guardians',
  meta: [{ name: 'description', content: 'Explore Earth Guardians campaigns, biodiversity data, youth-led action, crews and project grants.' }],
})
</script>

<style scoped>
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
.eyebrow--light { color: var(--text-muted); }

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  min-height: 40px;
}
.btn--primary { background: var(--text-primary); color: var(--bg-primary); }
.btn--primary:hover { opacity: 0.85; }
.btn--secondary {
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  background: transparent;
}
.btn--secondary:hover { background: var(--text-primary); color: var(--bg-primary); }
.btn--light { background: var(--bg-primary); color: var(--text-primary); }
.btn--light:hover { opacity: 0.85; }
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
}
.text-link:hover { opacity: 0.8; }

/* ── Hero ── */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(220px, 0.65fr);
  gap: clamp(2rem, 8vw, 6rem);
  align-items: end;
  padding-bottom: clamp(2.5rem, 6vw, 5rem);
  border-bottom: 1px solid var(--border-color);
}
.hero-title {
  max-width: 790px;
  margin: 0.6rem 0 1rem;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(2.5rem, 6vw, 5.5rem);
  font-weight: 900;
  line-height: 0.93;
  letter-spacing: -0.07em;
}
.hero-lede {
  max-width: 520px;
  margin: 0;
  color: var(--text-secondary);
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  line-height: 1.55;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.5rem;
}
.hero-note {
  padding: 1.25rem 0 0 1.25rem;
  border-left: 1px solid var(--border-color);
}
.hero-note-idx {
  display: block;
  margin-bottom: 2.5rem;
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.hero-note strong {
  display: block;
  max-width: 220px;
  font-size: 1.15rem;
  line-height: 1.15;
}
.hero-note p {
  max-width: 240px;
  margin: 0.7rem 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.55;
}

/* ── Sections ── */
.section {
  padding: clamp(2rem, 5vw, 4rem) 0;
  border-bottom: 1px solid var(--border-color);
}
.section:last-of-type { border-bottom: none; }
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 1.5rem;
}
.section-title {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  margin: 0.4rem 0 0;
  font-size: clamp(1.75rem, 3.5vw, 3rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.05em;
}
.section-side {
  max-width: 340px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.55;
}

/* ── Connection Flow ── */
.connection-flow {
  display: flex;
  align-items: stretch;
  gap: 0;
}
.flow-step {
  flex: 1;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.flow-icon {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  margin-bottom: 0.75rem;
}
.flow-icon--discover { background: #27ae60; color: #fff; }
.flow-icon--organize { background: #8e44ad; color: #fff; }
.flow-icon--act { background: #06b6d4; color: #fff; }
.flow-title {
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0 0 0.3rem;
}
.flow-desc {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0 0 0.75rem;
}
.flow-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
}
.flow-link:hover { opacity: 0.8; }
.flow-arrow {
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  color: var(--text-muted);
}

/* ── Campaign Grid ── */
.campaign-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.campaign-card {
  display: flex;
  flex-direction: column;
  padding: clamp(1rem, 2.5vw, 1.5rem);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: border-color 0.2s;
}
.campaign-card:hover { border-color: var(--primary); }
.campaign-card--featured {
  border-color: var(--primary);
  background: var(--bg-secondary);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: auto;
}
.card-top > svg { color: var(--primary); }
.card-kicker {
  color: var(--primary);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.campaign-card h3 {
  margin: 1.5rem 0 0.5rem;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  font-weight: 900;
  letter-spacing: -0.03em;
}
.campaign-card p {
  max-width: 42ch;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.55;
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: auto;
  padding-top: 1.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.card-tags span + span::before {
  content: '·';
  margin-right: 0.4rem;
  color: var(--text-muted);
  opacity: 0.5;
}
.card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1rem;
}

/* ── Pathway ── */
.pathway-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.pathway-step {
  position: relative;
  padding: 1.25rem 0;
  border-top: 2px solid var(--text-primary);
}
.pathway-num {
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.pathway-step > svg {
  display: block;
  margin: 1.5rem 0 0.75rem;
  color: var(--text-primary);
}
.pathway-step h3 {
  margin: 0 0 0.4rem;
  font-size: 1.15rem;
  font-weight: 900;
}
.pathway-step p {
  max-width: 30ch;
  margin: 0 0 0.75rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.55;
}

/* ── CTA Block ── */
.cta-block {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  padding: clamp(1.5rem, 3.5vw, 2.5rem);
  border-radius: 10px;
  background: var(--text-primary);
  color: var(--bg-primary);
}
.cta-title {
  max-width: 550px;
  margin: 0.5rem 0 0.6rem;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.6rem, 3.5vw, 3rem);
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: -0.05em;
}
.cta-desc {
  max-width: 480px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.55;
}
.source-note {
  margin: 2rem 0 0;
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.5;
}
.source-note a { color: inherit; text-decoration: underline; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero,
  .section-head,
  .cta-block {
    display: block;
  }
  .hero-note { margin-top: 2rem; padding-top: 1rem; padding-left: 1rem; }
  .hero-note-idx { margin-bottom: 1rem; }
  .section-side { margin-top: 0.75rem; }
  .campaign-grid,
  .pathway-grid { grid-template-columns: 1fr; }
  .connection-flow { flex-direction: column; gap: 0.5rem; }
  .flow-arrow { transform: rotate(90deg); padding: 0.25rem 0; justify-content: center; }
  .cta-block .btn { margin-top: 1.25rem; }
}
</style>
