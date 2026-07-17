/**
 * composables/useMapCore.ts
 * @why Core MapLibre map instance — tile server config, style setup, resize observer
 * @functions useMapCore
 * @deps @/lib/constants (MARKER_VISIBILITY_MARGIN, CLUSTER_REBUILD_THRESHOLD, SPECIES_COORD_TOLERANCE); @/lib/species-utils (findSpeciesAtCoord, getLocalizedSpecies, getTaxonomicGroupLabels)
 */
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

  function updateMarkerVisibility(
    mapInstance: MapLibreMap,
    markerList: Marker[],
  ) {
    const canvas = mapInstance.getCanvas()
    const mapBounds = mapInstance.getBounds()
    const px = MARKER_VISIBILITY_MARGIN
    const lngPerPx = (mapBounds.getEast() - mapBounds.getWest()) / canvas.clientWidth
    const latPerPx = (mapBounds.getNorth() - mapBounds.getSouth()) / canvas.clientHeight
    const lngMargin = px * lngPerPx
    const latMargin = px * latPerPx

    markerList.forEach(marker => {
      const el = marker.getElement()
      try {
        const lngLat = marker.getLngLat()
        const isOffScreen = lngLat.lng < mapBounds.getWest() - lngMargin ||
                            lngLat.lng > mapBounds.getEast() + lngMargin ||
                            lngLat.lat < mapBounds.getSouth() - latMargin ||
                            lngLat.lat > mapBounds.getNorth() + latMargin
        const isCurrentlyHidden = el.style.visibility === 'hidden'
        const shouldShow = !isOffScreen
        if (isCurrentlyHidden !== !shouldShow) {
          el.style.visibility = shouldShow ? 'visible' : 'hidden'
          el.style.pointerEvents = shouldShow ? 'auto' : 'none'
        }
      } catch {
        el.style.visibility = 'hidden'
        el.style.pointerEvents = 'none'
      }
    })
  }

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
