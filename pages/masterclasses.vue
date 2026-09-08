/**
 * pages/masterclasses.vue
 * @why Masterclasses page — training and skill-building resources for Crew leaders and members
 * @component masterclasses
 * @deps vue (computed); @/composables/useI18n (useI18n)
 */
<template>
  <main id="main-content" tabindex="-1" class="min-h-[100svh] bg-white dark:bg-[var(--bg-primary)] text-black dark:text-[var(--text-primary)]">
    <section class="mx-auto w-container px-4 py-8 sm:px-fluid-sm sm:section-padding pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-section">
      <header class="max-w-[min(100%,48rem)] mb-8 sm:mb-12">
        <div class="mb-4 sm:mb-6">
          <img
            :src="`${baseURL}eg-logo.png`"
            alt="Earth Guardians"
            class="h-[clamp(2rem,12vw,4rem)] w-auto"
            loading="eager"
          />
        </div>
        <h1 class="text-[1.75rem] xs:text-fluid-4xl font-black leading-[1.1] tracking-normal">
          {{ t('masterclasses.title') }}
        </h1>
        <p class="mt-3 sm:mt-4 max-w-[min(100%,42rem)] text-[0.95rem] xs:text-fluid-lg leading-[1.6] text-black/70 dark:text-[var(--text-secondary)]">
          {{ t('masterclasses.description') }}
        </p>
      </header>

      <section class="mb-8 sm:mb-12">
        <h2 class="text-[1.25rem] xs:text-fluid-3xl font-black leading-tight tracking-normal mb-4 sm:mb-6">
          {{ t('masterclasses.pastTrainingsTitle') }}
        </h2>
        <div class="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
            <div class="p-4 sm:p-5">
              <div class="flex items-center gap-2 mb-2">
                <Icon name="lucide:calendar" class="h-4 w-4 text-black/55 dark:text-[var(--text-muted)]" />
                <span class="text-xs font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)]">{{ t('masterclasses.grantWritingDate') }}</span>
              </div>
              <h3 class="text-[1.1rem] font-black leading-tight tracking-normal mb-2">{{ t('masterclasses.grantWritingTitle') }}</h3>
              <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('masterclasses.grantWritingDesc') }}</p>
            </div>
          </article>

          <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
            <div class="p-4 sm:p-5">
              <div class="flex items-center gap-2 mb-2">
                <Icon name="lucide:calendar" class="h-4 w-4 text-black/55 dark:text-[var(--text-muted)]" />
                <span class="text-xs font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)]">{{ t('masterclasses.projectManagementDate') }}</span>
              </div>
              <h3 class="text-[1.1rem] font-black leading-tight tracking-normal mb-2">{{ t('masterclasses.projectManagementTitle') }}</h3>
              <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('masterclasses.projectManagementDesc') }}</p>
            </div>
          </article>

          <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
            <div class="p-4 sm:p-5">
              <div class="flex items-center gap-2 mb-2">
                <Icon name="lucide:calendar" class="h-4 w-4 text-black/55 dark:text-[var(--text-muted)]" />
                <span class="text-xs font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)]">{{ t('masterclasses.climateJusticeDate') }}</span>
              </div>
              <h3 class="text-[1.1rem] font-black leading-tight tracking-normal mb-2">{{ t('masterclasses.climateJusticeTitle') }}</h3>
              <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('masterclasses.climateJusticeDesc') }}</p>
            </div>
          </article>

          <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
            <div class="p-4 sm:p-5">
              <div class="flex items-center gap-2 mb-2">
                <Icon name="lucide:calendar" class="h-4 w-4 text-black/55 dark:text-[var(--text-muted)]" />
                <span class="text-xs font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)]">{{ t('masterclasses.dataVisualizationDate') }}</span>
              </div>
              <h3 class="text-[1.1rem] font-black leading-tight tracking-normal mb-2">{{ t('masterclasses.dataVisualizationTitle') }}</h3>
              <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('masterclasses.dataVisualizationDesc') }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="mb-8 sm:mb-12">
        <h2 class="text-[1.25rem] xs:text-fluid-3xl font-black leading-tight tracking-normal mb-4 sm:mb-6">
          {{ t('masterclasses.skillsTitle') }}
        </h2>
        <div class="grid gap-4 sm:gap-6 sm:grid-cols-3">
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-black dark:bg-[var(--text-primary)] text-white dark:text-black mb-3">
              <Icon name="lucide:file-text" class="h-5 w-5" />
            </div>
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('masterclasses.grantWritingSkill') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('masterclasses.grantWritingSkillDesc') }}</p>
          </div>
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-black dark:bg-[var(--text-primary)] text-white dark:text-black mb-3">
              <Icon name="lucide:bar-chart" class="h-5 w-5" />
            </div>
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('masterclasses.dataAnalysisSkill') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('masterclasses.dataAnalysisSkillDesc') }}</p>
          </div>
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-black dark:bg-[var(--text-primary)] text-white dark:text-black mb-3">
              <Icon name="lucide:users" class="h-5 w-5" />
            </div>
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('masterclasses.leadershipSkill') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('masterclasses.leadershipSkillDesc') }}</p>
          </div>
        </div>
      </section>

      <section class="max-w-[min(100%,48rem)]">
        <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-black dark:bg-[var(--text-primary)] text-white dark:text-black p-6 sm:p-8 text-center">
          <h2 class="text-[1.25rem] xs:text-fluid-3xl font-black leading-tight tracking-normal mb-3 sm:mb-4">
            {{ t('masterclasses.ctaTitle') }}
          </h2>
          <p class="text-sm leading-6 text-white/80 dark:text-black/70 mb-4 sm:mb-6 max-w-[min(100%,36rem)] mx-auto">
            {{ t('masterclasses.ctaDesc') }}
          </p>
          <a
            href="https://www.earthguardians.org/crews"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 rounded-fluid bg-white dark:bg-[var(--bg-primary)] px-6 py-3 text-sm font-black text-black dark:text-[var(--text-primary)] hover:opacity-90 transition-opacity"
          >
            <Icon name="lucide:graduation-cap" class="h-4 w-4" />
            {{ t('masterclasses.joinCrew') }}
          </a>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">

import { computed } from 'vue'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: computed(() => `${t('masterclasses.title')} - Earth Guardians`),
  meta: [
    { name: 'description', content: computed(() => t('masterclasses.description')) },
    { property: 'og:title', content: computed(() => t('masterclasses.title')) },
    { property: 'og:description', content: computed(() => t('masterclasses.description')) },
  ],
})

</script>
