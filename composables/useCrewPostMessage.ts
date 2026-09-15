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
 *   Inbound:  crew-filter-update, crew-view-switch, crew-request-state
 *   Outbound: crew-map-ready, crew-map-state, crew-resize
 *
 * @connections pages/active-crews/index.vue, composables/useMapBase.ts
 */
import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import { useAppRuntime } from '@/composables/useAppRuntime'

/* ── types ──────────────────────────────────────────────────────────── */

/**
 * Minimal structural view of the MapLibre map API used by this bridge.
 * Structural (not nominal) typing keeps callers compatible no matter which
 * copy of the maplibre-gl types their `Map` instance resolves to.
 */
export interface CrewPostMessageMap {
  loaded(): boolean
  /** MapLibre types this as `boolean | void`; `unknown` keeps us assignable. */
  isStyleLoaded(): unknown
  getCanvas(): HTMLCanvasElement
  getZoom(): number
  getMaxZoom(): number
  getLayer(id: string): { type?: string } | undefined
  setPaintProperty(layerId: string, name: string, value: unknown): void
  flyTo(options: { center?: [number, number]; zoom?: number; duration?: number; essential?: boolean }): void
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: { padding?: number; duration?: number; essential?: boolean },
  ): void
  jumpTo(options: { center?: [number, number]; zoom?: number }): void
}

export interface CrewFilterPayload {
  region?: string
  hideAll?: string
  /** Zoom level 0..1 (0 = min, 1 = max). */
  zoom?: string
}

export interface CrewPostMessageOptions {
  /** Reactive ref to the MapLibre map instance (null until ready). */
  mapRef: Ref<CrewPostMessageMap | null>
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
  /** Signal ideal dimensions to the parent so it can resize the iframe container. */
  sendResizeHint: (width: string, height: string) => void
}

/* ── region slug → full-name mapping ────────────────────────────────── */

/** Map incoming slugs (from Squarespace) to the `region` field values used
 *  in crew-data.ts and crews-locations.json.
 *  `__empty__` = known slug with zero crews in the dataset (Antarctica):
 *  still counts as a filter (dims all markers) and flies to its fixed view. */
const SLUG_TO_REGION: Record<string, string> = {
  'africa':            'Africa',
  'antarctica':        '__empty__',       // no crews stationed — fixed view only
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
  if (full === '__empty__') return new Set()
  return new Set([full])
}

/* ── fixed region camera views ────────────────────────────────────── */
/**
 * Deterministic flyTo target per Squarespace region slug.
 *
 * Deliberately NOT computed from crew marker positions: the locations list
 * is fetched async (may be empty when a filter arrives), sparse regions
 * (Oceania: 0 crews) produce degenerate bboxes, and data-driven bounds
 * shift framing every time the dataset changes. Fixed views are stable,
 * work on both 2D and globe, and can never "break" on missing data.
 */
const REGION_VIEWS: Record<string, { center: [number, number]; zoom: number }> = {
  'africa':            { center: [20, 5],    zoom: 3 },
  'antarctica':        { center: [0, -78],   zoom: 2.3 },
  'asia':              { center: [100, 30],  zoom: 2.8 },
  'east-asia':         { center: [120, 35],  zoom: 3.5 },
  'south-asia':        { center: [78, 22],   zoom: 4 },
  'australia-oceania': { center: [140, -25], zoom: 3.5 },
  'oceania':           { center: [140, -25], zoom: 3.5 },
  'europe':            { center: [10, 50],   zoom: 4 },
  'north-america':     { center: [-100, 40], zoom: 3 },
  'south-america':     { center: [-60, -15], zoom: 3.2 },
}

/** True when the slug is a known Squarespace region (even with zero crews). */
function isKnownRegion(slug: string): boolean {
  return slug !== '' && (slug in REGION_VIEWS || slug in SLUG_TO_REGION)
}

/* ── origin allow-list ──────────────────────────────────────────────── */

const ALLOWED_ORIGINS = new Set([
  'https://earthguardians.org',
  'https://www.earthguardians.org',
  'https://guardioesdaterra.github.io',
  'http://localhost:3000',
  'http://localhost:3001',
])

/* ── map layer IDs (must match useMapMarker.ts addCrewMosaicLayers /
 *    addCrewLocationLayers: SOURCE='markers' + suffixes _mg/_mm/_ml and
 *    _pg/_p/_pc/_pl. active-crews is unclustered, so no _cg/_c/_cc/_cn. ── */

const MOSAIC_LAYERS = ['markers_mg', 'markers_mm', 'markers_ml']
const LOCATION_LAYERS = ['markers_pg', 'markers_p', 'markers_pc', 'markers_pl']
const ALL_CREW_LAYERS = [...MOSAIC_LAYERS, ...LOCATION_LAYERS]

/* ── original paint values (must match useMapMarker.ts) ─────────────── */
/** Reset paint per layer — mirrors addCrewMosaicLayers/addCrewLocationLayers. */
const CREW_PAINT_RESET: Record<string, { prop: 'circle-opacity' | 'text-opacity'; value: unknown }> = {
  markers_mg: { prop: 'circle-opacity', value: ['interpolate', ['linear'], ['zoom'], 2, 0.28, 7, 0.42] },
  markers_mm: { prop: 'circle-opacity', value: ['interpolate', ['linear'], ['zoom'], 2, 0.98, 7, 1] },
  markers_ml: { prop: 'text-opacity', value: 1 },
  markers_pg: { prop: 'circle-opacity', value: ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.30] },
  markers_p: { prop: 'circle-opacity', value: ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 0.98] },
  markers_pc: { prop: 'circle-opacity', value: ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 1] },
  markers_pl: { prop: 'text-opacity', value: ['interpolate', ['linear'], ['zoom'], 2, 0, 7, 1] },
}

/* ── default world view (fixed center+zoom — viewport-only flyTo) ───── */

const DEFAULT_CENTER: [number, number] = [0, 20]
const DEFAULT_ZOOM = 2.5

/* ── composable ─────────────────────────────────────────────────────── */

export function useCrewPostMessage(
  opts: CrewPostMessageOptions,
): CrewPostMessageApi {
  const runtime = useAppRuntime()
  // Hoisted at setup time: calling useRouter()/useRoute() inside the
  // postMessage event handler throws ("Nuxt instance unavailable") and the
  // catch-fallback did a full window.location.href navigation (= iframe
  // reload). Capturing once here keeps 2D↔3D switches to in-SPA router.push
  // (viewport-only, no reload).
  let router: ReturnType<typeof useRouter> | null = null
  let route: ReturnType<typeof useRoute> | null = null
  try {
    router = useRouter()
  } catch { router = null }
  try {
    route = useRoute()
  } catch { route = null }

  const activeRegion = ref('')
  const hideAll = ref(false)

  /* ── helpers ──────────────────────────────────────────────────────── */

  function map(): CrewPostMessageMap | null {
    return opts.mapRef.value
  }
  // NOTE: opts.regions / opts.locations are kept for API compatibility
  // (pages still pass them) but the camera no longer depends on crew data —
  // see REGION_VIEWS above.

  /* ── highlight / dim layers ───────────────────────────────────────── */

  function applyHighlight(regionSlug: string) {
    const m = map()
    if (!m || !m.isStyleLoaded()) return

    const matchSet = resolveRegionNames(regionSlug)
    // Known slug = filter, even when it matches zero crews (Antarctica:
    // every marker dims, camera still flies to its fixed view). Unknown or
    // empty slug = reset.
    const hasFilter = isKnownRegion(regionSlug)

    // Install smooth transitions for all crew layers
    for (const layerId of ALL_CREW_LAYERS) {
      if (!m.getLayer(layerId)) continue
      const layer = m.getLayer(layerId)!
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
      const reset = CREW_PAINT_RESET[layerId]
      if (!reset) continue

      if (!hasFilter) {
        // ── Reset to original paint values (see CREW_PAINT_RESET) ──
        m.setPaintProperty(layerId, reset.prop, reset.value)
        continue
      }

      // ── Apply region filter (dim non-matching, keep zoom fading) ──
      m.setPaintProperty(layerId, reset.prop, ['*', reset.value, matchExpr])
    }
  }

  /* ── flyTo ────────────────────────────────────────────────────────── */

  /* ── flyTo (fixed region views — never data-computed) ─────────────── */

  function flyToBounds(regionSlug: string) {
    const m = map()
    if (!m) return

    const view = REGION_VIEWS[regionSlug]
    if (!view) {
      flyToDefault()
      return
    }

    const reducedMotion = runtime.reducedMotion.value

    if (reducedMotion) {
      m.jumpTo({ center: view.center, zoom: view.zoom })
    } else {
      // flyTo (not fitBounds): deterministic center+zoom, identical on 2D
      // and globe, no dependency on async crew data. Viewport animates;
      // markers/styles are untouched so nothing reloads or breaks.
      m.flyTo({
        center: view.center,
        zoom: view.zoom,
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
      // flyTo (not fitBounds): viewport-only animation, same path as region
      // views. Never touches sources/layers, so nothing reloads or breaks.
      m.flyTo({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        duration: 1200,
        essential: true,
      })
    }
  }

  /* ── apply filters (main entry point) ─────────────────────────────── */

  function applyFilters(payload: CrewFilterPayload) {
    // Normalize: Squarespace always sends the 7 kebab-case slugs, but guard
    // against case/whitespace drift so "Africa" still hits REGION_VIEWS.
    const region = (payload.region ?? '').trim().toLowerCase()
    activeRegion.value = region

    // Update hideAll if provided
    if (payload.hideAll !== undefined) {
      hideAll.value = payload.hideAll === 'true'
    }

    // Viewport-only: paint-expression dim/highlight + fixed-center flyTo.
    // No source/layer add-remove, no router navigation → no reload.
    applyHighlight(region)

    flyToBounds(region)

    // Apply zoom AFTER flyToBounds so explicit zoom isn't overridden.
    // NOTE: jumpTo would cancel the in-flight flyTo animation; only apply
    // an explicit zoom when the sender actually provided one.
    if (payload.zoom !== undefined) {
      const m = map()
      if (m) {
        const t = Math.max(0, Math.min(1, parseFloat(payload.zoom) || 0))
        m.jumpTo({ zoom: t * m.getMaxZoom() })
      }
    }

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
    // Keep the SPA router query in sync with the replaceState above.
    // view-switch reads the query to carry the filter to the new view; if
    // the router still held the stale query the region would be lost.
    if (router && route) {
      const nextQuery: Record<string, string> = {}
      params.forEach((v, k) => { nextQuery[k] = v })
      const current = route.query as Record<string, unknown>
      const sameKeys = Object.keys(nextQuery).length === Object.keys(current).length
        && Object.entries(nextQuery).every(([k, v]) => String(current[k] ?? '') === v)
      if (!sameKeys) {
        router.replace({ query: nextQuery }).catch(() => {})
      }
    }
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

    if (data.type === 'crew-view-switch') {
      const view = data.payload?.view
      if (view === '2d' || view === '3d') {
        // Same-SPA route change — no iframe reload. The region filter is
        // already synced into the URL query by applyFilters(), so preserving
        // the query carries the filter to the new view, where the fresh
        // composable instance re-applies it via applyInitialUrlFilter().
        // No-op when the requested view is already active (avoids needless
        // re-render of the current view).
        const currentPath = window.location.pathname
        const isCurrently3d = /\/3d\/?$/.test(currentPath)
        const wants3d = view === '3d'
        if (isCurrently3d !== wants3d) {
          const basePath = isCurrently3d ? currentPath.replace(/\/3d\/?$/, '') : currentPath
          const targetPath = wants3d ? `${basePath}/3d` : basePath
          // Read the live URL query (source of truth after replaceState),
          // not the possibly-stale router query object.
          const liveParams = new URLSearchParams(window.location.search)
          const liveQuery: Record<string, string> = {}
          liveParams.forEach((v, k) => { liveQuery[k] = v })
          if (router) {
            router.push({ path: targetPath, query: liveQuery }).catch(() => {})
          } else {
            // Outside a routed context (plain embed test page): fall back to
            // a full navigation, still preserving the query (and region).
            const qs = window.location.search
            window.location.href = `${targetPath}${qs}`
          }
        }
      }
    }

    if (data.type === 'crew-request-state') {
      const state = getCurrentFilters()
      ;(event.source as Window | null)?.postMessage(
        { type: 'crew-map-state', payload: state },
        event.origin,
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

  /** Signal ideal dimensions to the parent so it can resize the iframe container. */
  function sendResizeHint(width: string, height: string) {
    window.parent.postMessage({ type: 'crew-resize', payload: { width, height } }, '*')
  }

  /* ── initial URL param filter (on map ready) ──────────────────────── */

  function applyInitialUrlFilter() {
    if (import.meta.server) return
    const params = new URLSearchParams(window.location.search)
    const region = (params.get('region') ?? '').trim().toLowerCase()
    const ha = params.get('hideAll')
    const zoomParam = params.get('zoom')
    if (ha === 'true') {
      hideAll.value = true
    }
    if (region) {
      activeRegion.value = region
      applyHighlight(region)
      flyToBounds(region)
    }
    // Apply explicit zoom AFTER flyToBounds so it isn't overridden
    if (zoomParam !== null) {
      const m = map()
      if (m) {
        const t = Math.max(0, Math.min(1, parseFloat(zoomParam) || 0))
        m.jumpTo({ zoom: t * m.getMaxZoom() })
      }
    }
  }

  /* ── lifecycle ────────────────────────────────────────────────────── */

  onMounted(() => {
    window.addEventListener('message', handleMessage)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('message', handleMessage)
  })

  // Watch for map to become ready, then apply initial filter and send ready signal.
  // NOTE: MapLibre's loaded() is NOT reactive, so watching it directly never
  // re-fires. Instead watch the map instance itself and hook the style 'load'
  // event (plus an already-loaded fast path), so crew-map-ready + the initial
  // ?region= filter always run exactly once.
  let readyDone = false
  function onMapReady() {
    if (readyDone) return
    readyDone = true
    // Small delay to ensure layers are painted
    setTimeout(() => {
      applyInitialUrlFilter()
      sendReady()
    }, 100)
  }
  let loadListenerAttachedTo: unknown = null
  const stopMapWatch = watch(
    () => opts.mapRef.value,
    (m) => {
      if (!m || readyDone) return
      const anyMap = m as unknown as {
        loaded(): boolean
        once?: (event: string, cb: () => void) => void
      }
      try {
        if (anyMap.loaded()) {
          onMapReady()
          return
        }
      } catch { /* ignore — fall through to load listener */ }
      // Attach once per map instance; 'load' fires when style+tiles settle.
      if (anyMap.once && loadListenerAttachedTo !== m) {
        loadListenerAttachedTo = m
        anyMap.once('load', onMapReady)
        // Safety net: if 'load' already fired or never fires (cached style),
        // poll briefly rather than leaving the parent waiting forever.
        let polls = 0
        const timer = setInterval(() => {
          polls += 1
          try {
            if (anyMap.loaded()) {
              clearInterval(timer)
              onMapReady()
            }
          } catch { /* ignore */ }
          if (polls > 50) clearInterval(timer)
        }, 100)
      }
    },
    { immediate: true },
  )
  void stopMapWatch

  return {
    activeRegion: activeRegion as Readonly<Ref<string>>,
    hideAll: hideAll as Readonly<Ref<boolean>>,
    applyFilters,
    getCurrentFilters,
    sendResizeHint,
  }
}
