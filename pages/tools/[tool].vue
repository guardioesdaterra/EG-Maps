<!--
  pages/tools/[tool].vue
  @why Tool editor route. The garden opens edge-to-edge (its own top bar, map
  and panels). Unknown or not-yet-built tools fall back to the hub.
  @component ToolPage
  @deps @/lib/tools (getTool), @/components/PageTopbar.vue,
        @/components/tools/garden/GardenToolMobile.vue,
        @/composables/useI18n
  @connections pages/tools/index.vue, lib/tools.ts, lib/site-routes.ts
-->
<template>
  <div v-if="isGarden" class="garden-route">
    <GardenToolMobile @close="closeTool" />
  </div>
</template>

<script setup lang="ts">
import PageTopbar from '@/components/PageTopbar.vue'
import GardenToolMobile from '@/components/tools/garden/GardenToolMobile.vue'
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
