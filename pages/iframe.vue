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

      <!-- Embed Examples -->
      <div class="grid gap-8">
        <section
          v-for="item in iframeConfigs"
          :key="item.key"
          class="rounded-xl border-2 border-black dark:border-[var(--border-color)] overflow-hidden"
        >
          <div class="border-b-2 border-black dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
            <h2 class="text-lg font-bold">{{ t(`iframe.${item.key}.title`) }}</h2>
            <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
              {{ t(`iframe.${item.key}.description`) }}
            </p>
          </div>
          <div class="p-4">
            <!-- Preview container (observed for visibility) -->
            <div
              :ref="(el) => observeContainer(item.key, el as HTMLElement | null)"
              class="mb-4 border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden"
            >
              <!-- Placeholder -->
              <div
                v-if="!isVisible[item.key]"
                class="bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/40 dark:text-white/40 text-sm"
                :class="item.placeholderClass"
              >
                {{ t('iframe.loadingPreview') }}
              </div>
              <!-- Iframe (mounted only while visible) -->
              <iframe
                v-else
                :src="item.src"
                class="border-0 w-full"
                :class="item.iframeClass"
                :title="t(`iframe.${item.key}.title`)"
                loading="lazy"
                :allow="item.allow"
              ></iframe>
            </div>
            <!-- Code Block -->
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ buildEmbedCode(item) }}</pre>
              </div>
              <button
                @click="copyToClipboard(buildEmbedCode(item), item.key)"
                class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                :aria-label="t('iframe.copyCode')"
              >
                {{ copiedId === item.key ? t('iframe.copied') : t('iframe.copy') }}
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
              <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">no-control=true</code> — {{ t('iframe.usage.queryParams.noControl') }}</li>
              <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">hideAll=true</code> — {{ t('iframe.usage.queryParams.hideAll') }}</li>
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

// ── Copy ──────────────────────────────────────────────────────
const copiedId = ref<string | null>(null)
let copyTimeout: ReturnType<typeof setTimeout> | null = null

async function copyToClipboard(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => { copiedId.value = null }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// ── Iframe configuration (single source of truth) ─────────────
interface IframeConfig {
  key: string
  src: string
  params: string
  placeholderClass: string
  iframeClass: string
  allow: string
  embedLabel: string
  embedWidth: string
  embedHeight: string
}

const iframeConfigs: IframeConfig[] = [
  {
    key: 'fullScreen',
    src: `${baseURL}active-crews/3d`,
    params: '',
    placeholderClass: 'h-96',
    iframeClass: 'h-96',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews',
    embedWidth: '100%',
    embedHeight: '100vh',
  },
  {
    key: 'fixed100',
    src: `${baseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews',
    embedWidth: '100%',
    embedHeight: '500px',
  },
  {
    key: 'responsive',
    src: `${baseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'relative w-full',
    iframeClass: 'absolute inset-0 w-full h-full',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews',
    embedWidth: '100%',
    embedHeight: '100%',
    // responsive wraps iframe in a 16:9 aspect container
  },
  {
    key: 'smallCard',
    src: `${baseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'w-[300px] h-[250px]',
    iframeClass: 'w-full h-full',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews',
    embedWidth: '300px',
    embedHeight: '250px',
  },
  {
    key: 'mediumCard',
    src: `${baseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'w-full max-w-[600px] aspect-[3/2]',
    iframeClass: 'w-full h-full',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews',
    embedWidth: '600px',
    embedHeight: '400px',
  },
  {
    key: 'largeCard',
    src: `${baseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'w-full max-w-[900px] aspect-[3/2]',
    iframeClass: 'w-full h-full',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews',
    embedWidth: '900px',
    embedHeight: '600px',
  },
  {
    key: 'fullScreenInteractive',
    src: `${baseURL}active-crews/3d?embed=true&controls=true`,
    params: 'embed=true&controls=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews - Interactive',
    embedWidth: '100%',
    embedHeight: '500px',
  },
  {
    key: 'observatory',
    src: `${baseURL}vulcan-observatory?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Vulcan Observatory - Mining Processes in Brazil',
    embedWidth: '100%',
    embedHeight: '500px',
  },
  {
    key: 'noControl',
    src: `${baseURL}active-crews/3d?no-control=true`,
    params: 'no-control=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews - No Controls',
    embedWidth: '100%',
    embedHeight: '500px',
  },
  {
    key: 'hideAll',
    src: `${baseURL}active-crews/3d?hideAll=true`,
    params: 'hideAll=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews - Globe Only',
    embedWidth: '100%',
    embedHeight: '500px',
  },
]

function buildEmbedCode(item: IframeConfig): string {
  if (item.key === 'responsive') {
    return `<!-- Responsive 16:9 Aspect Ratio Embed -->
<div style="position: relative; width: 100%; padding-bottom: 56.25%;">
  <iframe
    src="${item.src}"
    style="position: absolute; inset: 0; width: 100%; height: 100%; border: none;"
    loading="lazy"
    allow="${item.allow}"
    title="${item.embedLabel}"
  ></iframe>
</div>`
  }
  return `<!-- ${item.embedLabel} Embed -->
<iframe
  src="${item.src}"
  style="width: ${item.embedWidth}; height: ${item.embedHeight}; border: none;"
  loading="lazy"
  allow="${item.allow}"
  title="${item.embedLabel}"
></iframe>`
}

// ── Viewport visibility tracking ──────────────────────────────
// Only mount heavy WebGL iframes while visible; destroy on exit.
// Uses a Map for O(1) observer → key lookup and per-iframe
// debounce timers to avoid rapid mount/unmount during fast scrolls.

const isVisible = reactive<Record<string, boolean>>({})
for (const cfg of iframeConfigs) isVisible[cfg.key] = false

const containerMap = new Map<string, HTMLElement>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function observeContainer(key: string, el: HTMLElement | null) {
  if (el) containerMap.set(key, el)
  else containerMap.delete(key)
}

onMounted(() => {
  const elToKey = new Map<Element, string>()
  for (const [key, el] of containerMap) elToKey.set(el, key)

  const ENTER_DELAY = 100
  const EXIT_DELAY = 300

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const key = elToKey.get(entry.target)
        if (!key) continue

        if (entry.isIntersecting) {
          const pending = timers.get(key)
          if (pending) clearTimeout(pending)
          timers.set(key, setTimeout(() => {
            isVisible[key] = true
            timers.delete(key)
          }, ENTER_DELAY))
        } else {
          const pending = timers.get(key)
          if (pending) clearTimeout(pending)
          timers.set(key, setTimeout(() => {
            isVisible[key] = false
            timers.delete(key)
          }, EXIT_DELAY))
        }
      }
    },
    { rootMargin: '200px 0px', threshold: 0.25 },
  )

  for (const el of containerMap.values()) observer.observe(el)

  onUnmounted(() => {
    observer.disconnect()
    for (const t of timers.values()) clearTimeout(t)
    timers.clear()
  })
})

// SEO
useHead({
  title: t('iframe.title'),
  meta: [
    { name: 'description', content: t('iframe.subtitle') },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>
