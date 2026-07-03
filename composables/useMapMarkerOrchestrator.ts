import type { Ref } from 'vue'
import maplibregl from 'maplibre-gl'
import type { ProjectData } from '@/lib/types'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import type { Species } from '@/lib/map-utils'
import { isValidCoordinate } from '@/lib/map-utils'
import { preloadSpeciesImages } from '@/lib/image-utils'
import { useMapCluster, type ClusterPoint, type ClusterItem } from '@/composables/useMapCluster'
import {
  useGeoJSONMarkers,
  speciesIndexToGeoJSON,
  projectsToGeoJSON,
  type SpeciesIndexItem,
} from '@/composables/useGeoJSONMarkers'
import {
  createProjectMarkerElement,
  createSpeciesMarkerElement,
  createClusterMarkerElement,
  createCrewMarkerElement,
  createCrewLocationMarkerElement,
  createRareEarthMarkerElement,
} from '@/composables/useMapMarkers'
import { useMapCore } from '@/composables/useMapCore'
import { NATIVE_GEOJSON_THRESHOLD, MOBILE_PROJECT_LIMIT, MOBILE_SPECIES_LIMIT } from '@/lib/constants'

export interface OrchestratorCallbacks {
  openProjectOverlay: (_project: ProjectData) => void
  openSpeciesOverlay: (_species: Species | SpeciesIndexItem) => void
  openCrewOverlay: (_crew: CrewRegionData | CrewLocation) => void
  openCrewLocationOverlay?: (_crew: CrewLocation) => void
  openRareEarthOverlay?: (_feature: GeoJSON.Feature) => void
}

export interface OrchestratorOptions {
  map: Ref<maplibregl.Map | null> | (() => maplibregl.Map | null)
  locale: Ref<string>
  isMobile: Ref<boolean>
  baseURL: string
  defaultDataset: string
  callbacks: OrchestratorCallbacks
  isGlobe?: boolean
  /** Set to false to disable native GeoJSON clustering (default: true) */
  useNativeGeoJSON?: boolean
}

export function useMapMarkerOrchestrator(options: OrchestratorOptions) {
  const { locale, isMobile, baseURL, callbacks, isGlobe = false, useNativeGeoJSON = true } = options
  const t = (_k: string) => _k

  const mapCore = useMapCore(locale, t)
  const clusterer = useMapCluster()
  const geoJSONMarkers = useGeoJSONMarkers()

  const markers: maplibregl.Marker[] = []
  let lastClusterZoom = -1
  let lastBboxCenter: { lng: number; lat: number } | null = null
  const SOURCE_ID = isGlobe ? 'globe-species-markers' : 'species-markers'
  let geoJSONInitializedFor: 'project-grants' | 'endangered-species' | null = null
  let geoJSONSpeciesIndex: SpeciesIndexItem[] | null = null

  function getMap(): maplibregl.Map | null {
    if (typeof options.map === 'function') return options.map()
    return options.map.value
  }

  function applySpeciesFilters(speciesIndex: SpeciesIndexItem[], selectedGroups: string[]): SpeciesIndexItem[] {
    return mapCore.applySpeciesFilters(speciesIndex, selectedGroups)
  }

  function updateMarkerVisibility() {
    const m = getMap()
    if (!m) return
    mapCore.updateMarkerVisibility(m, markers)
  }

  function setupGeoJSONMarkers(
    activeDataset: string,
    projectsData: ProjectData[],
    speciesIndexData: SpeciesIndexItem[],
    speciesData: Species[],
    selectedSpeciesGroups: string[],
    forceReinit = false,
  ) {
    const m = getMap()
    if (!m || !useNativeGeoJSON) return
    if (!m.isStyleLoaded()) return
    if (activeDataset !== 'project-grants' && activeDataset !== 'endangered-species') return

    const dataset = activeDataset === 'project-grants' ? 'project-grants' : 'endangered-species'

    if (!forceReinit && geoJSONInitializedFor === dataset) {
      updateGeoJSONMarkerData(activeDataset, projectsData, speciesIndexData, speciesData, selectedSpeciesGroups)
      return
    }

    // Clean up old DOM markers
    markers.forEach(mm => mm.remove())
    markers.length = 0
    clusterer.destroy()

    geoJSONMarkers.init(m)

    if (dataset === 'project-grants') {
      const validProjects = projectsData.filter(p => isValidCoordinate(p.latitude, p.longitude))
      const geojson = projectsToGeoJSON(validProjects)
      geoJSONMarkers.addGeoJSONSource(SOURCE_ID, geojson, true)
      geoJSONMarkers.addClusterLayers(SOURCE_ID, 'project-grants')

      geoJSONMarkers.setupEventHandlers(
        SOURCE_ID,
        'project-grants',
        (props, _coords) => {
          const project = validProjects.find(p => p.project_title === props.id)
          if (project) callbacks.openProjectOverlay(project)
        },
        () => { /* flyTo handled inside setupEventHandlers */ }
      )
      geoJSONInitializedFor = 'project-grants'
    } else {
      let speciesIndex: SpeciesIndexItem[]

      if (geoJSONSpeciesIndex) {
        speciesIndex = geoJSONSpeciesIndex
      } else if (speciesIndexData.length > 0) {
        speciesIndex = speciesIndexData
        geoJSONSpeciesIndex = speciesIndex
      } else if (speciesData.length) {
        speciesIndex = speciesData.filter(s => isValidCoordinate(s.lat, s.lng)).map(s => ({
          id: s.id,
          commonName: s.commonName,
          scientificName: s.scientificName,
          taxonomicGroup: s.taxonomicGroup,
          category: s.category,
          lat: s.lat,
          lng: s.lng,
          imageUrl: s.imageUrl || null,
        }))
        geoJSONSpeciesIndex = speciesIndex
      } else {
        return
      }

      const filteredIndex = applySpeciesFilters(speciesIndex, selectedSpeciesGroups)
      const geojson = speciesIndexToGeoJSON(filteredIndex)
      geoJSONMarkers.addGeoJSONSource(SOURCE_ID, geojson, true)
      geoJSONMarkers.addClusterLayers(SOURCE_ID, 'endangered-species')

      geoJSONMarkers.setupEventHandlers(
        SOURCE_ID,
        'endangered-species',
        (props, coords) => {
          const [, lat] = coords
          const matches = mapCore.findSpeciesAtCoord(lat, coords[0], speciesIndex)
          if (matches.length > 1) {
            callbacks.openSpeciesOverlay(matches[0])
          } else {
            const speciesId = props.id as string
            const indexItem = speciesIndex.find(s => s.id === speciesId)
            if (indexItem) callbacks.openSpeciesOverlay(indexItem)
          }
        },
        (_, coords) => {
          const matches = mapCore.findSpeciesAtCoord(coords[1], coords[0], speciesIndex)
          if (matches.length > 1) {
            callbacks.openSpeciesOverlay(matches[0])
          }
        }
      )
      geoJSONInitializedFor = 'endangered-species'
    }

    lastClusterZoom = Math.floor(m.getZoom())
    const center = m.getCenter()
    lastBboxCenter = { lng: center.lng, lat: center.lat }
  }

  function updateGeoJSONMarkerData(
    activeDataset: string,
    projectsData: ProjectData[],
    speciesIndexData: SpeciesIndexItem[],
    speciesData: Species[],
    selectedSpeciesGroups: string[],
  ) {
    const m = getMap()
    if (!m || !geoJSONInitializedFor) return
    if (geoJSONInitializedFor === 'project-grants') {
      const validProjects = projectsData.filter(p => isValidCoordinate(p.latitude, p.longitude))
      geoJSONMarkers.updateData(SOURCE_ID, projectsToGeoJSON(validProjects))
    } else if (speciesIndexData.length) {
      geoJSONSpeciesIndex = speciesIndexData
      geoJSONMarkers.updateData(SOURCE_ID, speciesIndexToGeoJSON(applySpeciesFilters(speciesIndexData, selectedSpeciesGroups)))
    } else if (geoJSONSpeciesIndex) {
      const filteredIndex = applySpeciesFilters(geoJSONSpeciesIndex, selectedSpeciesGroups)
      geoJSONMarkers.updateData(SOURCE_ID, speciesIndexToGeoJSON(filteredIndex))
    } else if (speciesData.length) {
      const validSpecies = speciesData.filter(s => isValidCoordinate(s.lat, s.lng))
      geoJSONMarkers.updateData(SOURCE_ID, speciesIndexToGeoJSON(validSpecies.map(s => ({
        id: s.id,
        commonName: s.commonName,
        scientificName: s.scientificName,
        taxonomicGroup: s.taxonomicGroup,
        category: s.category,
        lat: s.lat,
        lng: s.lng,
        imageUrl: s.imageUrl || null,
      }))))
    }
  }

  function rebuildMarkers(
    activeDataset: string,
    projectsData: ProjectData[],
    speciesIndexData: SpeciesIndexItem[],
    speciesData: Species[],
    crewsData: CrewRegionData[],
    crewLocationsData: CrewLocation[],
    selectedSpeciesGroups: string[],
    rareEarthFeatures?: GeoJSON.Feature[],
  ) {
    const m = getMap()
    if (!m) return

    const currentZoom = m.getZoom()

    // Use native GeoJSON for large datasets
    if (useNativeGeoJSON && activeDataset === 'endangered-species' && speciesIndexData.length > NATIVE_GEOJSON_THRESHOLD) {
      setupGeoJSONMarkers(activeDataset, projectsData, speciesIndexData, speciesData, selectedSpeciesGroups)
      return
    }
    if (useNativeGeoJSON && activeDataset === 'project-grants' && projectsData.length > NATIVE_GEOJSON_THRESHOLD) {
      setupGeoJSONMarkers(activeDataset, projectsData, speciesIndexData, speciesData, selectedSpeciesGroups)
      return
    }

    // Clean up old markers
    markers.forEach(mm => mm.remove())
    markers.length = 0
    clusterer.destroy()

    if (activeDataset === 'project-grants') {
      const data = isMobile.value
        ? projectsData.slice(0, MOBILE_PROJECT_LIMIT)
        : projectsData
      const validProjects = data.filter(p => isValidCoordinate(p.latitude, p.longitude))

      const clusterItems = validProjects.map((p, i) => ({
        lng: p.longitude,
        lat: p.latitude,
        type: 'project' as const,
        index: i,
      }))

      clusterer.loadImmediate(clusterItems)

      const bounds = m.getBounds()
      const bbox: [number, number, number, number] = [
        bounds.getWest(), bounds.getSouth(),
        bounds.getEast(), bounds.getNorth(),
      ]
      const clusters = clusterer.getClusters(bbox, currentZoom)

      clusters.forEach((cp: ClusterPoint) => {
        if (cp.type === 'cluster') {
          const onItemClick = (item: ClusterItem) => {
            const project = validProjects[item.index]
            if (project) callbacks.openProjectOverlay(project)
          }
          const el = createClusterMarkerElement(activeDataset, cp.count, cp.items, onItemClick, validProjects)
          el.setAttribute('tabindex', '0')
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', `Cluster of ${cp.count} projects`)
          el.addEventListener('click', (e) => {
            if ((e.target as HTMLElement | null)?.classList.contains('cluster-mini-hover')) return
            if (m) {
              const zoom = Math.min(Math.max(clusterer.getClusterExpansionZoom(cp.clusterId), m.getZoom() + 1), m.getMaxZoom())
              m.flyTo({ center: [cp.lng, cp.lat], zoom, duration: 500, essential: true })
            }
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([cp.lng, cp.lat])
            .addTo(m)
          markers.push(marker)
        } else {
          const project = validProjects[cp.sourceIndex]
          if (!project) return
          const el = createProjectMarkerElement(project)
          el.style.cursor = 'pointer'
          el.setAttribute('tabindex', '0')
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', project.project_title)
          el.addEventListener('click', () => { callbacks.openProjectOverlay(project) })
          el.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); callbacks.openProjectOverlay(project) }
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([project.longitude, project.latitude])
            .addTo(m)
          markers.push(marker)
        }
      })
    } else if (activeDataset === 'vulcan-observatory' && rareEarthFeatures?.length) {
      const features = rareEarthFeatures

      const clusterItems = features.map((f, i) => {
        const coords = (f.geometry as GeoJSON.Point).coordinates
        return {
          lng: coords[0] as number,
          lat: coords[1] as number,
          type: 'rareEarth' as const,
          index: i,
        }
      })

      clusterer.loadImmediate(clusterItems)

      const bounds = m.getBounds()
      const bbox: [number, number, number, number] = [
        bounds.getWest(), bounds.getSouth(),
        bounds.getEast(), bounds.getNorth(),
      ]
      const clusters = clusterer.getClusters(bbox, currentZoom)

      clusters.forEach((cp: ClusterPoint) => {
        if (cp.type === 'cluster') {
          const onItemClick = (item: ClusterItem) => {
            const feature = features[item.index]
            if (feature) callbacks.openRareEarthOverlay?.(feature)
          }
          const el = createClusterMarkerElement(activeDataset, cp.count, cp.items, onItemClick, undefined, undefined, features)
          el.setAttribute('tabindex', '0')
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', `Cluster of ${cp.count} rare earth claims`)
          el.addEventListener('click', (e) => {
            if ((e.target as HTMLElement | null)?.classList.contains('cluster-mini-hover')) return
            if (m) {
              const zoom = Math.min(Math.max(clusterer.getClusterExpansionZoom(cp.clusterId), m.getZoom() + 1), m.getMaxZoom())
              m.flyTo({ center: [cp.lng, cp.lat], zoom, duration: 500, essential: true })
            }
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([cp.lng, cp.lat])
            .addTo(m)
          markers.push(marker)
        } else {
          const feature = features[cp.sourceIndex]
          if (!feature) return
          const el = createRareEarthMarkerElement(feature)
          el.style.cursor = 'pointer'
          el.setAttribute('tabindex', '0')
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', (feature.properties?.n as string) || 'Rare Earth claim')
          el.addEventListener('click', () => { callbacks.openRareEarthOverlay?.(feature) })
          el.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); callbacks.openRareEarthOverlay?.(feature) }
          })
          const markerCoords = (feature.geometry as GeoJSON.Point).coordinates
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([markerCoords[0] as number, markerCoords[1] as number])
            .addTo(m)
          markers.push(marker)
        }
      })
    } else if (activeDataset === 'active-crews') {
      const validCrews: (CrewLocation | CrewRegionData)[] = crewLocationsData.length
        ? crewLocationsData.filter(c => isValidCoordinate(c.lat, c.lng))
        : crewsData.filter(c => isValidCoordinate(c.latitude, c.longitude))

      const clusterItems = validCrews.map((c, i) => ({
        lng: 'lng' in c ? c.lng : c.longitude,
        lat: 'lat' in c ? c.lat : c.latitude,
        type: 'project' as const,
        index: i,
      }))

      clusterer.loadImmediate(clusterItems)

      const bounds = m.getBounds()
      const bbox: [number, number, number, number] = [
        bounds.getWest(), bounds.getSouth(),
        bounds.getEast(), bounds.getNorth(),
      ]
      const clusters = clusterer.getClusters(bbox, currentZoom)

      clusters.forEach((cp: ClusterPoint) => {
        if (cp.type === 'cluster') {
          const onItemClick = (item: ClusterItem) => {
            const crew = validCrews[item.index]
            if (crew) {
              if ('activeCrews' in crew) callbacks.openCrewOverlay(crew as CrewRegionData)
              else callbacks.openCrewLocationOverlay?.(crew as CrewLocation)
            }
          }
          const el = createClusterMarkerElement(activeDataset, cp.count, cp.items, onItemClick, undefined, undefined, undefined, validCrews.map(c => ({ lng: 'lng' in c ? c.lng : c.longitude, lat: 'lat' in c ? c.lat : c.latitude })))
          el.setAttribute('tabindex', '0')
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', `Cluster of ${cp.count} crew locations`)
          el.addEventListener('click', (e) => {
            if ((e.target as HTMLElement | null)?.classList.contains('cluster-mini-hover')) return
            if (m) {
              const zoom = Math.min(Math.max(clusterer.getClusterExpansionZoom(cp.clusterId), m.getZoom() + 1), m.getMaxZoom())
              m.flyTo({ center: [cp.lng, cp.lat], zoom, duration: 500, essential: true })
            }
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([cp.lng, cp.lat])
            .addTo(m)
          markers.push(marker)
        } else {
          const crew = validCrews[cp.sourceIndex]
          if (!crew) return
          const isLocation = 'name' in crew && 'lat' in crew && !('activeCrews' in crew)
          const crewStatus = isLocation ? (crew as CrewLocation).status : undefined
          const el = isLocation
            ? createCrewLocationMarkerElement(crew as CrewLocation)
            : createCrewMarkerElement(crew as CrewRegionData)
          el.style.cursor = 'pointer'
          el.setAttribute('tabindex', '0')
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', isLocation ? `${(crew as CrewLocation).name} - ${(crew as CrewLocation).city}, ${(crew as CrewLocation).country} (${crewStatus ?? 'active'})` : `${(crew as CrewRegionData).region} - ${(crew as CrewRegionData).activeCrews} active crews`)
          el.addEventListener('click', () => {
            if (isLocation) callbacks.openCrewLocationOverlay?.(crew as CrewLocation)
            else callbacks.openCrewOverlay(crew as CrewRegionData)
          })
          el.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (isLocation) callbacks.openCrewLocationOverlay?.(crew as CrewLocation)
              else callbacks.openCrewOverlay(crew as CrewRegionData)
            }
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(isLocation ? [(crew as CrewLocation).lng, (crew as CrewLocation).lat] : [(crew as CrewRegionData).longitude, (crew as CrewRegionData).latitude])
            .addTo(m)
          markers.push(marker)
        }
      })
    } else if (activeDataset === 'endangered-species' && speciesIndexData.length) {
      const data = isMobile.value
        ? speciesIndexData.slice(0, MOBILE_SPECIES_LIMIT)
        : speciesIndexData
      const speciesToRender = data.filter(s => isValidCoordinate(s.lat, s.lng))
      const imageUrls = speciesToRender.map(s => s.imageUrl).filter((url): url is string => url !== null)

      preloadSpeciesImages(imageUrls, true, baseURL)

      const clusterItems = speciesToRender.map((s, i) => ({
        lng: s.lng,
        lat: s.lat,
        type: 'species' as const,
        index: i,
      }))

      clusterer.loadImmediate(clusterItems)

      const bounds = m.getBounds()
      const bbox: [number, number, number, number] = [
        bounds.getWest(), bounds.getSouth(),
        bounds.getEast(), bounds.getNorth(),
      ]
      const clusters = clusterer.getClusters(bbox, currentZoom)

      clusters.forEach((cp: ClusterPoint) => {
        if (cp.type === 'cluster') {
          const onItemClick = (item: ClusterItem) => {
            const species = speciesToRender[item.index]
            if (species) callbacks.openSpeciesOverlay(species)
          }
          const el = createClusterMarkerElement(activeDataset, cp.count, cp.items, onItemClick, undefined, speciesToRender)
          el.setAttribute('tabindex', '0')
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', `Cluster of ${cp.count} species`)
          el.addEventListener('click', (e) => {
            if ((e.target as HTMLElement | null)?.classList.contains('cluster-mini-hover')) return
            if (m) {
              const zoom = Math.min(Math.max(clusterer.getClusterExpansionZoom(cp.clusterId), m.getZoom() + 1), m.getMaxZoom())
              m.flyTo({ center: [cp.lng, cp.lat], zoom, duration: 500, essential: true })
            }
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([cp.lng, cp.lat])
            .addTo(m)
          markers.push(marker)
        } else {
          const species = speciesToRender[cp.sourceIndex]
          if (!species) return
          const el = createSpeciesMarkerElement(species)
          el.style.cursor = 'pointer'
          el.setAttribute('tabindex', '0')
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', species.commonName)
          el.addEventListener('click', () => { callbacks.openSpeciesOverlay(species) })
          el.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); callbacks.openSpeciesOverlay(species) }
          })
          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([species.lng, species.lat])
            .addTo(m)
          markers.push(marker)
        }
      })
    }

    lastClusterZoom = Math.floor(currentZoom)
    if (m) {
      const c = m.getCenter()
      lastBboxCenter = { lng: c.lng, lat: c.lat }
    }
    updateMarkerVisibility()
  }

  function cleanup() {
    markers.forEach(m => m.remove())
    markers.length = 0
    clusterer.destroy()
    geoJSONMarkers.cleanup()
    geoJSONInitializedFor = null
    geoJSONSpeciesIndex = null
  }

  function resetState() {
    geoJSONInitializedFor = null
    geoJSONSpeciesIndex = null
    lastClusterZoom = -1
    lastBboxCenter = null
  }

  return {
    markers,
    clusterer,
    geoJSONMarkers,
    useNativeGeoJSON,
    lastClusterZoom,
    lastBboxCenter,
    geoJSONInitializedFor,
    geoJSONSpeciesIndex,
    rebuildMarkers,
    setupGeoJSONMarkers,
    updateGeoJSONMarkerData,
    updateMarkerVisibility,
    applySpeciesFilters,
    cleanup,
    resetState,
    mapCore,
  }
}
