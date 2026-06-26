import type { Ref } from 'vue'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { Species } from '@/lib/types'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { GROUP_COLORS } from '@/lib/map-utils'
import { MARKER_VISIBILITY_MARGIN, CLUSTER_REBUILD_THRESHOLD, SPECIES_COORD_TOLERANCE } from '@/lib/constants'

/**
 * Shared map logic extracted from UnifiedMap and GlobeView.
 * Eliminates ~200 lines of duplicated code across both components.
 */
export function useMapCore(locale: Ref<string>, t: (_key: string) => string) {

  // ── i18n helpers ──

  function taxonomicGroupLabel(group: string) {
    return t(`taxonomy.${group}`)
  }

  function getTaxonomicGroupLabels(): Record<string, string> {
    return Object.keys(GROUP_COLORS).reduce<Record<string, string>>((labels, group) => {
      labels[group] = taxonomicGroupLabel(group)
      return labels
    }, {})
  }

  function getLocalizedSpecies(species: Species | SpeciesIndexItem, overLocale?: string): Species {
    if (!('content' in species)) {
      return {
        ...species,
        imageUrl: species.imageUrl ?? '',
        region: '',
        ecosystem: '',
        imageCredit: '',
        ecosystemNeeds: undefined,
        actions: undefined,
        content: {},
      }
    }

    const targetLocale = overLocale ?? locale.value
    const content = species.content?.[targetLocale] ?? species.content?.en
    if (!content) return species

    return {
      ...species,
      description: content.description ?? species.description,
      endangerment: content.endangerment ?? species.endangerment,
      ecosystemNeeds: content.ecosystemNeeds ?? species.ecosystemNeeds,
      actions: content.actions ?? species.actions,
      region: content.region ?? species.region,
    }
  }

  // ── Species data helpers ──

  function findSpeciesAtCoord(
    lat: number,
    lng: number,
    source: SpeciesIndexItem[],
  ): SpeciesIndexItem[] {
    return source.filter(s =>
      Math.abs(s.lat - lat) < SPECIES_COORD_TOLERANCE &&
      Math.abs(s.lng - lng) < SPECIES_COORD_TOLERANCE
    )
  }

  function applySpeciesFilters(
    speciesIndex: SpeciesIndexItem[],
    selectedGroups: string[],
  ): SpeciesIndexItem[] {
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
