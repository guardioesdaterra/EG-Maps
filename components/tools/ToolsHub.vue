<!--
  components/tools/ToolsHub.vue
  @why Catalog of the Tools section — one card per registered tool, with its
       status made explicit (ready vs. planned) and a clear call to open it.
  @component ToolsHub
  @emits select: [id: ToolId]
  @deps vue (computed); @/composables/useI18n; @/lib/tools (TOOLS, type ToolId); @/components/Icon.vue
  @connections pages/tools/index.vue
-->
<template>
  <div class="tools-hub">
    <ul class="tools-hub__grid" role="list">
      <li v-for="tool in TOOLS" :key="tool.id">
        <button
          type="button"
          class="tools-hub__card"
          :class="{ 'tools-hub__card--planned': tool.status === 'planned' }"
          :style="{ '--tool-accent': ACCENTS[tool.accent] }"
          :disabled="tool.status === 'planned'"
          :aria-label="t('tools.openTool', { name: t(tool.nameKey) })"
          @click="emit('select', tool.id)"
        >
          <span class="tools-hub__icon">
            <Icon :name="tool.icon" class="h-6 w-6" />
          </span>

          <span class="tools-hub__content">
            <span class="tools-hub__head">
              <span class="tools-hub__name">{{ t(tool.nameKey) }}</span>
              <span v-if="tool.status === 'planned'" class="tools-hub__badge">{{ t('tools.comingSoonBadge') }}</span>
              <span v-else class="tools-hub__badge tools-hub__badge--ready">{{ t('tools.readyBadge') }}</span>
            </span>
            <span class="tools-hub__desc">{{ t(tool.descriptionKey) }}</span>
            <span v-if="tool.status === 'ready'" class="tools-hub__cta">
              {{ t('tools.open') }}
              <Icon name="tabler:arrow-narrow-right" class="h-3.5 w-3.5" />
            </span>
          </span>
        </button>
      </li>
    </ul>

    <section class="tools-hub__tips" aria-labelledby="tools-tips-title">
      <h2 id="tools-tips-title" class="tools-hub__tips-title">{{ t('tools.tipsTitle') }}</h2>
      <ul class="tools-hub__tips-grid" role="list">
        <li v-for="tip in tips" :key="tip.key" class="tools-hub__tip">
          <Icon :name="tip.icon" class="h-4 w-4 tools-hub__tip-icon" />
          <p>{{ t(tip.key) }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { TOOLS, type ToolAccent, type ToolId } from '@/lib/tools'
import Icon from '@/components/Icon.vue'

const emit = defineEmits<{ select: [id: ToolId] }>()
const { t } = useI18n()

const ACCENTS: Record<ToolAccent, string> = {
  emerald: '#10b981',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
  amber: '#f59e0b',
}

const tips = [
  { key: 'tools.tipGarden', icon: 'tabler:seedling' },
  { key: 'tools.tipSatellite', icon: 'tabler:cloud-download' },
  { key: 'tools.tipStorage', icon: 'tabler:database' },
]
</script>

<style scoped>
.tools-hub__grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.tools-hub__card {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: flex-start;
  gap: 0.9rem;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--panel-bg);
  padding: 1.1rem;
  text-align: start;
  box-shadow: var(--panel-shadow);
  transition: border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
}

.tools-hub__card:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--tool-accent);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--tool-accent) 18%, transparent);
}

.tools-hub__card:focus-visible {
  outline: 2px solid var(--tool-accent);
  outline-offset: 2px;
}

.tools-hub__card--planned {
  cursor: not-allowed;
  border-style: dashed;
  opacity: 0.62;
  box-shadow: none;
}

.tools-hub__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.9rem;
  height: 2.9rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--tool-accent) 35%, transparent);
  background: color-mix(in srgb, var(--tool-accent) 14%, transparent);
  color: var(--tool-accent);
}

.tools-hub__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.3rem;
}

.tools-hub__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tools-hub__name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.tools-hub__badge {
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--bg-secondary);
  padding: 0.12rem 0.45rem;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.tools-hub__badge--ready {
  background: color-mix(in srgb, var(--tool-accent) 18%, transparent);
  color: var(--tool-accent);
}

.tools-hub__desc {
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.tools-hub__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: auto;
  padding-top: 0.45rem;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--tool-accent);
}

.tools-hub__tips {
  margin-top: 2.25rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}

.tools-hub__tips-title {
  margin: 0 0 0.75rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.tools-hub__tips-grid {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.tools-hub__tip {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border-radius: 10px;
  background: var(--bg-secondary);
  padding: 0.7rem 0.8rem;
}

.tools-hub__tip-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: var(--text-muted);
}

.tools-hub__tip p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--text-secondary);
}
</style>
