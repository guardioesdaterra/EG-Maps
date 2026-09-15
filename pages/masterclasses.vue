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

      <!-- Ongoing Global Masterclass Series -->
      <section class="section" aria-labelledby="series-2026-title">
        <div class="section-head">
          <h2 id="series-2026-title" class="section-title">{{ t('masterclasses.series2026Title') }}</h2>
          <p class="section-desc">{{ t('masterclasses.series2026Desc') }}</p>
          <p class="section-note">{{ t('masterclasses.sessionLanguageNote') }}</p>
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
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">04</span>
              <span class="episode-date">June 2026</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.ep4Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.ep4Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.ep4Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-resource-label">{{ t('resources.title') }}:</span>
                <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.recording') }}</a>
                <a href="https://www.earthguardians.org/eg-resources" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.slideDeck') }}</a>
              </div>
            </div>
          </article>

          <!-- Episode 5 — upcoming -->
          <article class="episode episode--upcoming">
            <div class="episode-meta">
              <span class="episode-num">05</span>
              <span class="episode-badge">{{ t('masterclasses.upcoming') }}</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.ep5Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.ep5Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.ep5Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-time">{{ t('masterclasses.ep5Time') }}</span>
                <a href="https://us02web.zoom.us/meeting/register/7rJ7rLRTS6GtUte_F8K7Hw" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.registerZoom') }}</a>
                <span class="episode-note">{{ t('masterclasses.registerNote') }}</span>
              </div>
            </div>
          </article>

          <!-- More Sessions -->
          <article class="episode episode--more">
            <div class="episode-meta">
              <span class="episode-num">&hellip;</span>
              <span class="episode-date">2023 – 2026</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.moreTitle') }}</h3>
              <p class="episode-desc">
                {{ t('masterclasses.moreDesc') }}
              </p>
              <div class="episode-actions">
                <a
                  href="https://www.instagram.com/earthguardians/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="episode-cta"
                >
                  <Icon name="lucide:instagram" class="h-3.5 w-3.5" />
                  {{ t('masterclasses.viewOnInstagram') }}
                </a>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Past Masterclasses (2025 season) -->
      <section class="section" aria-labelledby="series-2025-title">
        <div class="section-head">
          <h2 id="series-2025-title" class="section-title">{{ t('masterclasses.series2025Title') }}</h2>
          <p class="section-desc">{{ t('masterclasses.series2025Desc') }}</p>
        </div>

        <div class="episodes">
          <!-- GM5 -->
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">GM5</span>
              <span class="episode-date">{{ t('masterclasses.gm5Date') }}</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.gm5Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.gm5Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.gm5Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-resource-label">{{ t('resources.title') }}:</span>
                <a href="https://drive.google.com/file/d/1hZo5M9_TxbTxvmZEul6_TkqN_dV6tXd0/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.flyer') }}</a>
              </div>
            </div>
          </article>

          <!-- GM4 -->
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">GM4</span>
              <span class="episode-date">{{ t('masterclasses.gm4Date') }}</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.gm4Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.gm4Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.gm4Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-resource-label">{{ t('resources.title') }}:</span>
                <a href="https://drive.google.com/file/d/1kb7M6wyl4fAHGsVmILcTUfv-3ol7M6fB/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.recording') }}</a>
                <a href="https://docs.google.com/presentation/d/1H2RZNkjnCscrpT_8tFG2Z_xoKJleRB6Q/edit?usp=drive_link&ouid=102755849788761311340&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.slideDeck') }}</a>
              </div>
            </div>
          </article>

          <!-- GM3 -->
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">GM3</span>
              <span class="episode-date">{{ t('masterclasses.gm3Date') }}</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.gm3Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.gm3Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.gm3Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-resource-label">{{ t('resources.title') }}:</span>
                <a href="https://drive.google.com/file/d/1aMyZGBDgb8fuoARmyVNMxAsyv5jYlPKH/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.recording') }}</a>
                <a href="https://docs.google.com/presentation/d/11A9ZS6zzHzBVZgMOoj-IWa0hK9-Cjnoi7CJkTPAe3RU/edit?usp=drive_link" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.slideDeck') }}</a>
                <a href="https://drive.google.com/file/d/1D6oOxhkvb-MiBJw23nj1f-_-5AHaz0gI/view?usp=sharing" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.flyer') }}</a>
              </div>
            </div>
          </article>

          <!-- GM2 -->
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">GM2</span>
              <span class="episode-date">{{ t('masterclasses.gm2Date') }}</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.gm2Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.gm2Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.gm2Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-resource-label">{{ t('resources.title') }}:</span>
                <a href="https://drive.google.com/file/d/1m3_kl90KH8wV4waCu_x32lPGzVD6UQi-/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.recording') }}</a>
                <a href="https://drive.google.com/file/d/1BIg7cwownt219oJwp_ZTBP-TOKcdIVft/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.slideDeck') }}</a>
              </div>
            </div>
          </article>

          <!-- GM1 -->
          <article class="episode">
            <div class="episode-meta">
              <span class="episode-num">GM1</span>
              <span class="episode-date">{{ t('masterclasses.gm1Date') }}</span>
            </div>
            <div class="episode-body">
              <h3 class="episode-title">{{ t('masterclasses.gm1Title') }}</h3>
              <p class="episode-speaker">{{ t('masterclasses.gm1Speaker') }}</p>
              <p class="episode-desc">
                {{ t('masterclasses.gm1Desc') }}
              </p>
              <div class="episode-resources">
                <span class="episode-resource-label">{{ t('resources.title') }}:</span>
                <a href="https://drive.google.com/file/d/1JDYMbj-SOOrTx8dhKmKF11kK3Fv9eSmn/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.recording') }}</a>
                <a href="https://drive.google.com/file/d/14N6XkAsopftFGkBbGYuAqQKP-ik9ySHq/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="episode-link">{{ t('masterclasses.slideDeck') }}</a>
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
  background: transparent;
  color: var(--text-primary);
}

/* ── Shell ── */
.page-shell {
  width: min(100% - 2rem, 72rem);
  margin: 0 auto;
  padding: clamp(2rem, 5vh, 4rem) 0 calc(clamp(4rem, 8vh, 6rem) + env(safe-area-inset-bottom));
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
.section-note {
  margin: 0.5rem 0 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
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
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s;
}
:global(.dark) .episode {
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.episode:hover { border-color: var(--primary); }
.episode--more {
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.12);
}
:global(.dark) .episode--more {
  border-color: rgba(255, 255, 255, 0.1);
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

.episode--upcoming {
  border-color: var(--primary);
}
/* ── Past Masterclasses Grid ── */
.past-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: 0.75rem;
}
.past-card {
  padding: 1rem 1.125rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px) saturate(1.3);
  -webkit-backdrop-filter: blur(12px) saturate(1.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s;
}
:global(.dark) .past-card {
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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

/* ── CTA Block ── */
.cta-block {
  padding: clamp(1.5rem, 3vw, 2.5rem);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
  color: var(--text-primary);
}
:global(.dark) .cta-block {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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
  min-height: 44px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  background: var(--primary);
  color: #fff;
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
