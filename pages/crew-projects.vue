/**
 * pages/crew-projects.vue
 * @why Crew Projects page — large-scale and small-scale projects led by EG Crews
 * @component crew-projects
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
          {{ t('crewProjects.title') }}
        </h1>
        <p class="mt-3 sm:mt-4 max-w-[min(100%,42rem)] text-[0.95rem] xs:text-fluid-lg leading-[1.6] text-black/70 dark:text-[var(--text-secondary)]">
          {{ t('crewProjects.description') }}
        </p>
      </header>

      <section class="mb-8 sm:mb-12">
        <div class="flex items-center gap-3 mb-4 sm:mb-6">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-black dark:bg-[var(--text-primary)] text-white dark:text-black">
            <Icon name="lucide:mountain" class="h-5 w-5" />
          </div>
          <h2 class="text-[1.25rem] xs:text-fluid-3xl font-black leading-tight tracking-normal">{{ t('crewProjects.largeScaleTitle') }}</h2>
        </div>
        <p class="max-w-[min(100%,42rem)] text-[0.85rem] xs:text-fluid-sm leading-6 text-black/65 dark:text-[var(--text-secondary)] mb-6">
          {{ t('crewProjects.largeScaleDesc') }}
        </p>

        <div class="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
            <div class="p-4 sm:p-5">
              <h3 class="text-[1.1rem] font-black leading-tight tracking-normal mb-2">{{ t('crewProjects.sherbroTitle') }}</h3>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)] mb-3">{{ t('crewProjects.sherbroLocation') }}</p>
              <ul class="space-y-2">
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.sherbroItem1') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.sherbroItem2') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.sherbroItem3') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.sherbroItem4') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.sherbroItem5') }}
                </li>
              </ul>
            </div>
          </article>

          <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
            <div class="p-4 sm:p-5">
              <h3 class="text-[1.1rem] font-black leading-tight tracking-normal mb-2">{{ t('crewProjects.tagbaTitle') }}</h3>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)] mb-3">{{ t('crewProjects.tagbaLocation') }}</p>
              <ul class="space-y-2">
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.tagbaItem1') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.tagbaItem2') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.tagbaItem3') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.tagbaItem4') }}
                </li>
              </ul>
            </div>
          </article>

          <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
            <div class="p-4 sm:p-5">
              <h3 class="text-[1.1rem] font-black leading-tight tracking-normal mb-2">{{ t('crewProjects.matchaleTitle') }}</h3>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)] mb-3">{{ t('crewProjects.matchaleLocation') }}</p>
              <ul class="space-y-2">
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.matchaleItem1') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.matchaleItem2') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.matchaleItem3') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.matchaleItem4') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.matchaleItem5') }}
                </li>
              </ul>
            </div>
          </article>

          <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
            <div class="p-4 sm:p-5">
              <h3 class="text-[1.1rem] font-black leading-tight tracking-normal mb-2">{{ t('crewProjects.amegnranTitle') }}</h3>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-black/55 dark:text-[var(--text-muted)] mb-3">{{ t('crewProjects.amegnranLocation') }}</p>
              <ul class="space-y-2">
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.amegnranItem1') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.amegnranItem2') }}
                </li>
                <li class="flex items-start gap-2 text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
                  <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-black dark:bg-[var(--text-primary)] mt-1.5" />
                  {{ t('crewProjects.amegnranItem3') }}
                </li>
              </ul>
            </div>
          </article>
        </div>

        <div class="mt-6 p-4 sm:p-5 rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-black/5 dark:bg-white/5">
          <p class="text-sm font-black text-center">
            {{ t('crewProjects.combinedImpact') }}
          </p>
        </div>
      </section>

      <section class="mb-8 sm:mb-12">
        <div class="flex items-center gap-3 mb-4 sm:mb-6">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white dark:bg-[var(--bg-primary)] text-black dark:text-[var(--text-primary)]">
            <Icon name="lucide:sprout" class="h-5 w-5" />
          </div>
          <h2 class="text-[1.25rem] xs:text-fluid-3xl font-black leading-tight tracking-normal">{{ t('crewProjects.smallScaleTitle') }}</h2>
        </div>
        <p class="max-w-[min(100%,42rem)] text-[0.85rem] xs:text-fluid-sm leading-6 text-black/65 dark:text-[var(--text-secondary)] mb-6">
          {{ t('crewProjects.smallScaleDesc') }}
        </p>

        <div class="grid gap-4 sm:gap-6 sm:grid-cols-3">
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('crewProjects.educationTitle') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('crewProjects.educationDesc') }}</p>
          </div>
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('crewProjects.artivismTitle') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('crewProjects.artivismDesc') }}</p>
          </div>
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('crewProjects.communityTitle') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('crewProjects.communityDesc') }}</p>
          </div>
        </div>
      </section>

      <section class="max-w-[min(100%,48rem)]">
        <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-black dark:bg-[var(--text-primary)] text-white dark:text-black p-6 sm:p-8 text-center">
          <h2 class="text-[1.25rem] xs:text-fluid-3xl font-black leading-tight tracking-normal mb-3 sm:mb-4">
            {{ t('crewProjects.ctaTitle') }}
          </h2>
          <p class="text-sm leading-6 text-white/80 dark:text-black/70 mb-4 sm:mb-6 max-w-[min(100%,36rem)] mx-auto">
            {{ t('crewProjects.ctaDesc') }}
          </p>
          <a
            href="https://www.earthguardians.org/crews"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 rounded-fluid bg-white dark:bg-[var(--bg-primary)] px-6 py-3 text-sm font-black text-black dark:text-[var(--text-primary)] hover:opacity-90 transition-opacity"
          >
            <Icon name="lucide:rocket" class="h-4 w-4" />
            {{ t('crewProjects.startCrew') }}
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
  title: computed(() => `${t('crewProjects.title')} - Earth Guardians`),
  meta: [
    { name: 'description', content: computed(() => t('crewProjects.description')) },
    { property: 'og:title', content: computed(() => t('crewProjects.title')) },
    { property: 'og:description', content: computed(() => t('crewProjects.description')) },
  ],
})

</script>
