/**
 * composables/useGeoHexGrid.ts
 * @why Geography-anchored hexbin density layer rendered as MapLibre GeoJSON
 *      layers on top of the satellite basemap (the "grid view" improvement):
 *      cells bin the active dataset's points, re-anchor on camera moves, and
 *      expose per-cell stats for a legend.
 * @functions useGeoHexGrid
 * @connections composables/useMapBase.ts, lib/hexbin.ts, lib/constants.ts (GEO_HEX_GRID)
 */
import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { GEO_HEX_GRID } from '@/lib/constants'
import { binHexCells, hexCellRing, type GeoPoint } from '@/lib/hexbin'

const SOURCE_ID = 'eg-geo-hex-grid'
const FILL_LAYER_ID = 'eg-geo-hex-fill'
const LINE_LAYER_ID = 'eg-geo-hex-line'
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export type HexGridMode = 'decorative' | 'density' | 'off'

export interface GeoHexStats {
  cells: number
  binned: number
  max: number
  topCells: { lng: number; lat: number; count: number }[]
  /** Approximate ground width of one hex cell in km at the current view. */
  cellKm: number
}

function rampColor(ratio: number): string {
  const ramp = GEO_HEX_GRID.fillRamp
  const idx = Math.min(ramp.length - 1, Math.floor(Math.sqrt(Math.max(0, Math.min(1, ratio))) * ramp.length))
  return ramp[idx] as string
}

export function useGeoHexGrid(
  getMap: () => MapLibreMap | null,
  points: Ref<GeoPoint[]>,
  mode: Ref<HexGridMode>,
) {
  const geoHexStats = shallowRef<GeoHexStats>({ cells: 0, binned: 0, max: 0, topCells: [], cellKm: 0 })
  let mapBound: MapLibreMap | null = null
  let raf: number | null = null
  let cancelled = false

  const showGeoHexGrid = computed(() => mode.value === 'density')

  function ensureLayers(map: MapLibreMap): boolean {
    if (!map.getSource(SOURCE_ID)) {
      try {
        map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY_FC })
        map.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['get', 'opacity'],
          },
        })
        map.addLayer({
          id: LINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': GEO_HEX_GRID.lineColor,
            'line-width': GEO_HEX_GRID.lineWidth,
            'line-opacity': 0.8,
          },
        })
      } catch {
        return false
      }
    }
    return Boolean(map.getLayer(FILL_LAYER_ID))
  }

  function removeLayers(map: MapLibreMap) {
    try {
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID)
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    } catch { /* map already torn down */ }
  }

  function rebuild() {
    if (cancelled) return
    const map = getMap()
    if (!map) return
    if (!map.isStyleLoaded()) {
      // `load` can fire while a provider style swap is still in flight — retry
      // once the map settles instead of leaving the grid missing.
      map.once('idle', () => requestRebuild())
      return
    }
    if (!showGeoHexGrid.value) {
      if (map.getSource(SOURCE_ID)) removeLayers(map)
      return
    }
    if (!ensureLayers(map)) return
    const bounds = map.getBounds()
    const zoom = map.getZoom()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    const binInput = { west: sw.lng, east: ne.lng, south: sw.lat, north: ne.lat, zoom }

    let cellPx: number = GEO_HEX_GRID.cellPx
    let result = binHexCells(points.value, binInput, cellPx)
    // Keep the redraw bounded on far-out zooms: grow cells until under cap.
    while (result.cells.length > GEO_HEX_GRID.maxCells && cellPx < 400) {
      cellPx = Math.round(cellPx * 1.4)
      result = binHexCells(points.value, binInput, cellPx)
    }

    const max = result.maxCount || 1
    const features: GeoJSON.Feature[] = result.cells.map(cell => ({
      type: 'Feature',
      properties: {
        count: cell.count,
        color: rampColor(cell.count / max),
        opacity: GEO_HEX_GRID.minFillOpacity
          + (GEO_HEX_GRID.maxFillOpacity - GEO_HEX_GRID.minFillOpacity) * Math.sqrt(cell.count / max),
      },
      geometry: {
        type: 'Polygon',
        // 40144 is the only EPSG MapLibre accepts for GeoJSON; hexbin works in
        // tile-pixel space and unprojects back to lng/lat instead.
        coordinates: [hexCellRing(cell.col, cell.row, result.cellPx, zoom)],
      },
    }))

    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features } satisfies GeoJSON.FeatureCollection)

    const topCells = [...result.cells]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(c => ({ lng: c.lng, lat: c.lat, count: c.count }))
    geoHexStats.value = {
      cells: result.cells.length,
      binned: result.totalPoints,
      max: result.maxCount,
      topCells,
      cellKm: Math.round(result.cellPx * result.kmPerPx * 10) / 10,
    }
  }

  function requestRebuild() {
    if (cancelled || raf !== null) return
    raf = requestAnimationFrame(() => {
      raf = null
      rebuild()
    })
  }

  function unbindMap() {
    if (!mapBound) return
    try {
      mapBound.off('move', requestRebuild)
      mapBound.off('zoom', requestRebuild)
      mapBound.off('resize', requestRebuild)
      mapBound.off('styledata', requestRebuild)
      if (mapBound.getSource(SOURCE_ID)) removeLayers(mapBound)
    } catch { /* map already removed */ }
    mapBound = null
  }

  function bindMap() {
    const map = getMap()
    if (!map || map === mapBound) return
    unbindMap()
    mapBound = map
    map.on('move', requestRebuild)
    map.on('zoom', requestRebuild)
    map.on('resize', requestRebuild)
    // Basemap switches drop every non-style layer; rebuild re-adds them.
    map.on('styledata', requestRebuild)
  }

  function refresh() {
    bindMap()
    requestRebuild()
  }

  function cleanup() {
    cancelled = true
    if (raf !== null) cancelAnimationFrame(raf)
    raf = null
    unbindMap()
  }

  // Immediate so a density grid restored from a saved preference or share link
  // renders without waiting for a mode change.
  watch(showGeoHexGrid, (on) => {
    if (on) {
      bindMap()
      rebuild()
    } else if (mapBound) {
      try { removeLayers(mapBound) } catch { /* ignore */ }
      geoHexStats.value = { cells: 0, binned: 0, max: 0, topCells: [], cellKm: 0 }
    }
  }, { immediate: true })
  watch(points, () => {
    if (showGeoHexGrid.value) requestRebuild()
  })

  onScopeDispose(cleanup)

  return { showGeoHexGrid, geoHexStats, refresh, cleanup }
}
