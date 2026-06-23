<template>
  <div
    class="data-bubble"
    :class="{ 'is-expanded': isExpanded }"
    :style="{
      top: positionTop ?? 'clamp(16rem, 40vh, 22rem)',
      zIndex: 'var(--z-map-global-stats)',
    }"
  >
    <button
      ref="triggerRef"
      class="bubble-trigger"
      @click="toggle"
      :aria-label="isExpanded ? t('stats.collapse') : label"
      :aria-expanded="isExpanded"
    >
      <span class="bubble-icon">G</span>
    </button>

    <Transition name="bubble-expand">
      <div v-if="isExpanded" class="bubble-panel" role="region" :aria-label="label">
        <div class="bubble-panel-header">
          <span class="bubble-panel-title">{{ label }}</span>
          <button
            ref="closeRef"
            class="bubble-panel-close"
            @click="close"
            :aria-label="t('stats.close')"
          >
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>

        <template v-if="mode === 'species'">
          <div class="groups-grid">
            <button
              v-for="(color, group) in GROUP_COLORS"
              :key="group"
              class="group-chip"
              :class="{ active: selectedGroups?.includes(group) }"
              @click="toggleGroup(group)"
              :aria-pressed="selectedGroups?.includes(group) ?? false"
            >
              <span class="group-dot" :style="{ backgroundColor: color }" />
              <span class="group-name">{{ groupLabel(group) }}</span>
            </button>
          </div>
        </template>

        <template v-else-if="mode === 'projects' && stats">
          <div class="stats-grid">
            <div class="stat-cell">
              <span class="stat-value">{{ formatCompact(stats.activeInitiatives) }}</span>
              <span class="stat-label">{{ t('stats.projectGrantees') }}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ formatCompact(stats.countriesCount) }}</span>
              <span class="stat-label">{{ t('stats.countries') }}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ formatCompact(stats.totalDirect) }}</span>
              <span class="stat-label">{{ t('stats.directBeneficiaries') }}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ formatCompact(stats.totalIndirect) }}</span>
              <span class="stat-label">{{ t('stats.indirectBeneficiaries') }}</span>
            </div>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import Icon from './Icon.vue'
import { GROUP_COLORS } from '@/lib/map-utils'
import { formatCompact } from '@/lib/utils'
import type { ProjectData } from '@/lib/types'

const props = withDefaults(defineProps<{
  mode: 'species' | 'projects'
  selectedGroups?: string[]
  projects?: ProjectData[]
  positionTop?: string
}>(), {
  selectedGroups: () => [],
  projects: () => [],
  positionTop: undefined,
})

const emit = defineEmits<{
  'toggle-group': [group: string]
}>()

const { t } = useI18n()
const isExpanded = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const closeRef = ref<HTMLButtonElement | null>(null)

const label = computed(() =>
  props.mode === 'species' ? t('globe.taxonomicGroups') : t('stats.title')
)

function toggle() {
  isExpanded.value = !isExpanded.value
}

function close() {
  isExpanded.value = false
  nextTick(() => triggerRef.value?.focus())
}

function toggleGroup(group: string) {
  emit('toggle-group', group)
}

function groupLabel(group: string) {
  return t(`taxonomy.${group}`)
}

watch(isExpanded, (expanded) => {
  if (expanded) {
    nextTick(() => closeRef.value?.focus())
  }
})

const stats = computed(() => {
  if (!props.projects?.length) return null
  const projects = props.projects
  const activeInitiatives = projects.length
  const uniqueCountries = new Set(
    projects.map(p => {
      if (!p.country_province) return ''
      return p.country_province.includes(',')
        ? p.country_province.split(',').pop()?.trim() || p.country_province
        : p.country_province
    }).filter(Boolean)
  )
  const totalDirect = projects.reduce((s, p) => s + p.direct_beneficiaries, 0)
  const totalIndirect = projects.reduce((s, p) => s + p.indirect_beneficiaries, 0)
  return { activeInitiatives, countriesCount: uniqueCountries.size, totalDirect, totalIndirect }
})
</script>

<style scoped>
.data-bubble {
  position: absolute;
  right: clamp(0.5rem, 4vw, 1.5rem);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

@media (max-width: 480px) {
  .data-bubble {
    right: 0.375rem;
  }
}

.bubble-trigger {
  width: clamp(2.75rem, 9vw, 3.5rem);
  height: clamp(2.75rem, 9vw, 3.5rem);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: var(--panel-shadow);
  transition: box-shadow var(--transition-normal) ease;
  position: relative;
}

.bubble-trigger:hover {
  box-shadow: 0 0 24px rgba(6, 182, 212, 0.3), var(--panel-shadow);
  border-color: rgba(6, 182, 212, 0.5);
  transform: scale(1.08);
}

.bubble-trigger:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 3px;
}

.bubble-trigger:active {
  transform: scale(0.95);
}

.bubble-icon {
  font-size: clamp(1.1rem, 3.5vw, 1.4rem);
  font-weight: 900;
  color: var(--text-primary);
  line-height: 1;
  font-family: 'Inter', system-ui, sans-serif;
  user-select: none;
}

.bubble-panel {
  margin-top: 0.5rem;
  min-width: clamp(10rem, 30vw, 18rem);
  max-width: clamp(12rem, 35vw, 22rem);
  background: var(--panel-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--panel-border);
  box-shadow: var(--panel-shadow);
  border-radius: clamp(0.75rem, 2vw, 1rem);
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  overflow: hidden;
}

@media (max-width: 480px) {
  .bubble-panel {
    min-width: 11rem;
    max-width: calc(100vw - 1.5rem);
    margin-top: 0.375rem;
  }
}

.bubble-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: clamp(0.375rem, 1vw, 0.5rem);
  padding-bottom: clamp(0.375rem, 1vw, 0.5rem);
  border-bottom: 1px solid var(--panel-border);
}

.bubble-panel-title {
  font-size: clamp(0.625rem, 1.8vw, 0.75rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-primary);
}

.bubble-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 4px;
  color: var(--text-muted);
  transition: color 0.15s ease;
  cursor: pointer;
  background: transparent;
  border: none;
  flex-shrink: 0;
}

.bubble-panel-close:hover {
  color: var(--text-primary);
  background: var(--search-result-hover-bg);
}

.bubble-panel-close:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* Groups grid */
.groups-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.125rem;
}

@media (min-width: 768px) {
  .groups-grid {
    gap: 0.25rem;
  }
}

.group-chip {
  display: flex;
  align-items: center;
  gap: clamp(0.25rem, 0.6vw, 0.375rem);
  padding: clamp(0.2rem, 0.5vw, 0.3rem) clamp(0.25rem, 0.6vw, 0.375rem);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease, color 0.2s ease;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
}

.group-chip:hover {
  background: var(--search-result-hover-bg);
  color: var(--search-result-text);
}

.group-chip:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}

.group-chip.active {
  background: var(--search-result-selected-bg);
  color: var(--search-result-selected-text);
}

.group-dot {
  width: clamp(0.5rem, 1.4vw, 0.625rem);
  height: clamp(0.5rem, 1.4vw, 0.625rem);
  border-radius: 50%;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.group-chip:hover .group-dot {
  transform: scale(1.25);
}

.group-name {
  font-size: clamp(0.5625rem, 1.5vw, 0.6875rem);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(0.375rem, 1vw, 0.5rem);
}

.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
}

.stat-value {
  font-size: clamp(0.875rem, 2.5vw, 1.125rem);
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: clamp(0.5rem, 1.3vw, 0.625rem);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 0.125rem;
  line-height: 1.2;
}

/* Expansion transition */
.bubble-expand-enter-active,
.bubble-expand-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.bubble-expand-enter-from,
.bubble-expand-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem) scale(0.95);
}
</style>
