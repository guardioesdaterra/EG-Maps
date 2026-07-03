<template>
  <div class="w-full h-[100svh] relative overflow-hidden bg-black" role="main" aria-label="Interactive Map Visualization">
    <Transition name="fade">
      <div v-if="isLoading" class="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
        <div class="relative mb-5 xs:mb-6">
          <div class="w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <div class="absolute inset-0 w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/10 border-b-white/50 animate-spin" style="animation-delay: 0.5s; animation-direction: reverse" />
        </div>
        <p class="text-white font-medium mb-1.5 xs:mb-2 text-sm xs:text-base">{{ t('general.loading') }}</p>
        <p class="text-gray-500 text-xs xs:text-sm">{{ datasetLabel }}</p>
        <div class="mt-3 xs:mt-4 flex gap-1">
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-1" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-2" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-3" />
        </div>
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

    <div v-if="isMobile" class="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none px-2 sm:px-3" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[clamp(10rem,24vw,16rem)] object-contain" />
    </div>
    <div v-else class="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[clamp(10rem,24vw,16rem)] -rotate-90 origin-center" />
    </div>

    <div ref="mapContainerRef" class="absolute inset-0 w-full h-full" :style="{ zIndex: 'var(--z-map-base)' }" />
    <slot name="overlays" />

    <ProjectFilterPanel v-if="activeDataset === 'project-grants' && showFilterPanel" :projects="projectsData" @filter-change="handleProjectFilterChange" />
    <SpeciesFilterPanel v-if="activeDataset === 'endangered-species' && showFilterPanel" ref="speciesFilterPanelRef" :species="speciesIndexData" @filter-change="handleFilterChange" @group-selection-change="handleSpeciesGroupSelection" @close="showFilterPanel = false" />
    <DataBubble v-if="activeDataset !== 'vulcan-observatory'" :mode="activeDataset === 'endangered-species' ? 'species' : 'projects'" :selected-groups="selectedSpeciesGroups" :projects="visibleProjects" position-top="clamp(16rem, 40vh, 22rem)" @toggle-group="toggleLegendGroup" />
    <MapControls v-if="activeDataset !== 'vulcan-observatory'" :is-globe-view="false" :show-hex-grid="showHexGrid" :show-connections="showConnections" :dataset="activeDataset" :projects="activeDataset === 'project-grants' ? visibleProjects : undefined" :species="activeDataset === 'endangered-species' ? speciesIndexData : undefined" :filter-open="showFilterPanel" @toggle-hex-grid="showHexGrid = !showHexGrid" @toggle-connections="toggleConnections" @toggle-filter="showFilterPanel = !showFilterPanel" @search-open-change="handleSearchOpenChange" @navigate="navigateToLocation" :style="{ zIndex: 'var(--z-map-ui-controls)' }" />

    <Transition name="fade">
      <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[var(--z-map-error-overlay)]">
        <div class="relative mb-6">
          <div class="w-16 h-16 rounded-full bg-[var(--text-primary)]/10 animate-pulse" />
          <iconify-icon icon="lucide:alert-triangle" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[var(--text-primary)]" />
        </div>
        <p class="text-gray-400 mb-4 text-center px-4 max-w-md">{{ errorMessage || t('globe.connectionError') }}</p>
        <button v-if="!noWebglSupport" @click="retryInit()" class="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-medium hover:opacity-80 transition-all duration-300 flex items-center gap-2">
          <iconify-icon icon="lucide:refresh-cw" class="h-4 w-4" />
          {{ t('globe.tryAgain') }}
        </button>
      </div>
    </Transition>

    <div v-if="showSpeciesOverlay" ref="speciesOverlayRef" class="species-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Species details" @click.self="closeSpeciesOverlay" @keydown.esc="closeSpeciesOverlay">
      <button ref="speciesCloseBtnRef" class="species-popup-close-btn-fixed" @click="closeSpeciesOverlay" aria-label="Close species details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div v-if="availablePopupLocales.length > 0" class="species-popup-lang-bar">
        <button v-for="loc in availablePopupLocales" :key="loc" class="species-popup-lang-btn" :class="{ active: popupLocale === loc }" @click="popupLocale = loc" :aria-label="`Show in ${(localeNames as Record<string, string>)[loc] || loc}`">{{ (localeNames as Record<string, string>)[loc] || loc }}</button>
      </div>
      <div class="species-popup-content-fixed" v-html="speciesOverlayHTML"></div>
    </div>

    <div v-if="showProjectOverlay" ref="projectOverlayRef" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Project details" @click.self="closeProjectOverlay" @keydown.esc="closeProjectOverlay">
      <button ref="projectCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeProjectOverlay" aria-label="Close project details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="project-popup-content-fixed" v-html="projectOverlayHTML"></div>
    </div>

    <div v-if="showCrewOverlay" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Crew region details" @click.self="closeCrewOverlay" @keydown.esc="closeCrewOverlay">
      <button ref="crewCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeCrewOverlay" aria-label="Close crew details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="project-popup-content-fixed" v-html="crewOverlayHTML"></div>
    </div>

    <SpeciesPanel @species-selected="handleSpeciesSelected" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useMapShared, type MapSharedOptions } from '@/composables/useMapShared'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import type { ProjectData } from '@/lib/types'

const props = withDefaults(defineProps<MapSharedOptions>(), {
  defaultDataset: 'project-grants',
})

const emit = defineEmits<{ mapInit: [map: MapLibreMap] }>()

const mapContainerRef = ref<HTMLDivElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
const speciesFilterPanelRef = ref<{ toggleTaxonomicGroup: (_group: string) => void } | null>(null)

const shared = useMapShared(mapContainerRef, hexCanvasRef, props, {
  customLoadHandler: true,
})

const {
  isMobile, activeDataset, showFilterPanel, selectedSpeciesGroups,
  hasError, errorMessage, noWebglSupport, isLoading, showHexGrid, showConnections,
  projectsData, speciesData, speciesIndexData, crewsData, crewLocationsData,
  visibleProjects, visibleSpecies,
  mapRef, baseURL, t, locale, localeNames,
  showSpeciesOverlay, speciesOverlayHTML, projectOverlayHTML, crewOverlayHTML,
  popupLocale, availablePopupLocales,
  speciesCloseBtnRef, speciesOverlayRef, projectCloseBtnRef, projectOverlayRef, crewCloseBtnRef,
  closeSpeciesOverlay, closeProjectOverlay, closeCrewOverlay,
  toggleLegendGroup,
  handleSpeciesSelected,
  handleFilterChange, handleProjectFilterChange,
  navigateToLocation, toggleConnections,
  connections, hexGrid,
  orchestrate: orchestrator,
  isMounted,
} = shared

const datasetLabel = computed(() => {
  const key = activeDataset.value === 'project-grants' ? 'home.projectGrants' : activeDataset.value === 'endangered-species' ? 'home.species' : 'home.observatoryOfVulcan'
  return t('globe.preparingData', { dataset: t(key).toLowerCase() })
})

function handleSpeciesGroupSelection(groups: string[]) {
  selectedSpeciesGroups.value = groups
}

function handleSearchOpenChange(open: boolean) {
  if (open && isMobile.value) showFilterPanel.value = false
}

function retryInit() {
  hasError.value = false
  initMap()
}

function initMap() {
  const m = new MapLibreMap({
    container: mapContainerRef.value!,
    style: shared.MAP_STYLE,
    zoom: 3,
    center: [0, 0],
    attributionControl: false,
    renderWorldCopies: true,
    fadeDuration: 100,
    maxTileCacheSize: 200,
    maxTileCacheZoomLevels: 5,
  })
  m.addControl(new maplibregl.AttributionControl({
    customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`
  }))
  if (!isMobile.value) {
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
  }

  m.on('load', () => {
    if (!isMounted.value) return
    isLoading.value = false
    emit('mapInit', m)
    if (activeDataset.value === 'vulcan-observatory') {
      setupRareEarthLayers()
    }
    rebuildMarkers()
    if (activeDataset.value !== 'active-crews') {
      addConnectionsAndParticles()
    }
    hexGrid.setupHexGrid()
  })

  m.on('move', () => {
    if (!pendingVisibilityUpdate) {
      pendingVisibilityUpdate = true
      requestAnimationFrame(() => {
        updateMarkerVisibility()
        pendingVisibilityUpdate = false
      })
    }
  })

  m.on('moveend', () => {
    updateMarkerVisibility()
    if (!m) return
    const z = Math.floor(m.getZoom())
    if (orchestrator.mapCore.shouldRebuildClusters(m, z, orchestrator.lastClusterZoom, orchestrator.lastBboxCenter)) {
      rebuildMarkers()
    }
  })

  m.on('resize', () => hexGrid.debouncedSetup())

  let errorCount = 0
  let usedFallback = false
  m.on('error', (err) => {
    errorCount++
    if (!usedFallback && errorCount >= 2 && MAP_STYLE.includes('maptiler.com')) {
      usedFallback = true
      m.setStyle('https://demotiles.maplibre.org/style.json')
      return
    }
    if (!m.loaded()) {
      isLoading.value = false
      hasError.value = true
    }
  })

  mapRef.value = m
}

// We patch the shared ref via a setter
// Actually, useMapShared's `mapRef` is a computed that reads from `map` which is a plain let
// We need another approach - let's use the orchestrator directly
// For now, bypass shared init and do it here

onMounted(() => {
  showFilterPanel.value = !isMobile.value
  initMap()
})
</script>

<style>
@import 'maplibre-gl/dist/maplibre-gl.css';
/* ... style copied from UnifiedMap ... */
.fade-enter-active,.fade-leave-active{transition:opacity .3s ease}.fade-enter-from,.fade-leave-to{opacity:0}.maplibregl-popup-content{background:rgba(0,0,0,.95)!important;border-radius:clamp(.375rem,1vw,.5rem)!important;border:1px solid rgba(6,182,212,.4)!important;box-shadow:0 0 30px rgba(6,182,212,.2),inset 0 0 15px rgba(6,182,212,.05)!important;padding:0!important;min-width:clamp(14rem,18vw,16.25rem);max-width:calc(100vw - 2rem)!important;max-height:calc(100vh - 2rem)!important;overflow:visible!important;overflow-y:auto!important;word-wrap:break-word!important;white-space:normal!important}.maplibregl-popup.cyberpunk-popup{z-index:2147483647!important;pointer-events:auto!important}.maplibregl-popup.cyberpunk-popup .maplibregl-popup-content{width:auto!important;min-width:clamp(15rem,22vw,17.5rem)!important;max-width:min(35rem,calc(100vw - 2rem))!important;max-height:calc(100vh - 3.75rem)!important;overflow-y:auto!important}.maplibregl-popup-anchor-top .maplibregl-popup-tip{bottom:-10px!important}.maplibregl-popup-anchor-bottom .maplibregl-popup-tip{top:-10px!important}.maplibregl-marker{pointer-events:auto;z-index:10;position:absolute!important;top:0!important;left:0!important;will-change:transform}.maplibregl-popup-tip{border-top-color:rgba(6,182,212,.8)!important;border-bottom-color:rgba(6,182,212,.8)!important}.maplibregl-popup-close-button{color:rgba(6,182,212,.8)!important;font-size:clamp(1rem,1.5vw,1.125rem)!important;padding:.25rem .5rem!important;background:0 0!important;border:none!important;top:.5rem!important;right:.5rem!important}.maplibregl-popup-close-button:hover{background-color:rgba(6,182,212,.2)!important;color:#06b6d4!important}.maplibregl-ctrl-bottom-right{margin-bottom:clamp(.375rem,1vw,.5rem);margin-right:clamp(.375rem,1vw,.5rem)}.maplibregl-ctrl-attrib-inner{color:rgba(255,255,255,.7);font-size:clamp(.5625rem,.8vw,.625rem);background-color:rgba(0,0,0,.6);padding:.125rem .375rem;border-radius:.25rem}.animate-pulse-slow{animation:pulse-slow 3s ease-in-out infinite}
</style>
