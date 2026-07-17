/**
 * components/map/ProjectPopup.vue
 * @why Project grant popup for map markers — shows title, funder, amount, category badge
 * @component ProjectPopup
 * @props project: ProjectData | null
 * @deps vue (computed); @/lib/colors (getProjectColorByBeneficiaries); @/lib/utils (formatCompact)
 */
<script setup lang="ts">

import { computed } from 'vue'
import type { ProjectData } from '@/lib/types'
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import { formatCompact } from '@/lib/utils'

const props = defineProps<{
  project: ProjectData | null
}>()

const { t } = useI18n()

const totalBeneficiaries = computed(() => {
  if (!props.project) return 0
  return props.project.direct_beneficiaries + props.project.indirect_beneficiaries
})

const accentColor = computed(() => {
  if (!props.project) return '#6366f1'
  return getProjectColorByBeneficiaries(
    props.project.direct_beneficiaries,
    props.project.indirect_beneficiaries,
  )
})

const mapsUrl = computed(() => {
  if (!props.project) return '#'
  return `https://www.google.com/maps?q=${props.project.latitude},${props.project.longitude}`
})

const hasStats = computed(() => {
  if (!props.project) return false
  return props.project.direct_beneficiaries > 0 || props.project.indirect_beneficiaries > 0
})

</script>

<template>
  <article v-if="project" class="project-popup">
    <div
      class="project-popup__accent"
      :style="{ background: accentColor }"
      aria-hidden="true"
    />

    <header class="project-popup__head">
      <div class="project-popup__group-row">
        <span class="project-popup__group" :style="{ borderColor: accentColor, color: accentColor }">
          {{ t('stats.projectGrantees') }}
        </span>
      </div>
      <h2 class="project-popup__title">{{ project.project_title }}</h2>
      <p v-if="project.country_province" class="project-popup__location">
        <Icon name="lucide:map-pin" size="0.75rem" />
        <span>{{ project.country_province }}</span>
      </p>
    </header>

    <div v-if="hasStats" class="project-popup__body">
      <div class="project-popup__stats">
        <div v-if="project.direct_beneficiaries > 0" class="project-popup__stat">
          <Icon name="lucide:users" size="0.75rem" class="project-popup__stat-icon" />
          <div class="project-popup__stat-body">
            <span class="project-popup__stat-label">{{ t('stats.directBeneficiaries') }}</span>
            <span class="project-popup__stat-value">{{ formatCompact(project.direct_beneficiaries) }}</span>
          </div>
        </div>
        <div v-if="project.indirect_beneficiaries > 0" class="project-popup__stat">
          <Icon name="lucide:clock" size="0.75rem" class="project-popup__stat-icon" />
          <div class="project-popup__stat-body">
            <span class="project-popup__stat-label">{{ t('stats.indirectBeneficiaries') }}</span>
            <span class="project-popup__stat-value">{{ formatCompact(project.indirect_beneficiaries) }}</span>
          </div>
        </div>
      </div>

      <div class="project-popup__total" :style="{ background: accentColor + '12', borderColor: accentColor + '30' }">
        <span class="project-popup__total-label">{{ t('stats.totalBeneficiaries') }}</span>
        <span class="project-popup__total-value" :style="{ color: accentColor }">
          {{ formatCompact(totalBeneficiaries) }}
        </span>
      </div>
    </div>

    <footer class="project-popup__footer">
      <a
        :href="mapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="project-popup__action"
        :style="{ '--action-clr': accentColor }"
      >
        <Icon name="lucide:navigation" size="0.75rem" />
        <span>Open in Google Maps</span>
      </a>
    </footer>
  </article>
</template>

<style scoped>
.project-popup {
  display: flex;
  flex-direction: column;
  color: #e2e2e2;
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
}

.project-popup__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
  transition: background 0.25s ease;
}

.project-popup__head {
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.project-popup__group-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.project-popup__group {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 700;
  border: 1px solid;
  padding: 0.1rem 0.55rem;
  border-radius: 4px;
  display: inline-block;
  line-height: 1.4;
}

.project-popup__title {
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
  color: #fff;
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
}

.project-popup__location {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  margin-top: 0.15rem;
}

.project-popup__body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.project-popup__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.project-popup__stat {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 0.7rem;
}

.project-popup__stat-icon {
  color: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.project-popup__stat-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.project-popup__stat-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
}

.project-popup__stat-value {
  font-size: 1rem;
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.project-popup__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid;
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
}

.project-popup__total-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
}

.project-popup__total-value {
  font-size: 1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.project-popup__footer {
  display: flex;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.85rem;
  margin-top: 0.5rem;
}

.project-popup__action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: var(--action-clr, #5dade2);
  text-decoration: none;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  line-height: 1.4;
  transition: background 0.15s, border-color 0.2s, color 0.15s;
}

.project-popup__action:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--action-clr, #5dade2);
}
</style>
