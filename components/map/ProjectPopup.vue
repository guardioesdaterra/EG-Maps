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
  if (!props.project) return 'var(--purple)'
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

const directPct = computed(() => {
  if (totalBeneficiaries.value === 0) return 0
  return Math.round((props.project!.direct_beneficiaries / totalBeneficiaries.value) * 100)
})

</script>

<template>
  <article v-if="project" class="pp">
    <!-- Hero accent strip -->
    <div class="pp__hero" :style="{ background: `linear-gradient(135deg, ${accentColor}18 0%, transparent 100%)` }">
      <div class="pp__hero-bar" :style="{ background: accentColor }" />
      <div class="pp__hero-content">
        <span class="pp__badge" :style="{ background: accentColor + '20', color: accentColor, borderColor: accentColor + '40' }">
          {{ t('stats.projectGrantees') }}
        </span>
        <h2 class="pp__title">{{ project.project_title }}</h2>
        <p v-if="project.country_province" class="pp__location">
          <Icon name="lucide:map-pin" size="0.85rem" />
          <span>{{ project.country_province }}</span>
        </p>
      </div>
    </div>

    <!-- Stats grid -->
    <div v-if="hasStats" class="pp__content">
      <div class="pp__stats">
        <div v-if="project.direct_beneficiaries > 0" class="pp__stat" :style="{ borderColor: accentColor + '25' }">
          <div class="pp__stat-icon" :style="{ background: accentColor + '15', color: accentColor }">
            <Icon name="lucide:users" size="1rem" />
          </div>
          <div class="pp__stat-body">
            <span class="pp__stat-label">{{ t('stats.directBeneficiaries') }}</span>
            <span class="pp__stat-value" :style="{ color: accentColor }">{{ formatCompact(project.direct_beneficiaries) }}</span>
          </div>
        </div>
        <div v-if="project.indirect_beneficiaries > 0" class="pp__stat" :style="{ borderColor: 'var(--stat-card-border)' }">
          <div class="pp__stat-icon" :style="{ background: 'var(--stat-card-bg)', color: 'var(--text-muted)' }">
            <Icon name="lucide:clock" size="1rem" />
          </div>
          <div class="pp__stat-body">
            <span class="pp__stat-label">{{ t('stats.indirectBeneficiaries') }}</span>
            <span class="pp__stat-value">{{ formatCompact(project.indirect_beneficiaries) }}</span>
          </div>
        </div>
      </div>

      <!-- Total row -->
      <div class="pp__total" :style="{ borderColor: accentColor + '30' }">
        <div class="pp__total-left">
          <span class="pp__total-label">{{ t('stats.totalBeneficiaries') }}</span>
          <span class="pp__total-value" :style="{ color: accentColor }">{{ formatCompact(totalBeneficiaries) }}</span>
        </div>
        <div class="pp__bar-track">
          <div class="pp__bar-fill" :style="{ width: directPct + '%', background: accentColor }" />
        </div>
      </div>

      <!-- Actions -->
      <div class="pp__actions">
        <a
          :href="mapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="pp__action-btn"
          :style="{ '--action-clr': accentColor }"
        >
          <Icon name="lucide:navigation" size="0.85rem" />
          <span>Open in Google Maps</span>
        </a>
      </div>
    </div>
  </article>
</template>

<style scoped>
.pp {
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Hero ── */
.pp__hero {
  position: relative;
  padding: 1.25rem 1.5rem 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}
.pp__hero-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
}
.pp__hero-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-left: 0.5rem;
}
.pp__badge {
  display: inline-flex;
  align-self: flex-start;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  border: 1px solid;
  padding: 0.15rem 0.6rem;
  border-radius: 5px;
  line-height: 1.4;
}
.pp__title {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: -0.015em;
  overflow-wrap: break-word;
}
.pp__location {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
  margin-top: 0.1rem;
}

/* ── Content ── */
.pp__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1.5rem;
}

/* ── Stats ── */
.pp__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.pp__stat {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 10px;
  padding: 0.85rem;
}
.pp__stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  flex-shrink: 0;
}
.pp__stat-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.pp__stat-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  font-weight: 700;
}
.pp__stat-value {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

/* ── Total ── */
.pp__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: var(--stat-card-bg);
}
.pp__total-left {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.pp__total-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: var(--text-muted);
}
.pp__total-value {
  font-size: 1.15rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.pp__bar-track {
  flex: 1;
  height: 4px;
  background: var(--stat-card-border);
  border-radius: 2px;
  overflow: hidden;
  max-width: 120px;
}
.pp__bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* ── Actions ── */
.pp__actions {
  display: flex;
  gap: 0.5rem;
}
.pp__action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--action-clr, var(--info));
  text-decoration: none;
  font-weight: 600;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  line-height: 1.4;
  transition: background 0.15s, border-color 0.2s, color 0.15s;
}
.pp__action-btn:hover {
  background: var(--stat-card-border);
  border-color: var(--action-clr, var(--info));
}
</style>
