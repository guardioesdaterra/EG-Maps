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
import { ref, computed, onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import { useAppRuntime } from '@/composables/useAppRuntime'

/* ── types ──────────────────────────────────────────────────────────── */

export interface CrewFilterPayload {
  region?: string
  hideAll?: string
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
  /** Apply a filter programmatically. */
  applyFilters: (payload: CrewFilterPayload) => void
  /** Get the current filter state for responding to state requests. */
  getCurrentFilters: () => CrewFilterPayload
}

/* ── region slug ↔ full-name mapping ────────────────────────────────── */

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

/** Map full region names back to the canonical slug used by the postMessage protocol. */
const REGION_TO_SLUG: Record<string, string> = {
  'Africa':        'africa',
  'East Asia':     'east-asia',
  'South Asia':    'south-asia',
  'Oceania':       'oceania',
  'Europe':        'europe',
  'North America': 'north-america',
  'South America': 'south-america',
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
const ALL_CREW_LAYERS = [...MOSAIC_LAYERS, ...LOCATION_LAYERS]

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

  /* ── helpers ──────────────────────────────────────────────────────── */

  function regionData(): CrewRegionData[] {
    return Array.isArray(opts.regions) ? opts.regions : opts.regions.value
  }
  function locationData(): CrewLocation[] {
    return Array.isArray(opts.locations) ? opts.locations : opts.locations.value
  }

  /** Check whether a crew feature's `region` matches the active filter. */
  function regionMatches(featureRegion: string | undefined, matchSet: Set<string>): boolean {
    if (matchSet.size === 0) return true
    return matchSet.has(featureRegion ?? '')
  }

  /* ── highlight / dim layers ───────────────────────────────────────── */

  let previousRegion: string | null = null

  function applyHighlight(regionSlug: string) {
    const map = opts.mapRef.value
    if (!map || !map.isStyleLoaded()) return

    const matchSet = resolveRegionNames(regionSlug)
    const hasFilter = matchSet.size > 0

    for (const layerId of ALL_CREW_LAYERS) {
      if (!map.getLayer(layerId)) continue
      const layer = map.getLayer(layerId)
      const isText = layer.type === 'symbol'

      if (!hasFilter) {
        // Reset to default zoom-based opacity (no region filter)
        if (isText) {
          if (MOSAIC_LAYERS.includes(layerId)) {
            // mosaic label: text-opacity = interpolate(zoom, 2→1, 6→0)
            map.setPaintProperty(layerId, 'text-opacity', [
              'interpolate', ['linear'], ['zoom'], 2, 1, 6, 0],
            )
          } else {
            // location label: text-opacity = interpolate(zoom, 2→0, 7→1)
            map.setPaintProperty(layerId, 'text-opacity', [
              'interpolate', ['linear'], ['zoom'], 2, 0, 7, 1],
            )
          }
        } else {
          if (layerId === 'markers_mg') {
            map.setPaintProperty(layerId, 'circle-opacity', [
              'interpolate', ['linear'], ['zoom'], 2, 0.32, 6, 0])
          } else if (layerId === 'markers_mm') {
            map.setPaintProperty(layerId, 'circle-opacity', [
              'interpolate', ['linear'], ['zoom'], 2, 0.96, 6, 0])
          } else if (layerId === 'markers_pg') {
            map.setPaintProperty(layerId, 'circle-opacity', [
              'interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.30])
          } else if (layerId === 'markers_p') {
            map.setPaintProperty(layerId, 'circle-opacity', [
              'interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.96])
          }
        }
        continue
      }

      // Region filter active — multiply zoom-opacity by highlight factor
      const matchExpr = [
        'case',
        ['in', ['get', 'region'], ['literal', [...matchSet]]],
        1.0,
        0.2,
      ]

      if (isText) {
        const baseOpacity = MOSAIC_LAYERS.includes(layerId)
          ? ['interpolate', ['linear'], ['zoom'], 2, 1, 6, 0]
          : ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 1]
        map.setPaintProperty(layerId, 'text-opacity', ['*', baseOpacity, matchExpr])
      } else {
        let baseOpacity: unknown
        if (layerId === 'markers_mg') {
          baseOpacity = ['interpolate', ['linear'], ['zoom'], 2, 0.32, 6, 0]
        } else if (layerId === 'markers_mm') {
          baseOpacity = ['interpolate', ['linear'], ['zoom'], 2, 0.96, 6, 0]
        } else if (layerId === 'markers_pg') {
          baseOpacity = ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.30]
        } else if (layerId === 'markers_p') {
          baseOpacity = ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.96]
        }
        if (baseOpacity) {
          map.setPaintProperty(layerId, 'circle-opacity', ['*', baseOpacity, matchExpr])
        }
      }
    }
  }

  /* ── flyTo ────────────────────────────────────────────────────────── */

  function flyToBounds(regionSlug: string) {
    const map = opts.mapRef.value
    if (!map) return

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
      map.jumpTo({
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        zoom: Math.min(Math.max(map.getZoom(), 2), 6),
      })
    } else {
      map.fitBounds(bounds, {
        padding: 60,
        duration: 1200,
        essential: true,
      })
    }
  }

  function flyToDefault() {
    const map = opts.mapRef.value
    if (!map) return

    const reducedMotion = runtime.reducedMotion.value

    if (reducedMotion) {
      map.jumpTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })
    } else {
      map.fitBounds(DEFAULT_BOUNDS, {
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

    applyHighlight(region)
    flyToBounds(region)

    // Sync URL without reload
    const params = new URLSearchParams(window.location.search)
    if (region) {
      params.set('region', region)
    } else {
      params.delete('region')
    }
    if (payload.hideAll) {
      params.set('hideAll', payload.hideAll)
    }
    const qs = params.toString()
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    history.replaceState(null, '', newUrl)
  }

  function getCurrentFilters(): CrewFilterPayload {
    const payload: CrewFilterPayload = {}
    if (activeRegion.value) payload.region = activeRegion.value
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
    applyFilters,
    getCurrentFilters,
  }
}
