<script setup lang="ts">
import { computed } from 'vue'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'

interface Props {
  crew: CrewRegionData | CrewLocation | null
  isLocation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLocation: false,
})

const { t } = useI18n()

const color = computed(() => {
  if (!props.crew || props.isLocation) return '#a855f7'
  const c = props.crew as CrewRegionData
  return c.activeCrews > 20 ? '#22c55e' : c.activeCrews > 5 ? '#3b82f6' : '#a855f7'
})

const region = computed(() => {
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

const statusColor = computed(() => isActive.value ? '#22c55e' : '#f59e0b')

const growth = computed(() => {
  if (!props.crew || props.isLocation) return null
  const c = props.crew as CrewRegionData
  const h2022 = c.history?.find(h => h.year === 2022)
  if (!h2022 || h2022.activeCrews === 0) return null
  return Math.round(((c.activeCrews - h2022.activeCrews) / h2022.activeCrews) * 100)
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
      <p class="crew-popup__eyebrow">Earth Guardians Crew</p>
      <h2 class="crew-popup__title">{{ region }}</h2>
      <p v-if="isLocation && locationParts" class="crew-popup__location">
        <Icon name="lucide:map-pin" class="h-3.5 w-3.5" />
        <span>{{ locationParts }}</span>
      </p>
      <div v-if="isLocation" class="crew-popup__status">
        <span class="crew-popup__status-dot" :style="{ background: statusColor }" />
        <span :style="{ color: statusColor }">{{ isActive ? 'Active' : 'Inactive' }}</span>
      </div>
    </header>

    <template v-if="!isLocation">
      <dl class="crew-popup__stats">
        <div class="crew-popup__stat">
          <dt>{{ t('crews.activeCrews') }}</dt>
          <dd :style="{ color }">{{ (crew as CrewRegionData).activeCrews }}</dd>
        </div>
        <div class="crew-popup__stat">
          <dt>{{ t('crews.totalMembers') }}</dt>
          <dd>{{ (crew as CrewRegionData).totalMembers.toLocaleString() }}</dd>
        </div>
        <div class="crew-popup__stat">
          <dt>{{ t('crews.countries') }}</dt>
          <dd>{{ (crew as CrewRegionData).countries }}</dd>
        </div>
        <div v-if="growth !== null" class="crew-popup__stat crew-popup__stat--growth">
          <dt>{{ t('crews.growthSince2022') }}</dt>
          <dd class="crew-popup__growth">+{{ growth }}%</dd>
        </div>
      </dl>
    </template>

    <footer v-if="!isLocation" class="crew-popup__footer">
      <a
        :href="`https://www.google.com/maps?q=${(crew as CrewRegionData).latitude},${(crew as CrewRegionData).longitude}`"
        target="_blank"
        rel="noopener noreferrer"
        class="crew-popup__link"
      >
        <Icon name="lucide:external-link" class="h-3 w-3" />
        <span>{{ t('project.openInMaps') }}</span>
      </a>
    </footer>
  </article>
</template>

<style scoped>
.crew-popup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #fafafa;
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
  min-width: 18rem;
  max-width: 26rem;
}
.crew-popup__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
}
.crew-popup__head { display: flex; flex-direction: column; gap: 0.25rem; }
.crew-popup__eyebrow {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 800;
  margin: 0;
}
.crew-popup__title {
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 0;
}
.crew-popup__location {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}
.crew-popup__status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
}
.crew-popup__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.crew-popup__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin: 0;
}
.crew-popup__stat {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.crew-popup__stat--growth {
  grid-column: 1 / -1;
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.2);
}
.crew-popup__stat dt {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 700;
}
.crew-popup__stat dd {
  font-size: 1rem;
  font-weight: 800;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.crew-popup__growth {
  color: #22c55e;
}
.crew-popup__footer {
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.75rem;
}
.crew-popup__link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;
  color: #5dade2;
  text-decoration: none;
  font-weight: 600;
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  transition: background 0.15s;
}
.crew-popup__link:hover { background: rgba(93, 173, 226, 0.12); }
</style>
