<!--
  pages/tools/index.vue
  @why Tools hub — the catalog of practical field tools, reachable at /tools so
       each tool can open as a full page instead of an overlay.
  @component ToolsIndexPage
  @deps @/components/PageTopbar.vue, @/components/tools/ToolsHub.vue,
        @/lib/tools (toolRoute), @/composables/useI18n
  @connections pages/tools/[tool].vue, lib/tools.ts, lib/site-routes.ts
-->
<template>
  <main id="main-content" tabindex="-1" class="page">
    <PageTopbar show-back />

    <div class="page-shell">
      <header class="page-header">
        <img :src="`${baseURL}eg-logo.png`" alt="Earth Guardians" class="page-header-logo" />
        <h1 class="page-title">{{ t('tools.title') }}</h1>
        <p class="page-desc">{{ t('tools.subtitle') }}</p>
      </header>

      <ToolsHub @select="openTool" />
    </div>
  </main>
</template>

<script setup lang="ts">
import PageTopbar from '@/components/PageTopbar.vue'
import ToolsHub from '@/components/tools/ToolsHub.vue'
import { toolRoute, type ToolId } from '@/lib/tools'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

function openTool(id: ToolId) {
  return navigateTo(toolRoute(id))
}

useHead({
  title: 'Tools — Earth Guardians',
  meta: [
    { name: 'description', content: 'Field tools for Earth Guardians: design agroecological gardens and keep satellite maps available offline.' },
    { property: 'og:title', content: 'Tools — Earth Guardians' },
    { property: 'og:description', content: 'Practical mapping and planning tools for community-led regeneration.' },
  ],
})
</script>

<style scoped>
.page {
  min-height: 100svh;
  background: transparent;
  color: var(--text-primary);
}

.page-shell {
  width: min(100% - 2rem, 72rem);
  margin: 0 auto;
  padding: clamp(2rem, 5vh, 4rem) 0 calc(clamp(4rem, 8vh, 6rem) + env(safe-area-inset-bottom));
}

.page-header { margin-bottom: clamp(1.75rem, 4vh, 2.75rem); }

.page-header-logo {
  width: auto;
  height: clamp(2rem, 5vw, 3rem);
  margin-bottom: 1.25rem;
}

.page-title {
  margin: 0;
  font-family: Montserrat, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.95;
}

.page-desc {
  max-width: 42rem;
  margin: 1rem 0 0;
  font-size: clamp(0.9rem, 1.3vw, 1.05rem);
  line-height: 1.6;
  color: var(--text-secondary);
}
</style>
