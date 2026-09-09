/**
 * components/RedBookDatabases.vue
 * @why Links panel to IUCN Red List, national red book databases, and species resources
 * @component RedBookDatabases
 * @deps vue (ref, onMounted, onUnmounted)
 */
<template>
  <section
    v-motion
    :initial="{ opacity: 0, y: 20 }"
    :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 400 } }"
    class="border-t border-white/[0.07] px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
  >
    <div class="mx-auto w-container">
      <header class="mb-5 sm:mb-6">
        <h2 class="font-heading text-[1.25rem] sm:text-fluid-3xl font-black leading-tight tracking-tight">
          {{ t('home.databasesTitle') }}
        </h2>
        <p class="mt-1.5 max-w-[min(100%,40rem)] text-[0.8rem] sm:text-fluid-xs leading-relaxed text-white/45">
          {{ t('home.databasesDescSuggest') }}
        </p>
      </header>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-white/40">
        <LoadingSpinner class="h-4 w-4" />
        {{ t('general.loading') }}
      </div>

      <div v-else class="grid gap-3 sm:gap-4 md:grid-cols-2">
        <article
          v-for="(db, index) in databases"
          :key="db.id"
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 400, delay: index * 100 } }"
          class="flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl px-4 py-4 sm:px-5 sm:py-5 transition-all duration-normal hover:border-white/[0.12] hover:bg-white/[0.06] hover:-translate-y-0.5"
        >
          <div class="mb-2 sm:mb-3 flex items-center gap-2 xs:gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.06]">
              <Icon :name="db.icon" class="h-4 w-4 text-eg-teal" />
            </div>
            <span class="truncate rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white/50">
              {{ db.scope }}
            </span>
          </div>

          <h3 class="font-heading text-[1.1rem] sm:text-fluid-2xl font-black leading-tight tracking-tight">{{ db.title }}</h3>
          <p class="mt-1.5 flex-1 text-[0.8rem] sm:text-fluid-xs leading-relaxed text-white/40">{{ db.description }}</p>

          <div v-if="db.speciesCount" class="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] sm:text-fluid-xs text-white/35">
            <span>{{ db.speciesCount }} {{ t('home.speciesCount').toLowerCase() }}</span>
            <span v-if="db.groupCount">· {{ db.groupCount }} {{ t('home.groupsCount').toLowerCase() }}</span>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <a
              :href="`mailto:crews@earthguardians.org?subject=${encodeURIComponent(t('home.suggestDatasetSubject'))}%20-%20${encodeURIComponent(db.title)}`"
              class="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 min-h-[2.25rem] py-1.5 text-[0.7rem] font-bold text-white/70 no-underline transition-all duration-200 hover:bg-white/[0.1] hover:text-white hover:border-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:scale-[0.97]"
            >
              <Icon name="lucide:mail" class="h-3.5 w-3.5" />
              {{ t('home.suggestDataset') }}
            </a>
            <a
              :href="db.link"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 min-h-[2.25rem] py-1.5 text-[0.7rem] font-bold text-white/45 no-underline transition-all duration-200 hover:bg-white/[0.05] hover:text-white/70 hover:border-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 active:scale-[0.97]"
            >
              <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
              {{ t('home.viewSource') }}
            </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">

import { ref, onMounted, onUnmounted } from 'vue'

interface DatasetInfo {
  id: string
  name: string
  url: string
  speciesCount: number
  taxonomicGroups: Record<string, number>
}

interface Database {
  id: string
  icon: string
  scope: string
  title: string
  description: string
  link: string
  speciesCount: number | null
  groupCount: number | null
}

const { t } = useI18n()

const loading = ref(true)
const databases = ref<Database[]>([])

const DATASET_ICONS: Record<string, string> = {
  iucn: 'lucide:globe',
  'icmbio-brazil': 'lucide:tree-pine',
}

const abortController = new AbortController()
onUnmounted(() => abortController.abort())

onMounted(async () => {
  try {
    const baseURL = (useRuntimeConfig().app?.baseURL as string) || '/'
    const res = await fetch(`${baseURL}data/species/index.json`, { signal: abortController.signal })
    const index: { datasets: DatasetInfo[] } = await res.json()

    databases.value = index.datasets.map((ds) => {
      const keyId = datasetKeyId(ds.id)
      return {
        id: ds.id,
        icon: DATASET_ICONS[ds.id] || 'lucide:database',
        scope: t(`home.${keyId}Scope`),
        title: t(`home.${keyId}Title`),
        description: t(`home.${keyId}Desc`),
        link: ds.url,
        speciesCount: ds.speciesCount,
        groupCount: Object.keys(ds.taxonomicGroups).length,
      }
    })
  } catch {
    databases.value = []
  } finally {
    loading.value = false
  }
})

function datasetKeyId(id: string): string {
  return id === 'icmbio-brazil' ? 'icmbio' : id
}

</script>
