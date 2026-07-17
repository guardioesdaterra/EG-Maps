/**
 * components/SpeciesFilterPanel.vue
 * @why Sidebar filter panel for endangered species — region, ecosystem, threat, text search
 * @component SpeciesFilterPanel
 * @emits 'filter-change': [filteredSpecies: SpeciesIndexItem[]]
  'group-selection-change': [groups: string[]]
  'close': []
 * @deps vue (ref, reactive, computed, watch); @/composables/useMediaQuery (useMediaQuery); @/composables/useI18n (useI18n)
 */
<template>
  <div
    :class="`fixed ${isMobile ? 'top-[clamp(5.5rem,12vh,7.5rem)] left-[max(0.5rem,env(safe-area-inset-left))] right-[max(0.5rem,env(safe-area-inset-right))] max-w-full' : 'top-20 right-16 w-[min(21.25rem,calc(100vw-5rem))]'} panel-cyber map-filter-panel rounded-lg p-2.5 xs:p-3 species-filter-panel transition-all duration-300`"
    :style="{ zIndex: '10001' }"
  >
    
    <div class="flex justify-between items-center mb-3">
      <div class="flex items-center gap-2">
        <iconify-icon icon="lucide:filter" class="h-4 w-4 text-cyan-400" />
        <h2 class="text-xs font-heading font-bold text-[var(--text-primary)] tracking-wider uppercase">
          {{ t('filter.filterSpecies') }}
        </h2>
        <span v-if="hasActiveFilters" class="px-1.5 py-0.5 rounded text-[clamp(10px,1.5vw,13px)] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          {{ activeFilterCount }}
        </span>
      </div>
      <UiButton
        v-if="hasActiveFilters"
        variant="ghost"
        size="sm"
        class="h-6 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded text-xs gap-1"
        @click="resetFilters"
      >
        <iconify-icon icon="lucide:x" class="h-3 w-3" />
        <span>{{ t('filter.reset') }}</span>
      </UiButton>
    </div>

    <div :class="isMobile ? 'max-h-[calc(100svh-11rem)] overflow-y-auto overflow-x-hidden pr-1 space-y-2' : 'max-h-[calc(100svh-9rem)] overflow-y-auto pr-1'">
    
    <div :class="isMobile ? 'mb-2' : 'mb-3'">
      <div class="relative">
        <iconify-icon icon="lucide:search" class="absolute left-2.5 top-2 h-4 w-4 text-white/50 pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('filter.searchPlaceholder')"
          class="filter-search w-full pl-8 pr-8 py-1.5 bg-black/50 border border-cyan-900/50 rounded text-sm text-white placeholder-white/50 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          :aria-label="t('filter.searchPlaceholder')"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-2.5 top-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-gray-700/50 text-white/70 hover:text-white hover:bg-gray-600/50 transition-colors"
        >
          <iconify-icon icon="lucide:x" class="h-3 w-3" />
        </button>
      </div>
    </div>

    
    <div :class="isMobile ? 'mb-2 flex flex-wrap gap-1' : 'mb-3 flex flex-wrap gap-1.5'" v-if="taxonomicGroups.length > 0">
      <button
        v-for="(group, index) in taxonomicGroups.slice(0, 4)"
        :key="group"
        @click="toggleTaxonomicGroup(group)"
        :class="`px-2 py-1 rounded text-[clamp(10px,1.5vw,13px)] font-medium transition-all duration-200 whitespace-nowrap ${
          selectedTaxonomicGroups.includes(group)
            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
            : 'bg-black/30 text-gray-400 border border-gray-700/50 hover:border-cyan-700/50 hover:text-cyan-400'
        }`"
        :style="{ animationDelay: `${index * 50}ms` }"
      >
        {{ groupLabel(group) }}
      </button>
      <button
        v-if="taxonomicGroups.length > 4"
        @click="showAllGroups = !showAllGroups"
        class="px-2 py-1 rounded text-[clamp(10px,1.5vw,13px)] font-medium bg-black/30 text-gray-500 border border-gray-700/50 hover:text-gray-300 transition-colors whitespace-nowrap"
      >
        {{ t('filter.moreGroups', { count: taxonomicGroups.length - 4 }) }}
      </button>
    </div>

    
    <div v-if="showAllGroups && taxonomicGroups.length > 4" :class="isMobile ? 'mb-2 flex flex-wrap gap-1 animate-fade-in' : 'mb-3 flex flex-wrap gap-1.5 animate-fade-in'">
      <button
        v-for="group in taxonomicGroups.slice(4)"
        :key="group"
        @click="toggleTaxonomicGroup(group)"
        :class="`px-2 py-1 rounded text-[clamp(10px,1.5vw,13px)] font-medium transition-all duration-200 whitespace-nowrap ${
          selectedTaxonomicGroups.includes(group)
            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
            : 'bg-black/30 text-gray-400 border border-gray-700/50 hover:border-cyan-700/50 hover:text-cyan-400'
        }`"
      >
        {{ groupLabel(group) }}
      </button>
    </div>

    
    <div :class="isMobile ? 'filter-group mb-2' : 'filter-group mb-2.5'">
      <button
        @click="taxonomicGroupCollapsed = !taxonomicGroupCollapsed"
        class="flex items-center gap-1.5 w-full text-left mb-1"
      >
        <iconify-icon
          :icon="taxonomicGroupCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'"
          class="h-4 w-4 text-white/70 transition-transform"
        />
        <span class="text-[clamp(10px,1.5vw,13px)] font-heading font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {{ t('filter.taxonomicGroup') }}
        </span>
        <span v-if="selectedTaxonomicGroups.length" class="ml-auto px-1.5 py-0.5 rounded text-[clamp(10px,1.5vw,13px)] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          {{ selectedTaxonomicGroups.length }}
        </span>
      </button>
      <div v-if="!taxonomicGroupCollapsed" class="animate-fade-in">
        <select
          value=""
          @change="handleTaxonomicSelect"
          class="filter-select w-full px-2.5 py-1.5 bg-black/50 border border-cyan-900/50 rounded text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
          :aria-label="t('filter.taxonomicGroup')"
        >
          <option value="">{{ selectedTaxonomicGroups.length ? t('filter.addGroup') : t('filter.allGroups') }}</option>
          <option v-for="group in taxonomicGroups" :key="group" :value="group">
            {{ selectedTaxonomicGroups.includes(group) ? t('filter.removeGroup', { group: groupLabel(group) }) : groupLabel(group) }}
          </option>
        </select>
        <div v-if="selectedTaxonomicGroups.length" :class="isMobile ? 'mt-1.5 flex flex-wrap gap-1' : 'mt-1.5 flex flex-wrap gap-1.5'">
          <button
            v-for="group in selectedTaxonomicGroups"
            :key="`selected-${group}`"
            class="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/15 px-1.5 py-0.5 text-[clamp(10px,1.5vw,13px)] text-cyan-300 whitespace-nowrap"
            @click="toggleTaxonomicGroup(group)"
          >
            {{ groupLabel(group) }}
            <iconify-icon icon="lucide:x" class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>

    
    <div v-if="regions.length > 0" :class="isMobile ? 'filter-group mb-2' : 'filter-group mb-2.5'">
      <label class="filter-label block text-[clamp(10px,1.5vw,13px)] font-heading font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        {{ t('filter.region') }}
      </label>
      <select
        v-model="filters.region"
        class="filter-select w-full px-2.5 py-1.5 bg-black/50 border border-cyan-900/50 rounded text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
        :aria-label="t('filter.region')"
      >
        <option value="">{{ t('filter.allRegions') }}</option>
        <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
      </select>
    </div>

    
    <div v-if="ecosystems.length > 0" :class="isMobile ? 'filter-group mb-2' : 'filter-group mb-2.5'">
      <label class="filter-label block text-[clamp(10px,1.5vw,13px)] font-heading font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        {{ t('filter.ecosystem') }}
      </label>
      <select
        v-model="filters.ecosystem"
        class="filter-select w-full px-2.5 py-1.5 bg-black/50 border border-cyan-900/50 rounded text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
        :aria-label="t('filter.ecosystem')"
      >
        <option value="">{{ t('filter.allEcosystems') }}</option>
        <option v-for="ecosystem in ecosystems" :key="ecosystem" :value="ecosystem">{{ ecosystem }}</option>
      </select>
    </div>

    
    <div :class="isMobile ? 'filter-group mb-2' : 'filter-group mb-3'">
      <label class="filter-label block text-[clamp(10px,1.5vw,13px)] font-heading font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        {{ t('filter.threatType') }}
      </label>
      <select
        v-model="filters.threatType"
        class="filter-select w-full px-2.5 py-1.5 bg-black/50 border border-cyan-900/50 rounded text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
        :aria-label="t('filter.threatType')"
      >
        <option value="">{{ t('filter.allThreats') }}</option>
        <option v-for="threat in threatTypes" :key="threat" :value="threat">{{ threat }}</option>
      </select>
    </div>

    
    <div class="filter-count pt-2 border-t border-cyan-900/30">
      <div class="flex items-center justify-between mb-1.5">
        <p class="text-[clamp(10px,1.5vw,13px)] font-heading font-semibold text-[var(--text-secondary)] tracking-wider" aria-live="polite" aria-atomic="true">
          {{ t('filter.showing', { count: filteredCount, total: totalCount }) }}
        </p>
        <span class="text-[clamp(10px,1.5vw,13px)] font-medium text-cyan-400">
          {{ filteredPercent }}%
        </span>
      </div>
      
      <div class="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          class="h-full bg-[var(--text-primary)] transition-all duration-300 ease-out"
          :style="{ width: `${filteredPercent}%` }"
        />
      </div>
    </div>
    </div>

    
    <div :class="isMobile ? 'mt-2' : 'mt-3'">
      <button
        class="w-full py-2 rounded text-xs font-medium transition-all duration-200 border border-cyan-900/50 text-gray-400 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10 flex items-center justify-center gap-1.5"
        @click="emit('close')"
      >
        <iconify-icon icon="lucide:x" class="h-3.5 w-3.5" />
        {{ t('filter.close') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, reactive, computed, watch } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useI18n } from '@/composables/useI18n'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'

interface Props {
  species?: SpeciesIndexItem[]
}

const props = withDefaults(defineProps<Props>(), {
  species: () => [],
})

const emit = defineEmits<{
  'filter-change': [filteredSpecies: SpeciesIndexItem[]]
  'group-selection-change': [groups: string[]]
  'close': []
}>()

const isMobile = useMediaQuery('(max-width: 768px)')

const { t } = useI18n()

const filters = reactive({
  region: '',
  ecosystem: '',
  threatType: '',
})

const searchQuery = ref('')
const showAllGroups = ref(false)
const taxonomicGroupCollapsed = ref(true)
const selectedTaxonomicGroups = ref<string[]>([])
const filterOptions = computed(() => {
  const groups = new Set<string>()
  const regionSet = new Set<string>()
  const ecosystemSet = new Set<string>()
  const threatsSet = new Set<string>()
  for (const s of props.species) {
    groups.add(s.taxonomicGroup)
    if (s.region) regionSet.add(s.region)
    if (s.ecosystem) ecosystemSet.add(s.ecosystem)
    if (s.threatTypes) {
      for (const t of s.threatTypes) threatsSet.add(t)
    }
  }
  return {
    taxonomicGroups: [...groups].sort(),
    regions: [...regionSet].sort(),
    ecosystems: [...ecosystemSet].sort(),
    threatTypes: [...threatsSet].sort(),
  }
})

const taxonomicGroups = computed(() => filterOptions.value.taxonomicGroups)
const regions = computed(() => filterOptions.value.regions)
const ecosystems = computed(() => filterOptions.value.ecosystems)
const threatTypes = computed(() => filterOptions.value.threatTypes)

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedTaxonomicGroups.value.length) count++
  if (filters.region) count++
  if (filters.ecosystem) count++
  if (filters.threatType) count++
  if (searchQuery.value) count++
  return count
})

const hasActiveFilters = computed(() => activeFilterCount.value > 0)

function groupLabel(group: string) {
  return t(`taxonomy.${group}`)
}

function toggleTaxonomicGroup(group: string) {
  if (selectedTaxonomicGroups.value.includes(group)) {
    selectedTaxonomicGroups.value = selectedTaxonomicGroups.value.filter(g => g !== group)
  } else {
    selectedTaxonomicGroups.value = [...selectedTaxonomicGroups.value, group]
  }
}

function handleTaxonomicSelect(event: Event) {
  const group = (event.target as HTMLSelectElement).value
  if (!group) return
  toggleTaxonomicGroup(group)
  ;(event.target as HTMLSelectElement).value = ''
}

const groupLabels = computed(() => {
  const map: Record<string, string> = {}
  for (const s of props.species) {
    if (!map[s.taxonomicGroup]) {
      map[s.taxonomicGroup] = groupLabel(s.taxonomicGroup).toLowerCase()
    }
  }
  return map
})

const filteredSpecies = computed(() => {
  const groupFilter = selectedTaxonomicGroups.value
  const regionFilter = filters.region
  const ecosystemFilter = filters.ecosystem
  const threatFilter = filters.threatType
  const query = searchQuery.value ? searchQuery.value.toLowerCase().trim() : ''
  const labels = groupLabels.value
  const hasGroupFilter = groupFilter.length > 0

  return props.species.filter(s => {
    if (hasGroupFilter && !groupFilter.includes(s.taxonomicGroup)) return false
    if (regionFilter && s.region !== regionFilter) return false
    if (ecosystemFilter && s.ecosystem !== ecosystemFilter) return false
    if (threatFilter && !s.threatTypes?.includes(threatFilter)) return false
    if (query) {
      if (!s.commonName.toLowerCase().includes(query) &&
          !s.scientificName.toLowerCase().includes(query) &&
          !(s.region && s.region.toLowerCase().includes(query)) &&
          !s.taxonomicGroup.toLowerCase().includes(query) &&
          !(labels[s.taxonomicGroup] && labels[s.taxonomicGroup].includes(query)) &&
          !(s.ecosystem && s.ecosystem.toLowerCase().includes(query))) return false
    }
    return true
  })
})

const filteredCount = computed(() => filteredSpecies.value.length)
const totalCount = computed(() => props.species.length)
const filteredPercent = computed(() => totalCount.value ? Math.round((filteredCount.value / totalCount.value) * 100) : 0)

watch(filteredSpecies, (newFiltered) => {
  emit('filter-change', newFiltered)
}, { immediate: true })

watch(selectedTaxonomicGroups, (groups) => {
  emit('group-selection-change', groups)
}, { immediate: true })

function resetFilters() {
  selectedTaxonomicGroups.value = []
  filters.region = ''
  filters.ecosystem = ''
  filters.threatType = ''
  searchQuery.value = ''
  showAllGroups.value = false
}

defineExpose({
  toggleTaxonomicGroup,
  resetFilters,
})

</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-search::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.filter-search:focus {
  border-color: #06b6d4;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
}

.filter-select option {
  background: #111111;
  color: #e5e5e5;
}

.filter-select:focus {
  border-color: #06b6d4;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
}

.species-filter-panel {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.species-filter-panel::-webkit-scrollbar {
  width: 3px;
}

.species-filter-panel::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 3px;
}
</style>
