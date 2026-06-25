<template>
  <section class="border-t border-black bg-white section-padding-x py-[clamp(1.5rem,4vh,3rem)]">
    <div class="mx-auto w-container">
      <header class="mb-fluid-lg">
        <h2 class="text-fluid-3xl font-black leading-tight tracking-normal">
          {{ t('home.databasesTitle') }}
        </h2>
        <p class="mt-1.5 max-w-[min(100%,40rem)] text-fluid-xs leading-5 text-black/65">
          {{ t('home.databasesDescSuggest') }}
        </p>
      </header>

      <div v-if="loading" class="flex items-center gap-2 text-fluid-sm text-black/50">
        <LoadingSpinner class="h-4 w-4" />
        {{ t('general.loading') }}
      </div>

      <div v-else class="grid gap-fluid md:grid-cols-2">
        <article
          v-for="db in databases"
          :key="db.id"
          class="flex flex-col rounded-fluid-lg border-2 border-black bg-white card-padding transition-transform duration-200 hover:-translate-y-0.5"
        >
          <div class="mb-2 xs:mb-3 flex items-center gap-2 xs:gap-3">
            <div class="flex h-[clamp(1.75rem,5vw,2.5rem)] w-[clamp(1.75rem,5vw,2.5rem)] shrink-0 items-center justify-center rounded-full border-2 border-black bg-black text-white">
              <Icon :name="db.icon" class="h-3.5 w-3.5 xs:h-4 xs:w-4" />
            </div>
            <span class="truncate rounded-full border border-black chip-fluid font-black uppercase tracking-[0.16em]">
              {{ db.scope }}
            </span>
          </div>

          <h3 class="text-fluid-2xl font-black leading-tight tracking-normal">{{ db.title }}</h3>
          <p class="mt-1 xs:mt-1.5 flex-1 text-fluid-xs leading-5 text-black/65">{{ db.description }}</p>

          <div v-if="db.speciesCount" class="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-fluid-xs text-black/50">
            <span>{{ db.speciesCount }} {{ t('home.speciesCount').toLowerCase() }}</span>
            <span v-if="db.groupCount">· {{ db.groupCount }} {{ t('home.groupsCount').toLowerCase() }}</span>
          </div>

          <div class="mt-2.5 xs:mt-3 flex flex-wrap items-center gap-1.5 xs:gap-2">
            <a
              :href="`mailto:crews@earthguardians.org?subject=${encodeURIComponent(t('home.suggestDatasetSubject'))}%20-%20${encodeURIComponent(db.title)}`"
              class="inline-flex items-center gap-1 xs:gap-1.5 rounded-fluid border-2 border-black bg-black px-2.5 xs:px-3 py-1.5 xs:py-2 text-fluid-xs font-black text-white transition-colors hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black/20"
            >
              <Icon name="lucide:mail" class="h-3 w-3 xs:h-3.5 xs:w-3.5" />
              {{ t('home.suggestDataset') }}
            </a>
            <a
              :href="db.link"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 xs:gap-1.5 rounded-fluid border-2 border-black px-2.5 xs:px-3 py-1.5 xs:py-2 text-fluid-xs font-black text-black transition-colors hover:bg-black hover:text-white focus:outline-none focus:ring-4 focus:ring-black/20"
            >
              <Icon name="lucide:external-link" class="h-3 w-3 xs:h-3.5 xs:w-3.5" />
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
