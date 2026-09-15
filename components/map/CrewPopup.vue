<script setup lang="ts">

import { computed, ref, watch } from 'vue'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import type { ProjectData } from '@/lib/types'
import { formatCompact } from '@/lib/utils'
import { crewLocationKey, crewRegionKey, filterCrewLocationsByRegion, parseCrewHistory, projectGrantKey } from '@/lib/crew-grants'
import { crewGrantMap, regionGrantMap, type StoredCrewGrantMatch } from '@/lib/crew-grants-map'

const props = defineProps<{
  crew: CrewRegionData | CrewLocation | null
  isLocation?: boolean
  projects?: ProjectData[]
  crewLocations?: CrewLocation[]
}>()

const emit = defineEmits<{
  'select-crew': [crew: CrewLocation]
  'fly-to-project': [lat: number, lng: number]
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
  // parseCrewHistory: feature-derived records can carry a stringified history
  // (vector-tile round-trip) — never call .find on a non-array.
  const history = parseCrewHistory(c.history)
  const h2022 = history.find(h => h.year === 2022)
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

const coordsLabel = computed(() => {
  if (!props.crew || !props.isLocation) return ''
  const c = props.crew as CrewLocation
  if (typeof c.lat !== 'number' || typeof c.lng !== 'number') return ''
  return `${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}`
})

const historyData = computed(() => {
  if (!props.crew || props.isLocation) return []
  const c = props.crew as CrewRegionData
  // Crash-safe: history may be missing or a stringified array when the record
  // came from map feature properties instead of the static dataset.
  return parseCrewHistory(c.history).map(h => ({
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

export interface CrewPopupGrant {
  project: ProjectData
  reason: StoredCrewGrantMatch['reason']
  distanceKm: number | null
}

const matchedGrants = computed<CrewPopupGrant[]>(() => {
  // Static precomputed map (scripts/generate-crew-grants.ts → lib/crew-grants-map.ts):
  // no rematching at runtime. Keys are intersected with the (possibly filtered)
  // project list so map filters keep working.
  if (!props.crew || !props.projects?.length) return []
  const byKey = new Map(props.projects.map(p => [projectGrantKey(p), p]))
  const refs = props.isLocation
    ? (crewGrantMap[crewLocationKey(props.crew as CrewLocation)] ?? [])
    : (regionGrantMap[crewRegionKey(props.crew as CrewRegionData)] ?? [])
  const out: CrewPopupGrant[] = []
  for (const ref of refs) {
    const project = byKey.get(ref.key)
    if (project) out.push({ project, reason: ref.reason, distanceKm: ref.distanceKm })
  }
  return out
})

function grantBeneficiaries(p: ProjectData): string {
  const total = (p.direct_beneficiaries || 0) + (p.indirect_beneficiaries || 0)
  return total > 0 ? formatCompact(total) : ''
}

function hasBeneficiaries(p: ProjectData): boolean {
  return (p.direct_beneficiaries || 0) + (p.indirect_beneficiaries || 0) > 0
}

const unknownBeneficiaries = computed(() => tx('stats.unknownBeneficiaries', 'Unknown'))

/** Grants <10 km from the crew are that crew's own (on-site) projects */
const SPECIFIC_MAX_KM = 10
/** Paginated to keep region popups (up to 52 grants) usable */
const GRANTS_PAGE_SIZE = 5

const grantsPage = ref(1)
watch(() => [props.crew, props.isLocation], () => {
  grantsPage.value = 1
})

function isSpecificGrant(m: CrewPopupGrant): boolean {
  return m.distanceKm !== null && m.distanceKm < SPECIFIC_MAX_KM
}

const specificGrants = computed<CrewPopupGrant[]>(() => matchedGrants.value.filter(isSpecificGrant))
const relatedGrants = computed<CrewPopupGrant[]>(() => matchedGrants.value.filter(m => !isSpecificGrant(m)))
const totalGrantPages = computed(() => Math.max(1, Math.ceil(relatedGrants.value.length / GRANTS_PAGE_SIZE)))
const safeGrantPage = computed(() => Math.min(Math.max(1, grantsPage.value), totalGrantPages.value))
const pagedRelatedGrants = computed<CrewPopupGrant[]>(() =>
  relatedGrants.value.slice((safeGrantPage.value - 1) * GRANTS_PAGE_SIZE, safeGrantPage.value * GRANTS_PAGE_SIZE),
)

function prevGrantsPage() {
  grantsPage.value = Math.max(1, safeGrantPage.value - 1)
}
function nextGrantsPage() {
  grantsPage.value = Math.min(totalGrantPages.value, safeGrantPage.value + 1)
}

/* ── Crews in this region (paginated) ─────────────────────────────────── */

const CREWS_PAGE_SIZE = 6

const crewsPage = ref(1)
watch(() => [props.crew, props.isLocation, props.crewLocations], () => {
  crewsPage.value = 1
})

const regionCrews = computed<CrewLocation[]>(() => {
  if (!props.crew || props.isLocation || !props.crewLocations?.length) return []
  return filterCrewLocationsByRegion(props.crewLocations, props.crew as CrewRegionData)
})
const totalCrewPages = computed(() => Math.max(1, Math.ceil(regionCrews.value.length / CREWS_PAGE_SIZE)))
const safeCrewPage = computed(() => Math.min(Math.max(1, crewsPage.value), totalCrewPages.value))
const pagedRegionCrews = computed<CrewLocation[]>(() =>
  regionCrews.value.slice((safeCrewPage.value - 1) * CREWS_PAGE_SIZE, safeCrewPage.value * CREWS_PAGE_SIZE),
)

function prevCrewsPage() {
  crewsPage.value = Math.max(1, safeCrewPage.value - 1)
}
function nextCrewsPage() {
  crewsPage.value = Math.min(totalCrewPages.value, safeCrewPage.value + 1)
}

function crewPlace(c: CrewLocation): string {
  return [c.city, c.country].filter(Boolean).join(', ')
}

function selectCrew(c: CrewLocation) {
  emit('select-crew', c)
}

function flyToProject(m: CrewPopupGrant) {
  const lat = m.project.latitude
  const lng = m.project.longitude
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    emit('fly-to-project', lat, lng)
  }
}

const totalMembersLabel = computed(() => {
  if (!props.crew || props.isLocation) return ''
  const n = (props.crew as CrewRegionData).totalMembers
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '0'
})

function tx(key: string, fallback: string, params?: Record<string, string>): string {
  const translated = params ? t(key, params) : t(key)
  return translated === key ? fallback : translated
}

const ownProjectsTitle = computed(() => !props.isLocation
  ? tx('crews.ownProjectsRegionTitle', 'On-site crew projects')
  : tx('crews.ownProjectsTitle', 'Near Crew Project'))

const crewProjectBadge = computed(() => tx('crews.crewProjectBadge', 'Crew project'))
const flyToLabel = computed(() => tx('crews.flyToProject', 'Fly to'))
const moreProjectsTitle = computed(() => tx('crews.moreProjects', 'More linked projects'))
const grantsPageLabel = computed(() => tx('crews.pageOf', `Page ${safeGrantPage.value} of ${totalGrantPages.value}`, { page: String(safeGrantPage.value), pages: String(totalGrantPages.value) }))
const crewsInRegionTitle = computed(() => tx('crews.crewsInRegion', `Crews in ${regionName.value}`, { region: regionName.value }))
const crewsInRegionHint = computed(() => tx('crews.crewsInRegionHint', 'All crews of this region — select one for details'))
const crewsPageLabel = computed(() => tx('crews.pageOf', `Page ${safeCrewPage.value} of ${totalCrewPages.value}`, { page: String(safeCrewPage.value), pages: String(totalCrewPages.value) }))

// Explicit scope labeling: a region popup aggregates the grants of ALL crews
// in the region, while a location popup shows only that crew's grants.
const grantsTitle = computed(() => {
  if (!props.isLocation) {
    const fallback = `Project grants of ${regionName.value}`
    const translated = t('crews.projectsOfRegion', { region: regionName.value })
    return translated === 'crews.projectsOfRegion' ? fallback : translated
  }
  const fallback = 'Project grants of this crew'
  const translated = t('crews.projectsOfCrew')
  return translated === 'crews.projectsOfCrew' ? fallback : translated
})

const grantsHint = computed(() => {
  if (!props.isLocation) {
    const fallback = 'Linked to crews across the whole region'
    const translated = t('crews.projectsOfRegionHint')
    return translated === 'crews.projectsOfRegionHint' ? fallback : translated
  }
  const fallback = 'Linked to this crew by place, name or proximity'
  const translated = t('crews.projectsOfCrewHint')
  return translated === 'crews.projectsOfCrewHint' ? fallback : translated
})

</script>

<template>
  <article v-if="crew" class="cp">
    <!-- Header -->
    <header class="cp__hero">
      <div class="cp__hero-content">
        <div class="cp__group-row">
          <span
            v-if="isLocation"
            class="cp__status"
            :style="{ background: statusColor + '18', color: statusColor, borderColor: statusColor + '40' }"
          >
            <span class="cp__status-dot" :style="{ background: statusColor }" />
            {{ isActive ? 'Active' : 'Inactive' }}
          </span>
          <span v-else class="cp__status cp__status--region">
            <Icon name="lucide:globe" size="0.7rem" />
            <span>{{ t('crews.region') || 'Region' }}</span>
          </span>
        </div>
        <h2 class="cp__title">
          <span class="cp__title-dot" :style="{ background: color }" aria-hidden="true" />
          <span>{{ regionName }}</span>
        </h2>
        <p v-if="isLocation && locationParts" class="cp__location">
          <Icon name="lucide:map-pin" size="0.85rem" />
          <span>{{ locationParts }}</span>
        </p>
        <p v-if="isLocation && coordsLabel" class="cp__coords">{{ coordsLabel }}</p>
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
              <Icon name="lucide:users-round" size="1rem" />
            </div>
            <div class="cp__stat-body">
              <span class="cp__stat-label">{{ t('crews.totalMembers') }}</span>
              <span class="cp__stat-value">{{ totalMembersLabel }}</span>
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
              :title="`${entry.year}: ${entry.active} active, ${entry.inactive} inactive crews, ${entry.members} members`"
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

        <!-- Crews in this region — paginated, tap for crew details -->
        <div v-if="regionCrews.length > 0" class="cp__crews">
          <h3 class="cp__section-title">
            <Icon name="lucide:users" size="0.75rem" />
            <span>{{ crewsInRegionTitle }}</span>
            <span class="cp__grants-count">{{ regionCrews.length }}</span>
          </h3>
          <p class="cp__grants-hint">{{ crewsInRegionHint }}</p>
          <ul class="cp__grants-list">
            <li v-for="c in pagedRegionCrews" :key="`${c.name}__${c.lat}__${c.lng}`">
              <button type="button" class="cp__grant cp__crew" @click="selectCrew(c)">
                <span
                  class="cp__crew-dot"
                  :style="{ background: c.status === 'active' ? 'var(--success)' : 'var(--warning)' }"
                  aria-hidden="true"
                />
                <span class="cp__grant-body">
                  <span class="cp__grant-title">{{ c.name }}</span>
                  <span v-if="crewPlace(c)" class="cp__grant-place">
                    <Icon name="lucide:map-pin" size="0.7rem" />
                    <span>{{ crewPlace(c) }}</span>
                  </span>
                </span>
                <span class="cp__crew-status" :data-active="c.status === 'active' ? '' : undefined">
                  {{ c.status === 'active' ? 'Active' : 'Inactive' }}
                </span>
              </button>
            </li>
          </ul>
          <div v-if="totalCrewPages > 1" class="cp__pager">
            <button
              type="button"
              class="cp__pager-btn"
              :disabled="safeCrewPage <= 1"
              :aria-label="t('grantsPortal.paginationPrev')"
              :title="t('grantsPortal.paginationPrev')"
              @click="prevCrewsPage"
            >
              <Icon name="lucide:chevron-left" size="0.9rem" />
            </button>
            <span class="cp__pager-label">{{ crewsPageLabel }}</span>
            <button
              type="button"
              class="cp__pager-btn"
              :disabled="safeCrewPage >= totalCrewPages"
              :aria-label="t('grantsPortal.paginationNext')"
              :title="t('grantsPortal.paginationNext')"
              @click="nextCrewsPage"
            >
              <Icon name="lucide:chevron-right" size="0.9rem" />
            </button>
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

    <!-- Related project grants (cross-dataset: project-grants ↔ active-crews) -->
    <div v-if="matchedGrants.length > 0" class="cp__content cp__grants">
      <h3 class="cp__section-title">
        <Icon name="lucide:hand-coins" size="0.75rem" />
        <span>{{ grantsTitle }}</span>
        <span class="cp__grants-count">{{ matchedGrants.length }}</span>
      </h3>
      <p class="cp__grants-hint">{{ grantsHint }}</p>
      <!-- This crew's own (on-site, <10 km) projects — highlighted, always fully shown -->
      <div v-if="specificGrants.length > 0" class="cp__own">
        <h4 v-if="relatedGrants.length > 0" class="cp__sub-title">
          <Icon name="lucide:star" size="0.75rem" />
          <span>{{ ownProjectsTitle }}</span>
        </h4>
        <ul class="cp__grants-list">
          <li
            v-for="m in specificGrants"
            :key="`own-${m.project.project_title}__${m.project.latitude}__${m.project.longitude}`"
            class="cp__grant cp__grant--own"
          >
            <div class="cp__grant-body">
              <span class="cp__grant-badge">
                <Icon name="lucide:star" size="0.65rem" />
                <span>{{ crewProjectBadge }}</span>
              </span>
              <span class="cp__grant-title">{{ m.project.project_title }}</span>
              <span v-if="m.project.country_province" class="cp__grant-place">
                <Icon name="lucide:map-pin" size="0.7rem" />
                <span>{{ m.project.country_province }}</span>
              </span>
            </div>
            <div class="cp__grant-side">
              <span class="cp__grant-benef" :class="{ 'cp__grant-benef--unknown': !hasBeneficiaries(m.project) }">
                {{ hasBeneficiaries(m.project) ? grantBeneficiaries(m.project) : unknownBeneficiaries }}
              </span>
              <button
                type="button"
                class="cp__fly-btn"
                :aria-label="`${flyToLabel}: ${m.project.project_title}`"
                :title="flyToLabel"
                @click="flyToProject(m)"
              >
                <Icon name="lucide:navigation" size="0.75rem" />
                <span>{{ flyToLabel }}</span>
              </button>
            </div>
          </li>
        </ul>
      </div>
      <!-- Remaining linked projects — paginated for large regions -->
      <div v-if="relatedGrants.length > 0" class="cp__related">
        <h4 v-if="specificGrants.length > 0" class="cp__sub-title cp__sub-title--related">
          <Icon name="lucide:link" size="0.75rem" />
          <span>{{ moreProjectsTitle }}</span>
        </h4>
        <ul class="cp__grants-list">
          <li
            v-for="m in pagedRelatedGrants"
            :key="`${m.project.project_title}__${m.project.latitude}__${m.project.longitude}`"
            class="cp__grant"
          >
            <div class="cp__grant-body">
              <span class="cp__grant-title">{{ m.project.project_title }}</span>
              <span v-if="m.project.country_province" class="cp__grant-place">
                <Icon name="lucide:map-pin" size="0.7rem" />
                <span>{{ m.project.country_province }}</span>
              </span>
            </div>
            <div class="cp__grant-side">
              <span class="cp__grant-benef" :class="{ 'cp__grant-benef--unknown': !hasBeneficiaries(m.project) }">
                {{ hasBeneficiaries(m.project) ? grantBeneficiaries(m.project) : unknownBeneficiaries }}
              </span>
              <button
                type="button"
                class="cp__fly-btn"
                :aria-label="`${flyToLabel}: ${m.project.project_title}`"
                :title="flyToLabel"
                @click="flyToProject(m)"
              >
                <Icon name="lucide:navigation" size="0.75rem" />
                <span>{{ flyToLabel }}</span>
              </button>
            </div>
          </li>
        </ul>
        <div v-if="totalGrantPages > 1" class="cp__pager">
          <button
            type="button"
            class="cp__pager-btn"
            :disabled="safeGrantPage <= 1"
            :aria-label="t('grantsPortal.paginationPrev')"
            :title="t('grantsPortal.paginationPrev')"
            @click="prevGrantsPage"
          >
            <Icon name="lucide:chevron-left" size="0.9rem" />
          </button>
          <span class="cp__pager-label">{{ grantsPageLabel }}</span>
          <button
            type="button"
            class="cp__pager-btn"
            :disabled="safeGrantPage >= totalGrantPages"
            :aria-label="t('grantsPortal.paginationNext')"
            :title="t('grantsPortal.paginationNext')"
            @click="nextGrantsPage"
          >
            <Icon name="lucide:chevron-right" size="0.9rem" />
          </button>
        </div>
      </div>
    </div>

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
.cp__hero-content {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.cp__group-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.15rem;
  flex-wrap: wrap;
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
  border-radius: 6px;
  line-height: 1.4;
}
.cp__status--region {
  color: var(--text-muted);
  background: var(--stat-card-bg);
  border-color: var(--stat-card-border);
}
.cp__status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cp__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: -0.015em;
  overflow-wrap: break-word;
}
.cp__title-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  flex-shrink: 0;
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
.cp__coords {
  margin: 0.15rem 0 0;
  font-size: 0.7rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
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

/* ── Related project grants ── */
.cp__grants {
  padding-top: 0;
}
.cp__grants-count {
  margin-left: auto;
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--text-muted);
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 6px;
  padding: 0.1rem 0.5rem;
  font-variant-numeric: tabular-nums;
}
.cp__grants-hint {
  margin: -0.35rem 0 0;
  font-size: 0.7rem;
  color: var(--text-muted);
}
.cp__own,
.cp__related {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cp__sub-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 800;
  color: var(--warning);
  margin: 0.35rem 0 0;
}
.cp__sub-title--related {
  color: var(--text-muted);
}
.cp__grants-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.cp__grant {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
}
.cp__grant-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.cp__grant-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  overflow-wrap: break-word;
}
.cp__grant-place {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}
.cp__grant-benef {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 800;
  /* Deepened in light mode: vivid success on a 12% tint ≈ 4.2:1 */
  color: color-mix(in srgb, var(--success) 68%, black);
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--success) 12%, transparent);
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
}
:global(.dark) .cp__grant-benef { color: var(--success); }
.cp__grant-benef--unknown {
  font-weight: 600;
  color: var(--text-muted);
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
}
.cp__grant-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
}
.cp__fly-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--info);
  background: transparent;
  border: 1px solid var(--stat-card-border);
  border-radius: 7px;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
  line-height: 1.2;
  transition: border-color 0.15s, background 0.15s;
}
.cp__fly-btn:hover {
  border-color: var(--info);
  background: color-mix(in srgb, var(--info) 10%, transparent);
}
.cp__grant--own {
  border-color: color-mix(in srgb, var(--warning) 45%, transparent);
  background: color-mix(in srgb, var(--warning) 7%, var(--stat-card-bg));
}
.cp__grant-badge {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  /* Deepened in light mode: warning on a 14% tint ≈ 4.5:1 */
  color: color-mix(in srgb, var(--warning) 68%, black);
  background: color-mix(in srgb, var(--warning) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 45%, transparent);
  border-radius: 6px;
  padding: 0.1rem 0.5rem;
  margin-bottom: 0.15rem;
}
:global(.dark) .cp__grant-badge { color: var(--warning); }
.cp__pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.15rem;
}
.cp__pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
  color: var(--text-primary);
  background: var(--stat-card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 8px;
  padding: 0.35rem;
  cursor: pointer;
  transition: border-color 0.15s, opacity 0.15s;
}
.cp__pager-btn:hover:not(:disabled) {
  border-color: var(--info);
}
.cp__pager-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.cp__pager-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Crews in region ── */
.cp__crews {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cp__crews .cp__grants-list {
  list-style: none;
}
.cp__crew {
  width: 100%;
  align-items: center;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  transition: border-color 0.15s;
}
.cp__crew:hover {
  border-color: var(--info);
}
.cp__crew-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 0.15rem;
  align-self: flex-start;
}
.cp__crew-status {
  flex-shrink: 0;
  align-self: flex-start;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 12%, transparent);
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
}
.cp__crew-status:not([data-active]) {
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 12%, transparent);
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
