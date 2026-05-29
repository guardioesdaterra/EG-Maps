import { shallowRef } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import type { ProjectData, Species } from '@/lib/types'
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import { GROUP_COLORS, isValidCoordinate } from '@/lib/map-utils'
import {
  getMarkerImageUrl,
  getMarkerPlaceholder,
  getProjectPlaceholder,
  preloadSpeciesImages,
} from '@/lib/image-utils'

export interface MarkerMetrics {
  hitSize: number
  visualSize: number
  color: string
  centerSize: number
  imageUrl?: string
  originalImageUrl?: string
  group?: string
}

export function getUnifiedMarkerMetrics(options: {
  color: string
  size: number
  centerScale?: number
  imageUrl?: string
  originalImageUrl?: string
  group?: string
}): MarkerMetrics {
  const hitSize = Math.max(34, Math.round(options.size + 12))
  const visualSize = Math.round(options.size)
  return {
    hitSize,
    visualSize,
    color: options.color,
    centerSize: Math.max(7, Math.round(visualSize * (options.centerScale ?? 0.42))),
    imageUrl: options.imageUrl,
    originalImageUrl: options.originalImageUrl,
    group: options.group,
  }
}

export function createUnifiedMarkerElement(metrics: MarkerMetrics, baseURL?: string) {
  const el = document.createElement('div')
  el.style.width = `${metrics.hitSize}px`
  el.style.height = `${metrics.hitSize}px`
  el.style.display = 'flex'
  el.style.justifyContent = 'center'
  el.style.alignItems = 'center'
  el.style.cursor = 'pointer'
  el.style.pointerEvents = 'auto'
  el.style.zIndex = '10'

  const inner = document.createElement('div')
  inner.style.width = `${metrics.visualSize}px`
  inner.style.height = `${metrics.visualSize}px`
  inner.style.borderRadius = '50%'
  inner.style.backgroundColor = 'rgba(0, 0, 0, 0.82)'
  inner.style.border = '2px solid rgba(255, 255, 255, 0.86)'
  inner.style.boxShadow = `0 0 ${Math.max(8, metrics.visualSize * 0.5)}px ${metrics.color}, 0 0 1.5px #fff`
  inner.style.display = 'flex'
  inner.style.justifyContent = 'center'
  inner.style.alignItems = 'center'
  inner.style.position = 'relative'
  inner.style.overflow = 'hidden'
  inner.style.transition = 'transform 160ms ease, box-shadow 160ms ease, width 160ms ease, height 160ms ease'
  inner.style.transformOrigin = 'center center'
  inner.style.transform = 'scale(1)'

  if (metrics.originalImageUrl) {
    const thumbUrl = getMarkerImageUrl(metrics.originalImageUrl, baseURL)
    inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${thumbUrl}")`
    inner.style.backgroundSize = 'cover'
    inner.style.backgroundPosition = 'center'
  } else if (metrics.imageUrl) {
    inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${metrics.imageUrl}")`
    inner.style.backgroundSize = 'cover'
    inner.style.backgroundPosition = 'center'
  } else {
    inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${getMarkerPlaceholder(metrics.group)}")`
    inner.style.backgroundSize = 'cover'
    inner.style.backgroundPosition = 'center'
  }

  el.appendChild(inner)

  el.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.28)'
    inner.style.boxShadow = `0 0 ${Math.max(16, metrics.visualSize * 0.9)}px ${metrics.color}, 0 0 4px #fff`
    el.style.zIndex = '100'
  })
  el.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)'
    inner.style.boxShadow = `0 0 ${Math.max(8, metrics.visualSize * 0.5)}px ${metrics.color}, 0 0 1.5px #fff`
    el.style.zIndex = '10'
  })

  return el
}

export function createProjectMarkerElement(project: ProjectData, baseURL?: string): HTMLElement {
  const totalBeneficiaries = project.direct_beneficiaries + project.indirect_beneficiaries
  const beneficiaryFactor = Math.min(Math.max(totalBeneficiaries / 10000, 0.5), 5)
  const markerSize = 15 + beneficiaryFactor * 10
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)
  return createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color,
    size: markerSize,
    group: getProjectPlaceholder(project.project_title),
  }), baseURL)
}

export function createSpeciesMarkerElement(species: Species, baseURL?: string): HTMLElement {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64032'
  return createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color,
    size: species.imageUrl ? 26 : 20,
    centerScale: 0.62,
    originalImageUrl: species.imageUrl || undefined,
    group: species.taxonomicGroup,
  }), baseURL)
}

export function useMapMarkers(
  map: Ref<MapLibreMap | null>,
  baseURL?: string
) {
  const markers = shallowRef<maplibregl.Marker[]>([])
  let pendingVisibilityUpdate = false

  function rebuildMarkers(
    dataset: 'project-grants' | 'endangered-species',
    projects: ProjectData[],
    species: Species[],
    isMobile: boolean,
    _onProjectClick?: (_project: ProjectData) => void,
    _onSpeciesClick?: (_species: Species) => void,
  ) {
    if (!map.value) return
    clearMarkers()

    if (dataset === 'project-grants') {
      projects.forEach((project) => {
        if (!isValidCoordinate(project.latitude, project.longitude)) return
        const el = createProjectMarkerElement(project, baseURL)
        el.style.cursor = 'pointer'
        el.addEventListener('click', () => _onProjectClick?.(project))
        const marker: maplibregl.Marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        marker.setLngLat([project.longitude, project.latitude])
        marker.addTo(map.value!)
        markers.value.push(marker as maplibregl.Marker)
      })
    } else {
      const speciesToRender = species.filter(s => isValidCoordinate(s.lat, s.lng))
      const imageUrls = speciesToRender.map(s => s.imageUrl).filter(Boolean) as string[]
      preloadSpeciesImages(imageUrls, true, baseURL)
      speciesToRender.forEach((sp) => {
        const el = createSpeciesMarkerElement(sp, baseURL)
        el.style.cursor = 'pointer'
        el.setAttribute('role', 'button')
        el.setAttribute('tabindex', '0')
        el.setAttribute('aria-label', `${sp.commonName} - ${sp.taxonomicGroup}`)
        el.addEventListener('click', () => _onSpeciesClick?.(sp))
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        marker.setLngLat([sp.lng, sp.lat])
        marker.addTo(map.value!)
        markers.value.push(marker)
      })
    }

    updateMarkerVisibility()
  }

  function clearMarkers() {
    markers.value.forEach(m => m.remove())
    markers.value = []
  }

  function updateMarkerVisibility() {
    if (!map.value) return
    const canvas = map.value.getCanvas()
    const margin = 50
    const bounds = {
      minX: -margin, maxX: canvas.width + margin,
      minY: -margin, maxY: canvas.height + margin,
    }
    markers.value.forEach(marker => {
      const el = marker.getElement()
      try {
        const point = map.value!.project(marker.getLngLat())
        if (!point || isNaN(point.x) || isNaN(point.y)) {
          el.style.display = 'none'
          el.style.pointerEvents = 'none'
          return
        }
        const isVisible = point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY
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

  function scheduleVisibilityUpdate() {
    if (!pendingVisibilityUpdate) {
      pendingVisibilityUpdate = true
      requestAnimationFrame(() => {
        updateMarkerVisibility()
        pendingVisibilityUpdate = false
      })
    }
  }

  return {
    markers,
    rebuildMarkers,
    clearMarkers,
    updateMarkerVisibility,
    scheduleVisibilityUpdate,
  }
}
