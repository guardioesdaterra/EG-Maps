<template>
  <main id="main-content" tabindex="-1" class="page">
    <PageTopbar show-back />

    <div class="page-shell">
      <!-- Header -->
      <header class="page-header">
        <img :src="`${baseURL}eg-logo.png`" alt="Earth Guardians" class="page-header-logo" />
        <h1 class="page-title">{{ t('masterclasses.title') }}</h1>
        <p class="page-desc">
          {{ t('masterclasses.description') }}
        </p>
      </header>

      <!-- 2026 Global Masterclass Series -->
      <section class="section" aria-labelledby="series-2026-title">
        <div class="section-head">
          <h2 id="series-2026-title" class="section-title">{{ t('masterclasses.series2026Title') }}</h2>
          <p class="section-desc">{{ t('masterclasses.series2026Desc') }}</p>
        </div>

        <div class="episodes">
          <!-- Episode 1 -->
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">01</span>
              <span class="episode-date">May 10, 2026</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.ep1Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.ep1Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.ep1Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-resource-label">{{ t('resources.title') }}:</span>
                <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.recording') }}</a>
                <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.slideDeck') }}</a>
                <span class="episode-note">{{ t('masterclasses.summariesAvailable') }}</span>
              </div>
            </div>
          </article>

          <!-- Episode 2 -->
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">02</span>
              <span class="episode-date">May 24, 2026</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.ep2Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.ep2Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.ep2Desc') }}
              </p>
            </div>
          </article>

          <!-- Episode 3 -->
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">03</span>
              <span class="episode-date">June 2026</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.ep3Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.ep3Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.ep3Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-resource-label">{{ t('resources.title') }}:</span>
                <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.recording') }}</a>
                <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.slideDeck') }}</a>
              </div>
            </div>
          </article>

          <!-- Episode 4 -->
          <article class="episode episode--upcoming">
            <div class="episode-meta">
              <span class="episode-num">04</span>
              <span class="episode-date">July 26, 2026</span>
              <span class="episode-badge">{{ t('masterclasses.upcoming') }}</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.ep4Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.ep4Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.ep4Desc') }}
              </p>
              <div class="episode-actions">
                <a
                  href="https://us02web.zoom.us/meeting/register/CqCXrQRKQK2Ky_-IB3JCCA"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="episode-cta"
                >
                  <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                  {{ t('masterclasses.registerZoom') }}
                </a>
                <span class="episode-time">{{ t('masterclasses.ep4Time') }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Past Masterclasses (2023–2024) -->
      <section class="section" aria-labelledby="past-title">
        <div class="section-head">
          <h2 id="past-title" class="section-title">{{ t('masterclasses.pastTrainingsTitle') }}</h2>
        </div>
        <div class="past-grid">
          <article class="past-card">
            <span class="past-year">{{ t('masterclasses.grantWritingDate') }}</span>
            <h3 class="past-name">{{ t('masterclasses.grantWritingTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.grantWritingDesc') }}</p>
          </article>
          <article class="past-card">
            <span class="past-year">{{ t('masterclasses.projectManagementDate') }}</span>
            <h3 class="past-name">{{ t('masterclasses.projectManagementTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.projectManagementDesc') }}</p>
          </article>
          <article class="past-card">
            <span class="past-year">2024</span>
            <h3 class="past-name">{{ t('masterclasses.managingStakeholdersTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.managingStakeholdersDesc') }}</p>
          </article>
          <article class="past-card">
            <span class="past-year">2024</span>
            <h3 class="past-name">{{ t('masterclasses.buildingCommunityTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.buildingCommunityDesc') }}</p>
          </article>
          <article class="past-card">
            <span class="past-year">2024</span>
            <h3 class="past-name">{{ t('masterclasses.talkingPoliticiansTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.talkingPoliticiansDesc') }}</p>
          </article>
          <article class="past-card">
            <span class="past-year">2024</span>
            <h3 class="past-name">{{ t('masterclasses.hrManagementTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.hrManagementDesc') }}</p>
          </article>
          <article class="past-card">
            <span class="past-year">2024</span>
            <h3 class="past-name">{{ t('masterclasses.copTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.copDesc') }}</p>
          </article>
          <article class="past-card">
            <span class="past-year">{{ t('masterclasses.climateJusticeDate') }}</span>
            <h3 class="past-name">{{ t('masterclasses.climateJusticeTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.climateJusticeDesc') }}</p>
          </article>
          <article class="past-card">
            <span class="past-year">{{ t('masterclasses.dataVisualizationDate') }}</span>
            <h3 class="past-name">{{ t('masterclasses.dataVisualizationTitle') }}</h3>
            <p class="past-desc">{{ t('masterclasses.dataVisualizationDesc') }}</p>
          </article>
        </div>
      </section>

      <!-- Skills -->
      <section class="section" aria-labelledby="skills-title">
        <div class="section-head">
          <h2 id="skills-title" class="section-title">{{ t('masterclasses.skillsTitle') }}</h2>
        </div>
        <div class="skills-grid">
          <div class="skill-card">
            <div class="skill-icon"><Icon name="lucide:file-text" /></div>
            <h3 class="skill-name">{{ t('masterclasses.grantWritingSkill') }}</h3>
            <p class="skill-desc">{{ t('masterclasses.grantWritingSkillDesc') }}</p>
          </div>
          <div class="skill-card">
            <div class="skill-icon"><Icon name="lucide:bar-chart" /></div>
            <h3 class="skill-name">{{ t('masterclasses.dataAnalysisSkill') }}</h3>
            <p class="skill-desc">{{ t('masterclasses.dataAnalysisSkillDesc') }}</p>
          </div>
          <div class="skill-card">
            <div class="skill-icon"><Icon name="lucide:users" /></div>
            <h3 class="skill-name">{{ t('masterclasses.leadershipSkill') }}</h3>
            <p class="skill-desc">{{ t('masterclasses.leadershipSkillDesc') }}</p>
          </div>
          <div class="skill-card">
            <div class="skill-icon"><Icon name="lucide:message-circle" /></div>
            <h3 class="skill-name">{{ t('masterclasses.advocacySkill') }}</h3>
            <p class="skill-desc">{{ t('masterclasses.advocacySkillDesc') }}</p>
          </div>
          <div class="skill-card">
            <div class="skill-icon"><Icon name="lucide:heart-handshake" /></div>
            <h3 class="skill-name">{{ t('masterclasses.communitySkill') }}</h3>
            <p class="skill-desc">{{ t('masterclasses.communitySkillDesc') }}</p>
          </div>
          <div class="skill-card">
            <div class="skill-icon"><Icon name="lucide:globe" /></div>
            <h3 class="skill-name">{{ t('masterclasses.financeSkill') }}</h3>
            <p class="skill-desc">{{ t('masterclasses.financeSkillDesc') }}</p>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="section">
        <div class="cta-block">
          <h2 class="cta-title">{{ t('masterclasses.ctaTitle') }}</h2>
          <p class="cta-desc">{{ t('masterclasses.ctaDesc') }}</p>
          <a
            href="https://www.earthguardians.org/crews"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-btn"
          >
            <Icon name="lucide:graduation-cap" class="h-4 w-4" />
            {{ t('masterclasses.joinCrew') }}
          </a>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: 'Masterclasses — Earth Guardians',
  meta: [
    { name: 'description', content: '2026 Global Masterclass Series and past training resources for Crew leaders and members. Learn from experts and build capacity for climate action.' },
    { property: 'og:title', content: 'Masterclasses — Earth Guardians' },
    { property: 'og:description', content: 'Training and skill-building resources for Crew leaders and members.' },
  ],
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

/* ── Header ── */
.page-header { margin-bottom: clamp(2rem, 5vh, 4rem); }
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

/* ── Sections ── */
.section { margin-bottom: clamp(2.5rem, 5vh, 4rem); }
.section-head { margin-bottom: 1.5rem; }
.section-title {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  margin: 0;
}
.section-desc {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 40rem;
}

/* ── Episodes (2026 Series) ── */
.episodes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.episode {
  display: grid;
  grid-template-columns: 5rem 1fr;
  gap: 1.25rem;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: border-color 0.2s;
}
.episode:hover { border-color: var(--primary); }
.episode--upcoming {
  border-color: var(--primary);
  background: var(--bg-secondary);
}
.episode-meta {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: flex-start;
}
.episode-num {
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--text-muted);
  line-height: 1;
}
.episode-date {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.episode-badge {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: var(--primary);
  color: var(--bg-primary);
}
.episode-body { display: flex; flex-direction: column; gap: 0.3rem; }
.episode-title {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
}
.episode-speaker {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  margin: 0;
}
.episode-desc {
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0.25rem 0 0;
}
.episode-resources,
.episode-prep {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-size: 0.7rem;
}
.episode-resource-label {
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.6rem;
}
.episode-link {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--primary);
  border: 1px solid var(--primary);
  transition: background 0.15s, color 0.15s;
}
.episode-link:hover { background: var(--primary); color: var(--bg-primary); }
.episode-note {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-style: italic;
}
.episode-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.episode-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: none;
  background: var(--primary);
  color: var(--bg-primary);
  transition: opacity 0.15s;
}
.episode-cta:hover { opacity: 0.85; }
.episode-time {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* ── Past Masterclasses Grid ── */
.past-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: 0.75rem;
}
.past-card {
  padding: 1rem 1.125rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: border-color 0.2s;
}
.past-card:hover { border-color: var(--primary); }
.past-year {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.past-name {
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0.4rem 0 0.3rem;
}
.past-desc {
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0;
}

/* ── Skills Grid ── */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  gap: 0.75rem;
}
.skill-card {
  padding: 1.125rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.skill-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--primary);
  color: var(--bg-primary);
  margin-bottom: 0.75rem;
}
.skill-name {
  font-size: 0.85rem;
  font-weight: 800;
  margin: 0 0 0.3rem;
}
.skill-desc {
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
@media (max-width: 600px) {
  .episode {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .episode-meta {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }
}
</style>
