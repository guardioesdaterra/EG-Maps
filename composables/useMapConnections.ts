import { ref, onUnmounted, type Ref } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ProjectData, Species } from '@/lib/types'
import {
  buildMapConnectionFeatures,
  createMapParticleSystem,
  syncMapConnectionLayers,
  type MapConnectionFeature,
  type MapParticleSystem,
} from '@/lib/map-effects'
import { useMediaQuery } from '@/composables/useMediaQuery'

export function useMapConnections(
  map: Ref<MapLibreMap | null>,
  containerRef: Ref<HTMLElement | null>
) {
  const showConnections = ref(true)
  const connectionFeatures = ref<MapConnectionFeature[]>([])
  let particleSystem: MapParticleSystem | null = null
  let isPaused = false
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Pause particles when off-screen
  let intersectionObserver: IntersectionObserver | null = null
  let visibilityHandler: (() => void) | null = null

  function setupVisibilityTracking() {
    if (!containerRef.value) return

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
    dataset: 'project-grants' | 'endangered-species',
    projects: ProjectData[],
    species: Species[],
  ) {
    cleanupParticles()
    if (!map.value) return

    if (!showConnections.value) {
      connectionFeatures.value = []
      syncMapConnectionLayers(map.value, [])
      return
    }

    connectionFeatures.value = buildMapConnectionFeatures({
      dataset,
      projects,
      species,
      isMobile: isMobile.value,
    })

    syncMapConnectionLayers(map.value, connectionFeatures.value)
  }

  function cleanupParticles() {
    particleSystem?.stop()
    particleSystem = null
  }

  function startParticles() {
    if (!showConnections.value || !map.value || !containerRef.value || !connectionFeatures.value.length) return
    cleanupParticles()
    isPaused = false
    particleSystem = createMapParticleSystem({
      map: map.value,
      container: containerRef.value,
      getFeatures: () => connectionFeatures.value,
      isMobile: () => isMobile.value,
      zIndex: 2,
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
    if (map.value) {
      syncMapConnectionLayers(map.value, [])
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
