<template>
  <div class="w-full h-[100svh] relative overflow-hidden bg-black" role="main" aria-label="3D Globe Visualization">
    <Transition name="fade">
      <div v-if="isLoading" class="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
        <div class="relative mb-5 xs:mb-6">
          <div class="w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <div class="absolute inset-0 w-16 xs:w-20 h-16 xs:h-20 rounded-full border-4 border-white/10 border-b-white/50 animate-spin" style="animation-delay: 0.5s; animation-direction: reverse" />
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

    <canvas ref="starCanvasRef" class="absolute inset-0 z-0 pointer-events-none" aria-hidden="true"></canvas>

    <div class="absolute inset-0 pointer-events-none z-10 bg-black/20"></div>
    <div class="absolute inset-0 pointer-events-none z-10 bg-black/5 dark:bg-white/5"></div>
    <div class="absolute inset-0 pointer-events-none z-10">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-black/5 dark:bg-white/5 blur-3xl animate-pulse-slow" />
    </div>
    <div class="absolute inset-0 pointer-events-none z-20" :style="{ boxShadow: `inset 0 0 clamp(40px, 12vw, 150px) clamp(8px, 3vw, 30px) rgba(0,0,0,0.7)` }"></div>

    <div class="absolute inset-0 pointer-events-none opacity-[0.03]" :style="{ zIndex: 'calc(var(--z-map-effects) + 1)', backgroundImage: `image-set(url(${baseURL}grid-overlay.png) 1x, url(${baseURL}grid-overlay.png) 2x)`, backgroundRepeat: 'repeat' }" />
    <div class="absolute inset-0 pointer-events-none opacity-[0.02] animate-noise-bg" :style="{ zIndex: 'calc(var(--z-map-effects) + 2)', backgroundImage: `image-set(url(${baseURL}noise.png) 1x, url(${baseURL}noise.png) 2x)`, backgroundRepeat: 'repeat' }" />
    <div aria-hidden="true" class="absolute inset-0 pointer-events-none opacity-[0.02]" :style="{ zIndex: 'calc(var(--z-map-effects) + 3)', backgroundImage: `image-set(url(${baseURL}scanline.gif) 1x, url(${baseURL}scanline.gif) 2x)`, backgroundRepeat: 'repeat' }" />

    <canvas v-if="showHexGrid" ref="hexCanvasRef" aria-hidden="true" class="absolute inset-0 w-full h-full pointer-events-none opacity-15" :style="{ zIndex: 'var(--z-map-hex-grid)' }" />

    <div ref="mapContainerRef" class="w-full h-full" :style="{ zIndex: 'var(--z-map-base)' }" />
    <slot name="overlays" />

    <div v-if="isMobile && !hideAll" class="absolute top-2 xs:top-3 left-1/2 -translate-x-1/2 pointer-events-none px-2" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[10vh] xs:max-h-[12vh] max-w-[clamp(10rem,24vw,16rem)] object-contain" loading="lazy" />
    </div>
    <div v-else-if="!hideAll" class="absolute top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" :class="hideControls ? '-left-4' : 'left-0'" :style="{ zIndex: 'var(--z-map-banner)' }">
      <img :src="`${baseURL}white-banner.png`" alt="Earth Guardians" class="h-auto w-auto max-h-[15vh] max-w-[clamp(10rem,24vw,16rem)] -rotate-90 origin-center" loading="lazy" />
    </div>

    <DataBubble v-if="!hideAll && activeDataset !== 'active-crews' && activeDataset !== 'vulcan-observatory'" :mode="activeDataset === 'endangered-species' ? 'species' : 'projects'" :selected-groups="selectedSpeciesGroups" :projects="visibleProjects" position-top="auto" position-bottom="clamp(1rem, 4vh, 2rem)" @toggle-group="toggleLegendGroup" />

    <MapControls v-if="activeDataset !== 'vulcan-observatory'" :is-globe-view="true" :show-hex-grid="showHexGrid" :show-connections="showConnections" :dataset="activeDataset" :projects="activeDataset === 'project-grants' ? visibleProjects : undefined" :species="activeDataset === 'endangered-species' ? speciesIndexData : undefined" :filter-open="showFilterPanel" :is-embed="hideControls" :style="{ zIndex: 'var(--z-map-ui-controls)' }" @toggle-hex-grid="showHexGrid = !showHexGrid" @toggle-connections="toggleConnections" @toggle-filter="!hideControls && (showFilterPanel = !showFilterPanel)" @navigate="navigateToLocation" />

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

    <div v-if="showSpeciesOverlay" class="species-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Species details" @click.self="closeSpeciesOverlay" @keydown.esc="closeSpeciesOverlay">
      <button ref="speciesCloseBtnRef" class="species-popup-close-btn-fixed" @click="closeSpeciesOverlay" aria-label="Close species details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div v-if="availablePopupLocales.length > 0" class="species-popup-lang-bar">
        <button v-for="loc in availablePopupLocales" :key="loc" class="species-popup-lang-btn" :class="{ active: popupLocale === loc }" @click="popupLocale = loc" :aria-label="`Show in ${(localeNames as Record<string, string>)[loc] || loc}`">{{ (localeNames as Record<string, string>)[loc] || loc }}</button>
      </div>
      <div class="species-popup-content-fixed" v-html="speciesOverlayHTML"></div>
    </div>

    <div v-if="showProjectOverlay" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Project details" @click.self="closeProjectOverlay" @keydown.esc="closeProjectOverlay">
      <button ref="projectCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeProjectOverlay" aria-label="Close project details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="project-popup-content-fixed" v-html="projectOverlayHTML"></div>
    </div>

    <div v-if="showCrewOverlay" class="project-popup-overlay-fixed" role="dialog" aria-modal="true" aria-label="Crew details" @click.self="closeCrewOverlay" @keydown.esc="closeCrewOverlay">
      <button ref="crewCloseBtnRef" class="project-popup-close-btn-fixed" @click="closeCrewOverlay" aria-label="Close crew details"><Icon name="lucide:x" class="h-6 w-6" /></button>
      <div class="project-popup-content-fixed" v-html="crewOverlayHTML"></div>
    </div>

    <SpeciesPanel @species-selected="handleSpeciesSelected" />
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'
import type maplibregl from 'maplibre-gl'
import type { MapBaseProps } from '@/composables/useMapBase'
import { useMapBase } from '@/composables/useMapBase'

const DataBubble = defineAsyncComponent(() => import('~/components/DataBubble.vue'))
const MapControls = defineAsyncComponent(() => import('~/components/MapControls.vue'))
const SpeciesPanel = defineAsyncComponent(() => import('~/components/SpeciesPanel.vue'))

const props = withDefaults(defineProps<MapBaseProps>(), {
  defaultDataset: 'project-grants',
  showHexGrid: true,
})

const emit = defineEmits<{ mapInit: [map: maplibregl.Map] }>()

const mapContainerRef = ref<HTMLElement | null>(null)
const hexCanvasRef = ref<HTMLCanvasElement | null>(null)
const starCanvasRef = ref<HTMLCanvasElement | null>(null)

let starAnimationId: number | null = null
let rotationAnimationId: number | null = null
let isUserInteracting = false
let interactionTimeout: ReturnType<typeof setTimeout> | null = null
let visibilityHandler: (() => void) | null = null

function initStarCanvas() {
  const canvas = starCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const stars: { x: number; y: number; r: number; a: number; da: number }[] = []
  const count = 120
  canvas.width = canvas.offsetWidth * devicePixelRatio
  canvas.height = canvas.offsetHeight * devicePixelRatio
  ctx.scale(devicePixelRatio, devicePixelRatio)
  const w = canvas.offsetWidth
  const h = canvas.offsetHeight
  for (let i = 0; i < count; i++) {
    stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.5, a: Math.random(), da: (Math.random() - 0.5) * 0.02 })
  }
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
}

function startAutoRotate(map: maplibregl.Map) {
  if (rotationAnimationId !== null) return
  function rotate() {
    if (!map || !base.isMounted || isUserInteracting) { rotationAnimationId = null; return }
    if (document.hidden) { rotationAnimationId = requestAnimationFrame(rotate); return }
    const center = map.getCenter()
    map.easeTo({ center: [center.lng - 0.15, center.lat], duration: 0, easing: (t) => t })
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
    setTimeout(() => initStarCanvas(), 500)
    startAutoRotate(map)
    function pauseAutoRotate() { isUserInteracting = true; stopAutoRotate(); if (interactionTimeout) clearTimeout(interactionTimeout) }
    function resumeAutoRotate() {
      isUserInteracting = false
      if (interactionTimeout) clearTimeout(interactionTimeout)
      interactionTimeout = setTimeout(() => { isUserInteracting = false; startAutoRotate(map) }, 3000)
    }
    map.on('dragstart', pauseAutoRotate)
    map.on('dragend', resumeAutoRotate)
    map.on('wheel', () => { pauseAutoRotate(); interactionTimeout = setTimeout(() => { isUserInteracting = false; startAutoRotate(map) }, 3000) })
    map.on('touchstart', pauseAutoRotate)
  },
  onBeforeCleanup: () => {
    stopAutoRotate()
    stopStarCanvas()
    if (interactionTimeout) clearTimeout(interactionTimeout)
    if (visibilityHandler) { document.removeEventListener('visibilitychange', visibilityHandler); visibilityHandler = null }
  },
})

function initMap() {
  base.initMap()
}

const {
  t, localeNames, baseURL, isMobile, isEmbed, hideControls, noControl, hideAll,
  activeDataset, projectsData, speciesIndexData, visibleProjects,
  selectedSpeciesGroups,
  hasError, errorMessage, noWebglSupport, isLoading,
  showHexGrid, showFilterPanel,
  showConnections, toggleConnections,
  showSpeciesOverlay, showProjectOverlay, showCrewOverlay,
  speciesOverlayHTML, projectOverlayHTML, crewOverlayHTML,
  popupLocale, availablePopupLocales,
  speciesCloseBtnRef, projectCloseBtnRef, crewCloseBtnRef,
  openSpeciesOverlay, closeSpeciesOverlay,
  openProjectOverlay, closeProjectOverlay,
  openCrewOverlay, closeCrewOverlay,
  handleSpeciesSelected,
  toggleLegendGroup, navigateToLocation,
} = base
</script>

<style>
@keyframes pulse { 0% { transform: scale(0.95); opacity: 0; } 50% { transform: scale(1.15); opacity: 0.4; } 100% { transform: scale(0.95); opacity: 0; } }
.maplibregl-map { background-color: transparent !important; touch-action: none !important; }
@keyframes cluster-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes mini-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
</style>
