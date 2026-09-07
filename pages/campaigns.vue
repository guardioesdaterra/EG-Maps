/**
 * pages/campaigns.vue
 * @why Campaigns page — connects Endangered Species work to EG Crews and community action
 * @component campaigns
 * @deps vue (computed); @/composables/useI18n (useI18n)
 */
<template>
  <main id="main-content" class="min-h-[100svh] bg-white dark:bg-[var(--bg-primary)] text-black dark:text-[var(--text-primary)]">
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
          {{ t('campaigns.title') }}
        </h1>
        <p class="mt-3 sm:mt-4 max-w-[min(100%,42rem)] text-[0.95rem] xs:text-fluid-lg leading-[1.6] text-black/70 dark:text-[var(--text-secondary)]">
          {{ t('campaigns.description') }}
        </p>
      </header>

      <div class="grid gap-6 sm:gap-8 lg:grid-cols-2">
        <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
          <div class="p-4 sm:p-6">
            <div class="flex items-center gap-3 mb-3 sm:mb-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-black dark:bg-[var(--text-primary)] text-white dark:text-black">
                <Icon name="lucide:leaf" class="h-5 w-5" />
              </div>
              <h2 class="text-[1.15rem] xs:text-fluid-2xl font-black leading-tight tracking-normal">{{ t('campaigns.endangeredSpeciesTitle') }}</h2>
            </div>
            <p class="text-[0.85rem] xs:text-fluid-sm leading-6 text-black/65 dark:text-[var(--text-secondary)]">
              {{ t('campaigns.endangeredSpeciesDesc') }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <NuxtLink
                to="/endangered-species"
                class="inline-flex items-center justify-center gap-1.5 rounded-fluid bg-black dark:bg-[var(--text-primary)] px-4 py-2 text-xs font-black text-white dark:text-black hover:opacity-90 transition-opacity"
              >
                <Icon name="lucide:map" class="h-3.5 w-3.5" />
                {{ t('home.2d') }}
              </NuxtLink>
              <NuxtLink
                to="/endangered-species/3d"
                class="inline-flex items-center justify-center gap-1.5 rounded-fluid border-2 border-black dark:border-[var(--border-color)] px-4 py-2 text-xs font-black text-black dark:text-[var(--text-primary)] hover:bg-black hover:text-white dark:hover:bg-[var(--text-primary)] dark:hover:text-black transition-colors"
              >
                <Icon name="lucide:globe" class="h-3.5 w-3.5" />
                {{ t('home.3d') }}
              </NuxtLink>
            </div>
          </div>
        </article>

        <article class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] overflow-hidden">
          <div class="p-4 sm:p-6">
            <div class="flex items-center gap-3 mb-3 sm:mb-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-black dark:bg-[var(--text-primary)] text-white dark:text-black">
                <Icon name="lucide:users-round" class="h-5 w-5" />
              </div>
              <h2 class="text-[1.15rem] xs:text-fluid-2xl font-black leading-tight tracking-normal">{{ t('campaigns.crewActionTitle') }}</h2>
            </div>
            <p class="text-[0.85rem] xs:text-fluid-sm leading-6 text-black/65 dark:text-[var(--text-secondary)]">
              {{ t('campaigns.crewActionDesc') }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <NuxtLink
                to="/active-crews"
                class="inline-flex items-center justify-center gap-1.5 rounded-fluid bg-black dark:bg-[var(--text-primary)] px-4 py-2 text-xs font-black text-white dark:text-black hover:opacity-90 transition-opacity"
              >
                <Icon name="lucide:map" class="h-3.5 w-3.5" />
                {{ t('home.2d') }}
              </NuxtLink>
              <NuxtLink
                to="/active-crews/3d"
                class="inline-flex items-center justify-center gap-1.5 rounded-fluid border-2 border-black dark:border-[var(--border-color)] px-4 py-2 text-xs font-black text-black dark:text-[var(--text-primary)] hover:bg-black hover:text-white dark:hover:bg-[var(--text-primary)] dark:hover:text-black transition-colors"
              >
                <Icon name="lucide:globe" class="h-3.5 w-3.5" />
                {{ t('home.3d') }}
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>

      <section class="mt-8 sm:mt-12 max-w-[min(100%,48rem)]">
        <h2 class="text-[1.25rem] xs:text-fluid-3xl font-black leading-tight tracking-normal mb-4 sm:mb-6">
          {{ t('campaigns.howItWorksTitle') }}
        </h2>
        <div class="grid gap-4 sm:gap-6 sm:grid-cols-3">
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-[var(--text-primary)] text-white dark:text-black text-sm font-black mb-3">1</div>
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('campaigns.step1Title') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('campaigns.step1Desc') }}</p>
          </div>
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-[var(--text-primary)] text-white dark:text-black text-sm font-black mb-3">2</div>
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('campaigns.step2Title') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('campaigns.step2Desc') }}</p>
          </div>
          <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] p-4 sm:p-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-[var(--text-primary)] text-white dark:text-black text-sm font-black mb-3">3</div>
            <h3 class="text-sm font-black uppercase tracking-wide mb-2">{{ t('campaigns.step3Title') }}</h3>
            <p class="text-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ t('campaigns.step3Desc') }}</p>
          </div>
        </div>
      </section>

      <section class="mt-8 sm:mt-12 max-w-[min(100%,48rem)]">
        <div class="rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-black dark:bg-[var(--text-primary)] text-white dark:text-black p-6 sm:p-8 text-center">
          <h2 class="text-[1.25rem] xs:text-fluid-3xl font-black leading-tight tracking-normal mb-3 sm:mb-4">
            {{ t('campaigns.ctaTitle') }}
          </h2>
          <p class="text-sm leading-6 text-white/80 dark:text-black/70 mb-4 sm:mb-6 max-w-[min(100%,36rem)] mx-auto">
            {{ t('campaigns.ctaDesc') }}
          </p>
          <a
            href="https://www.earthguardians.org/crews"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 rounded-fluid bg-white dark:bg-[var(--bg-primary)] px-6 py-3 text-sm font-black text-black dark:text-[var(--text-primary)] hover:opacity-90 transition-opacity"
          >
            <Icon name="lucide:users" class="h-4 w-4" />
            {{ t('campaigns.joinCrew') }}
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
  title: computed(() => `${t('campaigns.title')} - Earth Guardians`),
  meta: [
    { name: 'description', content: computed(() => t('campaigns.description')) },
    { property: 'og:title', content: computed(() => t('campaigns.title')) },
    { property: 'og:description', content: computed(() => t('campaigns.description')) },
  ],
})

</script>
