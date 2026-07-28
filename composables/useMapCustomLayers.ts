/**
 * composables/useMapCustomLayers.ts
 * @why MapLibre GL custom layer manager — watches custom datasets, adds/removes MapLibre sources and layers (circle, symbol, line, fill) reactively, and handles click events to select features for popup display.
 */
import { watch, ref, onUnmounted, type Ref } from 'vue'
import type { Map as MapLibreMap, MapMouseEvent, GeoJSONSource } from 'maplibre-gl'
import { useCustomData, type CustomDataset } from './useCustomData'

const SOURCE_PREFIX = 'custom_source_'
const LAYER_CIRCLE_PREFIX = 'custom_circle_'
const LAYER_LABEL_PREFIX = 'custom_label_'
const LAYER_LINE_PREFIX = 'custom_line_'
const LAYER_FILL_PREFIX = 'custom_fill_'

function hasPoint(features: GeoJSON.Feature[]): boolean {
  return features.some(f => f.geometry?.type === 'Point' || f.geometry?.type === 'MultiPoint')
}

function hasLine(features: GeoJSON.Feature[]): boolean {
  return features.some(f => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString')
}

function hasPolygon(features: GeoJSON.Feature[]): boolean {
  return features.some(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
}

export function useMapCustomLayers(mapRef: Ref<MapLibreMap | null>) {
  const { datasets, selectFeature } = useCustomData()
  const map = ref<MapLibreMap | null>(null)
  let lastIds = new Set<string>()
  let clickHandler: ((e: MapMouseEvent) => void) | null = null

  watch(mapRef, (m, oldM) => {
    map.value = m
    if (m && m.getStyle() && !oldM) {
      resyncAll()
    }
  }, { immediate: true })

  const styleLoadCleanup = ref<(() => void) | null>(null)

  watch(mapRef, (m) => {
    if (styleLoadCleanup.value) { styleLoadCleanup.value(); styleLoadCleanup.value = null }
    if (!m) return
    const onStyle = () => resyncAll()
    m.on('style.load', onStyle)
    styleLoadCleanup.value = () => m.off('style.load', onStyle)
  }, { immediate: true })

  function layerExists(dsId: string, m: MapLibreMap): boolean {
    const srcId = SOURCE_PREFIX + dsId
    try { return !!m.getSource(srcId) } catch { return false }
  }

  function addLayer(ds: CustomDataset, m: MapLibreMap) {
    const srcId = SOURCE_PREFIX + ds.id
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: ds.features }
    try { if (!m.getSource(srcId)) m.addSource(srcId, { type: 'geojson', data: fc }) } catch { return }
    try { (m.getSource(srcId) as GeoJSONSource | undefined)?.setData(fc) } catch { /* noop */ }
    if (hasPoint(ds.features)) {
      try {
        m.addLayer({
          id: LAYER_CIRCLE_PREFIX + ds.id,
          type: 'circle',
          source: srcId,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 15, 8],
            'circle-color': ds.color,
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        })
      } catch { /* noop */ }
      try {
        m.addLayer({
          id: LAYER_LABEL_PREFIX + ds.id,
          type: 'symbol',
          source: srcId,
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', 'title'], ''],
            'text-size': 10,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
          },
          paint: { 'text-color': ds.color, 'text-halo-color': '#fff', 'text-halo-width': 1 },
        })
      } catch { /* noop */ }
    }
    if (hasLine(ds.features)) {
      try {
        m.addLayer({
          id: LAYER_LINE_PREFIX + ds.id,
          type: 'line',
          source: srcId,
          paint: { 'line-color': ds.color, 'line-width': 2, 'line-opacity': 0.7 },
        })
      } catch { /* noop */ }
    }
    if (hasPolygon(ds.features)) {
      try {
        m.addLayer({
          id: LAYER_FILL_PREFIX + ds.id,
          type: 'fill',
          source: srcId,
          paint: { 'fill-color': ds.color, 'fill-opacity': 0.15, 'fill-outline-color': ds.color },
        })
      } catch { /* noop */ }
    }
  }

  function updateColors(dsId: string, color: string, m: MapLibreMap) {
    for (const [prefix, props] of [[LAYER_CIRCLE_PREFIX, [['circle-color', color]]], [LAYER_LABEL_PREFIX, [['text-color', color]]], [LAYER_LINE_PREFIX, [['line-color', color]]], [LAYER_FILL_PREFIX, [['fill-color', color], ['fill-outline-color', color]]]] as const) {
      const id = prefix + dsId
      for (const [prop, val] of props) {
        try { m.setPaintProperty(id, prop, val) } catch { /* noop */ }
      }
    }
  }

  function removeLayer(dsId: string, m: MapLibreMap) {
    const prefixes = [LAYER_CIRCLE_PREFIX, LAYER_LABEL_PREFIX, LAYER_LINE_PREFIX, LAYER_FILL_PREFIX]
    for (const p of prefixes) {
      const id = p + dsId
      try { if (m.getLayer(id)) m.removeLayer(id) } catch { /* noop */ }
    }
    const srcId = SOURCE_PREFIX + dsId
    try { if (m.getSource(srcId)) m.removeSource(srcId) } catch { /* noop */ }
  }

  watch(datasets, (all) => {
    const m = map.value as MapLibreMap | null
    if (!m || !m.getStyle()) return
    const currentIds = new Set(all.map(d => d.id))
    for (const oldId of lastIds) {
      if (!currentIds.has(oldId)) removeLayer(oldId, m)
    }
    for (const ds of all) {
      if (ds.visible && !lastIds.has(ds.id)) {
        addLayer(ds, m)
      } else if (!ds.visible && lastIds.has(ds.id)) {
        removeLayer(ds.id, m)
      } else if (ds.visible && lastIds.has(ds.id)) {
        const srcId = SOURCE_PREFIX + ds.id
        try {
          const src = m.getSource(srcId) as GeoJSONSource | undefined
          if (src && src.setData) src.setData({ type: 'FeatureCollection', features: ds.features })
        } catch { /* noop */ }
        updateColors(ds.id, ds.color, m)
      }
    }
    lastIds = currentIds
  }, { deep: true })

  function setupClickHandler() {
    const m = map.value
    if (!m || !m.getStyle()) return
    if (clickHandler) { m.off('click', clickHandler); clickHandler = null }
    clickHandler = (e: MapMouseEvent) => {
      const bbox = [[e.point.x - 5, e.point.y - 5], [e.point.x + 5, e.point.y + 5]] as [[number, number], [number, number]]
      const features = m.queryRenderedFeatures(bbox)
      for (const f of features) {
        for (const prefix of ['custom_circle_', 'custom_label_', 'custom_line_', 'custom_fill_']) {
          if (f.layer.id.startsWith(prefix)) {
            selectFeature(f as unknown as GeoJSON.Feature)
            return
          }
        }
      }
    }
    m.on('click', clickHandler)
  }

  function resyncAll() {
    const m = map.value as MapLibreMap | null
    if (!m || !m.getStyle()) return
    const all = datasets.value
    const currentIds = new Set(all.map(d => d.id))
    for (const oldId of lastIds) {
      if (!currentIds.has(oldId)) removeLayer(oldId, m)
    }
    for (const ds of all) {
      if (ds.visible && !layerExists(ds.id, m)) {
        addLayer(ds, m)
      }
    }
    lastIds = currentIds
    setupClickHandler()
  }

  function syncNow() {
    resyncAll()
  }

  onUnmounted(() => {
    if (styleLoadCleanup.value) styleLoadCleanup.value()
    const m = map.value
    if (m && clickHandler) m.off('click', clickHandler)
  })

  return { syncNow }
}
