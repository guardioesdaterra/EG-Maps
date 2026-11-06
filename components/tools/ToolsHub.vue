/**
 * components/tools/ToolsHub.vue
 * @why Landing view of the Tools sheet — lists every registered tool, opens the
 *      ready ones and labels the planned ones honestly instead of dead text.
 * @component ToolsHub
 * @emits select: [id: ToolId]
 * @deps vue (computed); @/composables/useI18n; @/lib/tools (TOOLS, type ToolId); @/components/Icon.vue
 * @connections layouts/default.vue, components/ui/ToolsSheet.vue
 */
<template>
  <div class="tools-hub h-full w-full overflow-y-auto">
    <p class="text-sm text-[var(--text-secondary)] mb-5 max-w-2xl">{{ t('tools.subtitle') }}</p>

    <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
      <li v-for="tool in TOOLS" :key="tool.id">
        <button
          type="button"
          class="tools-hub__card"
          :class="{ 'tools-hub__card--planned': tool.status === 'planned' }"
          :disabled="tool.status === 'planned'"
          :aria-label="t(tool.nameKey)"
          @click="emit('select', tool.id)"
        >
          <span class="tools-hub__icon" :class="tool.accent">
            <Icon :name="tool.icon" class="h-6 w-6" />
          </span>
          <span class="flex-1 min-w-0">
            <span class="flex items-center gap-2">
              <span class="text-sm font-bold text-[var(--text-primary)] truncate">{{ t(tool.nameKey) }}</span>
              <span v-if="tool.status === 'planned'" class="tools-hub__badge">{{ t('tools.comingSoonBadge') }}</span>
              <span v-else class="tools-hub__badge tools-hub__badge--ready">{{ t('tools.readyBadge') }}</span>
            </span>
            <span class="mt-1 block text-xs leading-relaxed text-[var(--text-secondary)]">{{ t(tool.descriptionKey) }}</span>
          </span>
        </button>
      </li>
    </ul>

    <section class="mt-8 max-w-2xl">
      <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{{ t('tools.tipsTitle') }}</h3>
      <ul class="space-y-1.5 text-xs text-[var(--text-secondary)] list-disc pl-4">
        <li>{{ t('tools.tipGarden') }}</li>
        <li>{{ t('tools.tipSatellite') }}</li>
        <li>{{ t('tools.tipStorage') }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { TOOLS, type ToolId } from '@/lib/tools'
import Icon from '@/components/Icon.vue'

const emit = defineEmits<{ select: [id: ToolId] }>()
const { t } = useI18n()
</script>

<style scoped>
.tools-hub__card {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  width: 100%;
  text-align: start;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg, rgba(255, 255, 255, 0.04));
  transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
}

.tools-hub__card:hover:not(:disabled) {
  border-color: rgba(6, 182, 212, 0.45);
  transform: translateY(-1px);
}

.tools-hub__card:focus-visible {
  outline: 2px solid var(--ring, #22d3ee);
  outline-offset: 2px;
}

.tools-hub__card--planned {
  opacity: 0.6;
  cursor: not-allowed;
}

.tools-hub__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.tools-hub__badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  color: var(--text-muted);
  flex-shrink: 0;
}

.tools-hub__badge--ready {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
}
</style>
