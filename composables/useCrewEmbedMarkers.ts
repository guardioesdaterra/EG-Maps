/**
 * composables/useCrewEmbedMarkers.ts
 * @why Active-crews markers for the Squarespace embed.
 *
 *       Renders a GPU-friendly GeoJSON source for crew *regions* (mosaic
 *       bubbles — up to 8 per region, arranged in a concentric layout)
 *       and crew *locations* (unclustered dots). Mosaic bubbles fade out
 *       on zoom-in while location dots fade in, creating an expanding
 *       separation effect. Click → emits a `host:open` postMessage.
 *
 * @functions useCrewEmbedMarkers
 * @connections composables/useSquarespaceEmbed.ts, pages/squarespace/active-crews.vue
 */
import { ref, onBeforeUnmount, type Ref } from 'vue'
import type {
  Map as MapLibreMap,
  GeoJSONSource,
  ExpressionSpecification,
  MapLayerMouseEvent,
} from 'maplibre-gl'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'

const REGION_SOURCE = 'eg-embed-crew-regions'
const REGION_MOSAIC_GLOW = 'eg-embed-crew-region-glow'
const REGION_MOSAIC_DOT = 'eg-embed-crew-region-dot'
const REGION_MOSAIC_LABEL = 'eg-embed-crew-region-label'
const LOCATION_SOURCE = 'eg-embed-crew-locations'
const LOCATION_HALO = 'eg-embed-crew-location-halo'
const LOCATION_DOT = 'eg-embed-crew-location-dot'

const MOSAIC_RADIUS_DEG = 0.045
const ZOOM_MIN = 2
const ZOOM_MAX = 7
const MAX_BUBBLES = 8

export interface CrewEmbedPopup {
  kind: 'region' | 'location'
  region?: CrewRegionData
  location?: CrewLocation
  point: { x: number; y: number }
}

export interface UseCrewEmbedMarkersOptions {
  mapRef: Ref<MapLibreMap | null>
  regions: Ref<CrewRegionData[]> | CrewRegionData[]
  locations: Ref<CrewLocation[]> | CrewLocation[]
  onPopup?: (popup: CrewEmbedPopup) => void
  accent?: string
}

export interface UseCrewEmbedMarkersApi {
  isReady: Readonly<Ref<boolean>>
  update: () => void
  install: () => void
  destroy: () => void
}

function computeMosaicPositions(count: number, centerLat: number, centerLng: number) {
  const latRad = centerLat * Math.PI / 180
  const lngScale = Math.max(Math.cos(latRad), 0.1)
  const positions: Array<{ lat: number; lng: number; radius: number }> = []

  if (count === 1) {
    positions.push({ lat: centerLat, lng: centerLng, radius: 7 })
    return positions
  }

  positions.push({ lat: centerLat, lng: centerLng, radius: 5.5 })

  if (count <= 7) {
    for (let i = 0; i < count - 1; i++) {
      const angle = (i / (count - 1)) * Math.PI * 2 - Math.PI / 2
      const lat = centerLat + Math.sin(angle) * MOSAIC_RADIUS_DEG
      const lng = centerLng + Math.cos(angle) * MOSAIC_RADIUS_DEG / lngScale
      positions.push({ lat, lng, radius: 4 })
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
      const lat = centerLat + Math.sin(angle) * MOSAIC_RADIUS_DEG
      const lng = centerLng + Math.cos(angle) * MOSAIC_RADIUS_DEG / lngScale
      positions.push({ lat, lng, radius: 4 })
    }
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2 + Math.PI / 4
      const lat = centerLat + Math.sin(angle) * MOSAIC_RADIUS_DEG * 1.65
      const lng = centerLng + Math.cos(angle) * MOSAIC_RADIUS_DEG * 1.65 / lngScale
      positions.push({ lat, lng, radius: 3.5 })
    }
  }

  return positions
}

function toRegionMosaicGeoJSON(regions: CrewRegionData[], accent: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const r of regions) {
    if (r.activeCrews === 0 && r.inactiveCrews === 0) continue
    const bubbles = Math.min(Math.max(r.activeCrews, 1), MAX_BUBBLES)
    const positions = computeMosaicPositions(bubbles, r.latitude, r.longitude)
    const bubbleRadius = bubbles === 1 ? 7 : bubbles <= 3 ? 5.5 : bubbles <= 6 ? 4.5 : 4

    for (let i = 0; i < bubbles; i++) {
      const pos = positions[i]
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] },
        properties: {
          id: r.id,
          kind: 'region',
          _bubbleIndex: i,
          _isPrimary: i === 0,
          _origLat: r.latitude,
          _origLng: r.longitude,
          _mosaicRadius: pos.radius,
          _bubbleRadius: bubbleRadius,
          active: r.activeCrews,
          inactive: r.inactiveCrews,
          members: r.totalMembers,
          countries: r.countries,
          region: r.region,
          label: i === 0 ? String(r.activeCrews) : '',
          color: r.activeCrews > 20 ? '#22c55e' : r.activeCrews > 5 ? '#3b82f6' : '#a855f7',
        },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

function toLocationGeoJSON(locations: CrewLocation[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: locations.map((l, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.lng, l.lat] },
      properties: {
        id: `${l.region || 'loc'}-${i}`,
        kind: 'location',
        name: l.name,
        city: l.city,
        state: l.state,
        country: l.country,
        status: l.status,
        region: l.region,
      },
    })),
  }
}

type ClickListener = (e: MapLayerMouseEvent) => void
type HoverListener = (e: MapLayerMouseEvent) => void

export function useCrewEmbedMarkers(
  opts: UseCrewEmbedMarkersOptions,
): UseCrewEmbedMarkersApi {
  const isReady = ref(false)
  const accent = opts.accent ?? '#22d3ee'

  const regionData = (): CrewRegionData[] =>
    Array.isArray(opts.regions) ? opts.regions : opts.regions.value
  const locationData = (): CrewLocation[] =>
    Array.isArray(opts.locations) ? opts.locations : opts.locations.value

  let mapListener: ClickListener | null = null
  let cursorListener: HoverListener | null = null
  const mosaicHoverFns: Array<{ lid: string; evt: string; fn: HoverListener }> = []

  const ensureSources = (map: MapLibreMap) => {
    const regionFC = toRegionMosaicGeoJSON(regionData(), accent)
    if (!map.getSource(REGION_SOURCE as never)) {
      map.addSource(REGION_SOURCE, { type: 'geojson', data: regionFC })
    } else {
      const src = map.getSource(REGION_SOURCE as never) as GeoJSONSource | undefined
      src?.setData(regionFC)
    }
    if (!map.getSource(LOCATION_SOURCE as never)) {
      map.addSource(LOCATION_SOURCE, { type: 'geojson', data: toLocationGeoJSON(locationData()) })
    } else {
      const src = map.getSource(LOCATION_SOURCE as never) as GeoJSONSource | undefined
      src?.setData(toLocationGeoJSON(locationData()))
    }
  }

  function mosaicSize(mosaic: string, orig: string, low: number): ExpressionSpecification {
    return ['interpolate', ['linear'], ['zoom'],
      ZOOM_MIN, low,
      ZOOM_MAX, ['coalesce', ['get', orig], low]] as unknown as ExpressionSpecification
  }

  function mosaicFade(low: number, high: number): ExpressionSpecification {
    return ['interpolate', ['linear'], ['zoom'],
      ZOOM_MIN, low,
      ZOOM_MAX - 1, high] as unknown as ExpressionSpecification
  }

  const install = () => {
    const map = opts.mapRef.value
    if (!map) return
    ensureSources(map)

    const colorExpr = ['match', ['get', '_bubbleIndex'],
      0, accent, 1, accent,
      2, '#3b82f6', 3, '#3b82f6', 4, '#3b82f6',
      5, '#a855f7', 6, '#a855f7', 7, '#a855f7',
      '#ec4899'] as unknown as ExpressionSpecification

    const regionFilter = ['==', 'kind', 'region'] as ExpressionSpecification
    const primaryFilter = ['all', ['==', 'kind', 'region'], ['==', '_isPrimary', true]] as ExpressionSpecification
    const locationFilter = ['==', 'kind', 'location'] as ExpressionSpecification

    if (!map.getLayer(REGION_MOSAIC_GLOW)) {
      map.addLayer({
        id: REGION_MOSAIC_GLOW, type: 'circle', source: REGION_SOURCE,
        filter: regionFilter, paint: {
          'circle-color': colorExpr,
          'circle-radius': mosaicSize('_mosaicRadius', '_bubbleRadius', 7),
          'circle-blur': 0.7,
          'circle-opacity': mosaicFade(0.32, 0),
        },
      })
    }
    if (!map.getLayer(REGION_MOSAIC_DOT)) {
      map.addLayer({
        id: REGION_MOSAIC_DOT, type: 'circle', source: REGION_SOURCE,
        filter: regionFilter, paint: {
          'circle-color': 'rgba(0,0,0,0.88)',
          'circle-radius': mosaicSize('_mosaicRadius', '_bubbleRadius', 5),
          'circle-stroke-color': colorExpr,
          'circle-stroke-width': 2,
          'circle-opacity': mosaicFade(0.96, 0),
        },
      })
    }
    if (!map.getLayer(REGION_MOSAIC_LABEL)) {
      map.addLayer({
        id: REGION_MOSAIC_LABEL, type: 'symbol', source: REGION_SOURCE,
        filter: primaryFilter, layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Arial Unicode MS Bold', 'DejaVu Sans Bold'],
          'text-size': mosaicSize('_mosaicRadius', '_bubbleRadius', 10),
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        }, paint: {
          'text-color': '#fff',
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1.5,
          'text-opacity': mosaicFade(1, 0),
        },
      })
    }

    const locOpacity = ['interpolate', ['linear'], ['zoom'],
      ZOOM_MIN, 0, ZOOM_MAX, 1] as unknown as ExpressionSpecification

    if (!map.getLayer(LOCATION_HALO)) {
      map.addLayer({
        id: LOCATION_HALO, type: 'circle', source: LOCATION_SOURCE,
        filter: locationFilter, paint: {
          'circle-radius': 10,
          'circle-color': ['case', ['==', ['get', 'status'], 'inactive'], '#f59e0b', accent],
          'circle-opacity': ['*', 0.22, locOpacity],
          'circle-blur': 0.5,
          'circle-stroke-width': 1,
          'circle-stroke-color': ['case', ['==', ['get', 'status'], 'inactive'], '#f59e0b', accent],
          'circle-stroke-opacity': ['*', 0.5, locOpacity],
        },
      })
    }
    if (!map.getLayer(LOCATION_DOT)) {
      map.addLayer({
        id: LOCATION_DOT, type: 'circle', source: LOCATION_SOURCE,
        filter: locationFilter, paint: {
          'circle-radius': 4,
          'circle-color': ['case', ['==', ['get', 'status'], 'inactive'], '#f59e0b', '#ffffff'],
          'circle-stroke-color': ['case', ['==', ['get', 'status'], 'inactive'], '#f59e0b', accent],
          'circle-stroke-width': 1.5,
          'circle-opacity': locOpacity,
        },
      })
    }

    cursorListener = (e) => {
      const has = (e.features ?? []).length > 0
      map.getCanvas().style.cursor = has ? 'pointer' : ''
    }
    map.on('mouseenter', REGION_MOSAIC_DOT, cursorListener)
    map.on('mouseleave', REGION_MOSAIC_DOT, cursorListener)
    map.on('mouseenter', LOCATION_DOT, cursorListener)
    map.on('mouseleave', LOCATION_DOT, cursorListener)

    for (const lid of [REGION_MOSAIC_GLOW, REGION_MOSAIC_DOT]) {
      const hoverIn: HoverListener = (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const f = e.features?.[0]
        if (f && map.getLayer(lid)) map.setPaintProperty(lid, 'circle-stroke-width', 3.5)
      }
      const hoverOut: HoverListener = (e) => {
        map.getCanvas().style.cursor = ''
        const f = e.features?.[0]
        if (f && map.getLayer(lid)) map.setPaintProperty(lid, 'circle-stroke-width', 2)
      }
      map.on('mouseenter', lid, hoverIn)
      map.on('mouseleave', lid, hoverOut)
      mosaicHoverFns.push({ lid, evt: 'mouseenter', fn: hoverIn })
      mosaicHoverFns.push({ lid, evt: 'mouseleave', fn: hoverOut })
    }

    mapListener = (e) => {
      const features = (e.features ?? []) as Array<{
        layer: { id: string }
        properties: Record<string, unknown>
        geometry: GeoJSON.Point
      }>
      if (!features.length) return
      const f = features[0]
      const popup: CrewEmbedPopup = {
        kind: f.layer.id === LOCATION_DOT ? 'location' : 'region',
        point: { x: e.point.x, y: e.point.y },
      }
      if (popup.kind === 'region') {
        const id = f.properties.id as string
        popup.region = regionData().find((r) => r.id === id)
      } else {
        const id = f.properties.id as string
        popup.location = locationData().find(
          (l, i) => `${l.region || 'loc'}-${i}` === id,
        )
      }
      opts.onPopup?.(popup)
    }
    map.on('click', REGION_MOSAIC_DOT, mapListener)
    map.on('click', LOCATION_DOT, mapListener)

    isReady.value = true
  }

  const update = () => {
    const map = opts.mapRef.value
    if (!map) return
    ensureSources(map)
  }

  const destroy = () => {
    const map = opts.mapRef.value
    if (!map) return
    try {
      for (const id of [REGION_MOSAIC_DOT, REGION_MOSAIC_GLOW, REGION_MOSAIC_LABEL, LOCATION_DOT, LOCATION_HALO]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      for (const id of [REGION_SOURCE, LOCATION_SOURCE]) {
        if (map.getSource(id as never)) map.removeSource(id as never)
      }
      if (mapListener) {
        map.off('click', REGION_MOSAIC_DOT, mapListener)
        map.off('click', LOCATION_DOT, mapListener)
      }
      if (cursorListener) {
        map.off('mouseenter', REGION_MOSAIC_DOT, cursorListener)
        map.off('mouseleave', REGION_MOSAIC_DOT, cursorListener)
        map.off('mouseenter', LOCATION_DOT, cursorListener)
        map.off('mouseleave', LOCATION_DOT, cursorListener)
      }
      for (const { lid, evt, fn } of mosaicHoverFns) {
        map.off(evt as 'mouseenter' | 'mouseleave', lid, fn)
      }
      mosaicHoverFns.length = 0
    } catch {
      /* map already torn down */
    }
    isReady.value = false
  }

  onBeforeUnmount(destroy)

  return {
    isReady: isReady as unknown as Readonly<Ref<boolean>>,
    update,
    install,
    destroy,
  }
}
