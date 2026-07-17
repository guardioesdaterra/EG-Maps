/**
 * composables/useWaterLayers.ts
 * @why Water body map layers — renders rivers, lakes, and ocean features on the map
 * @functions setupWaterLayers, cleanupWaterLayers, setWaterLayersVisibility
 * @consts WATER_SOURCE, WATER_LAYER_IDS
 * @connections composables/useRareEarthController.ts, composables/useRareEarthLayers.ts
 */
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'

const activePopups = new WeakMap<MapLibreMap, maplibregl.Popup>()

function closeActivePopup(map: MapLibreMap) {
  const popup = activePopups.get(map)
  if (popup) { popup.remove(); activePopups.delete(map) }
}

export const WATER_SOURCE = 'ree-water'
export const WATER_LAYER_IDS = [
  'ree-water-poly-fill', 'ree-water-poly-line', 'ree-water-poly-label',
  'ree-water-river-line', 'ree-water-river-label',
] as const

export function setupWaterLayers(
  map: MapLibreMap,
  waterData: GeoJSON.FeatureCollection,
): () => void {
  if (!waterData?.features?.length) return () => {}
  if (!map.isStyleLoaded()) return () => {}
  if (map.getSource(WATER_SOURCE)) return () => {}

  const cleanups: Array<() => void> = []

  map.addSource(WATER_SOURCE, {
    type: 'geojson',
    data: waterData,
  })

  map.addLayer({
    id: 'ree-water-poly-fill',
    type: 'fill',
    source: WATER_SOURCE,
    filter: ['==', 'geometryType', 'Polygon'],
    paint: {
      'fill-color': '#3498db',
      'fill-opacity': 0.15,
    },
  })

  map.addLayer({
    id: 'ree-water-poly-line',
    type: 'line',
    source: WATER_SOURCE,
    filter: ['==', 'geometryType', 'Polygon'],
    paint: {
      'line-color': '#2980b9',
      'line-width': 0.8,
      'line-opacity': 0.5,
    },
  })

  map.addLayer({
    id: 'ree-water-poly-label',
    type: 'symbol',
    source: WATER_SOURCE,
    filter: ['all', ['==', 'geometryType', 'Polygon'], ['has', 'name']],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 0, 10, 9, 13, 11],
      'text-allow-overlap': false,
      'text-ignore-placement': false,
    },
    paint: {
      'text-color': '#5dade2',
      'text-halo-color': 'rgba(0,0,0,0.85)',
      'text-halo-width': 1.5,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 10, 0.8],
    },
  })

  map.addLayer({
    id: 'ree-water-river-line',
    type: 'line',
    source: WATER_SOURCE,
    filter: ['==', 'geometryType', 'LineString'],
    paint: {
      'line-color': '#3498db',
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        8, 0.5,
        11, 1.5,
        14, 2.5,
      ],
      'line-opacity': 0.6,
    },
  })

  map.addLayer({
    id: 'ree-water-river-label',
    type: 'symbol',
    source: WATER_SOURCE,
    filter: ['all', ['==', 'geometryType', 'LineString'], ['has', 'name']],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 8, 14, 10],
      'symbol-placement': 'line',
      'text-rotation-alignment': 'map',
    },
    paint: {
      'text-color': '#2980b9',
      'text-halo-color': 'rgba(0,0,0,0.8)',
      'text-halo-width': 1,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 0.7],
    },
  })

  const onWaterClick = (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return
    const p = e.features[0].properties
    closeActivePopup(map)
    const waterType = p.water_type || p.water || p.waterway || 'water'
    const name = p.name || 'Unnamed water body'
    const typeLabel = waterType.charAt(0).toUpperCase() + waterType.slice(1)

    let sizeInfo = ''
    if (p.area_km2) sizeInfo = `Area: ${p.area_km2} km²`
    else if (p.length_km) sizeInfo = `Length: ${p.length_km} km`

    const html = `<div class="ree-popup-wrapper" style="padding:14px;min-width:200px;position:relative">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:#3b82f6;color:#fff">WATER</span>
        <span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(59,130,246,0.2);color:#60a5fa">${typeLabel}</span>
      </div>
      <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8">${name}</h3>
      ${sizeInfo ? `<p style="font-size:10px;color:#888;margin:6px 0 0">${sizeInfo}</p>` : ''}
      ${p.osm_id ? `<a href="https://www.openstreetmap.org/${p.osm_id ? 'way' : 'relation'}/${p.osm_id}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:10px;color:#60a5fa">View on OSM &rarr;</a>` : ''}
    </div>`

    activePopups.set(map, new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .setMaxWidth('none')
      .addTo(map))
  }

  const onWaterEnter = () => { map.getCanvas().style.cursor = 'pointer' }
  const onWaterLeave = () => { map.getCanvas().style.cursor = '' }

  for (const layerId of ['ree-water-poly-fill', 'ree-water-river-line']) {
    map.on('click', layerId, onWaterClick)
    map.on('mouseenter', layerId, onWaterEnter)
    map.on('mouseleave', layerId, onWaterLeave)
    cleanups.push(() => {
      map.off('click', layerId, onWaterClick)
      map.off('mouseenter', layerId, onWaterEnter)
      map.off('mouseleave', layerId, onWaterLeave)
    })
  }

  return () => {
    cleanups.forEach(fn => fn())
    cleanupWaterLayers(map)
  }
}

export function cleanupWaterLayers(map: MapLibreMap) {
  for (const id of WATER_LAYER_IDS) {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* layer may not exist */ }
  }
  try { if (map.getSource(WATER_SOURCE)) map.removeSource(WATER_SOURCE) } catch { /* source may not exist */ }
}

export function setWaterLayersVisibility(map: MapLibreMap, visible: boolean) {
  const visibility = visible ? 'visible' : 'none'
  for (const id of WATER_LAYER_IDS) {
    try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility) } catch { /* ignore */ }
  }
}
