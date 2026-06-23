<template>
  <section class="border-t border-black bg-white px-[clamp(0.875rem,4vw,2.5rem)] py-[clamp(3rem,8vh,6rem)]">
    <div class="mx-auto w-[min(100%,78rem)]">
      <header class="mb-[clamp(1.5rem,4vw,3rem)]">
        <h2 class="text-[clamp(1.25rem,4vw,2.5rem)] font-black leading-tight tracking-normal">
          {{ t('home.databasesTitle') }}
        </h2>
        <p class="mt-2 xs:mt-3 max-w-[min(100%,40rem)] text-xs xs:text-sm leading-6 text-black/65">
          {{ t('home.databasesDescSuggest') }}
        </p>
      </header>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-black/50">
        <LoadingSpinner class="h-4 w-4" />
        {{ t('general.loading') }}
      </div>

      <div v-else class="grid gap-[clamp(0.875rem,2vw,1.5rem)] md:grid-cols-2">
        <article
          v-for="db in databases"
          :key="db.id"
          class="flex flex-col rounded-lg border-2 border-black bg-white p-[clamp(1rem,3vw,1.75rem)] transition-transform duration-200 hover:-translate-y-1"
        >
          <div class="mb-3 xs:mb-4 flex items-center gap-3 xs:gap-4">
            <div class="flex h-[clamp(2.25rem,7vw,3rem)] w-[clamp(2.25rem,7vw,3rem)] shrink-0 items-center justify-center rounded-full border-2 border-black bg-black text-white">
              <Icon :name="db.icon" class="h-4 w-4 xs:h-5 xs:w-5" />
            </div>
            <span class="truncate rounded-full border border-black px-2 xs:px-3 py-0.5 xs:py-1 text-[10px] xs:text-[11px] font-black uppercase tracking-[0.16em] xs:tracking-[0.18em]">
              {{ db.scope }}
            </span>
          </div>

          <h3 class="text-[clamp(1rem,2.5vw,1.35rem)] font-black leading-tight tracking-normal">{{ db.title }}</h3>
          <p class="mt-2 xs:mt-3 flex-1 text-xs xs:text-sm leading-6 text-black/65">{{ db.description }}</p>

          <div v-if="db.speciesCount" class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/50">
            <span>{{ db.speciesCount }} {{ t('home.speciesCount').toLowerCase() }}</span>
            <span v-if="db.groupCount">· {{ db.groupCount }} {{ t('home.groupsCount').toLowerCase() }}</span>
          </div>

          <div class="mt-4 xs:mt-6 flex flex-wrap items-center gap-2 xs:gap-3">
            <a
              :href="`mailto:crews@earthguardians.org?subject=${encodeURIComponent(t('home.suggestDatasetSubject'))}%20-%20${encodeURIComponent(db.title)}`"
              class="inline-flex items-center gap-1.5 xs:gap-2 rounded-md border-2 border-black bg-black px-3 xs:px-4 xs:px-5 py-2 xs:py-2.5 text-xs xs:text-sm font-black text-white transition-colors hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black/20"
            >
              <Icon name="lucide:mail" class="h-3.5 w-3.5 xs:h-4 xs:w-4" />
              {{ t('home.suggestDataset') }}
            </a>
            <a
              :href="db.link"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 xs:gap-2 rounded-md border-2 border-black px-3 xs:px-4 xs:px-5 py-2 xs:py-2.5 text-xs xs:text-sm font-black text-black transition-colors hover:bg-black hover:text-white focus:outline-none focus:ring-4 focus:ring-black/20"
            >
              <Icon name="lucide:external-link" class="h-3.5 w-3.5 xs:h-4 xs:w-4" />
              {{ t('home.view2d') }}
            </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

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

onMounted(async () => {
  try {
    const baseURL = (useRuntimeConfig().app?.baseURL as string) || '/'
    const res = await fetch(`${baseURL}data/species/index.json`)
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
