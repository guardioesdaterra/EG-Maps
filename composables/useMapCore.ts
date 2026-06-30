import type { Ref } from 'vue'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { Species } from '@/lib/types'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { MARKER_VISIBILITY_MARGIN, CLUSTER_REBUILD_THRESHOLD, SPECIES_COORD_TOLERANCE } from '@/lib/constants'
import { findSpeciesAtCoord as _findSpeciesAtCoord, getLocalizedSpecies as _getLocalizedSpecies, getTaxonomicGroupLabels as _getTaxonomicGroupLabels } from '@/lib/species-utils'

export function useMapCore(locale: Ref<string>, t: (_key: string) => string) {

  function getTaxonomicGroupLabels(): Record<string, string> {
    return _getTaxonomicGroupLabels(t)
  }

  function getLocalizedSpecies(species: Species | SpeciesIndexItem, overLocale?: string): Species {
    return _getLocalizedSpecies(species, overLocale ?? locale.value, 'en')
  }

  function findSpeciesAtCoord(lat: number, lng: number, source: SpeciesIndexItem[]): SpeciesIndexItem[] {
    return _findSpeciesAtCoord(lat, lng, source, SPECIES_COORD_TOLERANCE)
  }

  function applySpeciesFilters(speciesIndex: SpeciesIndexItem[], selectedGroups: string[]): SpeciesIndexItem[] {
    if (selectedGroups.length === 0) return speciesIndex
    return speciesIndex.filter(s => selectedGroups.includes(s.taxonomicGroup))
  }

  // ── Marker visibility ──

  function updateMarkerVisibility(
    mapInstance: MapLibreMap,
    markerList: Marker[],
  ) {
    const canvas = mapInstance.getCanvas()
    const margin = MARKER_VISIBILITY_MARGIN
    const bounds = {
      minX: -margin,
      maxX: canvas.width + margin,
      minY: -margin,
      maxY: canvas.height + margin,
    }

    markerList.forEach(marker => {
      const el = marker.getElement()
      try {
        const point = mapInstance.project(marker.getLngLat())
        if (!point || isNaN(point.x) || isNaN(point.y)) {
          el.style.display = 'none'
          el.style.pointerEvents = 'none'
          return
        }

        const isVisible =
          point.x >= bounds.minX &&
          point.x <= bounds.maxX &&
          point.y >= bounds.minY &&
          point.y <= bounds.maxY

        const wasVisible = el.style.display !== 'none'
        if (isVisible !== wasVisible) {
          el.style.display = isVisible ? '' : 'none'
          el.style.pointerEvents = isVisible ? '' : 'none'
        }
      } catch {
        el.style.display = 'none'
        el.style.pointerEvents = 'none'
      }
    })
  }

  // ── Cluster rebuild logic ──

  function shouldRebuildClusters(
    mapInstance: MapLibreMap,
    currentZoom: number,
    lastZoom: number,
    lastCenter: { lng: number; lat: number } | null,
  ): boolean {
    if (currentZoom !== lastZoom) return true
    const bounds = mapInstance.getBounds()
    const center = mapInstance.getCenter()
    const lngSpan = bounds.getEast() - bounds.getWest()
    const latSpan = bounds.getNorth() - bounds.getSouth()
    return (
      !lastCenter ||
      Math.abs(center.lng - lastCenter.lng) > lngSpan * CLUSTER_REBUILD_THRESHOLD ||
      Math.abs(center.lat - lastCenter.lat) > latSpan * CLUSTER_REBUILD_THRESHOLD
    )
  }

  return {
    getLocalizedSpecies,
    getTaxonomicGroupLabels,
    findSpeciesAtCoord,
    applySpeciesFilters,
    updateMarkerVisibility,
    shouldRebuildClusters,
  }
}
