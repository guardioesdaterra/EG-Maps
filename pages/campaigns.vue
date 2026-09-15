<template>
  <main id="main-content" tabindex="-1" class="page">
    <PageTopbar show-back />

    <div class="page-shell">
      <!-- Hero -->
      <header class="hero">
        <div class="hero-copy">
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
          <strong>{{ t('campaigns.heroNote') }}</strong>
          <p>{{ t('campaigns.heroNoteDesc') }}</p>
        </aside>
      </header>

      <!-- How Species Connects to Crews -->
      <section class="section" aria-labelledby="connection-title">
        <div class="section-head">
          <div>
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
            <h2 id="library-title" class="section-title">{{ t('campaigns.libraryTitle') }}</h2>
          </div>
          <p class="section-side">{{ t('campaigns.libraryDesc') }}</p>
        </div>
        <div class="campaign-grid">
          <article v-for="c in campaigns" :key="c.title" class="campaign-card">
            <div class="card-top">
              <span class="card-kicker">{{ c.kicker }}</span>
              <Icon :name="c.icon" class="h-5 w-5" />
            </div>
            <h3>{{ c.title }}</h3>
            <p>{{ c.desc }}</p>
            <ul class="card-stats">
              <li v-for="s in c.stats" :key="s">{{ s }}</li>
            </ul>
            <div class="card-tags"><span>{{ c.tags }}</span></div>
            <div class="card-actions">
              <a class="btn btn--primary" :href="c.learnUrl" target="_blank" rel="noopener noreferrer">{{ t('campaigns.learnMore') }} <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" /></a>
              <a class="text-link" :href="c.actionUrl" target="_blank" rel="noopener noreferrer">{{ c.actionLabel }} <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" /></a>
            </div>
          </article>
        </div>
      </section>

      <!-- Pathway -->
      <section class="section" aria-labelledby="pathway-title">
        <div class="section-head">
          <div>
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
          <h2 class="cta-title">{{ t('campaigns.ctaTitle') }}</h2>
          <p class="cta-desc">{{ t('campaigns.ctaDesc') }}</p>
          <a class="btn btn--light" href="https://www.earthguardians.org/crews" target="_blank" rel="noopener noreferrer">
            {{ t('campaigns.becomeGuardian') }}
            <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <p class="source-note">Campaign content from Earth Guardians' official <a href="https://www.earthguardians.org/campaigns-2" target="_blank" rel="noopener noreferrer">campaigns</a>, <a href="https://www.earthguardians.org/can" target="_blank" rel="noopener noreferrer">Choose Action Now</a>, <a href="https://www.earthguardians.org/stmp" target="_blank" rel="noopener noreferrer">Stop the Money Pipeline</a>, <a href="https://www.earthguardians.org/civic-engagement" target="_blank" rel="noopener noreferrer">Civic Engagement</a> and <a href="https://www.earthguardians.org/divest-defund" target="_blank" rel="noopener noreferrer">Divest &amp; Defund</a> pages.</p>
    </div>
  </main>
</template>

<script setup lang="ts">
const { t } = useI18n()

interface Campaign {
  icon: string
  kicker: string
  title: string
  desc: string
  stats: string[]
  tags: string
  learnUrl: string
  actionLabel: string
  actionUrl: string
}

const campaigns = computed<Campaign[]>(() => [
  {
    icon: 'lucide:megaphone',
    kicker: t('campaigns.canKicker'),
    title: t('campaigns.canTitle'),
    desc: t('campaigns.canDesc'),
    stats: [t('campaigns.canStat1'), t('campaigns.canStat2'), t('campaigns.canStat3')],
    tags: t('campaigns.canTags'),
    learnUrl: 'https://www.earthguardians.org/can',
    actionLabel: t('campaigns.canActionLabel'),
    actionUrl: 'https://docs.google.com/document/d/1QgnCMJ-3dH_KHGWu4_VNhtGv49QdgkevWvGXxrCjZco/edit?usp=sharing',
  },
  {
    icon: 'lucide:landmark',
    kicker: t('campaigns.stmpKicker'),
    title: t('campaigns.stmpTitle'),
    desc: t('campaigns.stmpDesc'),
    stats: [t('campaigns.stmpStat1'), t('campaigns.stmpStat2'), t('campaigns.stmpStat3')],
    tags: t('campaigns.stmpTags'),
    learnUrl: 'https://www.earthguardians.org/stmp',
    actionLabel: t('campaigns.stmpActionLabel'),
    actionUrl: 'https://www.notmydirtymoney.com/',
  },
  {
    icon: 'lucide:vote',
    kicker: t('campaigns.civicKicker'),
    title: t('campaigns.civicTitle'),
    desc: t('campaigns.civicDesc'),
    stats: [t('campaigns.civicStat1'), t('campaigns.civicStat2'), t('campaigns.civicStat3')],
    tags: t('campaigns.civicTags'),
    learnUrl: 'https://www.earthguardians.org/civic-engagement',
    actionLabel: t('campaigns.civicActionLabel'),
    actionUrl: 'https://www.earthguardians.org/register-to-vote',
  },
  {
    icon: 'lucide:hand-coins',
    kicker: t('campaigns.divestKicker'),
    title: t('campaigns.divestTitle'),
    desc: t('campaigns.divestDesc'),
    stats: [t('campaigns.divestStat1'), t('campaigns.divestStat2'), t('campaigns.divestStat3')],
    tags: t('campaigns.divestTags'),
    learnUrl: 'https://www.earthguardians.org/divest-defund',
    actionLabel: t('campaigns.divestActionLabel'),
    actionUrl: 'https://www.notmydirtymoney.com/',
  },
])

useHead({
  title: 'Campaigns — Earth Guardians',
  meta: [{ name: 'description', content: 'Explore Earth Guardians campaigns, biodiversity data, youth-led action, crews and project grants.' }],
})
</script>

<style scoped>
.page {
  min-height: 100svh;
  background: transparent;
  color: var(--text-primary);
}

/* ── Shell ── */
.page-shell {
  width: min(100% - 2rem, 72rem);
  margin: 0 auto;
  padding: clamp(2rem, 5vh, 4rem) 0 calc(clamp(4rem, 8vh, 6rem) + env(safe-area-inset-bottom));
}

/* ── Shared ── */

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
  min-height: 44px;
}
.btn--primary { background: var(--text-primary); color: var(--bg-primary); }
.btn--primary:hover { opacity: 0.85; }
.btn--secondary {
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  background: transparent;
}
.btn--secondary:hover { background: var(--text-primary); color: var(--bg-primary); }
.btn--light {
  background: var(--primary);
  color: #fff;
}
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
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
:global(.dark) .flow-step {
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s, box-shadow 0.2s;
}
:global(.dark) .campaign-card {
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.campaign-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
:global(.dark) .campaign-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.campaign-card--featured {
  border-color: var(--primary);
  background: rgba(255, 255, 255, 0.07);
}
:global(.dark) .campaign-card--featured {
  background: rgba(255, 255, 255, 0.05);
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
.card-stats {
  list-style: none;
  margin: 0.9rem 0 0;
  padding: 0.9rem 0 0;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.card-stats li {
  position: relative;
  padding-left: 1.1rem;
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.45;
}
.card-stats li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.42em;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--primary);
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
  border-top: 2px solid rgba(255, 255, 255, 0.12);
}
:global(.dark) .pathway-step {
  border-top-color: rgba(255, 255, 255, 0.08);
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
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  color: var(--text-primary);
}
:global(.dark) .cta-block {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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
  .section-side { margin-top: 0.75rem; }
  .campaign-grid,
  .pathway-grid { grid-template-columns: 1fr; }
  .connection-flow { flex-direction: column; gap: 0.5rem; }
  .flow-arrow { transform: rotate(90deg); padding: 0.25rem 0; justify-content: center; }
  .cta-block .btn { margin-top: 1.25rem; }
}
</style>
