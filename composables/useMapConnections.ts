import { ref, onUnmounted, type Ref } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ProjectData, Species } from '@/lib/types'
import type { CrewLocation } from '@/lib/crew-data'
import {
  buildMapConnectionFeatures,
  createMapParticleSystem,
  syncMapConnectionLayers,
  type MapConnectionFeature,
  type MapParticleSystem,
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
}

export function useMapConnections(
  map: MapGetter | Ref<MapLibreMap | null>,
  containerRef: Ref<HTMLElement | null>,
  options: ConnectionOptions = {},
) {
  const getMap = (): MapLibreMap | null =>
    map && typeof map === 'object' && 'value' in map ? (map as Ref<MapLibreMap | null>).value : resolveMap(map as MapGetter)

  const { zIndex = 2, isMounted = () => true } = options
  const showConnections = ref(true)
  const connectionFeatures = ref<MapConnectionFeature[]>([])
  let particleSystem: MapParticleSystem | null = null
  let isPaused = false
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
    const m = getMap()
    if (!m) return

    if (!showConnections.value) {
      if (import.meta.dev) console.warn(`[useMapConnections] addConnections: disabled, clearing features`)
      connectionFeatures.value = []
      syncMapConnectionLayers(m, [])
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
    syncMapConnectionLayers(m, connectionFeatures.value)
  }

  function cleanupParticles() {
    particleSystem?.stop()
    particleSystem = null
    teardownVisibilityTracking()
  }

  function startParticles() {
    const m = getMap()
    if (!showConnections.value || !m || !containerRef.value || !connectionFeatures.value.length) {
      if (import.meta.dev) console.warn(`[useMapConnections] startParticles: skipped (showConn=${showConnections.value}, map=${!!m}, container=${!!containerRef.value}, features=${connectionFeatures.value.length})`)
      return
    }
    if (!isMounted()) return
    if (import.meta.dev) console.warn(`[useMapConnections] startParticles: starting with ${connectionFeatures.value.length} features`)
    cleanupParticles()
    isPaused = false
    particleSystem = createMapParticleSystem({
      map: m,
      container: containerRef.value,
      getFeatures: () => connectionFeatures.value,
      isMobile: () => isMobile.value,
      zIndex,
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
    const m = getMap()
    if (m) {
      syncMapConnectionLayers(m, [])
    }
    connectionFeatures.value = []
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
