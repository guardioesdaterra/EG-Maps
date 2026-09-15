/**
 * components/MapView3D.vue
 * @why 3D globe container — instantiates GlobeView with dataset-appropriate configuration
 * @component MapView3D
 * @emits mapInit: [map: maplibregl.Map]
 * @deps vue (ref, watch, computed, defineAsyncComponent); @/composables/useMapBase (useMapBase); ~/composables/useSpeciesData (useSpeciesIndex)
 */
<template>
  <div id="main-content" tabindex="-1" class="w-full h-[100svh] relative overflow-hidden bg-black focus:outline-none" role="main" aria-label="3D Globe Visualization">
    <Transition name="fade">
      <div v-if="isLoading" class="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
        <div class="relative mb-5 xs:mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-16 xs:w-20 h-16 xs:h-20 text-white" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
              <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
            </path>
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <Icon name="lucide:globe" class="w-7 h-7 xs:w-8 xs:h-8 text-white/70 animate-pulse" />
          </div>
        </div>
        <p class="text-white font-medium mb-1.5 xs:mb-2 text-sm xs:text-base">{{ t('globe.loading') }}</p>
        <p class="text-gray-500 text-xs xs:text-sm">{{ t('globe.preparingData', { dataset: activeDataset === 'project-grants' ? t('home.projectGrants').toLowerCase() : activeDataset === 'active-crews' ? t('nav.activeCrews').toLowerCase() : activeDataset === 'vulcan-observatory' ? t('home.observatoryOfVulcan').toLowerCase() : t('home.species').toLowerCase() }) }}</p>
        <div class="mt-3 xs:mt-4 flex gap-1">
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-1" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-2" />
          <div class="w-2 h-2 rounded-full bg-white/50 animate-bounce stagger-3" />
        </div>
      </div>
    </Transition>

    
    <Transition name="fade">
      <div v-if="showDataLoading" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-[99] flex items-center gap-2 px-3 py-2 rounded-lg bg-black backdrop-blur-sm border border-cyan-800/40 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-cyan-400" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
            <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
          </path>
        </svg>
        <span class="text-xs text-cyan-300 font-medium whitespace-nowrap">{{ dataStatusText }}</span>
      </div>
    </Transition>

    <canvas ref="starCanvasRef" class="absolute inset-0 z-0 pointer-events-none" aria-hidden="true"></canvas>

    <div class="absolute inset-0 pointer-events-none z-10 bg-black/20"></div>
    <div class="absolute inset-0 pointer-events-none z-10 bg-black/5 dark:bg-white/5"></div>
    <div class="absolute inset-0 pointer-events-none z-10">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-black/5 dark:bg-white/5 blur-3xl animate-pulse-slow" />
    </div>
    <div class="absolute inset-0 pointer-events-none z-20" :style="{ boxShadow: `inset 0 0 clamp(40px, 12vw, 150px) clamp(8px, 3vw, 30px) rgba(0,0,0,0.7)` }"></div>

    <div class="absolute inset-0 pointer-events-none opacity-[0.03]" :style="{ zIndex: 'calc(var(--z-map-effects) + 1)', backgroundImage: `image-set(url(${baseURL}grid-overlay.png) 1x, url(${baseURL}grid-overlay.png) 2x)`, backgroundRepeat: 'repeat' }" />
    <div class="absolute -inset-3 pointer-events-none opacity-[0.02] animate-noise-bg" :style="{ zIndex: 'calc(var(--z-map-effects) + 2)', backgroundImage: `image-set(url(${baseURL}noise.png) 1x, url(${baseURL}noise.png) 2x)`, backgroundRepeat: 'repeat' }" />
    <div aria-hidden="true" class="absolute inset-0 pointer-events-none opacity-[0.02]" :style="{ zIndex: 'calc(var(--z-map-effects) + 3)', backgroundImage: `image-set(url(${baseURL}scanline.gif) 1x, url(${baseURL}scanline.gif) 2x)`, backgroundRepeat: 'repeat' }" />

    <canvas v-if="showHexGrid" ref="hexCanvasRef" aria-hidden="true" class="absolute inset-0 w-full h-full pointer-events-none opacity-15" :style="{ zIndex: 'var(--z-map-hex-grid)' }" />

    <div ref="mapContainerRef" class="absolute inset-0 w-full h-full" :style="{ zIndex: 'var(--z-map-base)' }" />
    <ClusterResultsPanel
      v-if="clusterPanelOpen"
      :items="clusterPanelItems"
      :dataset-label="clusterPanelDataset"
      @close="closeClusterPanel"
      @select="selectClusterItem"
    />
    <button v-if="!hideControls && !hideAll && !nearbyOpen" type="button" class="absolute left-[max(0.5rem,env(safe-area-inset-left))] top-[clamp(4.25rem,11vh,6rem)] z-[var(--z-map-ui-controls)] min-h-11 rounded-full border border-cyan-300/30 bg-black/70 px-3 text-xs font-bold text-cyan-100 shadow-lg backdrop-blur-sm sm:left-auto sm:top-[max(1rem,env(safe-area-inset-top))] sm:right-[max(1rem,env(safe-area-inset-right))]" aria-label="Find nearby crews, projects and campaigns" @click="nearbyOpen = true">⌖ Nearby</button>
    <NearbyPanel v-if="nearbyOpen" :projects="projectsData" :crew-locations="crewLocationsData" @close="nearbyOpen = false" @navigate="navigateToLocation" />
    <slot name="overlays" />

    <div v-if="isMobile && !hideAll" class="absolute top-[clamp(5rem,13vh,6.5rem)] xs:top-[clamp(5rem,13vh,6.5rem)] left-1/2 -translate-x-1/2 pointer-events-none px-2" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[clamp(10rem,24vw,16rem)] object-contain" loading="lazy" />
    </div>
    <div v-else-if="!hideAll" class="absolute top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :class="hideControls ? '-left-4' : 'left-0'" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[clamp(10rem,24vw,16rem)] -rotate-90 origin-center" loading="lazy" />
    </div>

    <ProjectFilterPanel v-if="activeDataset === 'project-grants' && showFilterPanel" :projects="projectsData" @filter-change="handleProjectFilterChange" />
    <SpeciesFilterPanel v-if="activeDataset === 'endangered-species' && showFilterPanel" ref="speciesFilterPanelRef" :species="speciesIndexData" @filter-change="handleFilterChange" @group-selection-change="handleSpeciesGroupSelection" @close="showFilterPanel = false" />

    <DataBubble v-if="!hideAll && activeDataset !== 'vulcan-observatory'" :mode="activeDataset === 'endangered-species' ? 'species' : activeDataset === 'active-crews' ? 'crews' : 'projects'" :selected-groups="selectedSpeciesGroups" :projects="visibleProjects" :crews="crewsData" :crew-locations="crewLocationsData" position-top="auto" :position-bottom="isMobile ? 'clamp(5.5rem,12vh,7rem)' : 'clamp(1rem, 4vh, 2rem)'" @toggle-group="toggleLegendGroup" />

    <MapControls v-if="activeDataset !== 'vulcan-observatory' && !hideAll" :is-globe-view="true" :show-hex-grid="showHexGrid" :show-connections="showConnections" :dataset="activeDataset" :projects="activeDataset === 'project-grants' ? visibleProjects : undefined" :crews="activeDataset === 'active-crews' ? crewsData : undefined" :species="activeDataset === 'endangered-species' ? speciesIndexData : undefined" :filter-open="showFilterPanel" :is-embed="hideControls" :style="{ zIndex: 'var(--z-map-ui-controls)' }" @toggle-hex-grid="showHexGrid = !showHexGrid" @toggle-connections="toggleConnections" @toggle-filter="!hideControls && (showFilterPanel = !showFilterPanel)" @search-open-change="handleSearchOpenChange" @navigate="navigateToLocation" />

    <Transition name="fade">
      <div v-if="hasError" class="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-white z-[2000]">
        <div class="relative mb-5 xs:mb-6">
          <div class="w-14 h-14 xs:w-16 xs:h-16 rounded-full bg-[var(--text-primary)]/10 animate-pulse" />
          <Icon name="lucide:alert-triangle" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 xs:h-8 xs:w-8 text-[var(--text-primary)]" />
        </div>
        <h2 class="text-lg xs:text-xl font-bold mb-1.5 xs:mb-2">{{ t('globe.unableToLoad') }}</h2>
        <p class="text-gray-400 mb-4 text-center px-4 xs:px-4 max-w-xs xs:max-w-md text-sm xs:text-base">{{ errorMessage || t('globe.connectionError') }}</p>
        <button v-if="!noWebglSupport" @click="() => { hasError = false; initMap() }" class="px-5 xs:px-6 py-2 xs:py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-medium hover:opacity-80 transition-all duration-300 flex items-center gap-2 text-sm xs:text-base">
          <Icon name="lucide:refresh-cw" class="h-4 w-4" />
          {{ t('globe.tryAgain') }}
        </button>
      </div>
    </Transition>

    
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

    
    <Transition name="scale-fade">
      <div v-if="showProjectOverlay" ref="projectOverlayRef" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Project details" @click.self="closeProjectOverlay" @keydown.esc="closeProjectOverlay">
        <button ref="projectCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeProjectOverlay" aria-label="Close project details"><Icon name="lucide:x" class="h-6 w-6" /></button>
        <div class="project-popup-content-fixed">
          <MapProjectPopup :project="projectData" />
        </div>
      </div>
    </Transition>

    
    <Transition name="scale-fade">
      <div v-if="showCrewOverlay" ref="crewOverlayRef" class="crew-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Crew details" @click.self="closeCrewOverlay" @keydown.esc="closeCrewOverlay">
        <button ref="crewCloseBtnRef" class="crew-popup-close-btn-fixed" @click="closeCrewOverlay" aria-label="Close crew details"><Icon name="lucide:x" class="h-6 w-6" /></button>
        <div class="crew-popup-content-fixed">
          <MapCrewPopup :crew="crewData" :is-location="isCrewLocationData" :projects="visibleProjects" :crew-locations="crewLocationsData" @select-crew="openCrewLocationOverlay" @fly-to-project="(lat, lng) => navigateToLocation(lat, lng)" />
        </div>
      </div>
    </Transition>

    <SpeciesPanel @species-selected="handleSpeciesSelected" />
    <ImportDataWidget v-if="!hideAll" />
  </div>
</template>

<script setup lang="ts">

import { ref, watch, computed, defineAsyncComponent } from 'vue'
import type maplibregl from 'maplibre-gl'
import type { MapBaseProps } from '@/composables/useMapBase'
import { useMapBase } from '@/composables/useMapBase'
import { useSpeciesIndex } from '~/composables/useSpeciesData'
import { useMapCustomLayers } from '~/composables/useMapCustomLayers'
import ImportDataWidget from '~/components/ImportDataWidget.vue'
import NearbyPanel from '~/components/map/NearbyPanel.vue'
import ClusterResultsPanel, { type ClusterResultItem } from '~/components/map/ClusterResultsPanel.vue'

const DataBubble = defineAsyncComponent(() => import('~/components/DataBubble.vue'))
const MapControls = defineAsyncComponent(() => import('~/components/MapControls.vue'))
const SpeciesFilterPanel = defineAsyncComponent(() => import('~/components/SpeciesFilterPanel.vue'))
const ProjectFilterPanel = defineAsyncComponent(() => import('~/components/ProjectFilterPanel.vue'))
const SpeciesPanel = defineAsyncComponent(() => import('~/components/SpeciesPanel.vue'))

const props = withDefaults(defineProps<MapBaseProps>(), {
  defaultDataset: 'project-grants',
})

const emit = defineEmits<{ mapInit: [map: maplibregl.Map] }>()

const mapContainerRef = ref<HTMLElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
const starCanvasRef = ref<HTMLCanvasElement | null>(null)
const nearbyOpen = ref(false)

const showDataLoading = ref(false)
const dataStatusText = ref('')

let starAnimationId: number | null = null
let rotationAnimationId: number | null = null
let isUserInteracting = false
let interactionTimeout: ReturnType<typeof setTimeout> | null = null
let visibilityHandler: (() => void) | null = null
let starResizeCleanup: (() => void) | null = null

function initStarCanvas() {
  const canvasRef = starCanvasRef.value
  if (!canvasRef) return
  const ctxRef = canvasRef.getContext('2d')
  if (!ctxRef) return
  // Non-nullable aliases: `resize`/`onResize` close over these, and TS
  // resets narrowing inside nested closures (TS18047).
  const canvas: HTMLCanvasElement = canvasRef
  const ctx: CanvasRenderingContext2D = ctxRef
  const stars: { x: number; y: number; r: number; a: number; da: number }[] = []
  const count = base.quality.settings.value.starCount
  if (count === 0) return

  function resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * devicePixelRatio
    canvas.height = h * devicePixelRatio
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    return { w, h }
  }

  let dims = resize()
  let w = dims.w
  let h = dims.h

  for (let i = 0; i < count; i++) {
    stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.5, a: Math.random(), da: (Math.random() - 0.5) * 0.02 })
  }

  function onResize() {
    dims = resize()
    w = dims.w
    h = dims.h
    // Re-scatter stars that are out of bounds
    for (const s of stars) {
      if (s.x > w) s.x = Math.random() * w
      if (s.y > h) s.y = Math.random() * h
    }
  }
  window.addEventListener('resize', onResize)
  starResizeCleanup = () => { window.removeEventListener('resize', onResize) }

  function draw() {
    if (!ctx || !canvas) return
    if (document.hidden) { starAnimationId = requestAnimationFrame(draw); return }
    ctx.clearRect(0, 0, w, h)
    for (const s of stars) {
      s.a += s.da; if (s.a > 1) s.a = 1; if (s.a < 0.2) s.a = 0.2
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill()
    }
    starAnimationId = requestAnimationFrame(draw)
  }
  draw()
}

function stopStarCanvas() {
  if (starAnimationId !== null) { cancelAnimationFrame(starAnimationId); starAnimationId = null }
  if (starResizeCleanup) { starResizeCleanup(); starResizeCleanup = null }
}

function startAutoRotate(map: maplibregl.Map) {
  if (rotationAnimationId !== null) return
  function rotate() {
    if (!map || !base.isMounted || isUserInteracting) { rotationAnimationId = null; return }
    if (document.hidden) { rotationAnimationId = requestAnimationFrame(rotate); return }
    const center = map.getCenter()
    // Use jumpTo (instant) instead of easeTo to avoid creating an internal
    // MapLibre animation that conflicts with user drag interactions.
    map.jumpTo({ center: [center.lng - 0.15, center.lat] })
    rotationAnimationId = requestAnimationFrame(rotate)
  }
  rotationAnimationId = requestAnimationFrame(rotate)
}

function stopAutoRotate() {
  if (rotationAnimationId !== null) { cancelAnimationFrame(rotationAnimationId); rotationAnimationId = null }
}

const base = useMapBase({
  isGlobe: true,
  props,
  mapContainerRef,
  hexCanvasRef,
  onStyleLoad: (map) => {
    try { map.setProjection({ type: 'globe' }) } catch (e) { console.error('Error setting globe projection:', e) }
  },
  onMapReady: (map) => {
    emit('mapInit', map)
    customLayerCtx.syncNow()
    // Focus the map canvas so it can receive keyboard and pointer events
    // immediately — avoids the "must zoom before drag" issue on some browsers.
    try { map.getCanvas().focus() } catch { /* ignore */ }
    if (base.quality.settings.value.starCount > 0) {
      setTimeout(() => initStarCanvas(), 500)
    }
    if (base.quality.settings.value.autoRotate) {
      startAutoRotate(map)
    }
    function pauseAutoRotate() {
      isUserInteracting = true
      stopAutoRotate()
      if (interactionTimeout) clearTimeout(interactionTimeout)
    }
    function resumeAutoRotate() {
      isUserInteracting = false
      if (interactionTimeout) clearTimeout(interactionTimeout)
      interactionTimeout = setTimeout(() => { isUserInteracting = false; startAutoRotate(map) }, 3000)
    }
    map.on('dragstart', pauseAutoRotate)
    map.on('dragend', resumeAutoRotate)
    map.on('wheel', () => { pauseAutoRotate(); interactionTimeout = setTimeout(() => { isUserInteracting = false; startAutoRotate(map) }, 3000) })
    map.on('touchstart', pauseAutoRotate)
    map.on('touchend', resumeAutoRotate)
    map.on('touchcancel', resumeAutoRotate)
  },
  onBeforeCleanup: () => {
    stopAutoRotate()
    stopStarCanvas()
    if (interactionTimeout) clearTimeout(interactionTimeout)
    if (visibilityHandler) { document.removeEventListener('visibilitychange', visibilityHandler); visibilityHandler = null }
  },
})

const customLayerCtx = useMapCustomLayers(base.mapRef)

if (props.defaultDataset === 'endangered-species') {
  const { data: speciesIdx, loading: speciesLoading, currentDatasetLabel } = useSpeciesIndex(['iucn', 'icmbio-brazil'])
  let dataPushed = false
  watch(currentDatasetLabel, (v) => {
    if (v && speciesLoading.value) {
      showDataLoading.value = true
      dataStatusText.value = t('globe.preparingData', { dataset: v })
    }
  })
  watch(speciesLoading, (v) => {
    if (!v) {
      if (!dataPushed && speciesIdx.value.length > 0) {
        dataPushed = true
        base.speciesIndexData.value = speciesIdx.value
      }
      dataStatusText.value = 'All species data loaded ✓'
      setTimeout(() => { showDataLoading.value = false }, 2500)
    } else {
      showDataLoading.value = true
      dataStatusText.value = t('globe.preparingData', { dataset: currentDatasetLabel.value || '' })
    }
  })
}

useHead({
  link: props.defaultDataset === 'endangered-species'
    ? [
        { rel: 'preconnect', href: 'https://api.maptiler.com' },
      ]
    : [],
})

function initMap() {
  base.initMap(true)
}

const {
  t, localeNames, baseURL, isMobile, isEmbed, hideControls, noControl, hideAll,
  activeDataset, projectsData, speciesIndexData, visibleProjects, crewsData, crewLocationsData,
  selectedSpeciesGroups,
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
  openCrewOverlay, closeCrewOverlay, openCrewLocationOverlay,
  handleSpeciesSelected,
  handleFilterChange, handleProjectFilterChange,
  handleSearchOpenChange, handleSpeciesGroupSelection,
  toggleLegendGroup, navigateToLocation,
  clusterPanelItems, clusterPanelDataset, clusterPanelOpen, closeClusterPanel,
} = base

function selectClusterItem(item: ClusterResultItem) {
  // Disambiguation choice → open its details popup (navigating alone would be
  // a no-op for stacked markers sharing one coordinate).
  const loc = crewLocationsData.value.find(l => `${l.name}-${l.lat}-${l.lng}` === item.id)
  if (loc) {
    closeClusterPanel()
    openCrewLocationOverlay(loc)
    return
  }
  const region = crewsData.value.find(c => c.id === item.id)
  if (region) {
    closeClusterPanel()
    openCrewOverlay(region)
    return
  }
  const proj = projectsData.value.find(p => p.project_title === item.id)
  if (proj) {
    closeClusterPanel()
    openProjectOverlay(proj)
    return
  }
  const sp = speciesIndexData.value.find(s => s.id === item.id)
  if (sp) {
    closeClusterPanel()
    handleSpeciesSelected(sp)
    return
  }
  navigateToLocation(item.coordinates[1], item.coordinates[0])
}

const isLoading = computed(() => base.isLoading.value)

</script>

<style>
@keyframes pulse { 0% { transform: scale(0.95); opacity: 0; } 50% { transform: scale(1.15); opacity: 0.4; } 100% { transform: scale(0.95); opacity: 0; } }
.maplibregl-map { background-color: transparent !important; touch-action: none !important; }
@keyframes cluster-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes mini-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
</style>
