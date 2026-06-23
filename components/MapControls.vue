<template>
  <div>
    <!-- Main controls container - Mobile optimized -->
    <div :class="`absolute ${isMobile ? 'top-[clamp(5.5rem,12vh,7.5rem)] right-[max(0.5rem,env(safe-area-inset-right))]' : 'top-20 right-4'} z-[700] flex flex-col gap-1.5 xs:gap-2 map-tool-stack`">
      <!-- Search Button -->
      <UiTooltip :side="isMobile ? 'right' : 'left'">
        <template #trigger>
<UiButton
            variant="ghost"
            size="icon"
            class="map-tool-button relative"
            @click="toggleSearch"
            :aria-label="t('mapControls.search')"
          >
            <iconify-icon icon="lucide:search" class="h-4 w-4 xs:h-5 xs:w-5" />
            <span v-if="recentSearches.length > 0" class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full" />
          </UiButton>
        </template>
        <p>{{ dataset === 'project-grants' ? t('mapControls.searchProjects') : dataset === 'observatory-of-vulcan' ? 'Search cities' : t('mapControls.searchSpecies') }} <span class="text-gray-500 ml-1">{{ t('mapControls.keyboardShortcut') }}</span></p>
      </UiTooltip>

      <!-- Filter Panel Toggle -->
      <UiTooltip v-if="!isGlobeView" :side="isMobile ? 'right' : 'left'">
        <template #trigger>
          <UiButton
            variant="ghost"
            size="icon"
            :class="`map-tool-button ${filterOpen ? 'map-tool-button-active' : ''}`"
            @click="toggleFilterPanel"
            :aria-label="filterOpen ? t('mapControls.hideFilters') : t('mapControls.showFilters')"
          >
            <iconify-icon icon="lucide:sliders-horizontal" class="h-4 w-4 xs:h-5 xs:w-5" />
          </UiButton>
        </template>
        <p>{{ filterOpen ? t('mapControls.hideFilters') : t('mapControls.showFilters') }}</p>
      </UiTooltip>

      <!-- Connections / Particles Toggle -->
      <UiTooltip :side="isMobile ? 'right' : 'left'">
        <template #trigger>
          <UiButton
            variant="outline"
            size="icon"
            :class="`map-tool-button ${showConnections ? 'map-tool-button-active' : 'map-tool-button-muted'}`"
            @click="emit('toggle-connections')"
            :aria-label="showConnections ? t('mapControls.hideConnections') : t('mapControls.showConnections')"
          >
            <iconify-icon :icon="showConnections ? 'lucide:route' : 'lucide:unlink-2'" class="h-4 w-4 xs:h-5 xs:w-5" />
          </UiButton>
        </template>
        <p>{{ showConnections ? t('mapControls.hideConnections') : t('mapControls.showConnections') }}</p>
      </UiTooltip>

      <!-- Hex Grid Toggle -->
      <UiTooltip :side="isMobile ? 'right' : 'left'">
        <template #trigger>
          <UiButton
            variant="outline"
            size="icon"
            class="map-tool-button"
            @click="emit('toggle-hex-grid')"
            :aria-label="showHexGrid ? t('mapControls.hideHexGrid') : t('mapControls.showHexGrid')"
          >
            <iconify-icon v-if="showHexGrid" icon="lucide:grid-3x3" class="h-4 w-4 xs:h-5 xs:w-5" />
            <iconify-icon v-else icon="lucide:layers" class="h-4 w-4 xs:h-5 xs:w-5" />
          </UiButton>
        </template>
        <p>{{ showHexGrid ? t('mapControls.hideHexGrid') : t('mapControls.showHexGrid') }}</p>
      </UiTooltip>

      <!-- Fullscreen Toggle -->
      <UiTooltip :side="isMobile ? 'right' : 'left'">
        <template #trigger>
          <UiButton
            variant="outline"
            size="icon"
            class="map-tool-button"
            @click="toggleFullscreen"
            :aria-label="fullscreen ? t('mapControls.exitFullscreen') : t('mapControls.enterFullscreen')"
          >
            <iconify-icon v-if="fullscreen" icon="lucide:minimize-2" class="h-4 w-4 xs:h-5 xs:w-5" />
            <iconify-icon v-else icon="lucide:maximize-2" class="h-4 w-4 xs:h-5 xs:w-5" />
          </UiButton>
        </template>
        <p>{{ fullscreen ? t('mapControls.exitFullscreen') : t('mapControls.enterFullscreen') }}</p>
      </UiTooltip>
    </div>

    <!-- Search Panel with Transition -->
    <Transition name="search-panel">
      <div 
        v-if="showSearch" 
        :class="`absolute ${isMobile ? 'top-[clamp(5.5rem,12vh,7.5rem)] left-[max(0.5rem,env(safe-area-inset-left))] right-[max(0.5rem,env(safe-area-inset-right))] max-w-full max-h-[calc(100svh-10rem)]' : 'top-20 right-16 w-[min(20rem,calc(100vw-5rem))] max-h-[calc(100svh-8rem)]'} z-[700] panel-cyber p-2.5 xs:p-3 overflow-hidden`"
        role="dialog"
        :aria-label="t('mapControls.search')"
      >
        <div class="flex justify-between items-center mb-2 xs:mb-3">
          <h3 class="text-xs xs:text-sm font-bold text-[var(--tool-btn-text)] flex items-center gap-1.5 xs:gap-2">
            <iconify-icon icon="lucide:search" class="h-3.5 w-3.5 xs:h-4 xs:w-4" />
            {{ dataset === 'project-grants' ? t('mapControls.searchProjects') : dataset === 'observatory-of-vulcan' ? 'Search cities' : t('mapControls.searchSpecies') }}
          </h3>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-[var(--text-muted)] hidden sm:inline">ESC</span>
            <UiButton variant="ghost" size="icon" class="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--text-primary)]" @click="closeSearch" :aria-label="t('general.close')">
              <iconify-icon icon="lucide:x" class="h-4 w-4" />
            </UiButton>
          </div>
        </div>

        <div class="flex gap-2 mb-3">
          <div class="relative flex-1">
            <UiInput
              ref="searchInputRef"
              type="text"
              :placeholder="dataset === 'project-grants' ? t('mapControls.searchPlaceholder') : dataset === 'observatory-of-vulcan' ? 'Search Brazilian cities...' : t('mapControls.searchSpeciesPlaceholder')"
              v-model="searchQuery"
              class="pr-8"
              :style="{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }"
              @keydown="handleSearchKeydown"
              :aria-label="t('mapControls.search')"
            />
            <iconify-icon v-if="!searchQuery" icon="lucide:search" class="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <button 
              v-else 
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5"
              @click="clearSearch"
              :aria-label="t('general.close')"
            >
              <iconify-icon icon="lucide:x-circle" class="h-4 w-4" />
            </button>
          </div>
          <UiButton
            variant="outline"
            size="icon"
            :class="`h-9 w-9 border-[var(--panel-border)] transition-all duration-200 ${showAllItems ? 'bg-[var(--tool-btn-active-bg)] text-[var(--tool-btn-active-text)] shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'text-[var(--tool-btn-text)]'} hover:bg-[var(--tool-btn-active-bg)] hover:text-[var(--tool-btn-active-text)]`"
            :title="t('mapControls.showAll')"
            @click="toggleAllItems"
            :aria-label="t('mapControls.showAll')"
          >
            <iconify-icon icon="lucide:list" class="h-4 w-4" />
          </UiButton>
        </div>

        <!-- Recent Searches -->
        <div v-if="recentSearches.length > 0 && !searchQuery && !showAllItems" class="mb-3">
          <p class="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">{{ t('mapControls.recent') }}</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="recent in recentSearches.slice(0, 3)"
              :key="recent"
              class="text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 bg-[var(--input-bg)] text-[var(--text-muted)] hover:bg-[var(--search-result-hover-bg)] hover:text-[var(--search-result-text)]"
              @click="applyRecentSearch(recent)"
            >
              <iconify-icon icon="lucide:clock" class="h-3 w-3" />
              {{ recent }}
            </button>
          </div>
        </div>

        <!-- Keyboard navigation hint -->
        <div v-if="searchResults.length > 0" class="mb-2 text-[10px] text-[var(--text-muted)] flex items-center gap-2">
          <span class="flex items-center gap-1">
            <kbd class="px-1 py-0.5 rounded text-[9px]" style="background: var(--input-bg); color: var(--input-text);">Up</kbd>
            <kbd class="px-1 py-0.5 rounded text-[9px]" style="background: var(--input-bg); color: var(--input-text);">Down</kbd>
            {{ t('mapControls.clickToNavigate') }}
          </span>
        </div>

        <!-- Results List -->
        <div 
          ref="resultsContainerRef"
          :class="`space-y-0.5 ${isMobile ? 'max-h-[42vh]' : 'max-h-[280px]'} overflow-y-auto cyber-scrollbar pr-1`"
          role="listbox"
          :aria-label="t('mapControls.searchResults')"
        >
          <template v-if="searchResults.length > 0">
            <div
              v-for="(result, index) in searchResults"
              :key="`search-result-${index}`"
              :ref="(el: any) => { if (index === selectedIndex) selectedResultEl = el as Element | null }"
              :class="`group flex items-start p-2 rounded cursor-pointer transition-all duration-150 ${index === selectedIndex ? 'ring-1' : ''}`"
              :style="{
                background: index === selectedIndex ? 'var(--search-result-selected-bg)' : '',
                boxShadow: index === selectedIndex ? '0 0 0 1px var(--search-result-selected-text)' : ''
              }"
              @click="navigateToLocation(getResultLat(result), getResultLng(result), getResultTitle(result))"
              @mouseenter="selectedIndex = index"
              role="option"
              :aria-selected="index === selectedIndex"
            >
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium truncate transition-colors text-[var(--search-result-text)] group-hover:text-[var(--search-result-selected-text)]">
                  {{ getResultTitle(result) }}
                </h4>
                <div class="flex justify-between items-center">
                  <p class="text-xs text-[var(--text-muted)] flex items-center">
                    <iconify-icon icon="lucide:map-pin" class="h-3 w-3 inline mr-1 flex-shrink-0" />
                    {{ getResultLocation(result) }}
                  </p>
                  <p v-if="getProjectBeneficiaries(result)" class="text-xs text-[var(--text-muted)]">
                    {{ getProjectBeneficiaries(result)?.toLocaleString() }}
                  </p>
                  <p v-else-if="getSpeciesGroup(result)" class="text-xs text-[var(--text-muted)]">
                    {{ getSpeciesGroup(result) }}
                  </p>
                  <p v-else-if="getCityPopulation(result)" class="text-xs text-[var(--text-muted)]">
                    {{ getCityPopulation(result)?.toLocaleString() }} hab.
                  </p>
                </div>
              </div>
              <iconify-icon class="h-4 w-4 transition-all duration-150 flex-shrink-0 mt-1 text-[var(--search-result-text)] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" icon="lucide:arrow-right" />
            </div>
          </template>
          <template v-else>
            <div v-if="searchQuery.length > 0" class="flex flex-col items-center justify-center py-6 text-center">
              <iconify-icon icon="lucide:search-x" class="h-8 w-8 mb-2" style="color: var(--text-muted);" />
              <p class="text-sm" style="color: var(--text-secondary);">{{ t('mapControls.noResults') }} "{{ searchQuery }}"</p>
              <p class="text-xs mt-1" style="color: var(--text-muted);">{{ t('mapControls.tryDifferent') }}</p>
            </div>
            <div v-else-if="!showAllItems" class="flex flex-col space-y-3 items-center justify-center py-6">
              <div class="relative">
                <iconify-icon icon="lucide:search" class="h-10 w-10" style="color: var(--panel-border);" />
                <iconify-icon icon="lucide:sparkles" class="h-4 w-4 text-white/30 absolute -top-1 -right-1" />
              </div>
              <p class="text-xs text-center" style="color: var(--text-secondary);">{{ t('mapControls.clickToNavigate') }}<br />{{ t('mapControls.browseAll') }}</p>
              <UiButton variant="outline" size="sm" class="mt-1 text-xs border-[var(--panel-border)] text-[var(--tool-btn-text)] hover:bg-[var(--tool-btn-active-bg)] hover:text-[var(--tool-btn-active-text)] transition-all" @click="toggleAllItems">
                <iconify-icon icon="lucide:list" class="h-3 w-3 mr-1" />
                {{ t('mapControls.showAll') }}
              </UiButton>
            </div>
            <div v-else class="flex items-center justify-center py-4">
              <div class="flex gap-1">
                <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-1" />
                <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-2" />
                <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-3" />
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="mt-3 pt-2 border-t flex justify-between items-center" style="border-color: var(--panel-border);">
          <p class="text-xs" style="color: var(--text-muted);">
            {{ showAllItems ? t('mapControls.allItems') : searchQuery ? t('mapControls.results') : t('mapControls.recent') }}: {{ searchResults.length || recentSearches.length }}
          </p>
          <p v-if="selectedIndex >= 0 && searchResults.length > 0" class="text-xs text-[var(--tool-btn-text)] flex items-center gap-1">
            <iconify-icon icon="lucide:arrow-up-down" class="h-3 w-3" />
            {{ selectedIndex + 1 }} {{ t('mapControls.of') || 'of' }} {{ searchResults.length }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useI18n } from '@/composables/useI18n'
import { allProjectsData } from '@/lib/project-data'
import type { ProjectData } from '@/lib/types'
import type { Species } from '@/lib/map-utils'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { searchCities, BRAZILIAN_CITIES, type BrazilianCity } from '@/lib/brazilian-cities'

interface Props {
  isGlobeView?: boolean
  showHexGrid?: boolean
  showConnections?: boolean
  dataset?: 'project-grants' | 'endangered-species' | 'observatory-of-vulcan'
  projects?: ProjectData[]
  species?: (Species | SpeciesIndexItem)[]
  filterOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isGlobeView: false,
  showHexGrid: true,
  showConnections: true,
  dataset: 'project-grants',
  filterOpen: false,
})

const emit = defineEmits<{
  'toggle-hex-grid': []
  'toggle-connections': []
  'toggle-filter': []
  'search-open-change': [open: boolean]
  'navigate': [lat: number, lng: number]
}>()

const isMobile = useMediaQuery('(max-width: 768px)')
const { t } = useI18n()

const fullscreen = ref(false)
const showSearch = ref(false)
const showAllItems = ref(false)
const searchQuery = ref('')
type SearchResult = ProjectData | Species | BrazilianCity
const searchResults = ref<SearchResult[]>([])
const searchInputRef = ref<{ inputRef?: HTMLInputElement } | null>(null)
const selectedIndex = ref(-1)
const selectedResultEl = ref<Element | null>(null)
const resultsContainerRef = ref<HTMLElement | null>(null)
const recentSearches = ref<string[]>([])

// Load recent searches from localStorage
onMounted(() => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('eg-maps-recent-searches')
      if (saved) {
        recentSearches.value = JSON.parse(saved)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error loading recent searches:', e)
    }
    window.addEventListener('keydown', handleKeyboardShortcut)
  }
})

function saveRecentSearch(query: string) {
  if (!query || query.length < 2) return
  try {
    const filtered = recentSearches.value.filter(s => s.toLowerCase() !== query.toLowerCase())
    recentSearches.value = [query, ...filtered].slice(0, 5)
    localStorage.setItem('eg-maps-recent-searches', JSON.stringify(recentSearches.value))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error saving recent search:', e)
  }
}

function applyRecentSearch(query: string) {
  searchQuery.value = query
  showAllItems.value = false
}

function clearSearch() {
  searchQuery.value = ''
  selectedIndex.value = -1
  const input = searchInputRef.value?.inputRef
  input?.focus()
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  emit('search-open-change', showSearch.value)
}

function toggleFilterPanel() {
  if (showSearch.value) {
    closeSearch()
  }
  emit('toggle-filter')
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedIndex.value < searchResults.value.length - 1) {
      selectedIndex.value++
      scrollToSelected()
    } else if (searchResults.value.length > 0) {
      selectedIndex.value = 0
      scrollToSelected()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedIndex.value > 0) {
      selectedIndex.value--
      scrollToSelected()
    } else if (selectedIndex.value === 0) {
      selectedIndex.value = -1
    }
  } else if (e.key === 'Enter' && selectedIndex.value >= 0 && searchResults.value[selectedIndex.value]) {
    e.preventDefault()
    const result = searchResults.value[selectedIndex.value]
    navigateToLocation(
      getResultLat(result),
      getResultLng(result),
      getResultTitle(result)
    )
  }
}

function scrollToSelected() {
  nextTick(() => {
    if (selectedResultEl.value && resultsContainerRef.value) {
      selectedResultEl.value.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
}

// Reset selected index when results change
watch(searchResults, () => {
  selectedIndex.value = searchResults.value.length > 0 ? 0 : -1
})

// Search data based on active dataset
const currentProjects = computed(() => props.projects || allProjectsData)

function isProjectResult(result: SearchResult): result is ProjectData {
  return 'project_title' in result
}

function isSpeciesResult(result: SearchResult): result is Species {
  return 'commonName' in result && 'scientificName' in result
}

function isCityResult(result: SearchResult): result is BrazilianCity {
  return 'state' in result && 'population' in result && !('commonName' in result)
}

function getResultTitle(result: SearchResult): string {
  if (isProjectResult(result)) return result.project_title
  if (isSpeciesResult(result)) return result.commonName
  return result.name
}

function getResultLocation(result: SearchResult): string {
  if (isProjectResult(result)) return result.country_province
  if (isSpeciesResult(result)) return result.region
  return `${result.name}, ${result.state}`
}

function getResultLat(result: SearchResult): number {
  if (isProjectResult(result)) return result.latitude
  if (isSpeciesResult(result)) return result.lat
  return result.lat
}

function getResultLng(result: SearchResult): number {
  if (isProjectResult(result)) return result.longitude
  if (isSpeciesResult(result)) return result.lng
  return result.lng
}

function getProjectBeneficiaries(result: SearchResult): number | null {
  return isProjectResult(result) ? result.indirect_beneficiaries : null
}

function getSpeciesGroup(result: SearchResult): string | null {
  return isSpeciesResult(result) ? result.taxonomicGroup : null
}

function getCityPopulation(result: SearchResult): number | null {
  return isCityResult(result) ? result.population : null
}

// Search logic
watch([searchQuery, showAllItems, () => props.dataset], () => {
  if (props.dataset === 'project-grants') {
    if (searchQuery.value.length > 1) {
      const query = searchQuery.value.toLowerCase().trim()
      searchResults.value = currentProjects.value.filter(project =>
        project.project_title.toLowerCase().includes(query) ||
        (project.country_province || '').toLowerCase().includes(query)
      )
      showAllItems.value = false
    } else if (showAllItems.value) {
      searchResults.value = [...currentProjects.value].sort((a, b) =>
        a.project_title.localeCompare(b.project_title)
      )
    } else {
      searchResults.value = []
    }
  } else if (props.dataset === 'observatory-of-vulcan') {
    // City search
    if (searchQuery.value.length > 1) {
      searchResults.value = searchCities(searchQuery.value)
      showAllItems.value = false
    } else if (showAllItems.value) {
      searchResults.value = [...BRAZILIAN_CITIES].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    } else {
      searchResults.value = []
    }
  } else {
    // Species search
    const speciesList = (props.species || []) as Species[]
    if (searchQuery.value.length > 1) {
      const query = searchQuery.value.toLowerCase().trim()
      searchResults.value = speciesList.filter(species =>
        species.commonName.toLowerCase().includes(query) ||
        species.scientificName.toLowerCase().includes(query) ||
        (species as Species).region?.toLowerCase().includes(query) ||
        species.taxonomicGroup.toLowerCase().includes(query)
      )
      showAllItems.value = false
    } else if (showAllItems.value) {
      searchResults.value = [...speciesList].sort((a, b) =>
        a.commonName.localeCompare(b.commonName)
      )
    } else {
      searchResults.value = []
    }
  }
})

// Focus search input when search panel opens
watch(showSearch, async (val) => {
  if (val) {
    await nextTick()
    const input = searchInputRef.value?.inputRef
    input?.focus()
  }
})

// Keyboard shortcut for search (Ctrl+K or /)
function handleKeyboardShortcut(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable
  if (isTyping && e.key !== 'Escape') return

  if (e.key === '/' && !showSearch.value) {
    e.preventDefault()
    showSearch.value = true
    emit('search-open-change', true)
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = !showSearch.value
    emit('search-open-change', showSearch.value)
  }
  if (e.key === 'Escape' && showSearch.value) {
    closeSearch()
  }
}

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyboardShortcut)
  }
})

function toggleFullscreen() {
  if (typeof document === 'undefined') return

  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
      .then(() => { fullscreen.value = true })
      // eslint-disable-next-line no-console
      .catch((err) => { console.error(`Error attempting to enable fullscreen: ${err.message}`) })
  } else {
    document.exitFullscreen()
      .then(() => { fullscreen.value = false })
      // eslint-disable-next-line no-console
      .catch((err) => { console.error(`Error attempting to exit fullscreen: ${err.message}`) })
  }
}

function navigateToLocation(lat: number, lng: number, name?: string) {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    if (name && searchQuery.value) {
      saveRecentSearch(searchQuery.value)
    }
    emit('navigate', lat, lng)
    closeSearch()
  }
}

function toggleAllItems() {
  showAllItems.value = !showAllItems.value
  if (!showAllItems.value) {
    searchQuery.value = ''
  }
}

function closeSearch() {
  showSearch.value = false
  searchQuery.value = ''
  showAllItems.value = false
  searchResults.value = []
  emit('search-open-change', false)
}
</script>
