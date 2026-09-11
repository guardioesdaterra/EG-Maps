/**
 * composables/useCrewPostMessage.ts
 * @why Cross-origin postMessage bridge for the active-crews embed.
 *
 *       Listens for filter updates from a parent Squarespace page, applies
 *       them to the already-rendered MapLibre map (no reload), and keeps
 *       the iframe URL in sync via history.replaceState.
 *
 *       Also announces readiness (`crew-map-ready`) once the map has finished
 *       its initial render, and responds to state-request messages.
 *
 * @message-types
 *   Inbound:  crew-filter-update, crew-request-state
 *   Outbound: crew-map-ready, crew-map-state
 *
 * @connections pages/active-crews/index.vue, composables/useMapBase.ts
 */
import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import { useAppRuntime } from '@/composables/useAppRuntime'

/* ── types ──────────────────────────────────────────────────────────── */

export interface CrewFilterPayload {
  region?: string
  hideAll?: string
  /** Zoom level 0..1 (0 = min, 1 = max). */
  zoom?: string
}

export interface CrewPostMessageOptions {
  /** Reactive ref to the MapLibre map instance (null until ready). */
  mapRef: Ref<MapLibreMap | null>
  /** Reactive crew region data (the 7 regions with lat/lng/counts). */
  regions: Ref<CrewRegionData[]> | CrewRegionData[]
  /** Reactive crew location data (individual crew points). */
  locations: Ref<CrewLocation[]> | CrewLocation[]
}

export interface CrewPostMessageApi {
  /** Current region filter (slug or ''). */
  readonly activeRegion: Readonly<Ref<string>>
  /** Current hideAll state (reactive, driven by postMessage or URL). */
  readonly hideAll: Readonly<Ref<boolean>>
  /** Apply a filter programmatically. */
  applyFilters: (payload: CrewFilterPayload) => void
  /** Get the current filter state for responding to state requests. */
  getCurrentFilters: () => CrewFilterPayload
}

/* ── region slug → full-name mapping ────────────────────────────────── */

/** Map incoming slugs (from Squarespace) to the `region` field values used
 *  in crew-data.ts and crews-locations.json. */
const SLUG_TO_REGION: Record<string, string> = {
  'africa':            'Africa',
  'asia':              '__asia__',        // special: matches East Asia OR South Asia
  'east-asia':         'East Asia',
  'south-asia':        'South Asia',
  'australia-oceania': 'Oceania',
  'oceania':           'Oceania',
  'europe':            'Europe',
  'north-america':     'North America',
  'south-america':     'South America',
}

/** Expand a slug into the set of full region names it matches. */
function resolveRegionNames(slug: string): Set<string> {
  const full = SLUG_TO_REGION[slug]
  if (!full) return new Set()
  if (full === '__asia__') return new Set(['East Asia', 'South Asia'])
  return new Set([full])
}

/* ── origin allow-list ──────────────────────────────────────────────── */

const ALLOWED_ORIGINS = new Set([
  'https://earthguardians.org',
  'https://www.earthguardians.org',
  'http://localhost:3000',
  'http://localhost:3001',
])

/* ── map layer IDs (must match useMapMarker.ts) ─────────────────────── */

const MOSAIC_LAYERS = ['markers_mg', 'markers_mm', 'markers_ml']
const LOCATION_LAYERS = ['markers_pg', 'markers_p', 'markers_pl']
const CLUSTER_LAYERS = ['markers_cg', 'markers_c', 'markers_cn']
const ALL_CREW_LAYERS = [...MOSAIC_LAYERS, ...LOCATION_LAYERS, ...CLUSTER_LAYERS]

/* ── default world-view bounds ──────────────────────────────────────── */

const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-170, -60],
  [180, 85],
]

const DEFAULT_CENTER: [number, number] = [0, 20]
const DEFAULT_ZOOM = 2.5

/* ── composable ─────────────────────────────────────────────────────── */

export function useCrewPostMessage(
  opts: CrewPostMessageOptions,
): CrewPostMessageApi {
  const runtime = useAppRuntime()

  const activeRegion = ref('')
  const hideAll = ref(false)

  /* ── helpers ──────────────────────────────────────────────────────── */

  function regionData(): CrewRegionData[] {
    return Array.isArray(opts.regions) ? opts.regions : opts.regions.value
  }
  function locationData(): CrewLocation[] {
    return Array.isArray(opts.locations) ? opts.locations : opts.locations.value
  }

  function map(): MapLibreMap | null {
    return opts.mapRef.value
  }

  /* ── highlight / dim layers ───────────────────────────────────────── */

  function applyHighlight(regionSlug: string) {
    const m = map()
    if (!m || !m.isStyleLoaded()) return

    const matchSet = resolveRegionNames(regionSlug)
    const hasFilter = matchSet.size > 0

    // Install smooth transitions for all crew layers
    for (const layerId of ALL_CREW_LAYERS) {
      if (!m.getLayer(layerId)) continue
      const layer = m.getLayer(layerId)
      if (layer.type === 'circle') {
        m.setPaintProperty(layerId, 'circle-opacity-transition', { duration: 350, delay: 0 })
      } else if (layer.type === 'symbol') {
        m.setPaintProperty(layerId, 'text-opacity-transition', { duration: 350, delay: 0 })
      }
    }

    // Region filter expression: 1.0 for matching, 0.2 for non-matching
    const matchExpr = hasFilter
      ? (['case', ['in', ['get', 'region'], ['literal', [...matchSet]]], 1.0, 0.2] as unknown)
      : null

    for (const layerId of ALL_CREW_LAYERS) {
      if (!m.getLayer(layerId)) continue
      const layer = m.getLayer(layerId)
      const isText = layer.type === 'symbol'

      if (!hasFilter) {
        // ── Reset to original paint values ──
        if (layerId === 'markers_mg') {
          m.setPaintProperty(layerId, 'circle-opacity', ['interpolate', ['linear'], ['zoom'], 2, 0.32, 6, 0])
        } else if (layerId === 'markers_mm') {
          m.setPaintProperty(layerId, 'circle-opacity', ['interpolate', ['linear'], ['zoom'], 2, 0.96, 6, 0])
        } else if (layerId === 'markers_pg') {
          m.setPaintProperty(layerId, 'circle-opacity', ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.30])
        } else if (layerId === 'markers_p') {
          m.setPaintProperty(layerId, 'circle-opacity', ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.96])
        } else if (layerId === 'markers_cg') {
          m.setPaintProperty(layerId, 'circle-opacity', 0.30)
        } else if (layerId === 'markers_c') {
          m.setPaintProperty(layerId, 'circle-opacity', 0.94)
        } else if (layerId === 'markers_ml') {
          m.setPaintProperty(layerId, 'text-opacity', ['interpolate', ['linear'], ['zoom'], 2, 1, 6, 0])
        } else if (layerId === 'markers_pl') {
          m.setPaintProperty(layerId, 'text-opacity', ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 1])
        } else if (layerId === 'markers_cn') {
          m.setPaintProperty(layerId, 'text-opacity', 1)
        }
        continue
      }

      // ── Apply region filter ──
      if (layerId === 'markers_mg') {
        m.setPaintProperty(layerId, 'circle-opacity', ['*', ['interpolate', ['linear'], ['zoom'], 2, 0.32, 6, 0], matchExpr])
      } else if (layerId === 'markers_mm') {
        m.setPaintProperty(layerId, 'circle-opacity', ['*', ['interpolate', ['linear'], ['zoom'], 2, 0.96, 6, 0], matchExpr])
      } else if (layerId === 'markers_pg') {
        m.setPaintProperty(layerId, 'circle-opacity', ['*', ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.30], matchExpr])
      } else if (layerId === 'markers_p') {
        m.setPaintProperty(layerId, 'circle-opacity', ['*', ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.96], matchExpr])
      } else if (layerId === 'markers_cg') {
        m.setPaintProperty(layerId, 'circle-opacity', ['*', 0.30, matchExpr])
      } else if (layerId === 'markers_c') {
        m.setPaintProperty(layerId, 'circle-opacity', ['*', 0.94, matchExpr])
      } else if (layerId === 'markers_ml') {
        m.setPaintProperty(layerId, 'text-opacity', ['*', ['interpolate', ['linear'], ['zoom'], 2, 1, 6, 0], matchExpr])
      } else if (layerId === 'markers_pl') {
        m.setPaintProperty(layerId, 'text-opacity', ['*', ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 1], matchExpr])
      } else if (layerId === 'markers_cn') {
        m.setPaintProperty(layerId, 'text-opacity', ['*', 1, matchExpr])
      }
    }
  }

  /* ── flyTo ────────────────────────────────────────────────────────── */

  function computeZoomForBounds(
    m: MapLibreMap,
    minLng: number, maxLng: number,
    minLat: number, maxLat: number,
  ): number {
    const mapWidth = m.getCanvas().width
    const mapHeight = m.getCanvas().height
    const padding = 60
    const availW = mapWidth - padding * 2
    const availH = mapHeight - padding * 2

    const lngDelta = maxLng - minLng || 1
    const latDelta = maxLat - minLat || 1

    const zoomW = Math.log2(360 / (lngDelta * (availW / mapWidth)))
    const zoomH = Math.log2(180 / (latDelta * (availH / mapHeight)))
    return Math.min(zoomW, zoomH, 8)
  }

  function flyToBounds(regionSlug: string) {
    const m = map()
    if (!m) return

    const matchSet = resolveRegionNames(regionSlug)
    if (matchSet.size === 0) {
      flyToDefault()
      return
    }

    // Collect coordinates from matching crew locations
    const coords: [number, number][] = []
    for (const loc of locationData()) {
      if (matchSet.has(loc.region)) {
        coords.push([loc.lng, loc.lat])
      }
    }

    // Also include region center points for sparse regions
    for (const r of regionData()) {
      if (matchSet.has(r.region)) {
        coords.push([r.longitude, r.latitude])
      }
    }

    if (coords.length === 0) {
      flyToDefault()
      return
    }

    // Compute bounding box
    let minLng = Infinity, maxLng = -Infinity
    let minLat = Infinity, maxLat = -Infinity
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }

    // Add padding
    const pad = 5
    const bounds: [[number, number], [number, number]] = [
      [minLng - pad, minLat - pad],
      [maxLng + pad, maxLat + pad],
    ]

    const reducedMotion = runtime.reducedMotion.value

    if (reducedMotion) {
      const targetZoom = computeZoomForBounds(m, minLng - pad, maxLng + pad, minLat - pad, maxLat + pad)
      m.jumpTo({
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        zoom: targetZoom,
      })
    } else {
      m.fitBounds(bounds, {
        padding: 60,
        duration: 1200,
        essential: true,
      })
    }
  }

  function flyToDefault() {
    const m = map()
    if (!m) return

    const reducedMotion = runtime.reducedMotion.value

    if (reducedMotion) {
      m.jumpTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })
    } else {
      m.fitBounds(DEFAULT_BOUNDS, {
        padding: 60,
        duration: 1200,
        essential: true,
      })
    }
  }

  /* ── apply filters (main entry point) ─────────────────────────────── */

  function applyFilters(payload: CrewFilterPayload) {
    const region = payload.region ?? ''
    activeRegion.value = region

    // Update hideAll if provided
    if (payload.hideAll !== undefined) {
      hideAll.value = payload.hideAll === 'true'
    }

    applyHighlight(region)

    // Apply zoom if provided (0..1 maps to minZoom..maxZoom)
    if (payload.zoom !== undefined) {
      const m = map()
      if (m) {
        const t = Math.max(0, Math.min(1, parseFloat(payload.zoom) || 0))
        const targetZoom = t * m.getMaxZoom()
        m.jumpTo({ zoom: targetZoom })
      }
    }

    flyToBounds(region)

    // Sync URL without reload — preserve all existing params
    const params = new URLSearchParams(window.location.search)
    if (region) {
      params.set('region', region)
    } else {
      params.delete('region')
    }
    if (payload.hideAll !== undefined) {
      if (payload.hideAll === 'true') {
        params.set('hideAll', 'true')
      } else {
        params.delete('hideAll')
      }
    }
    if (payload.zoom !== undefined) {
      params.set('zoom', payload.zoom)
    }
    const qs = params.toString()
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    history.replaceState(null, '', newUrl)
  }

  function getCurrentFilters(): CrewFilterPayload {
    const payload: CrewFilterPayload = {}
    if (activeRegion.value) payload.region = activeRegion.value
    if (hideAll.value) payload.hideAll = 'true'
    const m = map()
    if (m) {
      const t = m.getZoom() / m.getMaxZoom()
      payload.zoom = String(Math.round(t * 100) / 100)
    }
    return payload
  }

  /* ── postMessage listener ─────────────────────────────────────────── */

  function handleMessage(event: MessageEvent) {
    if (!ALLOWED_ORIGINS.has(event.origin)) return

    const data = event.data
    if (!data || typeof data !== 'object') return

    if (data.type === 'crew-filter-update') {
      const payload = (data.payload ?? {}) as CrewFilterPayload
      applyFilters(payload)
    }

    if (data.type === 'crew-request-state') {
      const state = getCurrentFilters()
      event.source?.postMessage(
        { type: 'crew-map-state', payload: state },
        { targetOrigin: event.origin },
      )
    }
  }

  /* ── readiness signal ─────────────────────────────────────────────── */

  let readySent = false

  function sendReady() {
    if (readySent) return
    readySent = true
    window.parent.postMessage({ type: 'crew-map-ready' }, '*')
  }

  /* ── initial URL param filter (on map ready) ──────────────────────── */

  function applyInitialUrlFilter() {
    if (import.meta.server) return
    const params = new URLSearchParams(window.location.search)
    const region = params.get('region')
    const ha = params.get('hideAll')
    if (ha === 'true') {
      hideAll.value = true
    }
    if (region) {
      activeRegion.value = region
      applyHighlight(region)
      flyToBounds(region)
    }
  }

  /* ── lifecycle ────────────────────────────────────────────────────── */

  onMounted(() => {
    window.addEventListener('message', handleMessage)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('message', handleMessage)
  })

  // Watch for map to become ready, then apply initial filter and send ready signal
  let stopWatch: (() => void) | null = null
  stopWatch = watch(
    () => opts.mapRef.value?.loaded(),
    (loaded) => {
      if (!loaded) return
      // Small delay to ensure layers are painted
      setTimeout(() => {
        applyInitialUrlFilter()
        sendReady()
      }, 100)
      stopWatch?.()
    },
    { immediate: true },
  )

  return {
    activeRegion: activeRegion as Readonly<Ref<string>>,
    hideAll: hideAll as Readonly<Ref<boolean>>,
    applyFilters,
    getCurrentFilters,
  }
}
