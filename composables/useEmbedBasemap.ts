/**
 * composables/useEmbedBasemap.ts
 * @why Squarespace embed basemap — satellite imagery on land, transparent water.
 *
 *       Loads MapTiler's `hybrid-v4` (or `satellite-v4`) vector style, then
 *       overrides the `water` vector layer to paint at alpha 0 so the host
 *       page's background shows through oceans, lakes, and rivers. Country
 *       land borders are drawn on top of the satellite imagery as crisp
 *       white strokes (so they read against any satellite color).
 *
 *       If no MapTiler API key is configured, falls back to the
 *       borders-only look (transparent background, only land outlines).
 *
 * @functions useEmbedBasemap
 * @connections composables/useSquarespaceEmbed.ts, pages/squarespace/active-crews.vue
 */
import { ref, onBeforeUnmount, type Ref } from 'vue'
import type {
  Map as MapLibreMap,
  StyleSpecification,
  GeoJSONSource,
} from 'maplibre-gl'

const LAND_FILL_LAYER = 'eg-embed-land-fill'
const LAND_OUTLINE_LAYER = 'eg-embed-land-outline'
const BORDER_LAYER = 'eg-embed-country-border'

/**
 * Borders-only fallback style — used when no MapTiler API key is configured.
 * Country land polygons + thin borders are drawn by `addLandOverlay()` once
 * this style is loaded.
 */
function buildBordersOnlyStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {},
    layers: [
      {
        id: 'eg-embed-bg',
        type: 'background',
        paint: { 'background-color': 'rgba(0,0,0,0)' },
      },
    ],
  } as unknown as StyleSpecification
}

export type EmbedBasemapMode = 'satellite' | 'borders'

export interface UseEmbedBasemapOptions {
  mapRef: Ref<MapLibreMap | null>
  /** Absolute URL of the MapTiler style.json, or null for borders-only fallback. */
  mapTilerStyleUrl?: string | null
  /** Path to the land-borders GeoJSON (used in both modes). */
  landGeoJsonUrl?: string
  /** Border stroke color (CSS variable resolved at runtime). */
  borderColor?: string
  /** Border line width. */
  borderWidth?: number
}

export interface UseEmbedBasemapApi {
  /** True once the basemap + land borders are painted. */
  isReady: Readonly<Ref<boolean>>
  /** Which mode is currently active (satellite or borders-only fallback). */
  mode: Readonly<Ref<EmbedBasemapMode>>
  /** Internal — call once the map's `load` event fires. */
  install: () => Promise<void>
  /** Apply a different border color without rebuilding the basemap. */
  setBorderColor: (color: string) => void
}

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/**
 * After a style has loaded, walk all layers and make any water/ice/ocean
 * fill layers transparent. MapTiler's `hybrid-v4` style includes layers
 * named `water`, `Water area`, etc. — we match by `id` substring or layer
 * `type: 'fill'` with `source-layer` containing 'water'.
 */
function applyWaterAlpha(
  map: MapLibreMap,
  alphaFillColor: string,
  alphaLineColor: string,
): void {
  const style = map.getStyle()
  const layers = style.layers ?? []
  for (const layer of layers) {
    const id = layer.id.toLowerCase()
    const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : undefined
    const sourceLayerStr = typeof sourceLayer === 'string' ? sourceLayer : ''
    const looksLikeWater =
      id.includes('water') ||
      id.includes('ocean') ||
      (layer.type === 'fill' && sourceLayerStr.toLowerCase().includes('water'))
    if (!looksLikeWater) continue

    try {
      if (layer.type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-color', alphaFillColor)
        // Leave fill-opacity at 0 explicitly.
        map.setPaintProperty(layer.id, 'fill-opacity', 0)
        const paint = layer.paint
        if (paint && typeof paint === 'object' && 'fill-outline-color' in paint) {
          map.setPaintProperty(layer.id, 'fill-outline-color', alphaLineColor)
        }
      } else if (layer.type === 'line') {
        map.setPaintProperty(layer.id, 'line-color', alphaLineColor)
        map.setPaintProperty(layer.id, 'line-opacity', 0)
      }
    } catch {
      /* some properties may be data-driven; skip */
    }
  }
}

export function useEmbedBasemap(opts: UseEmbedBasemapOptions): UseEmbedBasemapApi {
  const isReady = ref(false)
  const mode = ref<EmbedBasemapMode>('borders')

  const url = opts.landGeoJsonUrl ?? '/data/embed/land-110m.geojson'
  const defaultBorderLight = readCssVar(
    '--embed-land-stroke',
    'rgba(255,255,255,0.85)',
  )
  const defaultBorderDark = readCssVar(
    '--embed-land-stroke-dark',
    'rgba(255,255,255,0.7)',
  )
  const borderWidth = opts.borderWidth ?? 1.2
  let borderColor = opts.borderColor ?? defaultBorderLight

  const addLandOverlay = (map: MapLibreMap) => {
    // Insert just above the basemap's first non-bg layer so borders sit
    // above the satellite imagery. If borders-only mode, this is the only
    // visible thing.
    const layers = map.getStyle().layers ?? []
    const firstNonBg = layers.find(
      (l) => l.id !== 'eg-embed-bg' && l.id !== 'background',
    )
    const beforeId = firstNonBg?.id

    // Add the GeoJSON source for the country polygons (used as clip mask).
    if (!map.getSource('eg-embed-land' as never)) {
      // Lazy-load the GeoJSON — caller awaits the fetch before calling
      // install(). We attach an empty data first to keep the source valid.
      map.addSource('eg-embed-land', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
    }

    if (!map.getLayer(LAND_FILL_LAYER)) {
      map.addLayer(
        {
          id: LAND_FILL_LAYER,
          type: 'fill',
          source: 'eg-embed-land',
          paint: {
            'fill-color': borderColor,
            'fill-opacity': 0.06,
          },
        },
        beforeId,
      )
    }
    if (!map.getLayer(BORDER_LAYER)) {
      map.addLayer(
        {
          id: BORDER_LAYER,
          type: 'line',
          source: 'eg-embed-land',
          paint: {
            'line-color': borderColor,
            'line-width': borderWidth,
            'line-opacity': 0.95,
          },
        },
        beforeId,
      )
    }
    if (!map.getLayer(LAND_OUTLINE_LAYER)) {
      map.addLayer(
        {
          id: LAND_OUTLINE_LAYER,
          type: 'line',
          source: 'eg-embed-land',
          paint: {
            'line-color': borderColor,
            'line-width': Math.max(0.5, borderWidth * 0.4),
            'line-opacity': 0.4,
          },
        },
        beforeId,
      )
    }
  }

  const setBorderColor = (color: string) => {
    borderColor = color
    const map = opts.mapRef.value
    if (!map || !map.isStyleLoaded()) return
    for (const id of [LAND_FILL_LAYER, BORDER_LAYER, LAND_OUTLINE_LAYER]) {
      if (!map.getLayer(id)) continue
      if (id === LAND_FILL_LAYER) {
        map.setPaintProperty(id, 'fill-color', color)
      } else {
        map.setPaintProperty(id, 'line-color', color)
      }
    }
  }

  const install = async () => {
    const map = opts.mapRef.value
    if (!map) return

    const styleUrl = opts.mapTilerStyleUrl ?? null
    if (styleUrl) {
      // ─── Satellite-on-land, alpha-water mode ───
      mode.value = 'satellite'
      map.setStyle(styleUrl, { diff: false })

      await new Promise<void>((resolve) => {
        const onLoad = () => {
          map.off('style.load', onLoad)
          resolve()
        }
        map.on('style.load', onLoad)
        if (map.isStyleLoaded()) {
          map.off('style.load', onLoad)
          resolve()
        }
      })

      // Make every water/ocean layer transparent so the Squarespace
      // background bleeds through water pixels. This is the heart of the
      // "100% transparent with satellite tile on land" effect.
      applyWaterAlpha(map, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)')

      // Add our crisp country borders on top of the satellite imagery.
      addLandOverlay(map)

      // Load land GeoJSON and feed the border source.
      try {
        const res = await fetch(url, { credentials: 'omit' })
        if (res.ok) {
          const geo = (await res.json()) as GeoJSON.FeatureCollection
          const src = map.getSource('eg-embed-land' as never) as
            | GeoJSONSource
            | undefined
          src?.setData(geo)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[eg-embed] land geojson fetch failed', err)
      }
    } else {
      // ─── Borders-only fallback ───
      mode.value = 'borders'
      map.setStyle(buildBordersOnlyStyle() as unknown as string, { diff: false })
      await new Promise<void>((resolve) => {
        const onLoad = () => {
          map.off('style.load', onLoad)
          resolve()
        }
        map.on('style.load', onLoad)
        if (map.isStyleLoaded()) {
          map.off('style.load', onLoad)
          resolve()
        }
      })

      addLandOverlay(map)

      try {
        const res = await fetch(url, { credentials: 'omit' })
        if (res.ok) {
          const geo = (await res.json()) as GeoJSON.FeatureCollection
          const src = map.getSource('eg-embed-land' as never) as
            | GeoJSONSource
            | undefined
          src?.setData(geo)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[eg-embed] land geojson fetch failed', err)
      }
    }

    isReady.value = true
  }

  onBeforeUnmount(() => {
    const map = opts.mapRef.value
    if (!map) return
    try {
      for (const id of [LAND_FILL_LAYER, LAND_OUTLINE_LAYER, BORDER_LAYER]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('eg-embed-land' as never)) {
        map.removeSource('eg-embed-land' as never)
      }
    } catch {
      /* map torn down */
    }
  })

  return {
    isReady: isReady as unknown as Readonly<Ref<boolean>>,
    mode: mode as unknown as Readonly<Ref<EmbedBasemapMode>>,
    install,
    setBorderColor,
  }
}