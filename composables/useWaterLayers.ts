/**
 * composables/useWaterLayers.ts
 * @why Water body map layers — renders rivers, lakes, and ocean features on the map
 * @functions setupWaterLayers, cleanupWaterLayers, setWaterLayersVisibility
 * @consts WATER_SOURCE, WATER_LAYER_IDS
 * @connections composables/useRareEarthController.ts, composables/useRareEarthLayers.ts
 */
import type { Map as MapLibreMap, MapLayerMouseEvent, DataDrivenPropertyValueSpecification } from 'maplibre-gl'
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
  options?: { attachClickHandlers?: boolean },
): () => void {
  if (!waterData?.features?.length) return () => {}
  // NOTE: no `isStyleLoaded()` gate here on purpose — see the same note in
  // `setupCulturalLayers`. This runs mid-`syncObservatoryLayers` right after
  // `setData` calls that mark the style dirty until the next render; gating
  // on `isStyleLoaded()` would silently drop the water layer forever.
  // Load-gating with retry lives in `useRareEarthController.setupLayers`.
  if (map.getSource(WATER_SOURCE)) return () => {}

  const cleanups: Array<() => void> = []

  map.addSource(WATER_SOURCE, {
    type: 'geojson',
    data: waterData,
    // 7k polygons: relax simplification + tile buffer to cut first-paint
    // triangulation cost. No data removed — purely render-side.
    tolerance: 0.5,
    buffer: 64,
  })

  // NOTE: geometry type must be read with the ['geometry-type'] expression.
  // The previous ['==', 'geometryType', 'Polygon'] compared two string
  // literals (always false), which left ALL water bodies invisible.
  const polyGeom = ['==', ['geometry-type'], 'Polygon']
  const lineGeom = ['==', ['geometry-type'], 'LineString']
  // Waters under mining pressure (see lib/water-defense.ts) render red so a
  // threatened reservoir reads instantly against safe blue water.
  const threatCount = ['to-number', ['coalesce', ['get', 'threat_claims_2km'], 0]]
  const threatened = ['>', threatCount, 0]

  map.addLayer({
    id: 'ree-water-poly-fill',
    type: 'fill',
    source: WATER_SOURCE,
    filter: polyGeom as unknown as maplibregl.FilterSpecification,
    paint: {
      'fill-color': ['case', threatened, '#e74c3c', '#3498db'] as unknown as DataDrivenPropertyValueSpecification<string>,
      'fill-opacity': ['case', threatened, 0.3, 0.15] as unknown as DataDrivenPropertyValueSpecification<number>,
    },
  })

  map.addLayer({
    id: 'ree-water-poly-line',
    type: 'line',
    source: WATER_SOURCE,
    filter: polyGeom as unknown as maplibregl.FilterSpecification,
    paint: {
      'line-color': ['case', threatened, '#e74c3c', '#2980b9'] as unknown as DataDrivenPropertyValueSpecification<string>,
      'line-width': 0.8,
      'line-opacity': ['case', threatened, 0.9, 0.5] as unknown as DataDrivenPropertyValueSpecification<number>,
    },
  })

  map.addLayer({
    id: 'ree-water-poly-label',
    type: 'symbol',
    source: WATER_SOURCE,
    // NOTE: do NOT spread polyGeom here — `['all', ...polyGeom, ...]` would
    // flatten to `['all', '==', [...], 'Polygon', ...]`, which fails
    // style-spec validation (`filter[1]: array expected, string found`).
    filter: ['all', polyGeom, ['has', 'name']] as unknown as maplibregl.FilterSpecification,
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
    filter: lineGeom as unknown as maplibregl.FilterSpecification,
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
    // Same no-spread rule as the poly label above.
    filter: ['all', lineGeom, ['has', 'name']] as unknown as maplibregl.FilterSpecification,
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

    // Mining-pressure context (precomputed in lib/water-defense.ts at load).
    const threat2 = Number(p.threat_claims_2km ?? 0)
    const threat5 = Number(p.threat_claims_5km ?? 0)
    const nearest = p.threat_nearest ? String(p.threat_nearest) : ''
    const threatBadge = threat2 > 0
      ? `<span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:700;background:rgba(231,76,60,0.2);color:var(--danger)">UNDER PRESSURE</span>`
      : threat5 > 0
        ? `<span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:700;background:rgba(243,156,18,0.2);color:var(--warning)">WATCH</span>`
        : ''
    const threatHTML = (threat2 > 0 || threat5 > 0)
      ? `<div style="margin-top:7px;padding-top:7px;border-top:1px solid var(--obs-panel-border)">
          <div style="font-size:7.5px;color:var(--obs-text-muted);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:3px">Mining pressure</div>
          <div style="font-size:10.5px;color:var(--obs-text-primary);font-weight:600">${threat2} claims ≤2km · ${threat5} claims ≤5km</div>
          ${nearest ? `<div style="font-size:9px;color:var(--obs-text-muted);margin-top:2px">Nearest: ${nearest}</div>` : ''}
        </div>`
      : ''

    const html = `<div class="ree-popup-wrapper" style="padding:14px;min-width:200px;position:relative">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:var(--info);color:#fff">WATER</span>
        <span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(59,130,246,0.2);color:var(--info)">${typeLabel}</span>
        ${threatBadge}
      </div>
      <h3 style="margin:0;font-size:13px;font-weight:700;color:var(--obs-text-primary)">${name}</h3>
      ${sizeInfo ? `<p style="font-size:10px;color:var(--obs-text-muted);margin:6px 0 0">${sizeInfo}</p>` : ''}
      ${threatHTML}
      ${p.osm_id ? `<a href="https://www.openstreetmap.org/${p.osm_id ? 'way' : 'relation'}/${p.osm_id}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:10px;color:var(--info)">View on OSM &rarr;</a>` : ''}
    </div>`

    activePopups.set(map, new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .setMaxWidth('none')
      .addTo(map))
  }

  const onWaterEnter = () => { map.getCanvas().style.cursor = 'pointer' }
  const onWaterLeave = () => { map.getCanvas().style.cursor = '' }

  // The observatory's unified map click owns popups (tabbed for overlaps);
  // water keeps hover affordances but skips its own click popup on request.
  const attachClicks = options?.attachClickHandlers !== false
  for (const layerId of ['ree-water-poly-fill', 'ree-water-river-line']) {
    if (attachClicks) map.on('click', layerId, onWaterClick)
    map.on('mouseenter', layerId, onWaterEnter)
    map.on('mouseleave', layerId, onWaterLeave)
    cleanups.push(() => {
      if (attachClicks) map.off('click', layerId, onWaterClick)
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
