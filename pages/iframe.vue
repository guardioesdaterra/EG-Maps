<template>
  <main class="bg-white dark:bg-[var(--bg-primary)] text-black dark:text-[var(--text-primary)] min-h-screen">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <header class="mb-8">
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl">
          {{ t('iframe.title') }}
        </h1>
        <p class="mt-2 text-lg text-black/70 dark:text-[var(--text-secondary)]">
          {{ t('iframe.subtitle') }}
        </p>
      </header>

      <!-- Embed Examples Grid -->
      <div class="grid gap-8">
        <!-- Full Screen Embed -->
        <section class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t('iframe.fullScreen.title') }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t('iframe.fullScreen.description') }}
            </p>
          </div>
          <div class="p-4">
            <!-- Preview -->
            <div class="mb-4 border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden">
              <iframe
                :src="`${baseURL}active-crews/3d`"
                class="w-full h-96 border-0"
                loading="lazy"
                :title="t('iframe.fullScreen.title')"
              ></iframe>
            </div>
            <!-- Code Block -->
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ fullScreenCode }}</pre>
              </div>
              <button
                @click="copyToClipboard(fullScreenCode, 'fullScreen')"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === 'fullScreen' ? t('iframe.copied') : t('iframe.copy') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Fixed 100% Embed -->
        <section class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t('iframe.fixed100.title') }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t('iframe.fixed100.description') }}
            </p>
          </div>
          <div class="p-4">
            <div class="mb-4 border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden">
              <iframe
                :src="`${baseURL}active-crews/3d?embed=true`"
                class="w-full h-[500px] border-0"
                loading="lazy"
                :title="t('iframe.fixed100.title')"
              ></iframe>
            </div>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ fixed100Code }}</pre>
              </div>
              <button
                @click="copyToClipboard(fixed100Code, 'fixed100')"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === 'fixed100' ? t('iframe.copied') : t('iframe.copy') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Responsive Container Embed -->
        <section class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t('iframe.responsive.title') }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t('iframe.responsive.description') }}
            </p>
          </div>
          <div class="p-4">
            <div class="mb-4 border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden">
              <div class="relative w-full" style="padding-bottom: 56.25%;">
                <iframe
                  :src="`${baseURL}active-crews/3d?embed=true`"
                  class="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                  :title="t('iframe.responsive.title')"
                ></iframe>
              </div>
            </div>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ responsiveCode }}</pre>
              </div>
              <button
                @click="copyToClipboard(responsiveCode, 'responsive')"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === 'responsive' ? t('iframe.copied') : t('iframe.copy') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Small Card Embed -->
        <section class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t('iframe.smallCard.title') }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t('iframe.smallCard.description') }}
            </p>
          </div>
          <div class="p-4">
            <div class="mb-4 flex justify-center">
              <div class="border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden w-[300px] h-[250px]">
                <iframe
                  :src="`${baseURL}active-crews/3d?embed=true`"
                  class="w-full h-full border-0"
                  loading="lazy"
                  :title="t('iframe.smallCard.title')"
                ></iframe>
              </div>
            </div>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ smallCardCode }}</pre>
              </div>
              <button
                @click="copyToClipboard(smallCardCode, 'smallCard')"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === 'smallCard' ? t('iframe.copied') : t('iframe.copy') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Medium Card Embed -->
        <section class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t('iframe.mediumCard.title') }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t('iframe.mediumCard.description') }}
            </p>
          </div>
          <div class="p-4">
            <div class="mb-4 flex justify-center overflow-hidden">
              <div class="border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden w-full max-w-[600px] aspect-[3/2]">
                <iframe
                  :src="`${baseURL}active-crews/3d?embed=true`"
                  class="w-full h-full border-0"
                  loading="lazy"
                  :title="t('iframe.mediumCard.title')"
                ></iframe>
              </div>
            </div>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ mediumCardCode }}</pre>
              </div>
              <button
                @click="copyToClipboard(mediumCardCode, 'mediumCard')"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === 'mediumCard' ? t('iframe.copied') : t('iframe.copy') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Large Card Embed -->
        <section class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t('iframe.largeCard.title') }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t('iframe.largeCard.description') }}
            </p>
          </div>
          <div class="p-4">
            <div class="mb-4 flex justify-center overflow-hidden">
              <div class="border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden w-full max-w-[900px] aspect-[3/2]">
                <iframe
                  :src="`${baseURL}active-crews/3d?embed=true`"
                  class="w-full h-full border-0"
                  loading="lazy"
                  :title="t('iframe.largeCard.title')"
                ></iframe>
              </div>
            </div>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ largeCardCode }}</pre>
              </div>
              <button
                @click="copyToClipboard(largeCardCode, 'largeCard')"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === 'largeCard' ? t('iframe.copied') : t('iframe.copy') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Full Screen Interactive Embed -->
        <section class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t('iframe.fullScreenInteractive.title') }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t('iframe.fullScreenInteractive.description') }}
            </p>
          </div>
          <div class="p-4">
            <div class="mb-4 border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden">
              <iframe
                :src="`${baseURL}active-crews/3d?embed=true&controls=true`"
                class="w-full h-[500px] border-0"
                loading="lazy"
                :title="t('iframe.fullScreenInteractive.title')"
              ></iframe>
            </div>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ fullScreenInteractiveCode }}</pre>
              </div>
              <button
                @click="copyToClipboard(fullScreenInteractiveCode, 'fullScreenInteractive')"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === 'fullScreenInteractive' ? t('iframe.copied') : t('iframe.copy') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Observatory Embed -->
        <section class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t('iframe.observatory.title') }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t('iframe.observatory.description') }}
            </p>
          </div>
          <div class="p-4">
            <div class="mb-4 border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden">
              <iframe
                :src="`${baseURL}vulcan-observatory?embed=true`"
                class="w-full h-[500px] border-0"
                loading="lazy"
                :title="t('iframe.observatory.title')"
              ></iframe>
            </div>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ observatoryCode }}</pre>
              </div>
              <button
                @click="copyToClipboard(observatoryCode, 'observatory')"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === 'observatory' ? t('iframe.copied') : t('iframe.copy') }}
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- Usage Instructions -->
      <section class="mt-8 rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
          <h2 class="text-lg font-bold">{{ t('iframe.usage.title') }}</h2>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.queryParams.title') }}</h3>
            <ul class="list-disc list-inside text-sm text-black/70 dark:text-[var(--text-secondary)] space-y-1">
              <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">embed=true</code> — {{ t('iframe.usage.queryParams.embed') }}</li>
              <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">controls=true</code> — {{ t('iframe.usage.queryParams.controls') }}</li>
              <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">lang=es</code> — {{ t('iframe.usage.queryParams.lang') }}</li>
            </ul>
          </div>
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.autoHide.title') }}</h3>
            <p class="text-sm text-black/70 dark:text-[var(--text-secondary)]">
              {{ t('iframe.usage.autoHide.description') }}
            </p>
          </div>
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.viewportSizes.title') }}</h3>
            <ul class="list-disc list-inside text-sm text-black/70 dark:text-[var(--text-secondary)] space-y-1">
              <li><strong>Banner</strong> — {{ t('iframe.usage.viewportSizes.banner') }}</li>
              <li><strong>Small Card</strong> — {{ t('iframe.usage.viewportSizes.smallCard') }}</li>
              <li><strong>Medium Card</strong> — {{ t('iframe.usage.viewportSizes.mediumCard') }}</li>
              <li><strong>Responsive</strong> — {{ t('iframe.usage.viewportSizes.responsive') }}</li>
              <li><strong>Full Screen</strong> — {{ t('iframe.usage.viewportSizes.fullScreen') }}</li>
            </ul>
          </div>
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.security.title') }}</h3>
            <p class="text-sm text-black/70 dark:text-[var(--text-secondary)]">
              {{ t('iframe.usage.security.description') }}
            </p>
          </div>
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.performance.title') }}</h3>
            <p class="text-sm text-black/70 dark:text-[var(--text-secondary)]">
              {{ t('iframe.usage.performance.description') }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL || '/'

// Copy functionality
const copiedId = ref<string | null>(null)
let copyTimeout: ReturnType<typeof setTimeout> | null = null

async function copyToClipboard(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => {
      copiedId.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Embed codes
const fullScreenCode = computed(() => `<!-- Full Screen Embed -->
<iframe
  src="${baseURL}active-crews/3d"
  style="width: 100%; height: 100vh; border: none;"
  loading="lazy"
  title="Earth Guardians Active Crews"
></iframe>`)

const fixed100Code = computed(() => `<!-- Fixed Height Embed -->
<iframe
  src="${baseURL}active-crews/3d?embed=true"
  style="width: 100%; height: 500px; border: none;"
  loading="lazy"
  title="Earth Guardians Active Crews"
></iframe>`)

const responsiveCode = computed(() => `<!-- Responsive 16:9 Aspect Ratio Embed -->
<div style="position: relative; width: 100%; padding-bottom: 56.25%;">
  <iframe
    src="${baseURL}active-crews/3d?embed=true"
    style="position: absolute; inset: 0; width: 100%; height: 100%; border: none;"
    loading="lazy"
    title="Earth Guardians Active Crews"
  ></iframe>
</div>`)

const smallCardCode = computed(() => `<!-- Small Card Embed (300x250) -->
<iframe
  src="${baseURL}active-crews/3d?embed=true"
  style="width: 300px; height: 250px; border: none;"
  loading="lazy"
  title="Earth Guardians Active Crews"
></iframe>`)

const mediumCardCode = computed(() => `<!-- Medium Card Embed (600x400) -->
<iframe
  src="${baseURL}active-crews/3d?embed=true"
  style="width: 600px; height: 400px; border: none;"
  loading="lazy"
  title="Earth Guardians Active Crews"
></iframe>`)

const largeCardCode = computed(() => `<!-- Large Card Embed (900x600) -->
<iframe
  src="${baseURL}active-crews/3d?embed=true"
  style="width: 900px; height: 600px; border: none;"
  loading="lazy"
  title="Earth Guardians Active Crews"
></iframe>`)

const fullScreenInteractiveCode = computed(() => `<!-- Full Screen Interactive Embed -->
<iframe
  src="${baseURL}active-crews/3d?embed=true&controls=true"
  style="width: 100%; height: 500px; border: none;"
  loading="lazy"
  title="Earth Guardians Active Crews - Interactive"
></iframe>`)

const observatoryCode = computed(() => `<!-- Vulcan Observatory Embed -->
<iframe
  src="${baseURL}vulcan-observatory?embed=true"
  style="width: 100%; height: 500px; border: none;"
  loading="lazy"
  title="Vulcan Observatory - Mining Processes in Brazil"
></iframe>`)

// SEO
useHead({
  title: t('iframe.title'),
  meta: [
    { name: 'description', content: t('iframe.subtitle') },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>