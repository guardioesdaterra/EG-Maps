<template>
  <div>
    <!-- Main controls container -->
    <div :class="`absolute ${isMobile ? 'top-20 left-4' : 'top-20 right-4'} z-[500] flex flex-col gap-2`">
      <!-- Search Button -->
      <UiTooltip :side="isMobile ? 'right' : 'left'">
        <template #trigger>
          <UiButton
            variant="outline"
            size="icon"
            class="w-10 h-10 rounded-md bg-black/70 border border-cyan-900/50 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            @click="showSearch = !showSearch"
          >
            <iconify-icon icon="lucide:search" class="h-5 w-5" />
          </UiButton>
        </template>
        <p>Search</p>
      </UiTooltip>

      <!-- Hex Grid Toggle -->
      <UiTooltip :side="isMobile ? 'right' : 'left'">
        <template #trigger>
          <UiButton
            variant="outline"
            size="icon"
            class="w-10 h-10 rounded-md bg-black/70 border border-cyan-900/50 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            @click="emit('toggle-hex-grid')"
          >
            <iconify-icon v-if="showHexGrid" icon="lucide:grid-3x3" class="h-5 w-5" />
            <iconify-icon v-else icon="lucide:layers" class="h-5 w-5" />
          </UiButton>
        </template>
        <p>{{ showHexGrid ? 'Hide Hex Grid' : 'Show Hex Grid' }}</p>
      </UiTooltip>

      <!-- Fullscreen Toggle -->
      <UiTooltip :side="isMobile ? 'right' : 'left'">
        <template #trigger>
          <UiButton
            variant="outline"
            size="icon"
            class="w-10 h-10 rounded-md bg-black/70 border border-cyan-900/50 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            @click="toggleFullscreen"
          >
            <iconify-icon v-if="fullscreen" icon="lucide:minimize-2" class="h-5 w-5" />
            <iconify-icon v-else icon="lucide:maximize-2" class="h-5 w-5" />
          </UiButton>
        </template>
        <p>{{ fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen' }}</p>
      </UiTooltip>
    </div>

    <!-- Search Panel -->
    <div v-if="showSearch" :class="`absolute ${isMobile ? 'top-44 left-4 right-4' : 'top-20 right-16 w-80'} z-[500] bg-black/90 backdrop-blur-md p-4 rounded-md border border-cyan-900/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]`">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-bold text-cyan-400">
          Search {{ dataset === 'project-grants' ? 'Projects' : 'Species' }}
        </h3>
        <UiButton variant="ghost" size="icon" class="h-6 w-6 text-gray-400 hover:text-white" @click="closeSearch">
          <iconify-icon icon="lucide:x" class="h-4 w-4" />
        </UiButton>
      </div>

      <div class="flex gap-2 mb-3">
        <div class="relative flex-1">
          <UiInput
            ref="searchInputRef"
            type="text"
            :placeholder="dataset === 'project-grants' ? 'Search by name or location...' : 'Search by name or region...'"
            v-model="searchQuery"
            class="bg-gray-900/50 border-cyan-900/50 focus:border-cyan-500 text-white pr-9"
          />
          <iconify-icon icon="lucide:search" class="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        <UiButton
          variant="outline"
          size="icon"
          :class="`h-9 w-9 border-cyan-900/50 ${showAllItems ? 'bg-cyan-900/30 text-cyan-300' : 'text-cyan-400 bg-black/70'} hover:bg-cyan-950/30 hover:text-cyan-300`"
          title="Show All"
          @click="toggleAllItems"
        >
          <iconify-icon icon="lucide:list" class="h-4 w-4" />
        </UiButton>
      </div>

      <div class="space-y-0.5 max-h-[300px] overflow-y-auto cyber-scrollbar pr-1">
        <template v-if="searchResults.length > 0">
          <div
            v-for="(result, index) in searchResults"
            :key="`search-result-${index}`"
            class="group flex items-start p-2 hover:bg-cyan-950/20 rounded cursor-pointer transition-colors duration-150"
            @click="navigateToLocation(result.lat || result.latitude, result.lng || result.longitude)"
          >
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-medium text-cyan-400 truncate">
                {{ result.project_title || result.commonName }}
              </h4>
              <div class="flex justify-between">
                <p class="text-xs text-gray-400 flex items-center">
                  <iconify-icon icon="lucide:map-pin" class="h-3 w-3 inline mr-1 flex-shrink-0" />
                  {{ result.country_province || result.region }}
                </p>
                <p v-if="result.indirect_beneficiaries" class="text-xs text-gray-500">
                  {{ result.indirect_beneficiaries.toLocaleString() }} benef.
                </p>
                <p v-else class="text-xs text-gray-500">
                  {{ result.taxonomicGroup }}
                </p>
              </div>
            </div>
            <iconify-icon icon="lucide:arrow-right" class="h-4 w-4 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 mt-1" />
          </div>
        </template>
        <template v-else>
          <div v-if="searchQuery.length > 0" class="text-xs text-gray-400 text-center py-2">No results found</div>
          <div v-else-if="!showAllItems" class="flex flex-col space-y-2 items-center justify-center py-4">
            <iconify-icon icon="lucide:search" class="h-8 w-8 text-cyan-900/50" />
            <p class="text-xs text-gray-400 text-center">Enter search term or click "List" to view all</p>
            <UiButton variant="outline" size="sm" class="mt-2 text-xs border-cyan-900/50 text-cyan-400 hover:bg-cyan-950/30" @click="toggleAllItems">
              <iconify-icon icon="lucide:list" class="h-3 w-3 mr-1" />
              Show All
            </UiButton>
          </div>
          <div v-else class="text-xs text-gray-400 text-center py-2">Loading...</div>
        </template>
      </div>

      <div class="mt-3 pt-2 border-t border-cyan-900/30 flex justify-between items-center">
        <p class="text-xs text-gray-500">{{ showAllItems ? 'All Items' : 'Search Results' }}: {{ searchResults.length }}</p>
        <p v-if="searchResults.length > 0" class="text-xs text-cyan-400">Click to navigate</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { allProjectsData } from '@/lib/project-data'
import type { ProjectData } from '@/lib/types'
import type { Species } from '@/lib/map-utils'

interface Props {
  isGlobeView?: boolean
  showHexGrid?: boolean
  dataset?: 'project-grants' | 'endangered-species'
  projects?: ProjectData[]
  species?: Species[]
}

const props = withDefaults(defineProps<Props>(), {
  isGlobeView: false,
  showHexGrid: true,
  dataset: 'project-grants',
})

const emit = defineEmits<{
  'toggle-hex-grid': []
  'navigate': [lat: number, lng: number]
}>()

const isMobile = useMediaQuery('(max-width: 768px)')

const fullscreen = ref(false)
const showSearch = ref(false)
const showAllItems = ref(false)
const searchQuery = ref('')
const searchResults = ref<Array<ProjectData | Species>>([])
const searchInputRef = ref<HTMLElement | null>(null)

// Search data based on active dataset
const currentProjects = computed(() => props.projects || allProjectsData)

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
  } else {
    // Species search
    const speciesList = (props.species || []) as Species[]
    if (searchQuery.value.length > 1) {
      const query = searchQuery.value.toLowerCase().trim()
      searchResults.value = speciesList.filter(species =>
        species.commonName.toLowerCase().includes(query) ||
        species.scientificName.toLowerCase().includes(query) ||
        species.region.toLowerCase().includes(query) ||
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
    const input = searchInputRef.value?.$el || searchInputRef.value
    if (input && typeof input.focus === 'function') {
      input.focus()
    }
  }
})

// Keyboard shortcut for search (Ctrl+K or /)
function handleKeyboardShortcut(e: KeyboardEvent) {
  if (e.key === '/' && !showSearch.value) {
    e.preventDefault()
    showSearch.value = true
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = !showSearch.value
  }
  if (e.key === 'Escape' && showSearch.value) {
    closeSearch()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyboardShortcut)
  }
})
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
      .catch((err) => { console.error(`Error attempting to enable fullscreen: ${err.message}`) })
  } else {
    document.exitFullscreen()
      .then(() => { fullscreen.value = false })
      .catch((err) => { console.error(`Error attempting to exit fullscreen: ${err.message}`) })
  }
}

function navigateToLocation(lat: number, lng: number) {
  if (lat && lng) {
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
}
</script>
