<template>
  <main ref="rootRef" class="eg-grants-embed" :data-view="view" aria-label="Earth Guardians grants embed">
    <header class="eg-grants-embed-header">
      <div>
        <p class="eyebrow">Earth Guardians</p>
        <h1>{{ viewTitle }}</h1>
        <p class="subtitle">{{ viewDescription }}</p>
      </div>
      <span class="count-pill">{{ items.length }}</span>
    </header>

    <div v-if="items.length" class="grant-grid">
      <article v-for="item in items" :key="item.id" class="grant-card">
        <div class="grant-card-top">
          <span class="grant-type">{{ item.type }}</span>
          <span v-if="item.country" class="grant-country">{{ item.country }}</span>
        </div>
        <h2>{{ item.title }}</h2>
        <p>{{ item.description }}</p>
        <footer>
          <span>{{ item.funder }}</span>
          <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer">Open opportunity ↗</a>
        </footer>
      </article>
    </div>
    <p v-else class="empty">No opportunities are available in this view yet.</p>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { allProjectsData } from '~/lib/project-data'
import { useSquarespaceEmbed } from '~/composables/useSquarespaceEmbed'

const route = useRoute()
definePageMeta({ layout: false })
const rootRef = ref<HTMLElement | null>(null)
const embed = useSquarespaceEmbed({ rootRef, channel: 'eg-maps-eg-grants', initialTheme: 'auto', minHeight: 280 })
const view = computed(() => String(route.query.view || 'worldwide'))
const remoteItems = ref<Array<Record<string, unknown>>>([])

const viewMeta: Record<string, { title: string; description: string; type: string }> = {
  overview: { title: 'Impact overview', description: 'A compact, embeddable view of Earth Guardians grant impact.', type: 'Impact' },
  community: { title: 'Community opportunities', description: 'Funding and opportunities for community-led climate action.', type: 'Community' },
  crew: { title: 'Crew projects', description: 'Projects and initiatives led by Earth Guardians crews.', type: 'Crew project' },
  partners: { title: 'Partner opportunities', description: 'Open opportunities from trusted Earth Guardians partners.', type: 'Partner' },
  worldwide: { title: 'Worldwide grants', description: 'A responsive public directory of funding opportunities.', type: 'Grant' },
  egprojects: { title: 'EG project grants', description: 'Earth Guardians project grants and community impact.', type: 'Project grant' },
}

const meta = computed(() => viewMeta[view.value] || viewMeta.worldwide)
const viewTitle = computed(() => meta.value.title)
const viewDescription = computed(() => meta.value.description)

const items = computed(() => {
  if (view.value === 'egprojects' || view.value === 'crew' || view.value === 'overview') {
    return allProjectsData.slice(0, view.value === 'overview' ? 6 : 20).map((project, index) => ({
      id: `project-${index}`,
      title: project.project_title,
      description: `Project in ${project.country_province}`,
      country: project.country_province,
      funder: 'Earth Guardians',
      type: viewMeta[view.value]?.type || 'Project grant',
      url: '',
    }))
  }
  return remoteItems.value.map((item, index) => ({
    id: String(item.id || index),
    title: String(item.title || 'Opportunity'),
    description: String(item.description || 'Open funding opportunity.'),
    country: String(item.country || ''),
    funder: String(item.funder || item.source || 'Earth Guardians network'),
    type: meta.value.type,
    url: String(item.url || ''),
  }))
})

onMounted(async () => {
  try {
    const response = await fetch('/api/grants/public')
    if (response.ok) remoteItems.value = await response.json()
  } catch {
    // Static project data remains available when the public API is unavailable.
  }
})

useHead({
  title: 'Earth Guardians Grants Embed',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>

<style>
.eg-grants-embed { box-sizing: border-box; width: 100%; min-height: 100%; padding: clamp(1rem, 3vw, 2rem); color: #0f172a; background: transparent; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.eg-grants-embed-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.1rem; }
.eyebrow { margin: 0 0 .4rem; color: #0f766e; font: 600 .68rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .15em; text-transform: uppercase; }
.eg-grants-embed h1 { margin: 0; color: #0f172a; font-size: clamp(1.3rem, 3vw, 2rem); letter-spacing: -.035em; }
.subtitle { max-width: 58ch; margin: .45rem 0 0; color: rgba(15,23,42,.68); font-size: .88rem; line-height: 1.5; }
.count-pill { flex: 0 0 auto; padding: .35rem .65rem; border: 1px solid rgba(94,234,212,.3); border-radius: 999px; color: #5eead4; font-size: .78rem; }
.grant-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: .75rem; }
.grant-card { min-width: 0; padding: 1rem; border: 1px solid rgba(15,23,42,.14); border-radius: 1rem; background: rgba(255,255,255,.76); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.grant-card-top, .grant-card footer { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.grant-type, .grant-country { color: rgba(15,23,42,.6); font-size: .7rem; }
.grant-type { color: #5eead4; font-weight: 600; }
.grant-card h2 { margin: .8rem 0 .45rem; color: #0f172a; font-size: 1rem; line-height: 1.3; }
.grant-card p { min-height: 3.2em; margin: 0 0 1rem; color: rgba(15,23,42,.68); font-size: .78rem; line-height: 1.5; }
.grant-card footer { padding-top: .75rem; border-top: 1px solid rgba(15,23,42,.12); color: rgba(15,23,42,.56); font-size: .7rem; }
.grant-card a { color: #67e8f9; text-decoration: none; }
.empty { padding: 2rem 0; color: rgba(226,232,240,.6); }
.dark .eg-grants-embed { color: #e2e8f0; }
.dark .eyebrow { color: #5eead4; }
.dark .eg-grants-embed h1, .dark .grant-card h2 { color: #f8fafc; }
.dark .subtitle { color: rgba(226,232,240,.68); }
.dark .grant-card { border-color: rgba(148,163,184,.18); background: rgba(15,23,42,.38); }
.dark .grant-type, .dark .grant-country { color: rgba(226,232,240,.6); }
.dark .grant-card p { color: rgba(226,232,240,.68); }
.dark .grant-card footer { border-color: rgba(148,163,184,.12); color: rgba(226,232,240,.56); }
@media (prefers-reduced-motion: no-preference) { .grant-card { transition: transform 180ms ease-out, border-color 180ms ease-out; } .grant-card:hover { transform: translateY(-2px); border-color: rgba(94,234,212,.42); } }
</style>
