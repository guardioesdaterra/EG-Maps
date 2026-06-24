import { watch, onScopeDispose, type Ref } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import {
  setupRareEarthLayers as setupRareEarthLayersInternal,
  syncRareEarthLayerVisibility as syncRareEarthLayerVisibilityInternal,
} from '@/composables/useRareEarthLayers'
import { buildEnterpriseNetworkLines } from '@/lib/enterprise-data'

export interface RareEarthControllerProps {
  rareEarthPoints?: GeoJSON.FeatureCollection
  rareEarthPolygons?: GeoJSON.FeatureCollection
  rareEarthProtected?: GeoJSON.FeatureCollection
  layerVisibility?: Record<string, boolean>
  flyToTarget?: { lng: number; lat: number; zoom?: number } | null
}

export interface RareEarthControllerOptions {
  /** Map instance (null until ready) */
  map: Ref<MapLibreMap | null>
  /** True when REE dataset is active (drives whether watchers do anything) */
  isActive: Ref<boolean> | (() => boolean)
  /** Reactive props getter (so watchers re-fire when upstream changes) */
  getProps: () => RareEarthControllerProps
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

  function setupLayers() {
    const m = map.value
    if (!m) return
    const p = getProps()
    if (!p.rareEarthPoints) return

    setupRareEarthLayersInternal(m, {
      points: p.rareEarthPoints,
      polys: p.rareEarthPolygons ?? null,
      protected: p.rareEarthProtected ?? null,
      networkFeatures: buildEnterpriseNetworkLines(p.rareEarthPoints),
    })
    syncRareEarthLayerVisibilityInternal(m, p.layerVisibility || {})
  }

  // Watcher: layer visibility toggles (parent-driven state)
  const stopVisWatch = watch(
    () => getProps().layerVisibility,
    () => {
      if (!isActiveGetter()) return
      const m = map.value
      if (!m) return
      syncRareEarthLayerVisibilityInternal(m, getProps().layerVisibility || {})
    },
    { deep: true },
  )

  // Watcher: points data updates (e.g. from search filtering)
  const stopPointsWatch = watch(
    () => getProps().rareEarthPoints,
    (newVal) => {
      if (!isActiveGetter() || !newVal || !map.value || !map.value.isStyleLoaded()) return
      try {
        const src = map.value.getSource('ree-points') as maplibregl.GeoJSONSource
        if (src) src.setData(newVal)
        const netFc = buildEnterpriseNetworkLines(newVal)
        const netSrc = map.value.getSource('ree-network') as maplibregl.GeoJSONSource | undefined
        if (netSrc) netSrc.setData(netFc)
      } catch { /* ignore */ }
    },
  )

  // Watcher: protected areas data updates
  const stopProtectedWatch = watch(
    () => getProps().rareEarthProtected,
    (newVal) => {
      if (!isActiveGetter() || !newVal || !map.value || !map.value.isStyleLoaded()) return
      try {
        const src = map.value.getSource('ree-protected') as maplibregl.GeoJSONSource | undefined
        if (src) src.setData(newVal)
      } catch { /* ignore */ }
    },
  )

  // Watcher: fly-to target from parent
  const stopFlyToWatch = watch(
    () => getProps().flyToTarget,
    (target) => {
      if (!target) return
      const m = map.value
      if (!m) return
      m.flyTo({ center: [target.lng, target.lat], zoom: target.zoom ?? 9, duration: 1500 })
      m.once('moveend', () => addFlyToHighlight(target.lng, target.lat))
    },
  )

  onScopeDispose(() => {
    stopVisWatch()
    stopPointsWatch()
    stopProtectedWatch()
    stopFlyToWatch()
    if (flyToHighlightTimer) clearTimeout(flyToHighlightTimer)
    if (flyToHighlightMarker) { flyToHighlightMarker.remove(); flyToHighlightMarker = null }
  })

  return { setupLayers, addFlyToHighlight }
}
