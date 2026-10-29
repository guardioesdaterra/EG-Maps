/**
 * pages/iframe.vue
 * @why Embeddable iframe page — lightweight map view for embedding in external sites
 * @component iframe
 */
<template>
  <main id="main-content" tabindex="-1" class="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      
      <header class="mb-8">
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl">
          {{ t('iframe.title') }}
        </h1>
        <p class="mt-2 text-lg text-[var(--text-secondary)]">
          {{ t('iframe.subtitle') }}
        </p>
      </header>

      
      <section class="mb-8 rounded-xl border-2 border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-[var(--border-color)] px-4 py-3 bg-[var(--bg-secondary)]">
          <h2 class="text-lg font-bold">{{ t('iframe.picker.title') }}</h2>
          <p class="text-sm text-[var(--text-secondary)]">
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
                : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'"
            >
              2D
            </button>
            <button
              @click="pickerMode = '3d'"
              class="flex-1 text-3xl font-black py-8 rounded-xl border-2 transition-all duration-200"
              :class="pickerMode === '3d'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'"
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
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'"
            >
              {{ ds.label }}
            </button>
          </div>
          
          <div v-if="pickerMode" class="relative w-full border border-[var(--border-color)] rounded-lg overflow-hidden" :aria-busy="previewStatus.picker === 'loading'">
            <iframe
              :key="`${pickerIframeSrc}:${previewRevision.picker}`"
              :src="pickerIframeSrc"
              class="w-full h-[min(500px,80vw)] border-0"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
              :title="pickerIframeTitle"
              @load="markPreviewLoaded('picker')"
              @error="markPreviewFailed('picker')"
            ></iframe>
            <div
              v-if="previewStatus.picker !== 'loaded'"
              class="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/95 text-[var(--text-secondary)]"
              :role="previewStatus.picker === 'error' ? 'alert' : 'status'"
              aria-live="polite"
            >
              <div v-if="previewStatus.picker === 'error'" class="flex flex-col items-center gap-2 text-sm">
                <span>{{ t('general.error') }}</span>
                <button type="button" class="rounded-md border border-[var(--border-color)] px-3 py-1.5 font-medium hover:bg-[var(--bg-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" @click="retryPreview('picker')">
                  {{ t('general.retry') }}
                </button>
              </div>
              <div v-else class="flex items-center gap-2 text-sm">
                <span aria-hidden="true" class="h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:animate-none" />
                <span>{{ t('general.loading') }}</span>
              </div>
            </div>
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

      
      <section class="mb-8 rounded-xl border-2 border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-[var(--border-color)] px-4 py-3 bg-[var(--bg-secondary)]">
          <h2 class="text-lg font-bold">{{ t('iframe.compare.title') }}</h2>
          <p class="text-sm text-[var(--text-secondary)]">
            {{ t('iframe.compare.description') }}
          </p>
        </div>
        <div class="p-4 space-y-6">
          <div
            v-for="comp in compareConfigs"
            :key="comp.key"
            class="border border-[var(--border-color)] rounded-lg p-4"
          >
            <h3 class="font-bold mb-3">{{ comp.label }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-medium text-[var(--text-muted)] mb-1">2D Map</p>
                <div
                  :ref="(el) => observeContainer(comp.key + '-2d', el as HTMLElement | null)"
                  class="relative border border-[var(--border-color)] rounded-lg overflow-hidden"
                  :aria-busy="previewStatus[comp.key + '-2d'] === 'loading'"
                >
                  <div
                    v-if="!isVisible[comp.key + '-2d']"
                    class="bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] text-sm h-64"
                  >
                    {{ t('iframe.loadingPreview') }}
                  </div>
                  <iframe
                    v-else
                    :key="`${comp.key}-2d:${previewRevision[comp.key + '-2d']}`"
                    :src="comp.src2d"
                    class="w-full h-64 border-0"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
                    :title="comp.label + ' 2D'"
                    @load="markPreviewLoaded(comp.key + '-2d')"
                    @error="markPreviewFailed(comp.key + '-2d')"
                  ></iframe>
                  <div
                    v-if="isVisible[comp.key + '-2d'] && previewStatus[comp.key + '-2d'] !== 'loaded'"
                    class="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/95 text-[var(--text-secondary)]"
                    :role="previewStatus[comp.key + '-2d'] === 'error' ? 'alert' : 'status'"
                    aria-live="polite"
                  >
                    <div v-if="previewStatus[comp.key + '-2d'] === 'error'" class="flex flex-col items-center gap-2 text-sm">
                      <span>{{ t('general.error') }}</span>
                      <button type="button" class="rounded-md border border-[var(--border-color)] px-3 py-1.5 font-medium hover:bg-[var(--bg-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" @click="retryPreview(comp.key + '-2d')">
                        {{ t('general.retry') }}
                      </button>
                    </div>
                    <div v-else class="flex items-center gap-2 text-sm">
                      <span aria-hidden="true" class="h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:animate-none" />
                      <span>{{ t('general.loading') }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p class="text-xs font-medium text-[var(--text-muted)] mb-1">3D Globe</p>
                <div
                  :ref="(el) => observeContainer(comp.key + '-3d', el as HTMLElement | null)"
                  class="relative border border-[var(--border-color)] rounded-lg overflow-hidden"
                  :aria-busy="previewStatus[comp.key + '-3d'] === 'loading'"
                >
                  <div
                    v-if="!isVisible[comp.key + '-3d']"
                    class="bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] text-sm h-64"
                  >
                    {{ t('iframe.loadingPreview') }}
                  </div>
                  <iframe
                    v-else
                    :key="`${comp.key}-3d:${previewRevision[comp.key + '-3d']}`"
                    :src="comp.src3d"
                    class="w-full h-64 border-0"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
                    :title="comp.label + ' 3D'"
                    @load="markPreviewLoaded(comp.key + '-3d')"
                    @error="markPreviewFailed(comp.key + '-3d')"
                  ></iframe>
                  <div
                    v-if="isVisible[comp.key + '-3d'] && previewStatus[comp.key + '-3d'] !== 'loaded'"
                    class="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/95 text-[var(--text-secondary)]"
                    :role="previewStatus[comp.key + '-3d'] === 'error' ? 'alert' : 'status'"
                    aria-live="polite"
                  >
                    <div v-if="previewStatus[comp.key + '-3d'] === 'error'" class="flex flex-col items-center gap-2 text-sm">
                      <span>{{ t('general.error') }}</span>
                      <button type="button" class="rounded-md border border-[var(--border-color)] px-3 py-1.5 font-medium hover:bg-[var(--bg-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" @click="retryPreview(comp.key + '-3d')">
                        {{ t('general.retry') }}
                      </button>
                    </div>
                    <div v-else class="flex items-center gap-2 text-sm">
                      <span aria-hidden="true" class="h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:animate-none" />
                      <span>{{ t('general.loading') }}</span>
                    </div>
                  </div>
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
          class="rounded-xl border-2 border-[var(--border-color)] overflow-hidden"
        >
          <div class="border-b-2 border-[var(--border-color)] px-4 py-3 bg-[var(--bg-secondary)]">
            <h2 class="text-lg font-bold">{{ t(`iframe.${item.key}.title`) }}</h2>
            <p class="text-sm text-[var(--text-secondary)]">
              {{ t(`iframe.${item.key}.description`) }}
            </p>
          </div>
          <div class="p-4">
            
            <div
              :ref="(el) => observeContainer(item.key, el as HTMLElement | null)"
              class="relative mb-4 border border-[var(--border-color)] rounded-lg overflow-hidden"
              :class="item.placeholderClass"
              :aria-busy="previewStatus[item.key] === 'loading'"
            >
              
              <div
                v-if="!isVisible[item.key]"
                class="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm"
              >
                {{ t('iframe.loadingPreview') }}
              </div>
              
              <iframe
                v-else
                :key="`${item.key}:${previewRevision[item.key]}`"
                :src="item.src"
                class="border-0 w-full"
                :class="item.iframeClass"
                :title="t(`iframe.${item.key}.title`)"
                loading="lazy"
                :allow="item.allow"
                @load="markPreviewLoaded(item.key)"
                @error="markPreviewFailed(item.key)"
              ></iframe>
              <div
                v-if="isVisible[item.key] && previewStatus[item.key] !== 'loaded'"
                class="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]/95 text-[var(--text-secondary)]"
                :role="previewStatus[item.key] === 'error' ? 'alert' : 'status'"
                aria-live="polite"
              >
                <div v-if="previewStatus[item.key] === 'error'" class="flex flex-col items-center gap-2 text-sm">
                  <span>{{ t('general.error') }}</span>
                  <button type="button" class="rounded-md border border-[var(--border-color)] px-3 py-1.5 font-medium hover:bg-[var(--bg-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" @click="retryPreview(item.key)">
                    {{ t('general.retry') }}
                  </button>
                </div>
                <div v-else class="flex items-center gap-2 text-sm">
                  <span aria-hidden="true" class="h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:animate-none" />
                  <span>{{ t('general.loading') }}</span>
                </div>
              </div>
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

      
      <section class="mt-8 rounded-xl border-2 border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-[var(--border-color)] px-4 py-3 bg-[var(--bg-secondary)]">
          <h2 class="text-lg font-bold">{{ t('iframe.usage.title') }}</h2>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.queryParams.title') }}</h3>
            <ul class="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1">
              <li><code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-xs">embed=true</code> — {{ t('iframe.usage.queryParams.embed') }}</li>
              <li><code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-xs">no-control=true</code> — {{ t('iframe.usage.queryParams.noControl') }}</li>
              <li><code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-xs">hideAll=true</code> — {{ t('iframe.usage.queryParams.hideAll') }}</li>
              <li><code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-xs">controls=true</code> — {{ t('iframe.usage.queryParams.controls') }}</li>
              <li><code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-xs">lang=es</code> — {{ t('iframe.usage.queryParams.lang') }}</li>
            </ul>
          </div>
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.autoHide.title') }}</h3>
            <p class="text-sm text-[var(--text-secondary)]">
              {{ t('iframe.usage.autoHide.description') }}
            </p>
          </div>
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.viewportSizes.title') }}</h3>
            <ul class="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1">
              <li><strong>Banner</strong> — {{ t('iframe.usage.viewportSizes.banner') }}</li>
              <li><strong>Small Card</strong> — {{ t('iframe.usage.viewportSizes.smallCard') }}</li>
              <li><strong>Medium Card</strong> — {{ t('iframe.usage.viewportSizes.mediumCard') }}</li>
              <li><strong>Responsive</strong> — {{ t('iframe.usage.viewportSizes.responsive') }}</li>
              <li><strong>Full Screen</strong> — {{ t('iframe.usage.viewportSizes.fullScreen') }}</li>
            </ul>
          </div>
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.security.title') }}</h3>
            <p class="text-sm text-[var(--text-secondary)]">
              {{ t('iframe.usage.security.description') }}
            </p>
          </div>
          <div>
            <h3 class="font-bold mb-2">{{ t('iframe.usage.performance.title') }}</h3>
            <p class="text-sm text-[var(--text-secondary)]">
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
const embedBaseURL = import.meta.client ? new URL(baseURL, window.location.origin).toString() : baseURL

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
  { key: 'active-crews', label: 'Crews Map' },
  { key: 'project-grants', label: 'Project Grants' },
  { key: 'endangered-species', label: 'Endangered Species' },
  { key: 'vulcan-observatory', label: 'Vulcan Observatory' },
]

const pickerIframeSrc = computed(() => {
  if (!pickerMode.value) return ''
  const path = pickerMode.value === '3d' ? `${pickerDataset.value}/3d` : pickerDataset.value
  return `${embedBaseURL}${path}?hideAll=true`
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
  const src = `${embedBaseURL}${path}?hideAll=true`
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
    label: 'Crews Map',
    src2d: `${embedBaseURL}active-crews?embed=true&hideAll=true`,
    src3d: `${embedBaseURL}active-crews/3d?embed=true&hideAll=true`,
  },
  {
    key: 'comp-project-grants',
    label: 'Project Grants',
    src2d: `${embedBaseURL}project-grants?embed=true&hideAll=true`,
    src3d: `${embedBaseURL}project-grants/3d?embed=true&hideAll=true`,
  },
  {
    key: 'comp-endangered-species',
    label: 'Endangered Species',
    src2d: `${embedBaseURL}endangered-species?embed=true&hideAll=true`,
    src3d: `${embedBaseURL}endangered-species/3d?embed=true&hideAll=true`,
  },
  {
    key: 'comp-vulcan-observatory',
    label: 'Vulcan Observatory',
    src2d: `${embedBaseURL}vulcan-observatory?embed=true&hideAll=true`,
    src3d: `${embedBaseURL}vulcan-observatory/3d?embed=true&hideAll=true`,
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
    src: `${embedBaseURL}active-crews/3d`,
    params: '',
    placeholderClass: 'h-96',
    iframeClass: 'h-96',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map',
    embedWidth: '100%',
    embedHeight: '100vh',
  },
  {
    key: 'fixed100',
    src: `${embedBaseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map',
    embedWidth: '100%',
    embedHeight: '500px',
  },
  {
    key: 'responsive',
    src: `${embedBaseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'w-full aspect-video',
    iframeClass: 'absolute inset-0 w-full h-full',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map',
    embedWidth: '100%',
    embedHeight: '100%',
  },
  {
    key: 'smallCard',
    src: `${embedBaseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'w-[300px] h-[250px]',
    iframeClass: 'w-full h-full',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map',
    embedWidth: '300px',
    embedHeight: '250px',
  },
  {
    key: 'mediumCard',
    src: `${embedBaseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'w-full max-w-[600px] aspect-[3/2]',
    iframeClass: 'w-full h-full',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map',
    embedWidth: '600px',
    embedHeight: '400px',
  },
  {
    key: 'largeCard',
    src: `${embedBaseURL}active-crews/3d?embed=true`,
    params: 'embed=true',
    placeholderClass: 'w-full max-w-[900px] aspect-[3/2]',
    iframeClass: 'w-full h-full',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map',
    embedWidth: '900px',
    embedHeight: '600px',
  },
  {
    key: 'fullScreenInteractive',
    src: `${embedBaseURL}active-crews/3d?embed=true&controls=true`,
    params: 'embed=true&controls=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map - Interactive',
    embedWidth: '100%',
    embedHeight: '500px',
  },

  {
    key: 'activeCrews2d',
    src: `${embedBaseURL}active-crews?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map - 2D',
    embedWidth: '100%',
    embedHeight: '500px',
  },

  {
    key: 'projectGrants3d',
    src: `${embedBaseURL}project-grants/3d?embed=true`,
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
    src: `${embedBaseURL}project-grants?embed=true`,
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
    src: `${embedBaseURL}endangered-species/3d?embed=true`,
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
    src: `${embedBaseURL}endangered-species?embed=true`,
    params: 'embed=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Endangered Species - 2D',
    embedWidth: '100%',
    embedHeight: '500px',
  },

  {
    key: 'observatory3d',
    src: `${embedBaseURL}vulcan-observatory/3d?embed=true`,
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
    src: `${embedBaseURL}vulcan-observatory?embed=true`,
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
    src: `${embedBaseURL}active-crews/3d?no-control=true`,
    params: 'no-control=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map - No Controls',
    embedWidth: '100%',
    embedHeight: '500px',
  },
  {
    key: 'hideAll',
    src: `${embedBaseURL}active-crews/3d?hideAll=true`,
    params: 'hideAll=true',
    placeholderClass: 'h-[500px]',
    iframeClass: 'h-[500px]',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen',
    embedLabel: 'Earth Guardians Crews Map - Globe Only',
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
  if (item.embedHeight === 'auto') {
    return `
<iframe
  src="${item.src}"
  style="width: 100%; min-height: 360px; border: none;"
  loading="lazy"
  allow="${item.allow}"
  title="${item.embedLabel}"
></iframe>`
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

type PreviewStatus = 'idle' | 'loading' | 'loaded' | 'error'

const previewStatus = reactive<Record<string, PreviewStatus>>({ picker: 'idle' })
const previewRevision = reactive<Record<string, number>>({ picker: 0 })
const isVisible = reactive<Record<string, boolean>>({})
for (const cfg of iframeConfigs) {
  isVisible[cfg.key] = false
  previewStatus[cfg.key] = 'idle'
  previewRevision[cfg.key] = 0
}
for (const comp of compareConfigs) {
  isVisible[comp.key + '-2d'] = false
  isVisible[comp.key + '-3d'] = false
  previewStatus[comp.key + '-2d'] = 'idle'
  previewStatus[comp.key + '-3d'] = 'idle'
  previewRevision[comp.key + '-2d'] = 0
  previewRevision[comp.key + '-3d'] = 0
}

watch(pickerIframeSrc, (src) => {
  if (src) previewStatus.picker = 'loading'
})

function markPreviewLoaded(key: string) {
  if (key in previewStatus) previewStatus[key] = 'loaded'
}

function markPreviewFailed(key: string) {
  if (key in previewStatus) previewStatus[key] = 'error'
}

function retryPreview(key: string) {
  if (!(key in previewStatus)) return
  previewStatus[key] = 'loading'
  previewRevision[key] = (previewRevision[key] ?? 0) + 1
}

const containerMap = new Map<string, HTMLElement>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
let previewObserver: IntersectionObserver | null = null

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

        const pending = timers.get(key)
        if (pending) clearTimeout(pending)
        timers.delete(key)

        if (entry.isIntersecting) {
          if (isVisible[key]) continue
          timers.set(key, setTimeout(() => {
            isVisible[key] = true
            previewStatus[key] = 'loading'
            timers.delete(key)
          }, ENTER_DELAY))
        } else {
          if (!isVisible[key]) continue
          timers.set(key, setTimeout(() => {
            isVisible[key] = false
            previewStatus[key] = 'idle'
            timers.delete(key)
          }, EXIT_DELAY))
        }
      }
    },
    { rootMargin: '200px 0px', threshold: 0.25 },
  )
  previewObserver = observer

  for (const el of containerMap.values()) observer.observe(el)
})

onUnmounted(() => {
  previewObserver?.disconnect()
  previewObserver = null
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
})

useHead({
  title: t('iframe.title'),
  meta: [
    { name: 'description', content: t('iframe.subtitle') },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})

</script>
