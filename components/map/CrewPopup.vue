/**
 * components/map/CrewPopup.vue
 * @why Crew region/location popup for map markers — shows stats, history, status
 * @component CrewPopup
 * @props crew: CrewRegionData | CrewLocation | null
   isLocation?
 * @deps vue (computed)
 */
<script setup lang="ts">

import { computed } from 'vue'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'

const props = defineProps<{
  crew: CrewRegionData | CrewLocation | null
  isLocation?: boolean
}>()

const { t } = useI18n()

const color = computed(() => {
  if (!props.crew || props.isLocation) return 'var(--purple)'
  const c = props.crew as CrewRegionData
  return c.activeCrews > 20 ? 'var(--success)' : c.activeCrews > 5 ? 'var(--info)' : 'var(--purple)'
})

const regionName = computed(() => {
  if (!props.crew) return ''
  return props.isLocation
    ? (props.crew as CrewLocation).name || (props.crew as CrewLocation).region
    : (props.crew as CrewRegionData).region
})

const locationParts = computed(() => {
  if (!props.crew || !props.isLocation) return ''
  const c = props.crew as CrewLocation
  return [c.city, c.state, c.country].filter(Boolean).join(', ')
})

const isActive = computed(() => {
  if (!props.crew || !props.isLocation) return true
  return (props.crew as CrewLocation).status !== 'inactive'
})

const statusColor = computed(() => isActive.value ? 'var(--success)' : 'var(--warning)')

const growth = computed(() => {
  if (!props.crew || props.isLocation) return null
  const c = props.crew as CrewRegionData
  const h2022 = c.history?.find(h => h.year === 2022)
  if (!h2022 || h2022.activeCrews === 0) return null
  return Math.round(((c.activeCrews - h2022.activeCrews) / h2022.activeCrews) * 100)
})

const mapsUrl = computed(() => {
  if (!props.crew) return '#'
  if (props.isLocation) {
    const c = props.crew as CrewLocation
    return `https://www.google.com/maps?q=${c.lat},${c.lng}`
  }
  const c = props.crew as CrewRegionData
  return `https://www.google.com/maps?q=${c.latitude},${c.longitude}`
})

const regionData = computed(() => {
  if (!props.crew || !props.isLocation) return null
  const c = props.crew as CrewLocation
  return c.region || null
})

const historyData = computed(() => {
  if (!props.crew || props.isLocation) return []
  const c = props.crew as CrewRegionData
  if (!c.history?.length) return []
  return c.history.map(h => ({
    year: h.year,
    active: h.activeCrews,
    inactive: h.inactiveCrews,
    members: h.members,
  }))
})

const maxActiveCrews = computed(() => {
  if (!historyData.value.length) return 1
  return Math.max(...historyData.value.map(h => h.active), 1)
})

const totalHistoryCrews = computed(() => {
  if (!historyData.value.length) return 0
  return historyData.value.reduce((sum, h) => sum + h.active + h.inactive, 0)
})

</script>

<template>
  <article v-if="crew" class="crew-popup">
    <div
      class="crew-popup__accent"
      :style="{ background: color }"
      aria-hidden="true"
    />

    <header class="crew-popup__head">
      <div class="crew-popup__group-row">
        <span class="crew-popup__group" :style="{ borderColor: color, color }">
          Earth Guardians Crew
        </span>
        <span
          v-if="isLocation"
          class="crew-popup__status"
          :style="{ background: statusColor + '18', color: statusColor, borderColor: statusColor + '40' }"
        >
          <span class="crew-popup__status-dot" :style="{ background: statusColor }" />
          {{ isActive ? 'Active' : 'Inactive' }}
        </span>
      </div>
      <h2 class="crew-popup__title">{{ regionName }}</h2>
      <p v-if="isLocation && locationParts" class="crew-popup__location">
        <Icon name="lucide:map-pin" size="0.75rem" />
        <span>{{ locationParts }}</span>
      </p>
      <p v-if="!isLocation && regionData" class="crew-popup__location">
        <Icon name="lucide:map-pin" size="0.75rem" />
        <span>{{ regionData }}</span>
      </p>
    </header>

    <!-- Region view: stats + history -->
    <template v-if="!isLocation">
      <div class="crew-popup__body">
        <div class="crew-popup__stats">
          <div class="crew-popup__stat">
            <Icon name="lucide:users" size="0.75rem" class="crew-popup__stat-icon" :style="{ color }" />
            <div class="crew-popup__stat-body">
              <span class="crew-popup__stat-label">{{ t('crews.activeCrews') }}</span>
              <span class="crew-popup__stat-value" :style="{ color }">
                {{ (crew as CrewRegionData).activeCrews }}
              </span>
            </div>
          </div>
          <div class="crew-popup__stat">
            <Icon name="lucide:user-x" size="0.75rem" class="crew-popup__stat-icon" />
            <div class="crew-popup__stat-body">
              <span class="crew-popup__stat-label">{{ t('crews.inactiveCrews') || 'Inactive' }}</span>
              <span class="crew-popup__stat-value">{{ (crew as CrewRegionData).inactiveCrews }}</span>
            </div>
          </div>
          <div class="crew-popup__stat">
            <Icon name="lucide:clock" size="0.75rem" class="crew-popup__stat-icon" />
            <div class="crew-popup__stat-body">
              <span class="crew-popup__stat-label">{{ t('crews.totalMembers') }}</span>
              <span class="crew-popup__stat-value">{{ (crew as CrewRegionData).totalMembers.toLocaleString() }}</span>
            </div>
          </div>
          <div class="crew-popup__stat">
            <Icon name="lucide:globe" size="0.75rem" class="crew-popup__stat-icon" />
            <div class="crew-popup__stat-body">
              <span class="crew-popup__stat-label">{{ t('crews.countries') }}</span>
              <span class="crew-popup__stat-value">{{ (crew as CrewRegionData).countries }}</span>
            </div>
          </div>
        </div>

        <!-- Growth badge -->
        <div
          v-if="growth !== null"
          class="crew-popup__growth"
          :style="{ background: 'var(--success-bg)', borderColor: 'var(--success)' + '30' }"
        >
          <Icon name="lucide:trending-up" size="0.85rem" class="crew-popup__growth-icon" />
          <div class="crew-popup__growth-body">
            <span class="crew-popup__growth-label">{{ t('crews.growthSince2022') }}</span>
            <span class="crew-popup__growth-value">+{{ growth }}%</span>
          </div>
        </div>

        <!-- History bar chart -->
        <div v-if="historyData.length > 0" class="crew-popup__history">
          <h3 class="crew-popup__section-title">
            <Icon name="lucide:bar-chart-3" size="0.7rem" />
            <span>Crew History</span>
          </h3>
          <div class="crew-popup__chart">
            <div
              v-for="entry in historyData"
              :key="entry.year"
              class="crew-popup__chart-bar"
            >
              <div class="crew-popup__chart-stack">
                <div
                  class="crew-popup__chart-fill crew-popup__chart-fill--active"
                  :style="{ height: (entry.active / maxActiveCrews) * 100 + '%', background: color }"
                />
                <div
                  v-if="entry.inactive > 0"
                  class="crew-popup__chart-fill crew-popup__chart-fill--inactive"
                  :style="{ height: (entry.inactive / maxActiveCrews) * 100 + '%' }"
                />
              </div>
              <span class="crew-popup__chart-label">{{ String(entry.year).slice(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Location view: region context -->
    <template v-else-if="regionData">
      <div class="crew-popup__body">
        <div class="crew-popup__region-context">
          <Icon name="lucide:layers" size="0.75rem" class="crew-popup__region-icon" />
          <div class="crew-popup__region-body">
            <span class="crew-popup__region-label">{{ t('crews.region') || 'Region' }}</span>
            <span class="crew-popup__region-value">{{ regionData }}</span>
          </div>
        </div>
      </div>
    </template>

    <footer class="crew-popup__footer">
      <a
        :href="mapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="crew-popup__action"
        :style="{ '--action-clr': color }"
      >
        <Icon name="lucide:navigation" size="0.75rem" />
        <span>Open in Google Maps</span>
      </a>
    </footer>
  </article>
</template>

<style scoped>
.crew-popup {
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
}

.crew-popup__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
  transition: background 0.25s ease;
}

.crew-popup__head {
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.crew-popup__group-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}

.crew-popup__group {
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

.crew-popup__status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  line-height: 1.4;
}

.crew-popup__status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.crew-popup__title {
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
}

.crew-popup__location {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
  margin-top: 0.15rem;
}

.crew-popup__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Stats grid ── */
.crew-popup__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.crew-popup__stat {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 8px;
  padding: 0.7rem;
}

.crew-popup__stat-icon {
  color: var(--stat-card-label);
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.crew-popup__stat-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.crew-popup__stat-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--stat-card-label);
  font-weight: 700;
}

.crew-popup__stat-value {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* ── Growth badge ── */
.crew-popup__growth {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border: 1px solid;
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
}

.crew-popup__growth-icon {
  color: var(--success);
  flex-shrink: 0;
}

.crew-popup__growth-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.crew-popup__growth-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--stat-card-label);
  font-weight: 700;
}

.crew-popup__growth-value {
  font-size: 1rem;
  font-weight: 800;
  color: var(--success);
  font-variant-numeric: tabular-nums;
}

/* ── History chart ── */
.crew-popup__history {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.crew-popup__section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  font-weight: 700;
  margin: 0;
}

.crew-popup__chart {
  display: flex;
  align-items: flex-end;
  gap: 0.35rem;
  height: 64px;
  padding: 0.4rem 0;
  border: 1px solid var(--stat-card-border);
  border-radius: 8px;
  background: var(--stat-card-bg);
}

.crew-popup__chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  height: 100%;
  justify-content: flex-end;
}

.crew-popup__chart-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  justify-content: flex-end;
}

.crew-popup__chart-fill {
  width: 100%;
  min-height: 2px;
  border-radius: 2px;
  transition: height 0.3s ease;
}

.crew-popup__chart-fill--active {
  opacity: 0.9;
}

.crew-popup__chart-fill--inactive {
  background: var(--text-muted);
  opacity: 0.3;
}

.crew-popup__chart-label {
  font-size: 0.55rem;
  font-weight: 600;
  color: var(--text-muted);
  line-height: 1;
}

/* ── Location region context ── */
.crew-popup__region-context {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
}

.crew-popup__region-icon {
  color: var(--purple);
  flex-shrink: 0;
}

.crew-popup__region-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.crew-popup__region-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--stat-card-label);
  font-weight: 700;
}

.crew-popup__region-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── Footer ── */
.crew-popup__footer {
  display: flex;
  border-top: 1px solid var(--stat-card-border);
  padding-top: 0.85rem;
  margin-top: 0.5rem;
}

.crew-popup__action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: var(--action-clr, var(--info));
  text-decoration: none;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  line-height: 1.4;
  transition: background 0.15s, border-color 0.2s, color 0.15s;
}

.crew-popup__action:hover {
  background: var(--stat-card-border);
  border-color: var(--action-clr, var(--info));
}
</style>
