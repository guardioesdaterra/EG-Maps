/**
 * pages/iframe.vue
 * @why Embeddable iframe page — lightweight map view for embedding in external sites
 * @component iframe
 */
<template>
  <main id="main-content" class="bg-white dark:bg-[var(--bg-primary)] text-black dark:text-[var(--text-primary)] min-h-screen">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      
      <header class="mb-8">
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl">
          {{ t('iframe.title') }}
        </h1>
        <p class="mt-2 text-lg text-black/70 dark:text-[var(--text-secondary)]">
          {{ t('iframe.subtitle') }}
        </p>
      </header>

      
      <section class="mb-8 rounded-xl border-2 border-black/20 dark:border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-black/20 dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
          <h2 class="text-lg font-bold">{{ t('iframe.picker.title') }}</h2>
          <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
            {{ t('iframe.picker.description') }}
          </p>
        </div>
        <div class="p-6 flex flex-col items-center gap-6">
          
          <div class="flex gap-4 w-full max-w-md">
            <button
              @click="pickerMode = '2d'"
              class="flex-1 text-3xl font-black py-8 rounded-xl border-2 transition-all duration-200"
              :class="pickerMode === '2d'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/10'"
            >
              2D
            </button>
            <button
              @click="pickerMode = '3d'"
              class="flex-1 text-3xl font-black py-8 rounded-xl border-2 transition-all duration-200"
              :class="pickerMode === '3d'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/10'"
            >
              3D
            </button>
          </div>
          
          <div v-if="pickerMode" class="flex gap-2 flex-wrap justify-center">
            <button
              v-for="ds in pickerDatasets"
              :key="ds.key"
              @click="pickerDataset = ds.key"
              class="px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors"
              :class="pickerDataset === ds.key
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/10'"
            >
              {{ ds.label }}
            </button>
          </div>
          
          <div v-if="pickerMode" class="w-full border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden">
            <iframe
              :src="pickerIframeSrc"
              class="w-full h-[min(500px,80vw)] border-0"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
              :title="pickerIframeTitle"
            ></iframe>
          </div>
          
          <div v-if="pickerMode" class="w-full relative">
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ pickerEmbedCode }}</pre>
            </div>
            <button
              @click="copyToClipboard(pickerEmbedCode, 'picker')"
              class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
              :aria-label="t('iframe.copyCode')"
            >
              {{ copiedId === 'picker' ? t('iframe.copied') : t('iframe.copy') }}
            </button>
          </div>
        </div>
      </section>

      
      <section class="mb-8 rounded-xl border-2 border-black/20 dark:border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-black/20 dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
          <h2 class="text-lg font-bold">{{ t('iframe.compare.title') }}</h2>
          <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
            {{ t('iframe.compare.description') }}
          </p>
        </div>
        <div class="p-4 space-y-6">
          <div
            v-for="comp in compareConfigs"
            :key="comp.key"
            class="border border-black/10 dark:border-[var(--border-color)] rounded-lg p-4"
          >
            <h3 class="font-bold mb-3">{{ comp.label }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-medium text-black/50 dark:text-[var(--text-secondary)] mb-1">2D Map</p>
                <div
                  :ref="(el) => observeContainer(comp.key + '-2d', el as HTMLElement | null)"
                  class="border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden"
                >
                  <div
                    v-if="!isVisible[comp.key + '-2d']"
                    class="bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/40 dark:text-white/40 text-sm h-64"
                  >
                    {{ t('iframe.loadingPreview') }}
                  </div>
                  <iframe
                    v-else
                    :src="comp.src2d"
                    class="w-full h-64 border-0"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
                    :title="comp.label + ' 2D'"
                  ></iframe>
                </div>
              </div>
              <div>
                <p class="text-xs font-medium text-black/50 dark:text-[var(--text-secondary)] mb-1">3D Globe</p>
                <div
                  :ref="(el) => observeContainer(comp.key + '-3d', el as HTMLElement | null)"
                  class="border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden"
                >
                  <div
                    v-if="!isVisible[comp.key + '-3d']"
                    class="bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/40 dark:text-white/40 text-sm h-64"
                  >
                    {{ t('iframe.loadingPreview') }}
                  </div>
                  <iframe
                    v-else
                    :src="comp.src3d"
                    class="w-full h-64 border-0"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
                    :title="comp.label + ' 3D'"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
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
            
            <div
              :ref="(el) => observeContainer(item.key, el as HTMLElement | null)"
              class="mb-4 border border-black/20 dark:border-[var(--border-color)] rounded-lg overflow-hidden"
            >
              
              <div
                v-if="!isVisible[item.key]"
                class="bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/40 dark:text-white/40 text-sm"
                :class="item.placeholderClass"
              >
                {{ t('iframe.loadingPreview') }}
              </div>
              
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

const pickerMode = ref<'2d' | '3d' | null>(null)
const pickerDataset = ref('active-crews')

const pickerDatasets = [
  { key: 'active-crews', label: 'Active Crews' },
  { key: 'project-grants', label: 'Project Grants' },
  { key: 'endangered-species', label: 'Endangered Species' },
  { key: 'vulcan-observatory', label: 'Observatory of Vulcan' },
]

const pickerIframeSrc = computed(() => {
  if (!pickerMode.value) return ''
  const path = pickerMode.value === '3d' ? `${pickerDataset.value}/3d` : pickerDataset.value
  return `${baseURL}${path}?hideAll=true`
})

const pickerIframeTitle = computed(() => {
  const ds = pickerDatasets.find(d => d.key === pickerDataset.value)
  const mode = pickerMode.value?.toUpperCase()
  return `${ds?.label ?? ''} ${mode}`
})

const pickerEmbedCode = computed(() => {
  if (!pickerMode.value) return ''
  const ds = pickerDatasets.find(d => d.key === pickerDataset.value)
  const mode = pickerMode.value.toUpperCase()
  const path = pickerMode.value === '3d' ? `${pickerDataset.value}/3d` : pickerDataset.value
  const src = `${baseURL}${path}?hideAll=true`
  const label = `${ds?.label ?? ''} — ${mode}`
  return `\n<iframe\n  src="${src}"\n  style="width: 100%; height: 500px; border: none;"\n  loading="lazy"\n  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"\n  title="${label}"\n></iframe>`
})

interface CompareItem {
  key: string
  label: string
  src2d: string
  src3d: string
}

const compareConfigs: CompareItem[] = [
  {
    key: 'comp-active-crews',
    label: 'Active Crews',
    src2d: `${baseURL}active-crews?embed=true&hideAll=true`,
    src3d: `${baseURL}active-crews/3d?embed=true&hideAll=true`,
  },
  {
    key: 'comp-project-grants',
    label: 'Project Grants',
    src2d: `${baseURL}project-grants?embed=true&hideAll=true`,
    src3d: `${baseURL}project-grants/3d?embed=true&hideAll=true`,
  },
  {
    key: 'comp-endangered-species',
    label: 'Endangered Species',
    src2d: `${baseURL}endangered-species?embed=true&hideAll=true`,
    src3d: `${baseURL}endangered-species/3d?embed=true&hideAll=true`,
  },
  {
    key: 'comp-vulcan-observatory',
    label: 'Observatory of Vulcan',
    src2d: `${baseURL}vulcan-observatory?embed=true&hideAll=true`,
    src3d: `${baseURL}vulcan-observatory/3d?embed=true&hideAll=true`,
  },
]

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
    key: 'activeCrews2d',
    src: `${baseURL}active-crews?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Active Crews - 2D',
    embedWidth: '100%',
    embedHeight: '500px',
  },

  {
    key: 'projectGrants3d',
    src: `${baseURL}project-grants/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Project Grants - 3D Globe',
    embedWidth: '100%',
    embedHeight: '500px',
  },
  {
    key: 'projectGrants2d',
    src: `${baseURL}project-grants?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Project Grants - 2D Map',
    embedWidth: '100%',
    embedHeight: '500px',
  },

  {
    key: 'endangeredSpecies3d',
    src: `${baseURL}endangered-species/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Endangered Species - 3D Globe',
    embedWidth: '100%',
    embedHeight: '500px',
  },
  {
    key: 'endangeredSpecies2d',
    src: `${baseURL}endangered-species?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Endangered Species - 2D Map',
    embedWidth: '100%',
    embedHeight: '500px',
  },

  {
    key: 'observatory3d',
    src: `${baseURL}vulcan-observatory/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Vulcan Observatory - 3D Globe',
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
    return `
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
  return `
<iframe
  src="${item.src}"
  style="width: ${item.embedWidth}; height: ${item.embedHeight}; border: none;"
  loading="lazy"
  allow="${item.allow}"
  title="${item.embedLabel}"
></iframe>`
}

const isVisible = reactive<Record<string, boolean>>({})
for (const cfg of iframeConfigs) isVisible[cfg.key] = false
for (const comp of compareConfigs) {
  isVisible[comp.key + '-2d'] = false
  isVisible[comp.key + '-3d'] = false
}

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

useHead({
  title: t('iframe.title'),
  meta: [
    { name: 'description', content: t('iframe.subtitle') },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})

</script>
