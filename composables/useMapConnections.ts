import { ref, onUnmounted, watch, type Ref } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ProjectData, Species } from '@/lib/types'
import type { CrewLocation } from '@/lib/crew-data'
import {
  buildMapConnectionFeatures,
  createMapParticleSystem,
  syncMapConnectionLayers,
  type MapConnectionFeature,
  type MapParticleSystem,
  type ParticleQualityConfig,
} from '@/lib/map-effects'
import { useMediaQuery } from '@/composables/useMediaQuery'

type SpeciesLike = { id: string; lat: number; lng: number; commonName: string; taxonomicGroup: string }

type MapGetter = MapLibreMap | null | (() => MapLibreMap | null)

function resolveMap(getter: MapGetter): MapLibreMap | null {
  return typeof getter === 'function' ? getter() : getter
}

export interface ConnectionOptions {
  zIndex?: number
  isMounted?: () => boolean
  /** Static quality config (used at construction) */
  quality?: ParticleQualityConfig
  /** Reactive quality settings — watcher will update running particle system */
  qualityRef?: Ref<ParticleQualityConfig | null>
  /** Reactive quality blur for connection line layers */
  qualityBlur?: Ref<number>
}

export function useMapConnections(
  map: MapGetter | Ref<MapLibreMap | null>,
  containerRef: Ref<HTMLElement | null>,
  options: ConnectionOptions = {},
) {
  const getMap = (): MapLibreMap | null =>
    map && typeof map === 'object' && 'value' in map ? (map as Ref<MapLibreMap | null>).value : resolveMap(map as MapGetter)

  const { zIndex = 2, isMounted = () => true, quality, qualityRef, qualityBlur } = options
  const showConnections = ref(true)
  const connectionFeatures = ref<MapConnectionFeature[]>([])
  let particleSystem: MapParticleSystem | null = null
  let isPaused = false
  let deferredSyncHandler: (() => void) | null = null
  let deferredSyncRetries = 0
  const MAX_DEFERRED_SYNC_RETRIES = 5
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Pause particles when off-screen
  let intersectionObserver: IntersectionObserver | null = null
  let visibilityHandler: (() => void) | null = null

  function setupVisibilityTracking() {
    if (!containerRef.value || intersectionObserver) return

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) {
          resumeParticles()
        } else {
          pauseParticles()
        }
      },
      { threshold: 0.01 }
    )
    intersectionObserver.observe(containerRef.value)

    visibilityHandler = () => {
      if (document.hidden) {
        pauseParticles()
      } else {
        resumeParticles()
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
  }

  function teardownVisibilityTracking() {
    intersectionObserver?.disconnect()
    intersectionObserver = null
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  function pauseParticles() {
    if (isPaused || !particleSystem) return
    isPaused = true
    particleSystem.stop()
  }

  function resumeParticles() {
    if (!isPaused || !particleSystem) return
    isPaused = false
    if (showConnections.value && connectionFeatures.value.length) {
      particleSystem.start()
    }
  }

  function addConnections(
    dataset: 'project-grants' | 'endangered-species' | 'active-crews',
    projects: ProjectData[],
    species: SpeciesLike[],
    crewLocations?: CrewLocation[],
  ) {
    cleanupParticles()
    cleanupDeferredSync()
    const m = getMap()
    if (!m) return

    if (!showConnections.value) {
      if (import.meta.dev) console.warn(`[useMapConnections] addConnections: disabled, clearing features`)
      connectionFeatures.value = []
      syncMapConnectionLayers(m, [], qualityBlur?.value)
      return
    }

    connectionFeatures.value = buildMapConnectionFeatures({
      dataset,
      projects,
      species,
      crewLocations,
      isMobile: isMobile.value,
    })

    if (import.meta.dev) console.warn(`[useMapConnections] addConnections: dataset=${dataset}, projects=${projects.length}, species=${species.length}, crewLocations=${crewLocations?.length ?? 0}, features=${connectionFeatures.value.length}`)

    if (connectionFeatures.value.length > 0 && !m.isStyleLoaded()) {
      scheduleDeferredSync(m)
    } else {
      syncMapConnectionLayers(m, connectionFeatures.value, qualityBlur?.value)
    }
  }

  function scheduleDeferredSync(m: MapLibreMap) {
    cleanupDeferredSync()
    deferredSyncRetries = 0

    deferredSyncHandler = () => {
      deferredSyncRetries++
      if (m.isStyleLoaded() || deferredSyncRetries >= MAX_DEFERRED_SYNC_RETRIES) {
        cleanupDeferredSync()
        syncMapConnectionLayers(m, connectionFeatures.value, qualityBlur?.value)
        return
      }
    }
    m.on('style.load', deferredSyncHandler)
  }

  function cleanupDeferredSync() {
    if (deferredSyncHandler) {
      const m = getMap()
      if (m) m.off('style.load', deferredSyncHandler)
      deferredSyncHandler = null
    }
  }

  function cleanupParticles() {
    particleSystem?.stop()
    particleSystem = null
    teardownVisibilityTracking()
  }

  let startRetries = 0
  const MAX_START_RETRIES = 5

  function startParticles() {
    const m = getMap()
    if (!showConnections.value || !m || !containerRef.value || !connectionFeatures.value.length) {
      if (import.meta.dev) console.warn(`[useMapConnections] startParticles: skipped (showConn=${showConnections.value}, map=${!!m}, container=${!!containerRef.value}, features=${connectionFeatures.value.length})`)
      return
    }
    if (!isMounted()) return

    if (!m.isStyleLoaded() && startRetries < MAX_START_RETRIES) {
      startRetries++
      if (import.meta.dev) console.warn(`[useMapConnections] startParticles: map not ready, retry ${startRetries}/${MAX_START_RETRIES}`)
      setTimeout(() => startParticles(), 300)
      return
    }
    startRetries = 0

    if (import.meta.dev) console.warn(`[useMapConnections] startParticles: starting with ${connectionFeatures.value.length} features`)
    cleanupParticles()
    isPaused = false
    particleSystem = createMapParticleSystem({
      map: m,
      container: containerRef.value,
      getFeatures: () => connectionFeatures.value,
      isMobile: () => isMobile.value,
      zIndex,
      quality: qualityRef?.value ?? quality,
    })
    particleSystem.start()
    setupVisibilityTracking()
  }

  function toggleConnections() {
    showConnections.value = !showConnections.value
  }

  function cleanup() {
    cleanupParticles()
    teardownVisibilityTracking()
    cleanupDeferredSync()
    const m = getMap()
    if (m) syncMapConnectionLayers(m, [])
    connectionFeatures.value = []
  }

  // Watch reactive quality changes and update running particle system + connection layers
  if (qualityRef) {
    watch(qualityRef, (newQ) => {
      if (particleSystem && newQ) {
        particleSystem.updateQuality(newQ)
      }
      // Re-sync connection layers if blur changed
      const m = getMap()
      if (m && connectionFeatures.value.length && qualityBlur) {
        syncMapConnectionLayers(m, connectionFeatures.value, qualityBlur.value)
      }
    }, { deep: true })
  }

  onUnmounted(() => {
    teardownVisibilityTracking()
  })

  return {
    showConnections,
    connectionFeatures,
    addConnections,
    startParticles,
    cleanupParticles,
    toggleConnections,
    cleanup,
  }
}
