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

</script>

<template>
  <article v-if="crew" class="cp">
    <!-- Header -->
    <header class="cp__hero" :style="{ background: `linear-gradient(135deg, ${color}14 0%, transparent 100%)` }">
      <div class="cp__hero-bar" :style="{ background: color }" />
      <div class="cp__hero-content">
        <div class="cp__group-row">
          <span class="cp__badge" :style="{ borderColor: color + '50', color }">
            Earth Guardians Crew
          </span>
          <span
            v-if="isLocation"
            class="cp__status"
            :style="{ background: statusColor + '18', color: statusColor, borderColor: statusColor + '40' }"
          >
            <span class="cp__status-dot" :style="{ background: statusColor }" />
            {{ isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <h2 class="cp__title">{{ regionName }}</h2>
        <p v-if="isLocation && locationParts" class="cp__location">
          <Icon name="lucide:map-pin" size="0.85rem" />
          <span>{{ locationParts }}</span>
        </p>
        <p v-if="!isLocation && regionData" class="cp__location">
          <Icon name="lucide:map-pin" size="0.85rem" />
          <span>{{ regionData }}</span>
        </p>
      </div>
    </header>

    <!-- Region view: stats + history -->
    <template v-if="!isLocation">
      <div class="cp__content">
        <!-- Stats grid -->
        <div class="cp__stats">
          <div class="cp__stat" :style="{ borderColor: color + '25' }">
            <div class="cp__stat-icon" :style="{ background: color + '15', color }">
              <Icon name="lucide:users" size="1rem" />
            </div>
            <div class="cp__stat-body">
              <span class="cp__stat-label">{{ t('crews.activeCrews') }}</span>
              <span class="cp__stat-value" :style="{ color }">
                {{ (crew as CrewRegionData).activeCrews }}
              </span>
            </div>
          </div>
          <div class="cp__stat">
            <div class="cp__stat-icon">
              <Icon name="lucide:user-x" size="1rem" />
            </div>
            <div class="cp__stat-body">
              <span class="cp__stat-label">{{ t('crews.inactiveCrews') || 'Inactive' }}</span>
              <span class="cp__stat-value">{{ (crew as CrewRegionData).inactiveCrews }}</span>
            </div>
          </div>
          <div class="cp__stat">
            <div class="cp__stat-icon">
              <Icon name="lucide:clock" size="1rem" />
            </div>
            <div class="cp__stat-body">
              <span class="cp__stat-label">{{ t('crews.totalMembers') }}</span>
              <span class="cp__stat-value">{{ (crew as CrewRegionData).totalMembers.toLocaleString() }}</span>
            </div>
          </div>
          <div class="cp__stat">
            <div class="cp__stat-icon">
              <Icon name="lucide:globe" size="1rem" />
            </div>
            <div class="cp__stat-body">
              <span class="cp__stat-label">{{ t('crews.countries') }}</span>
              <span class="cp__stat-value">{{ (crew as CrewRegionData).countries }}</span>
            </div>
          </div>
        </div>

        <!-- Growth badge -->
        <div
          v-if="growth !== null"
          class="cp__growth"
        >
          <Icon name="lucide:trending-up" size="1rem" class="cp__growth-icon" />
          <div class="cp__growth-body">
            <span class="cp__growth-label">{{ t('crews.growthSince2022') }}</span>
            <span class="cp__growth-value">+{{ growth }}%</span>
          </div>
        </div>

        <!-- History bar chart -->
        <div v-if="historyData.length > 0" class="cp__history">
          <h3 class="cp__section-title">
            <Icon name="lucide:bar-chart-3" size="0.75rem" />
            <span>Crew History</span>
          </h3>
          <div class="cp__chart">
            <div
              v-for="entry in historyData"
              :key="entry.year"
              class="cp__chart-bar"
            >
              <div class="cp__chart-stack">
                <div
                  class="cp__chart-fill cp__chart-fill--active"
                  :style="{ height: (entry.active / maxActiveCrews) * 100 + '%', background: color }"
                />
                <div
                  v-if="entry.inactive > 0"
                  class="cp__chart-fill cp__chart-fill--inactive"
                  :style="{ height: (entry.inactive / maxActiveCrews) * 100 + '%' }"
                />
              </div>
              <span class="cp__chart-label">{{ String(entry.year).slice(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Location view: region context -->
    <template v-else-if="regionData">
      <div class="cp__content">
        <div class="cp__region-context">
          <Icon name="lucide:layers" size="0.85rem" class="cp__region-icon" />
          <div class="cp__region-body">
            <span class="cp__region-label">{{ t('crews.region') || 'Region' }}</span>
            <span class="cp__region-value">{{ regionData }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Footer -->
    <footer class="cp__footer">
      <a
        :href="mapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="cp__action"
        :style="{ '--action-clr': color }"
      >
        <Icon name="lucide:navigation" size="0.85rem" />
        <span>Open in Google Maps</span>
      </a>
    </footer>
  </article>
</template>

<style scoped>
.cp {
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Hero ── */
.cp__hero {
  position: relative;
  padding: 1.25rem 1.5rem 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}
.cp__hero-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
}
.cp__hero-content {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-left: 0.5rem;
}
.cp__group-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.15rem;
  flex-wrap: wrap;
}
.cp__badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  border: 1px solid;
  padding: 0.15rem 0.6rem;
  border-radius: 5px;
  display: inline-block;
  line-height: 1.4;
}
.cp__status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid;
  padding: 0.12rem 0.5rem;
  border-radius: 5px;
  line-height: 1.4;
}
.cp__status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cp__title {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: -0.015em;
  overflow-wrap: break-word;
}
.cp__location {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
  margin-top: 0.1rem;
}

/* ── Content ── */
.cp__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}

/* ── Stats grid ── */
.cp__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.cp__stat {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 10px;
  padding: 0.85rem;
}
.cp__stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: var(--stat-card-bg);
  color: var(--text-muted);
  flex-shrink: 0;
}
.cp__stat-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.cp__stat-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  font-weight: 700;
}
.cp__stat-value {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

/* ── Growth badge ── */
.cp__growth {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--success);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: var(--stat-card-bg);
}
.cp__growth-icon {
  color: var(--success);
  flex-shrink: 0;
}
.cp__growth-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.cp__growth-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  font-weight: 700;
}
.cp__growth-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--success);
  font-variant-numeric: tabular-nums;
}

/* ── History chart ── */
.cp__history {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cp__section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  font-weight: 700;
  margin: 0;
}
.cp__chart {
  display: flex;
  align-items: flex-end;
  gap: 0.4rem;
  height: 72px;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--stat-card-border);
  border-radius: 10px;
  background: var(--stat-card-bg);
}
.cp__chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  height: 100%;
  justify-content: flex-end;
}
.cp__chart-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  justify-content: flex-end;
}
.cp__chart-fill {
  width: 100%;
  min-height: 2px;
  border-radius: 2px;
  transition: height 0.3s ease;
}
.cp__chart-fill--active { opacity: 0.9; }
.cp__chart-fill--inactive { background: var(--text-muted); opacity: 0.3; }
.cp__chart-label {
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--text-muted);
  line-height: 1;
}

/* ── Location context ── */
.cp__region-context {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 10px;
  padding: 0.75rem 1rem;
}
.cp__region-icon {
  color: var(--purple);
  flex-shrink: 0;
}
.cp__region-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.cp__region-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  font-weight: 700;
}
.cp__region-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── Footer ── */
.cp__footer {
  display: flex;
  border-top: 1px solid var(--border-color);
  padding: 0.85rem 1.5rem;
}
.cp__action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--action-clr, var(--info));
  text-decoration: none;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  line-height: 1.4;
  transition: background 0.15s, border-color 0.2s, color 0.15s;
}
.cp__action:hover {
  background: var(--stat-card-border);
  border-color: var(--action-clr, var(--info));
}
</style>
