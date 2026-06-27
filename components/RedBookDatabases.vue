<template>
  <section
    v-motion
    :initial="{ opacity: 0, y: 20 }"
    :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 400 } }"
    class="border-t border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-primary)] px-4 sm:section-padding-x py-6 sm:py-[clamp(1.5rem,4vh,3rem)]"
  >
    <div class="mx-auto w-container">
      <header class="mb-4 sm:mb-fluid-lg">
        <h2 class="text-[1.25rem] sm:text-fluid-3xl font-black leading-tight tracking-normal">
          {{ t('home.databasesTitle') }}
        </h2>
        <p class="mt-1.5 max-w-[min(100%,40rem)] text-[0.8rem] sm:text-fluid-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">
          {{ t('home.databasesDescSuggest') }}
        </p>
      </header>

      <div v-if="loading" class="flex items-center gap-2 text-fluid-sm text-black/50 dark:text-[var(--text-muted)]">
        <LoadingSpinner class="h-4 w-4" />
        {{ t('general.loading') }}
      </div>

      <div v-else class="grid gap-2.5 sm:gap-fluid md:grid-cols-2">
        <article
          v-for="(db, index) in databases"
          :key="db.id"
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 400, delay: index * 100 } }"
          class="flex flex-col rounded-fluid-lg border-2 border-black dark:border-[var(--border-color)] bg-white dark:bg-[var(--card)] px-3.5 py-3 sm:card-padding transition-transform duration-200 hover:-translate-y-0.5"
        >
          <div class="mb-2 sm:mb-3 flex items-center gap-2 xs:gap-3">
            <div class="flex h-[clamp(2rem,6vw,2.5rem)] w-[clamp(2rem,6vw,2.5rem)] shrink-0 items-center justify-center rounded-full border-2 border-black bg-black dark:bg-[var(--text-primary)] text-white dark:text-black">
              <Icon :name="db.icon" class="h-3.5 w-3.5 xs:h-4 xs:w-4" />
            </div>
            <span class="truncate rounded-full border border-black dark:border-[var(--border-color)] px-2 py-0.5 sm:chip-fluid text-[10px] sm:text-[11px] font-black uppercase tracking-[0.16em]">
              {{ db.scope }}
            </span>
          </div>

          <h3 class="text-[1.15rem] sm:text-fluid-2xl font-black leading-tight tracking-normal">{{ db.title }}</h3>
          <p class="mt-1 xs:mt-1.5 flex-1 text-[0.8rem] sm:text-fluid-xs leading-5 text-black/65 dark:text-[var(--text-secondary)]">{{ db.description }}</p>

          <div v-if="db.speciesCount" class="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] sm:text-fluid-xs text-black/50 dark:text-[var(--text-muted)]">
            <span>{{ db.speciesCount }} {{ t('home.speciesCount').toLowerCase() }}</span>
            <span v-if="db.groupCount">· {{ db.groupCount }} {{ t('home.groupsCount').toLowerCase() }}</span>
          </div>

          <div class="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <a
              :href="`mailto:crews@earthguardians.org?subject=${encodeURIComponent(t('home.suggestDatasetSubject'))}%20-%20${encodeURIComponent(db.title)}`"
              class="inline-flex items-center gap-1.5 rounded-fluid border-2 border-black dark:border-[var(--border-color)] bg-black dark:bg-[var(--text-primary)] px-3 min-h-[40px] py-2 sm:px-3 sm:py-2 text-[0.75rem] sm:text-fluid-xs font-black text-white dark:text-black transition-colors hover:bg-white dark:hover:bg-[var(--bg-primary)] hover:text-black dark:hover:text-[var(--text-primary)] focus:outline-none focus:ring-4 focus:ring-black/20 dark:focus:ring-[var(--text-primary)]/20 active:scale-[0.97]"
            >
              <Icon name="lucide:mail" class="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              {{ t('home.suggestDataset') }}
            </a>
            <a
              :href="db.link"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-fluid border-2 border-black dark:border-[var(--border-color)] px-3 min-h-[40px] py-2 sm:px-3 sm:py-2 text-[0.75rem] sm:text-fluid-xs font-black text-black dark:text-[var(--text-primary)] transition-colors hover:bg-black dark:hover:bg-[var(--text-primary)] hover:text-white dark:hover:text-black focus:outline-none focus:ring-4 focus:ring-black/20 dark:focus:ring-[var(--text-primary)]/20 active:scale-[0.97]"
            >
              <Icon name="lucide:external-link" class="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              {{ t('home.viewSource') }}
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
