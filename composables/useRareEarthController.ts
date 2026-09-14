/**
 * composables/useRareEarthController.ts
 * @why Rare earth elements 3D controller — orbit, zoom, and selection in the 3D scene
 * @functions useRareEarthController
 * @interfaces RareEarthControllerProps, RareEarthPopupConfig, RareEarthControllerOptions
 * @deps vue (watch, onScopeDispose, type Ref); @/composables/useRareEarthLayers (syncObservatoryLayers, syncRareEarthLayerVisibility); @/lib/enterprise-data (buildEnterpriseNetworkLines)
 * @connections composables/useMapBase.ts
 */
import { watch, onScopeDispose, type Ref } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import {
  syncObservatoryLayers,
  syncRareEarthLayerVisibility as syncRareEarthLayerVisibilityInternal,
} from '@/composables/useRareEarthLayers'
import { buildEnterpriseNetworkLines } from '@/lib/enterprise-data'

export interface RareEarthControllerProps {
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthFiltered?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthProtected?: GeoJSON.FeatureCollection
  rareEarthWater?: GeoJSON.FeatureCollection | null
  rareEarthCultural?: GeoJSON.FeatureCollection | null
  layerVisibility?: Record<string, boolean>
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null
}

export interface RareEarthPopupConfig {
  t: (_key: string, _params?: Record<string, unknown>) => string
  locale: { value: string }
  onSidebarOpen?: (_payload: { processo: string; nome: string; tab: string; coords: [number, number] }) => void
}

export interface RareEarthControllerOptions {
  /** Map instance (null until ready) */
  map: Ref<MapLibreMap | null>
  /** True when REE dataset is active (drives whether watchers do anything) */
  isActive: Ref<boolean> | (() => boolean)
  /** Reactive props getter (so watchers re-fire when upstream changes) */
  getProps: () => RareEarthControllerProps
  /** Popup configuration for i18n-aware popup rendering */
  popup?: RareEarthPopupConfig
}

/**
 * Owns the Rare Earth Observatory layers, watchers, and fly-to highlight marker
 * for a MapLibre map instance. Encapsulates what was previously inlined in
 * UnifiedMap.vue so the parent component stays focused on general map wiring.
 *
 * All watchers gate on `isActive` so the watchers do not fire work for unrelated
 * datasets. Cleanup is registered via `onScopeDispose` so the lifecycle is
 * tied to the parent effect scope (component or composable).
 */
export function useRareEarthController(options: RareEarthControllerOptions) {
  const { map, isActive, getProps } = options
  const isActiveGetter = typeof isActive === 'function' ? isActive : () => isActive.value

  let flyToHighlightMarker: maplibregl.Marker | null = null
  let flyToHighlightTimer: ReturnType<typeof setTimeout> | null = null
  let reconcileTimer: ReturnType<typeof setTimeout> | null = null
  let setupRetryTimer: ReturnType<typeof setTimeout> | null = null
  let netResyncTimer: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0
  // Generous budget: on slow links the 7MB water + 1MB cultural payloads can
  // take well over the first seconds; retries are cheap no-ops once live.
  const MAX_RETRIES = 40
  // Enterprise-network rebuild throttle: hub-spoke construction over 20k
  // full-Brazil claims is the heaviest per-keystroke cost. Rebuild at most
  // once per 2s; filtered churn inside the window reuses on-map lines, and a
  // delayed pass picks up the latest data.
  let lastNetBuiltPoints: unknown = null
  let lastNetBuildAt = 0
  const NET_THROTTLE_MS = 2000

  function addFlyToHighlight(lng: number, lat: number) {
    const m = map.value
    if (!m) return
    if (flyToHighlightTimer) clearTimeout(flyToHighlightTimer)
    if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }

    const el = document.createElement('div')
    el.style.width = '40px'
    el.style.height = '40px'
    el.style.borderRadius = '50%'
    el.style.background = 'rgba(231,76,60,0.15)'
    el.style.border = '2px solid rgba(231,76,60,0.6)'
    el.style.boxShadow = '0 0 20px rgba(231,76,60,0.3), inset 0 0 12px rgba(231,76,60,0.15)'
    el.style.animation = 'flyto-pulse 1.5s ease-out 3'
    el.style.pointerEvents = 'none'

    flyToHighlightMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(m)

    flyToHighlightTimer = setTimeout(() => {
      if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }
      flyToHighlightTimer = null
    }, 5000)
  }

  function scheduleSetupRetry() {
    if (setupRetryTimer || retryCount >= MAX_RETRIES) return
    retryCount++
    setupRetryTimer = setTimeout(() => {
      setupRetryTimer = null
      setupLayers()
    }, 350)
  }

  /**
   * Single reconcile entry point: push the latest props into the map via
   * `syncObservatoryLayers` (setData-first, setup-if-missing). Retries while
   * the style is not ready so late-arriving data can never be dropped when
   * a style switch is mid-flight — the failure mode that blanked polygons.
   */
  function setupLayers() {
    const m = map.value
    if (!m || !isActiveGetter()) return
    if (!m.isStyleLoaded()) {
      try { m.once('idle', () => setupLayers()) } catch { /* ignore */ }
      scheduleSetupRetry()
      return
    }
    const p = getProps()
    // Effective claim set: live filters win, raw points are the fallback.
    // An explicitly empty filtered set means "no matches" (render empty),
    // while undefined means "not filtered" (render raw).
    const effectivePoints = p.rareEarthFiltered ?? p.rareEarthPoints
    let networkFeatures: GeoJSON.FeatureCollection | null | undefined
    if (!effectivePoints?.features?.length) {
      // Genuine empty (no matches yet / filtered out): clear lines.
      networkFeatures = { type: 'FeatureCollection', features: [] }
      lastNetBuiltPoints = effectivePoints
    } else if (effectivePoints !== lastNetBuiltPoints || Date.now() - lastNetBuildAt > NET_THROTTLE_MS) {
      networkFeatures = buildEnterpriseNetworkLines(effectivePoints)
      lastNetBuiltPoints = effectivePoints
      lastNetBuildAt = Date.now()
    } else {
      // Filtered churn inside the throttle window: keep on-map lines, and
      // schedule a delayed pass so the latest data still lands.
      networkFeatures = undefined
      if (!netResyncTimer) {
        netResyncTimer = setTimeout(() => {
          netResyncTimer = null
          scheduleReconcile()
        }, NET_THROTTLE_MS + 100)
      }
    }
    const ok = syncObservatoryLayers(m, {
      points: effectivePoints ?? null,
      polys: p.rareEarthPolygons ?? null,
      protected: p.rareEarthProtected ?? null,
      water: p.rareEarthWater ?? null,
      cultural: p.rareEarthCultural ?? null,
      networkFeatures,
      visibility: p.layerVisibility,
      popup: options.popup,
    })
    if (ok) {
      retryCount = 0
      if (setupRetryTimer) { clearTimeout(setupRetryTimer); setupRetryTimer = null }
    } else {
      scheduleSetupRetry()
    }
  }

  function scheduleReconcile() {
    if (reconcileTimer) return
    reconcileTimer = setTimeout(() => {
      reconcileTimer = null
      setupLayers()
    }, 32)
  }

  // Visibility-only toggles apply instantly without touching sources.
  const stopVisWatch = watch(
    () => getProps().layerVisibility,
    () => {
      if (!isActiveGetter()) return
      const m = map.value
      if (!m || !m.isStyleLoaded()) return
      syncRareEarthLayerVisibilityInternal(m, getProps().layerVisibility || {})
    },
  )

  // Late map arrival (reactive mapRef now updates) — bootstrap layers.
  const stopMapWatch = watch(
    () => map.value,
    (m) => {
      if (!m || !isActiveGetter()) return
      scheduleReconcile()
    },
  )

  // One debounced reconcile for ALL structural inputs. Previously five
  // independent watchers each early-returned while the style was reloading
  // and dropped their update forever (the polygon blanking). Funneling
  // through setupLayers() gives every input the same retry-while-reloading
  // guarantee.
  const stopDataWatch = watch(
    () => [
      getProps().rareEarthPoints,
      getProps().rareEarthFiltered,
      getProps().rareEarthPolygons,
      getProps().rareEarthProtected,
      getProps().rareEarthWater,
      getProps().rareEarthCultural,
    ] as const,
    () => {
      if (!isActiveGetter() || !map.value) return
      scheduleReconcile()
    },
  )

  let pendingFlyHighlight: { lng: number; lat: number } | null = null
  const stopFlyToWatch = watch(
    () => getProps().flyToTarget,
    (target) => {
      if (!target) return
      const m = map.value
      if (!m) {
        pendingFlyHighlight = { lng: target.lng, lat: target.lat }
        return
      }
      try {
        m.once('moveend', () => addFlyToHighlight(target.lng, target.lat))
      } catch {
        addFlyToHighlight(target.lng, target.lat)
      }
    },
  )
  // Flush highlight if target arrived before the map.
  const stopPendingFlyWatch = watch(() => map.value, (m) => {
    if (m && pendingFlyHighlight) {
      const t = pendingFlyHighlight
      pendingFlyHighlight = null
      try { m.once('moveend', () => addFlyToHighlight(t.lng, t.lat)) } catch { /* ignore */ }
    }
  })

  onScopeDispose(() => {
    stopVisWatch()
    stopMapWatch()
    stopDataWatch()
    stopFlyToWatch()
    stopPendingFlyWatch()
    if (reconcileTimer) { clearTimeout(reconcileTimer); reconcileTimer = null }
    if (netResyncTimer) { clearTimeout(netResyncTimer); netResyncTimer = null }
    if (setupRetryTimer) { clearTimeout(setupRetryTimer); setupRetryTimer = null }
    if (flyToHighlightTimer) clearTimeout(flyToHighlightTimer)
    if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }
  })

  return { setupLayers, addFlyToHighlight }
}
