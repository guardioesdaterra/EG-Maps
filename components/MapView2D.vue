<template>
  <div class="w-full h-[100svh] relative overflow-hidden bg-black" role="main" aria-label="Interactive Map Visualization">
    <!-- Full-screen loading overlay (only during map init) -->
    <Transition name="fade">
      <div v-if="isLoading" class="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
        <div class="relative mb-5 xs:mb-6">
          <div class="w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <div class="absolute inset-0 w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/10 border-b-white/50 animate-spin" style="animation-delay: 0.5s; animation-direction: reverse" />
        </div>
        <p class="text-white font-medium mb-1.5 xs:mb-2 text-sm xs:text-base">{{ t('general.loading') }}</p>
        <p class="text-gray-500 text-xs xs:text-sm">{{ t('globe.preparingData', { dataset: activeDataset === 'project-grants' ? t('home.projectGrants').toLowerCase() : activeDataset === 'endangered-species' ? t('home.species').toLowerCase() : t('home.observatoryOfVulcan').toLowerCase() }) }}</p>
        <div class="mt-3 xs:mt-4 flex gap-1">
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-1" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-2" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-3" />
        </div>
      </div>
    </Transition>

    <!-- Non-blocking data loading indicator (shows on top of rendered map) -->
    <Transition name="fade">
      <div v-if="showDataLoading" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-[99] flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-cyan-800/40 pointer-events-none">
        <div class="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span class="text-xs text-cyan-300 font-medium whitespace-nowrap">{{ dataStatusText }}</span>
      </div>
    </Transition>

    <div class="absolute inset-0 bg-black/5 dark:bg-white/5 pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }" />
    <div class="absolute inset-0 pointer-events-none opacity-[0.03]" :style="{ zIndex: 'calc(var(--z-map-effects) + 1)', backgroundImage: `image-set(url(${baseURL}grid-overlay.png) 1x, url(${baseURL}grid-overlay.png) 2x)`, backgroundRepeat: 'repeat' }" />
    <div class="absolute inset-0 pointer-events-none opacity-[0.02] animate-noise-bg" :style="{ zIndex: 'calc(var(--z-map-effects) + 2)', backgroundImage: `image-set(url(${baseURL}noise.png) 1x, url(${baseURL}noise.png) 2x)`, backgroundRepeat: 'repeat' }" />
    <div aria-hidden="true" class="absolute inset-0 pointer-events-none opacity-[0.015]" :style="{ zIndex: 'calc(var(--z-map-effects) + 3)', backgroundImage: `image-set(url(${baseURL}scanline.gif) 1x, url(${baseURL}scanline.gif) 2x)`, backgroundRepeat: 'repeat' }" />
    <div aria-hidden="true" class="absolute inset-0 pointer-events-none" :style="{ zIndex: 'var(--z-map-overlays)', boxShadow: 'inset 0 0 clamp(30px, 8vw, 100px) clamp(5px, 2vw, 15px) rgba(0,0,0,0.5)' }" />

    <canvas v-if="showHexGrid" ref="hexCanvasRef" aria-hidden="true" class="absolute inset-0 w-full h-full pointer-events-none opacity-20" :style="{ zIndex: 'var(--z-map-hex-grid)' }" />

    <div aria-hidden="true" class="absolute inset-0 overflow-hidden pointer-events-none" :style="{ zIndex: 'var(--z-map-effects)' }">
      <div :class="`absolute top-0 left-0 w-full h-full ${isMobile ? 'opacity-5' : 'opacity-10'}`">
        <div class="absolute top-0 left-0 w-1/3 h-1/3 bg-cyan-500/20 blur-3xl animate-pulse-slow" />
        <template v-if="!isMobile">
          <div class="absolute bottom-0 right-0 w-1/3 h-1/3 bg-purple-500/20 blur-3xl animate-pulse-slow-delay" />
          <div class="absolute top-1/2 right-1/4 w-1/4 h-1/4 bg-pink-500/20 blur-3xl animate-pulse-slow-delay-2" />
        </template>
      </div>
    </div>

    <div v-if="isMobile && !hideAll" class="absolute top-[clamp(4.5rem,12vw,6rem)] left-1/2 -translate-x-1/2 pointer-events-none px-2 sm:px-3" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[clamp(10rem,24vw,16rem)] object-contain" loading="lazy" />
    </div>
    <div v-else-if="!hideAll" class="absolute top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :class="hideControls ? '-left-4' : 'left-0'" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[clamp(10rem,24vw,16rem)] -rotate-90 origin-center" loading="lazy" />
    </div>

    <div ref="mapContainerRef" class="absolute inset-0 w-full h-full" :style="{ zIndex: 'var(--z-map-base)' }" />
    <slot name="overlays" />

    <ProjectFilterPanel v-if="activeDataset === 'project-grants' && showFilterPanel" :projects="projectsData" @filter-change="handleProjectFilterChange" />
    <SpeciesFilterPanel v-if="activeDataset === 'endangered-species' && showFilterPanel" ref="speciesFilterPanelRef" :species="speciesIndexData" @filter-change="handleFilterChange" @group-selection-change="handleSpeciesGroupSelection" @close="showFilterPanel = false" />

    <DataBubble v-if="!hideAll && activeDataset !== 'vulcan-observatory'" :mode="activeDataset === 'endangered-species' ? 'species' : activeDataset === 'active-crews' ? 'crews' : 'projects'" :selected-groups="selectedSpeciesGroups" :projects="visibleProjects" :crews="crewsData" :crew-locations="crewLocationsData" position-top="auto" :position-bottom="isMobile ? 'clamp(4.5rem, 10vh, 6rem)' : 'clamp(1rem, 4vh, 2rem)'" @toggle-group="toggleLegendGroup" />

    <MapControls v-if="activeDataset !== 'vulcan-observatory'" :is-globe-view="false" :show-hex-grid="showHexGrid" :show-connections="showConnections" :dataset="activeDataset" :projects="activeDataset === 'project-grants' ? visibleProjects : undefined" :species="activeDataset === 'endangered-species' ? speciesIndexData : undefined" :filter-open="showFilterPanel" :is-embed="hideControls" @toggle-hex-grid="showHexGrid = !showHexGrid" @toggle-connections="toggleConnections" @toggle-filter="!hideControls && (showFilterPanel = !showFilterPanel)" @search-open-change="handleSearchOpenChange" @navigate="navigateToLocation" :style="{ zIndex: 'var(--z-map-ui-controls)' }" />

    <Transition name="fade">
      <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[var(--z-map-error-overlay)]">
        <div class="relative mb-6">
          <div class="w-16 h-16 rounded-full bg-[var(--text-primary)]/10 animate-pulse" />
          <iconify-icon icon="lucide:alert-triangle" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[var(--text-primary)]" />
        </div>
        <p class="text-gray-400 mb-4 text-center px-4 max-w-md">{{ errorMessage || t('globe.connectionError') }}</p>
        <button v-if="!noWebglSupport" @click="() => { hasError = false; initMap() }" class="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-medium hover:opacity-80 transition-all duration-300 flex items-center gap-2">
          <iconify-icon icon="lucide:refresh-cw" class="h-4 w-4" />
          {{ t('globe.tryAgain') }}
        </button>
      </div>
    </Transition>

    <!-- Species overlay -->
    <Transition name="scale-fade">
      <div v-if="showSpeciesOverlay" ref="speciesOverlayRef" class="species-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Species details" @click.self="closeSpeciesOverlay" @keydown.esc="closeSpeciesOverlay">
        <button ref="speciesCloseBtnRef" class="species-popup-close-btn-fixed" @click="closeSpeciesOverlay" aria-label="Close species details"><Icon name="lucide:x" class="h-6 w-6" /></button>
        <div v-if="availablePopupLocales.length > 0" class="species-popup-lang-bar">
          <button v-for="loc in availablePopupLocales" :key="loc" class="species-popup-lang-btn" :class="{ active: popupLocale === loc }" @click="popupLocale = loc" :aria-label="`Show in ${(localeNames as Record<string, string>)[loc] || loc}`">{{ (localeNames as Record<string, string>)[loc] || loc }}</button>
        </div>
        <div class="species-popup-content-fixed">
          <MapSpeciesPopup :species="speciesData" />
        </div>
      </div>
    </Transition>

    <!-- Project overlay -->
    <Transition name="scale-fade">
      <div v-if="showProjectOverlay" ref="projectOverlayRef" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Project details" @click.self="closeProjectOverlay" @keydown.esc="closeProjectOverlay">
        <button ref="projectCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeProjectOverlay" aria-label="Close project details"><Icon name="lucide:x" class="h-6 w-6" /></button>
        <div class="project-popup-content-fixed">
          <MapProjectPopup :project="projectData" />
        </div>
      </div>
    </Transition>

    <!-- Crew overlay -->
    <Transition name="scale-fade">
      <div v-if="showCrewOverlay" ref="crewOverlayRef" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Crew region details" @click.self="closeCrewOverlay" @keydown.esc="closeCrewOverlay">
        <button ref="crewCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeCrewOverlay" aria-label="Close crew details"><Icon name="lucide:x" class="h-6 w-6" /></button>
        <div class="project-popup-content-fixed">
          <MapCrewPopup :crew="crewData" :is-location="isCrewLocationData" />
        </div>
      </div>
    </Transition>

    <SpeciesPanel @species-selected="handleSpeciesSelected" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent } from 'vue'
import type maplibregl from 'maplibre-gl'
import type { MapBaseProps } from '@/composables/useMapBase'
import { useMapBase } from '@/composables/useMapBase'
import { useSpeciesIndex } from '~/composables/useSpeciesData'

const SpeciesFilterPanel = defineAsyncComponent(() => import('~/components/SpeciesFilterPanel.vue'))
const ProjectFilterPanel = defineAsyncComponent(() => import('~/components/ProjectFilterPanel.vue'))
const DataBubble = defineAsyncComponent(() => import('~/components/DataBubble.vue'))
const MapControls = defineAsyncComponent(() => import('~/components/MapControls.vue'))
const SpeciesPanel = defineAsyncComponent(() => import('~/components/SpeciesPanel.vue'))

const props = withDefaults(defineProps<MapBaseProps>(), { defaultDataset: 'project-grants' })
const emit = defineEmits<{ mapInit: [map: maplibregl.Map] }>()

const mapContainerRef = ref<HTMLElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)

const ctx = useMapBase({
  isGlobe: false,
  props,
  mapContainerRef,
  hexCanvasRef,
  onMapReady: (map) => emit('mapInit', map),
})

const showDataLoading = ref(false)
const dataStatusText = ref('')
let dataLoadedCount = 0
const DATA_TOTAL = 2

if (props.defaultDataset === 'endangered-species') {
  const { data: speciesIdx, loading: speciesLoading, currentDatasetLabel } = useSpeciesIndex(['iucn', 'icmbio-brazil'])
  watch(currentDatasetLabel, (v) => {
    if (v && speciesLoading.value) {
      showDataLoading.value = true
      dataStatusText.value = t('globe.preparingData', { dataset: v })
    }
  })
  watch(speciesLoading, (v) => {
    if (!v) {
      dataLoadedCount++
      if (dataLoadedCount >= DATA_TOTAL) {
        dataStatusText.value = 'All species data loaded ✓'
        setTimeout(() => { showDataLoading.value = false }, 2500)
      } else {
        showDataLoading.value = true
        dataStatusText.value = `${currentDatasetLabel.value || ''} loaded → next dataset...`
        setTimeout(() => {
          if (dataLoadedCount < DATA_TOTAL) {
            showDataLoading.value = false
          }
        }, 2000)
      }
    } else {
      showDataLoading.value = true
      dataStatusText.value = t('globe.preparingData', { dataset: currentDatasetLabel.value || '' })
    }
  })
  watch(speciesIdx, (val) => {
    // Only write data when non-empty — avoids wasted rebuild with 0 features
    if (val.length > 0) {
      ctx.speciesIndexData.value = val
    }
  })
}

const isLoading = computed(() => ctx.isLoading.value)

useHead({
  link: props.defaultDataset === 'endangered-species'
    ? [
        { rel: 'preconnect', href: 'https://api.maptiler.com' },
      ]
    : [],
})

const {
  t, localeNames, baseURL, isMobile, isEmbed, hideControls, noControl, hideAll,
  projectsData, speciesIndexData, visibleProjects, crewsData, crewLocationsData,
  activeDataset, selectedSpeciesGroups,
  hasError, errorMessage, noWebglSupport,
  showHexGrid, showFilterPanel, speciesFilterPanelRef,
  showConnections, toggleConnections,
  showSpeciesOverlay, showProjectOverlay, showCrewOverlay,
  speciesData, projectData, crewData, isCrewLocationData,
  popupLocale, availablePopupLocales,
  speciesCloseBtnRef, speciesOverlayRef,
  projectCloseBtnRef, projectOverlayRef,
  crewCloseBtnRef, crewOverlayRef,
  openSpeciesOverlay, closeSpeciesOverlay,
  openProjectOverlay, closeProjectOverlay,
  openCrewOverlay, closeCrewOverlay,
  handleSpeciesSelected,
  handleFilterChange, handleProjectFilterChange,
  handleSearchOpenChange, handleSpeciesGroupSelection, toggleLegendGroup,
  navigateToLocation,
  initMap,
} = ctx
</script>
