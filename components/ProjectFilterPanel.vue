<template>
  <div
    :class="`fixed ${isMobile ? 'top-[clamp(5.5rem,12vh,7.5rem)] left-[max(0.5rem,env(safe-area-inset-left))] right-[max(0.5rem,env(safe-area-inset-right))] max-w-full' : 'top-20 right-[calc(1rem+3.5rem)] w-[min(21.25rem,calc(100vw-5rem))]'} panel-cyber map-filter-panel rounded-lg p-2.5 xs:p-3 project-filter-panel transition-all duration-300`"
    :style="{ zIndex: '10001' }"
  >
    <!-- Header -->
    <div class="flex justify-between items-center mb-3">
      <div class="flex items-center gap-2">
        <iconify-icon icon="lucide:filter" class="h-4 w-4 text-cyan-400" />
        <h2 class="text-xs font-heading font-bold text-[var(--text-primary)] tracking-wider uppercase">
          {{ t('filter.filterProjects') }}
        </h2>
        <span v-if="hasActiveFilters" class="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          {{ activeFilterCount }}
        </span>
      </div>
      <div class="flex items-center gap-1">
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
        <UiButton
          variant="ghost"
          size="icon"
          class="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--search-result-hover-bg)] rounded"
          @click="closePanel"
          :title="t('filter.close')"
        >
          <iconify-icon icon="lucide:x" class="h-4 w-4" />
        </UiButton>
      </div>
    </div>

    <div :class="isMobile ? 'max-h-[calc(100svh-13rem)] overflow-y-auto pr-1' : ''">
    <!-- Search Input -->
    <div class="mb-3">
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

    <!-- Country Filter -->
    <div class="filter-group mb-2.5">
      <label class="filter-label block text-[10px] font-heading font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        {{ t('filter.country') }}
      </label>
      <select
        v-model="filters.country"
        class="filter-select w-full px-2.5 py-1.5 bg-black/50 border border-cyan-900/50 rounded text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
        :aria-label="t('filter.country')"
      >
        <option value="">{{ t('filter.allCountries') }}</option>
        <option v-for="country in uniqueCountries" :key="country" :value="country">{{ country }}</option>
      </select>
    </div>

    <!-- Beneficiary Range Filter -->
    <div class="filter-group mb-3">
      <label class="filter-label block text-[10px] font-heading font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        {{ t('filter.beneficiaryRange') }}
      </label>
      <select
        v-model="filters.beneficiaryRange"
        class="filter-select w-full px-2.5 py-1.5 bg-black/50 border border-cyan-900/50 rounded text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
        :aria-label="t('filter.beneficiaryRange')"
      >
        <option value="">{{ t('filter.allRanges') }}</option>
        <option value="under1000">{{ t('filter.under1000') }}</option>
        <option value="1000-10000">{{ t('filter.range1000to10000') }}</option>
        <option value="10000-50000">{{ t('filter.range10000to50000') }}</option>
        <option value="over50000">{{ t('filter.over50000') }}</option>
      </select>
    </div>

    <!-- Filter Count with progress bar -->
    <div class="filter-count pt-2 border-t border-cyan-900/30">
      <div class="flex items-center justify-between mb-1.5">
        <p class="text-[10px] font-heading font-semibold text-[var(--text-secondary)] tracking-wider" aria-live="polite" aria-atomic="true">
          {{ t('filter.showingProjects', { count: filteredCount, total: totalCount }) }}
        </p>
        <span class="text-[10px] font-medium text-cyan-400">
          {{ filteredPercent }}%
        </span>
      </div>
      <!-- Progress bar -->
      <div class="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          class="h-full bg-[var(--text-primary)] transition-all duration-300 ease-out"
          :style="{ width: `${filteredPercent}%` }"
        />
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useI18n } from '@/composables/useI18n'
import type { ProjectData } from '@/lib/types'

interface Props {
  projects: ProjectData[]
}

const props = withDefaults(defineProps<Props>(), {
  projects: () => [],
})

const emit = defineEmits<{
  'filter-change': [filteredProjects: ProjectData[]]
  'close': []
}>()

const isMobile = useMediaQuery('(max-width: 768px)')
const { t } = useI18n()

function closePanel() {
  emit('close')
}

// Filter state
const filters = reactive({
  country: '',
  beneficiaryRange: '',
})

const searchQuery = ref('')

// Extract unique countries from projects data
const uniqueCountries = computed(() => {
  const countries = new Set<string>()
  props.projects.forEach(p => {
    if (p.country_province) {
      // Extract just the country part (after comma if present)
      const country = p.country_province.includes(',')
        ? p.country_province.split(',').pop()?.trim() || p.country_province
        : p.country_province
      countries.add(country)
    }
  })
  return [...countries].sort()
})

// Count active filters
const activeFilterCount = computed(() => {
  let count = 0
  if (filters.country) count++
  if (filters.beneficiaryRange) count++
  if (searchQuery.value) count++
  return count
})

// Check if any filters are active
const hasActiveFilters = computed(() => activeFilterCount.value > 0)

// Check if project matches beneficiary range
function matchesBeneficiaryRange(project: ProjectData): boolean {
  const total = project.direct_beneficiaries + project.indirect_beneficiaries

  switch (filters.beneficiaryRange) {
    case 'under1000':
      return total < 1000
    case '1000-10000':
      return total >= 1000 && total < 10000
    case '10000-50000':
      return total >= 10000 && total < 50000
    case 'over50000':
      return total >= 50000
    default:
      return true
  }
}

// Apply filters to projects
const filteredProjects = computed(() => {
  let result = props.projects

  if (filters.country) {
    result = result.filter(p => {
      if (!p.country_province) return false
      const countryPart = p.country_province.includes(',')
        ? p.country_province.split(',').pop()?.trim()
        : p.country_province
      return countryPart === filters.country
    })
  }

  if (filters.beneficiaryRange) {
    result = result.filter(matchesBeneficiaryRange)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(p =>
      p.project_title.toLowerCase().includes(query) ||
      p.country_province?.toLowerCase().includes(query)
    )
  }

  return result
})

const filteredCount = computed(() => filteredProjects.value.length)
const totalCount = computed(() => props.projects.length)
const filteredPercent = computed(() => totalCount.value ? Math.round((filteredCount.value / totalCount.value) * 100) : 0)

// Emit filtered projects when filters change
watch(filteredProjects, (newFiltered) => {
  emit('filter-change', newFiltered)
}, { immediate: true })

// Reset all filters
function resetFilters() {
  filters.country = ''
  filters.beneficiaryRange = ''
  searchQuery.value = ''
}
</script>

<style scoped>
.project-filter-panel {
  background: #000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.project-filter-panel::-webkit-scrollbar {
  width: 3px;
}

.project-filter-panel::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 3px;
}
</style>
