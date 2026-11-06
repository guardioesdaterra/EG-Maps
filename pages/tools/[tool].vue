<!--
  pages/tools/[tool].vue
  @why Tool editor route. The garden opens edge-to-edge (its own top bar, map
       and panels); the satellite downloader uses the standard page chrome.
       Unknown or not-yet-built tools fall back to the hub.
  @component ToolPage
  @deps @/lib/tools (getTool), @/components/PageTopbar.vue,
        @/components/tools/garden/GardenToolMobile.vue,
        @/components/tools/satellite/OfflineSatelliteTool.vue
  @connections pages/tools/index.vue, lib/tools.ts, lib/site-routes.ts
-->
<template>
  <div v-if="isGarden" class="garden-route">
    <GardenToolMobile @close="closeTool" />
  </div>

  <main v-else-if="tool" id="main-content" tabindex="-1" class="page">
    <PageTopbar show-back />

    <div class="page-shell">
      <header class="tool-header">
        <NuxtLink to="/tools" class="tool-back">
          <Icon name="tabler:arrow-left" class="h-3.5 w-3.5" />
          {{ t('tools.title') }}
        </NuxtLink>
        <span class="tool-eyebrow">
          <Icon :name="tool.icon" class="h-4 w-4" />
          {{ t('tools.readyBadge') }}
        </span>
        <h1 class="tool-title">{{ t(tool.nameKey) }}</h1>
        <p class="tool-desc">{{ t(tool.descriptionKey) }}</p>
      </header>

      <OfflineSatelliteTool />
    </div>
  </main>
</template>

<script setup lang="ts">
import PageTopbar from '@/components/PageTopbar.vue'
import GardenToolMobile from '@/components/tools/garden/GardenToolMobile.vue'
import OfflineSatelliteTool from '@/components/tools/satellite/OfflineSatelliteTool.vue'
import Icon from '@/components/Icon.vue'
import { getTool } from '@/lib/tools'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const route = useRoute()

const tool = computed(() => getTool(String(route.params.tool ?? '')))
const isGarden = computed(() => tool.value?.id === 'agroecological-garden')

// Planned or unknown slugs never render an editor — send them back to the hub.
if (!tool.value || tool.value.status !== 'ready') {
  await navigateTo('/tools', { replace: true })
}

function closeTool() {
  return navigateTo('/tools')
}

useHead(() => ({
  title: tool.value ? `${t(tool.value.nameKey)} — Earth Guardians Tools` : 'Tools — Earth Guardians',
  meta: tool.value
    ? [{ name: 'description', content: t(tool.value.descriptionKey) }]
    : [],
}))
</script>

<style scoped>
.garden-route {
  height: 100svh;
  width: 100%;
}

.page {
  min-height: 100svh;
  background: transparent;
  color: var(--text-primary);
}

.page-shell {
  width: min(100% - 2rem, 72rem);
  margin: 0 auto;
  padding: clamp(1.5rem, 4vh, 2.5rem) 0 calc(clamp(4rem, 8vh, 6rem) + env(safe-area-inset-bottom));
}

.tool-header {
  margin-bottom: clamp(1.5rem, 3vh, 2.25rem);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: clamp(1rem, 2.5vh, 1.75rem);
}

.tool-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 44px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-decoration: none;
}

.tool-back:hover { color: var(--text-primary); }

.tool-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.tool-title {
  margin: 0.4rem 0 0;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
}

.tool-desc {
  max-width: 44rem;
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
}
</style>
