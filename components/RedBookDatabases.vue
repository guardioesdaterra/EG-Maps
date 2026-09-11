<template>
  <section
    class="redbook-section"
  >
    <div class="redbook-container">
      <header class="redbook-header">
        <div>
          <span class="redbook-index">04 / Source layer</span>
          <h2>{{ t('home.databasesTitle') }}</h2>
        </div>
        <p>{{ t('home.databasesDescSuggest') }}</p>
      </header>

      <div v-if="loading" class="redbook-loading">
        <LoadingSpinner class="h-4 w-4" />
        {{ t('general.loading') }}
      </div>

      <div v-else class="redbook-grid">
        <article
          v-for="(db, index) in databases"
          :key="db.id"
          class="redbook-card"
        >
          <div class="redbook-card-topline">
            <span class="redbook-card-index">0{{ index + 1 }}</span>
            <span class="redbook-scope"><span />{{ db.scope }}</span>
          </div>
          <div class="redbook-icon"><Icon :name="db.icon" class="h-5 w-5" /></div>
          <h3>{{ db.title }}</h3>
          <p>{{ db.description }}</p>

          <div v-if="db.speciesCount" class="redbook-stats">
            <span>{{ db.speciesCount }} {{ t('home.speciesCount').toLowerCase() }}</span>
            <span v-if="db.groupCount">{{ db.groupCount }} {{ t('home.groupsCount').toLowerCase() }}</span>
          </div>

          <div class="redbook-actions">
            <a
              :href="`mailto:crews@earthguardians.org?subject=${encodeURIComponent(t('home.suggestDatasetSubject'))}%20-%20${encodeURIComponent(db.title)}`"
              class="redbook-button redbook-button-primary"
            >
              <Icon name="lucide:mail" class="h-3.5 w-3.5" />
              {{ t('home.suggestDataset') }}
            </a>
            <a :href="db.link" target="_blank" rel="noopener noreferrer" class="redbook-button redbook-button-secondary">
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

import { onMounted, onUnmounted, ref } from 'vue'

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

onMounted(async () => {
  try {
    const baseURL = (useRuntimeConfig().app?.baseURL as string) || '/'
    const res = await fetch(`${baseURL}data/species/index.json`, { signal: abortController.signal })
    const index: { datasets: DatasetInfo[] } = await res.json()

    databases.value = index.datasets.map((dataset) => {
      const keyId = datasetKeyId(dataset.id)
      return {
        id: dataset.id,
        icon: DATASET_ICONS[dataset.id] || 'lucide:database',
        scope: t(`home.${keyId}Scope`),
        title: t(`home.${keyId}Title`),
        description: t(`home.${keyId}Desc`),
        link: dataset.url,
        speciesCount: dataset.speciesCount,
        groupCount: Object.keys(dataset.taxonomicGroups).length,
      }
    })
  } catch {
    databases.value = []
  } finally {
    loading.value = false
  }
})

onUnmounted(() => abortController.abort())

function datasetKeyId(id: string): string {
  return id === 'icmbio-brazil' ? 'icmbio' : id
}

</script>

<style scoped>
.redbook-section {
  position: relative;
  z-index: 2;
  padding: clamp(3.8rem, 8vw, 7rem) 0 2rem;
  border-top: 1px solid var(--home-line, rgba(16, 35, 27, 0.14));
}

.redbook-container {
  width: min(100% - 2rem, 78rem);
  margin: 0 auto;
}

.redbook-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 26rem);
  gap: 3rem;
  align-items: end;
  margin-bottom: 2rem;
}

.redbook-index,
.redbook-card-topline,
.redbook-scope,
.redbook-stats,
.redbook-button,
.redbook-loading {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.redbook-index {
  color: var(--home-muted, #596960);
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.redbook-header h2 {
  max-width: 34rem;
  margin: 0.7rem 0 0;
  font-family: Montserrat, Inter, sans-serif;
  font-size: clamp(2.2rem, 5.5vw, 5rem);
  font-weight: 900;
  letter-spacing: -0.065em;
  line-height: 0.94;
}

.redbook-header p {
  max-width: 25rem;
  margin: 0 0 0.35rem auto;
  color: var(--home-muted, #596960);
  font-size: 0.82rem;
  line-height: 1.6;
}

.redbook-loading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--home-muted, #596960);
  font-size: 0.75rem;
}

.redbook-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.redbook-card {
  position: relative;
  display: flex;
  min-height: 20rem;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--home-line, rgba(16, 35, 27, 0.14));
  border-radius: 1.25rem;
  padding: 1.2rem;
  background: var(--home-card, rgba(255, 255, 250, 0.76));
  box-shadow: 0 1rem 2.5rem rgba(18, 42, 28, 0.06);
}

.redbook-card::after {
  position: absolute;
  right: -2rem;
  bottom: -3rem;
  width: 10rem;
  height: 10rem;
  border: 1px solid var(--home-accent-strong, #b9da46);
  border-radius: 50%;
  content: '';
  opacity: 0.35;
}

.redbook-card-topline {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--home-muted, #596960);
  font-size: 0.59rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.redbook-card-index {
  color: var(--home-accent-strong, #b9da46);
}

.redbook-scope {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.redbook-scope span {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 50%;
  background: var(--home-accent-strong, #b9da46);
}

.redbook-icon {
  position: relative;
  z-index: 1;
  display: grid;
  width: 3rem;
  height: 3rem;
  margin-top: 2.2rem;
  place-items: center;
  border-radius: 0.95rem;
  background: color-mix(in srgb, var(--home-accent-strong, #b9da46) 18%, transparent);
  color: var(--home-accent-strong, #b9da46);
}

.redbook-card h3 {
  position: relative;
  z-index: 1;
  max-width: 30rem;
  margin: 1rem 0 0;
  font-family: Montserrat, Inter, sans-serif;
  font-size: clamp(1.15rem, 2vw, 1.6rem);
  font-weight: 850;
  letter-spacing: -0.05em;
  line-height: 1.04;
}

.redbook-card p {
  position: relative;
  z-index: 1;
  max-width: 34rem;
  margin: 0.65rem 0 0;
  color: var(--home-muted, #596960);
  font-size: 0.76rem;
  line-height: 1.55;
}

.redbook-stats {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: auto;
  padding-top: 1.2rem;
  color: var(--home-muted, #596960);
  font-size: 0.57rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.redbook-actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1.2rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--home-line, rgba(16, 35, 27, 0.14));
}

.redbook-button {
  display: inline-flex;
  min-height: 2.3rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.6rem 0.85rem;
  font-size: 0.59rem;
  font-weight: 850;
  letter-spacing: 0.07em;
  text-decoration: none;
  text-transform: uppercase;
  transition: transform 180ms ease, background-color 180ms ease, color 180ms ease;
}

.redbook-button:hover {
  transform: translateY(-1px);
}

.redbook-button-primary {
  background: var(--home-ink, #10231b);
  color: var(--home-bg, #f1f2e9);
}

.redbook-button-primary:hover {
  background: var(--home-accent-strong, #b9da46);
  color: #10231b;
}

.redbook-button-secondary {
  border: 1px solid var(--home-line, rgba(16, 35, 27, 0.14));
  color: var(--home-ink, #10231b);
}

.redbook-button-secondary:hover {
  border-color: var(--home-accent-strong, #b9da46);
  background: var(--home-accent-strong, #b9da46);
  color: #10231b;
}

@media (max-width: 700px) {
  .redbook-container {
    width: min(100% - 1.25rem, 78rem);
  }

  .redbook-header {
    grid-template-columns: 1fr;
    gap: 1.4rem;
  }

  .redbook-header p {
    margin-left: 0;
  }

  .redbook-grid {
    grid-template-columns: 1fr;
  }
}
</style>
