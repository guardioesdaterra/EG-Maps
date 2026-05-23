import { ref, type Ref } from 'vue'
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
  const isMobile = useMediaQuery('(max-width: 768px)')

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
    particleSystem = createMapParticleSystem({
      map: map.value,
      container: containerRef.value,
      getFeatures: () => connectionFeatures.value,
      isMobile: () => isMobile.value,
      zIndex: 2,
    })
    particleSystem.start()
  }

  function toggleConnections() {
    showConnections.value = !showConnections.value
  }

  function cleanup() {
    cleanupParticles()
    if (map.value) {
      syncMapConnectionLayers(map.value, [])
    }
    connectionFeatures.value = []
  }

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
