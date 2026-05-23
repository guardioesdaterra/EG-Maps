import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'

export function getMapStyle(apiKey?: string): string {
  if (apiKey) return `https://api.maptiler.com/maps/satellite/style.json?key=${apiKey}`
  return 'https://demotiles.maplibre.org/style.json'
}

const tileCache = new Map<string, Response>()
const MAX_TILE_CACHE = 500

export function transformRequest(url: string, _resourceType?: string) {
  if (tileCache.has(url)) {
    return { url, headers: {}, method: 'GET' as const, type: 'image' as const, credentials: 'same-origin' as const, collectResourceTiming: false }
  }
  return { url }
}

function trimTileCache() {
  if (tileCache.size > MAX_TILE_CACHE) {
    const keys = [...tileCache.keys()]
    const toDelete = keys.slice(0, tileCache.size - MAX_TILE_CACHE)
    toDelete.forEach(k => tileCache.delete(k))
  }
}

export function cacheTileResponse(url: string, response: Response) {
  tileCache.set(url, response)
  trimTileCache()
}

export function clearMapCache() {
  tileCache.clear()
}

export function useMapLibre(
  containerRef: Ref<HTMLDivElement | null>,
  options: {
    isGlobe?: boolean
    isMobile?: boolean
    mapStyle?: string
    onLoad?: (map: MapLibreMap) => void
  } = {}
) {
  const map = ref<MapLibreMap | null>(null)
  const isLoading = ref(true)
  const hasError = ref(false)
  let isMounted = true
  let errorCount = 0
  let usedFallback = false
  let loadTimeout: ReturnType<typeof setTimeout> | null = null

  onMounted(() => { isMounted = true })
  onUnmounted(() => {
    isMounted = false
    if (loadTimeout) clearTimeout(loadTimeout)
    if (map.value) {
      map.value.remove()
      map.value = null
    }
  })

  async function initMap() {
    if (!containerRef.value) return
    isLoading.value = true
    hasError.value = false
    errorCount = 0
    usedFallback = false

    try {
      const maplibregl = await import('maplibre-gl')
      const style = options.mapStyle || getMapStyle()
      const m = new maplibregl.Map({
        container: containerRef.value,
        style,
        zoom: options.isMobile ? 1.8 : options.isGlobe ? 2.5 : 3,
        center: options.isGlobe ? [0, 20] : [0, 0],
        attributionControl: false,
        renderWorldCopies: !options.isGlobe,
        fadeDuration: 100,
        maxTileCacheSize: 200,
        maxTileCacheZoomLevels: 5,
        transformRequest,
      } as maplibregl.MapOptions & { antialias?: boolean })

      m.addControl(new maplibregl.AttributionControl({
        customAttribution: `EARTH GUARDIANS @ ${new Date().getFullYear()}`
      }))

      if (!options.isMobile && !options.isGlobe) {
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left')
      }

      if (options.isGlobe) {
        m.on('style.load', () => {
          try { m.setProjection({ type: 'globe' } as any) } catch (e) { console.error('Error setting globe projection:', e) }
        })
      }

      m.on('load', () => {
        if (!isMounted) return
        isLoading.value = false
        options.onLoad?.(m)
      })

      m.on('error', (err: any) => {
        console.error('MapLibre error:', err)
        errorCount++
        if (!usedFallback && errorCount >= 2 && style.includes('maptiler.com')) {
          usedFallback = true
          console.warn('MapTiler style failed, falling back to demotiles style')
          m.setStyle('https://demotiles.maplibre.org/style.json')
          return
        }
        if (!m.loaded()) {
          isLoading.value = false
          hasError.value = true
        }
      })

      loadTimeout = setTimeout(() => { if (isLoading.value) isLoading.value = false }, 10000)
      map.value = m
    } catch (err) {
      console.error('Failed to initialize map:', err)
      isLoading.value = false
      hasError.value = true
    }
  }

  function retry() {
    hasError.value = false
    initMap()
  }

  return { map, isLoading, hasError, initMap, retry }
}
