import type { Map as MapLibreMap, MapLayerMouseEvent, DataDrivenPropertyValueSpecification } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { buildRareEarthPopupHTML, escapeHtml } from '@/lib/map-utils'
import { citiesToGeoJSON } from '@/lib/brazilian-cities'

export const REE_SOURCE_POINTS = 'ree-points'
export const REE_SOURCE_POLYS = 'ree-polys'
export const REE_SOURCE_GEO = 'ree-geo'
export const REE_SOURCE_SITES = 'ree-sites'
export const REE_SOURCE_NETWORK = 'ree-network'
export const REE_SOURCE_PROTECTED = 'ree-protected'
export const REE_SOURCE_CITIES = 'ree-cities'

export const REE_LAYER_IDS = [
  'ree-poly-fill', 'ree-poly-glow', 'ree-poly-line', 'ree-poly-label',
  'ree-geo-fill', 'ree-geo-aquifer', 'ree-geo-conflict', 'ree-geo-line', 'ree-geo-label',
  'ree-site-glow', 'ree-site-label',
  'ree-network-lines',
  'ree-protected-ti-fill', 'ree-protected-ti-line', 'ree-protected-ti-label',
  'ree-protected-quilombo-fill', 'ree-protected-quilombo-line', 'ree-protected-quilombo-label',
  'ree-cities-label',
  'ree-overlap-glow',
] as const

export const REE_SOURCE_IDS = [
  REE_SOURCE_POINTS, REE_SOURCE_POLYS, REE_SOURCE_GEO,
  REE_SOURCE_SITES, REE_SOURCE_NETWORK, REE_SOURCE_PROTECTED,
  REE_SOURCE_CITIES,
] as const

export interface RareEarthLayerOptions {
  points: GeoJSON.FeatureCollection
  polys?: GeoJSON.FeatureCollection | null
  protected?: GeoJSON.FeatureCollection | null
  networkFeatures?: GeoJSON.FeatureCollection | null
  onClaimClick?: (_props: Record<string, unknown>, _lngLat: [number, number]) => void
}

function safeRemoveLayer(map: MapLibreMap, id: string) {
  try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ }
}
function safeRemoveSource(map: MapLibreMap, id: string) {
  try { if (map.getSource(id)) map.removeSource(id) } catch { /* */ }
}

export function cleanupRareEarthLayers(map: MapLibreMap) {
  REE_LAYER_IDS.forEach(id => safeRemoveLayer(map, id))
  REE_SOURCE_IDS.forEach(id => safeRemoveSource(map, id))
}

export function setupRareEarthLayers(
  map: MapLibreMap,
  options: RareEarthLayerOptions,
) {
  const { points, polys, protected: protectedAreas } = options
  if (!points) return

  cleanupRareEarthLayers(map)

  map.addSource(REE_SOURCE_POINTS, {
    type: 'geojson',
    data: points,
    cluster: true,
    clusterMaxZoom: 11,
    clusterRadius: 45,
    clusterProperties: {
      dr: ['+', ['case', ['==', ['get', 'c'], 'direct_ree'], 1, 0]],
      ca: ['+', ['case', ['==', ['get', 'c'], 'carbonatite_associated'], 1, 0]],
      pg: ['+', ['case', ['==', ['get', 'c'], 'pegmatite_associated'], 1, 0]],
      hm: ['+', ['case', ['==', ['get', 'c'], 'heavy_mineral_associated'], 1, 0]],
      ph: ['+', ['case', ['==', ['get', 'c'], 'phosphate_associated'], 1, 0]],
      st: ['+', ['case', ['==', ['get', 'c'], 'strategic_associated'], 1, 0]],
      md: ['max', ['get', 'ds']],
    },
  })

  if (polys) {
    map.addSource(REE_SOURCE_POLYS, { type: 'geojson', data: polys })
  }

  if (polys) {
    const polyColorMatch: DataDrivenPropertyValueSpecification<string> = ['match', ['get', 'category'],
      'direct_ree', '#e74c3c', 'carbonatite_associated', '#f39c12',
      'pegmatite_associated', '#27ae60', 'heavy_mineral_associated', '#2980b9',
      'phosphate_associated', '#8e44ad', 'strategic_associated', '#e91e63', '#999']

    map.addLayer({
      id: 'ree-poly-fill', type: 'fill', source: REE_SOURCE_POLYS,
      paint: { 'fill-color': polyColorMatch, 'fill-opacity': 0.08 },
    })
    map.addLayer({
      id: 'ree-poly-glow', type: 'line', source: REE_SOURCE_POLYS,
      paint: {
        'line-color': polyColorMatch,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 4, 14, 7],
        'line-opacity': 0.08, 'line-blur': 2,
      },
    })
    map.addLayer({
      id: 'ree-poly-line', type: 'line', source: REE_SOURCE_POLYS,
      paint: {
        'line-color': polyColorMatch,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 1, 14, 2],
        'line-opacity': 0.4,
      },
    })
    map.addLayer({
      id: 'ree-poly-label', type: 'symbol', source: REE_SOURCE_POLYS,
      layout: {
        'text-field': ['coalesce', ['get', 'nome'], ['get', 'NOME'], ['get', 'enterprise'], ''],
        'text-font': ['Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 0, 8, 8, 12, 11],
        'text-allow-overlap': false, 'text-ignore-placement': false, 'text-anchor': 'center',
      },
      paint: {
        'text-color': '#ccc', 'text-halo-color': 'rgba(0,0,0,0.85)', 'text-halo-width': 1.5,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 0.8],
      },
    })
    map.on('click', 'ree-poly-fill', (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const p = e.features[0].properties
      const adapted = adaptPolygonProps(p)
      if (options.onClaimClick) {
        options.onClaimClick(adapted, [e.lngLat.lng, e.lngLat.lat])
        return
      }
      const html = buildRareEarthPopupHTML(adapted)
      new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .setMaxWidth('none')
        .addTo(map)
    })
  }

  addBrazilianCitiesLayer(map)
  addRareEarthConflictSites(map)
  addRareEarthGeoBoundaries(map)
  if (options.networkFeatures) {
    addRareEarthNetworkLines(map, options.networkFeatures)
  }
  if (protectedAreas) {
    addProtectedAreasLayer(map, protectedAreas)
  }
}

export function adaptPolygonProps(p: Record<string, unknown>): Record<string, unknown> {
  return {
    c: p.category,
    ds: p.ds ?? p.danger_score ?? 5,
    n: p.NOME || p.nome || p.enterprise || 'Polygon',
    s: p.SUBS || p.substances || '—',
    p: p.PROCESSO || p.processo || '—',
    f: p.FASE || p.fase || '—',
    u: p.UF || p.uf || '',
    a: p.AREA_HA ?? p.area_ha ?? 0,
    net: p.network_id || '',
    ev: p.ULT_EVENTO || '',
    ano: p.ANO ?? p.ano ?? 0,
    numero: p.NUMERO ?? p.numero ?? 0,
  }
}

export function addRareEarthGeoBoundaries(map: MapLibreMap) {
  const wb: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'São Francisco Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-47, -12], [-44, -12], [-42, -13], [-40, -14], [-39, -15.5], [-39.5, -17], [-40, -18.5], [-42, -19.5], [-44, -20], [-46, -20.5], [-48, -19], [-49, -17], [-48.5, -15], [-47.5, -13.5], [-47, -12]]] } },
      { type: 'Feature', properties: { name: 'Paranaíba Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-49, -17], [-47.5, -17.5], [-46.5, -18.5], [-46, -19.5], [-47, -20.5], [-48.5, -20.5], [-50, -20], [-51.5, -19], [-51, -17.5], [-50, -17], [-49, -17]]] } },
      { type: 'Feature', properties: { name: 'Jequitinhonha Basin', type: 'basin' }, geometry: { type: 'Polygon', coordinates: [[[-42, -15.5], [-40.5, -15.5], [-39.5, -16], [-39.5, -17.5], [-40.5, -18], [-42, -17.5], [-43, -16.5], [-42, -15.5]]] } },
      { type: 'Feature', properties: { name: 'Bambuí Aquifer', type: 'aquifer' }, geometry: { type: 'Polygon', coordinates: [[[-49, -15], [-47, -15], [-45, -16], [-44, -18], [-44.5, -20], [-46, -21], [-48.5, -21], [-50, -20], [-51, -18], [-50.5, -16], [-49, -15]]] } },
      { type: 'Feature', properties: { name: 'Urucuia Aquifer', type: 'aquifer' }, geometry: { type: 'Polygon', coordinates: [[[-46, -13], [-43.5, -13], [-42, -14.5], [-42.5, -16.5], [-44, -17.5], [-46, -17.5], [-47, -16], [-46, -13]]] } },
      { type: 'Feature', properties: { name: 'Poços de Caldas Conflict', type: 'conflict' }, geometry: { type: 'Polygon', coordinates: [[[-47.2, -21.2], [-46, -21.2], [-45.8, -21.8], [-46.2, -22.2], [-47.2, -22.2], [-47.5, -21.8], [-47.2, -21.2]]] } },
      { type: 'Feature', properties: { name: 'INB Caldas Nuclear', type: 'nuclear' }, geometry: { type: 'Polygon', coordinates: [[[-47, -21.4], [-46.3, -21.4], [-46.1, -21.9], [-46.5, -22.1], [-47, -22], [-47.2, -21.7], [-47, -21.4]]] } },
    ],
  }
  map.addSource(REE_SOURCE_GEO, { type: 'geojson', data: wb })
  map.addLayer({
    id: 'ree-geo-fill', type: 'fill', source: REE_SOURCE_GEO,
    filter: ['==', ['get', 'type'], 'basin'],
    paint: { 'fill-color': '#3498db', 'fill-opacity': 0.05 },
  })
  map.addLayer({
    id: 'ree-geo-aquifer', type: 'fill', source: REE_SOURCE_GEO,
    filter: ['==', ['get', 'type'], 'aquifer'],
    paint: { 'fill-color': '#9b59b6', 'fill-opacity': 0.07 },
  })
  map.addLayer({
    id: 'ree-geo-conflict', type: 'fill', source: REE_SOURCE_GEO,
    filter: ['in', ['get', 'type'], ['literal', ['conflict', 'nuclear']]],
    paint: { 'fill-color': '#e74c3c', 'fill-opacity': 0.08 },
  })
  map.addLayer({
    id: 'ree-geo-line', type: 'line', source: REE_SOURCE_GEO,
    paint: {
      'line-color': ['match', ['get', 'type'], 'basin', '#3498db', 'aquifer', '#9b59b6', 'conflict', '#e74c3c', 'nuclear', '#c0392b', '#3498db'],
      'line-width': ['match', ['get', 'type'], 'conflict', 2, 'nuclear', 2, 1],
      'line-opacity': 0.4,
      'line-dasharray': ['match', ['get', 'type'], 'conflict', ['literal', [2, 2]], 'nuclear', ['literal', [1, 1]], ['literal', [3, 2]]],
    },
  })
  map.addLayer({
    id: 'ree-geo-label', type: 'symbol', source: REE_SOURCE_GEO,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 9,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': ['match', ['get', 'type'], 'basin', '#2980b9', 'aquifer', '#8e44ad', 'conflict', '#c0392b', 'nuclear', '#c0392b', '#2980b9'],
      'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.5,
    },
  })
}

export function addRareEarthConflictSites(map: MapLibreMap) {
  const sites: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'Poços de Caldas', danger: 9.5, tag: 'CONFLICT' }, geometry: { type: 'Point', coordinates: [-46.57, -21.55] } },
      { type: 'Feature', properties: { name: 'Araxá', danger: 8.5, tag: 'REE + CBMM' }, geometry: { type: 'Point', coordinates: [-46.94, -19.59] } },
      { type: 'Feature', properties: { name: 'Jequié Corridor', danger: 7.5, tag: 'SPECULATION' }, geometry: { type: 'Point', coordinates: [-40.48, -13.85] } },
      { type: 'Feature', properties: { name: 'Serra Verde', danger: 9, tag: 'US DFC $565M' }, geometry: { type: 'Point', coordinates: [-48.1, -14.25] } },
      { type: 'Feature', properties: { name: 'Aclara Carina', danger: 7, tag: 'State Dept $5M' }, geometry: { type: 'Point', coordinates: [-49.1, -16.7] } },
      { type: 'Feature', properties: { name: 'Bambuí Aquifer', danger: 9, tag: 'CONTAMINATION' }, geometry: { type: 'Point', coordinates: [-47, -17.5] } },
    ],
  }
  map.addSource(REE_SOURCE_SITES, { type: 'geojson', data: sites })
  map.addLayer({
    id: 'ree-site-glow', type: 'circle', source: REE_SOURCE_SITES,
    paint: {
      'circle-color': '#c0392b',
      'circle-radius': 13,
      'circle-opacity': 0.2, 'circle-blur': 0.8,
    },
  })
  map.addLayer({
    id: 'ree-site-label', type: 'symbol', source: REE_SOURCE_SITES,
    layout: {
      'text-field': ['format', ['get', 'name'], { 'font-scale': 1.1 }, ' ', ['get', 'tag'], { 'font-scale': 0.75 }],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 8, 10, 12, 12],
      'text-allow-overlap': false, 'text-ignore-placement': false,
      'text-anchor': 'bottom', 'text-offset': [0, 2],
    },
    paint: {
      'text-color': '#c0392b', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 2,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 0.9],
    },
  })
  map.on('click', 'ree-site-label', (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return
    const p = e.features[0].properties
    const dangerScore = p.danger ?? 5
    const dangerColor = dangerScore >= 9 ? '#e74c3c' : dangerScore >= 7 ? '#f39c12' : '#27ae60'
    const siteHtml = `<div class="ree-popup-wrapper" style="padding:14px;min-width:200px;position:relative">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${dangerColor};color:#fff">${dangerScore.toFixed(1)} Danger</span>
        <span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(192,57,43,0.2);color:#c0392b">CONFLICT ZONE</span>
      </div>
      <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8">${escapeHtml(p.name || 'Unknown')}</h3>
      <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:4px">${escapeHtml(p.tag || '')}</div>
    </div>`
    new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat(e.lngLat)
      .setHTML(siteHtml)
      .setMaxWidth('none')
      .addTo(map)
  })
  map.on('mouseenter', 'ree-site-label', () => { map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', 'ree-site-label', () => { map.getCanvas().style.cursor = '' })
}

export function addRareEarthNetworkLines(map: MapLibreMap, networkFeatures: GeoJSON.FeatureCollection) {
  if (!map || !networkFeatures?.features?.length) return
  map.addSource(REE_SOURCE_NETWORK, { type: 'geojson', data: networkFeatures })
  map.addLayer({
    id: 'ree-network-lines', type: 'line', source: REE_SOURCE_NETWORK,
    paint: {
      'line-color': ['coalesce', ['get', 'color'], '#5dade2'],
      'line-width': [
        'case',
        ['==', ['get', 'connectionType'], 'corporate'], 1.5,
        ['==', ['get', 'connectionType'], 'foreign_to_claims'], 1,
        0.5,
      ],
      'line-opacity': 0.4,
      'line-dasharray': [
        'case',
        ['==', ['get', 'connectionType'], 'corporate'], ['literal', [2, 2]],
        ['==', ['get', 'connectionType'], 'foreign_to_claims'], ['literal', [4, 2]],
        ['literal', [1, 3]],
      ],
    },
  })
  map.on('mouseenter', 'ree-network-lines', () => { map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', 'ree-network-lines', () => { map.getCanvas().style.cursor = '' })
}

export function addBrazilianCitiesLayer(map: MapLibreMap) {
  const cityData = citiesToGeoJSON()
  map.addSource(REE_SOURCE_CITIES, { type: 'geojson', data: cityData })
  map.addLayer({
    id: 'ree-cities-label', type: 'symbol', source: REE_SOURCE_CITIES,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 4, 0, 7, 8, 10, 11, 14, 13],
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-anchor': 'bottom',
      'text-offset': [0, 1.5],
    },
    paint: {
      'text-color': '#e8e8e8',
      'text-halo-color': 'rgba(0,0,0,0.85)',
      'text-halo-width': 2,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 7, 0.7, 10, 0.9],
    },
  })
}

export function addProtectedAreasLayer(map: MapLibreMap, protectedAreas: GeoJSON.FeatureCollection) {
  if (!protectedAreas?.features?.length) return
  map.addSource(REE_SOURCE_PROTECTED, { type: 'geojson', data: protectedAreas })

  map.addLayer({
    id: 'ree-protected-ti-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'ti'],
    paint: { 'fill-color': '#c0392b', 'fill-opacity': 0.12 },
  })
  map.addLayer({
    id: 'ree-protected-ti-line', type: 'line', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'ti'],
    paint: { 'line-color': '#c0392b', 'line-width': 1.5, 'line-opacity': 0.7, 'line-dasharray': [3, 2] },
  })
  map.addLayer({
    id: 'ree-protected-ti-label', type: 'symbol', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'ti'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 9, 10, 11],
      'text-allow-overlap': false,
    },
    paint: { 'text-color': '#c0392b', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
  })

  map.addLayer({
    id: 'ree-protected-quilombo-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'quilombo'],
    paint: { 'fill-color': '#f39c12', 'fill-opacity': 0.10 },
  })
  map.addLayer({
    id: 'ree-protected-quilombo-line', type: 'line', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'quilombo'],
    paint: { 'line-color': '#f39c12', 'line-width': 1.5, 'line-opacity': 0.7, 'line-dasharray': [2, 2] },
  })
  map.addLayer({
    id: 'ree-protected-quilombo-label', type: 'symbol', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'quilombo'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 9, 10, 11],
      'text-allow-overlap': false,
    },
    paint: { 'text-color': '#f39c12', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
  })

  map.addLayer({
    id: 'ree-overlap-glow', type: 'circle', source: REE_SOURCE_POINTS,
    filter: ['>', ['to-number', ['get', 'overlaps_count']], 0],
    paint: {
      'circle-color': '#ff00ff',
      'circle-radius': 14,
      'circle-opacity': 0.2, 'circle-blur': 0.8,
      'circle-stroke-color': '#ff00ff', 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.8,
    },
  })

  for (const layerId of ['ree-protected-ti-fill', 'ree-protected-quilombo-fill']) {
    map.on('click', layerId, (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const p = e.features[0].properties
      const kind = p.kind === 'ti' ? 'Indigenous Land (Terra Indígena)' : 'Quilombola Territory'
      const html = `<div class="ree-popup-wrapper" style="padding:14px;min-width:220px;position:relative">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${p.kind === 'ti' ? '#c0392b' : '#f39c12'};color:#fff">PROTECTED AREA</span>
          <span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(255,255,255,0.06);color:#888">${escapeHtml(kind)}</span>
        </div>
        <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8">${escapeHtml(p.name || 'Unknown')}</h3>
        <p style="font-size:10px;color:#888;margin:6px 0 0;line-height:1.45">Mining claims overlapping this territory may violate Free, Prior and Informed Consent (FPIC) under ILO Convention 169.</p>
        ${p.source_url ? `<a href="${escapeHtml(p.source_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:10px;color:#5dade2">Source &rarr;</a>` : ''}
      </div>`
      new maplibregl.Popup({ offset: 8, closeButton: true, className: 'cyberpunk-popup' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .setMaxWidth('none')
        .addTo(map)
    })
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
  }
}

export function syncRareEarthLayerVisibility(map: MapLibreMap, vis: Record<string, boolean>) {
  if (!map || !map.isStyleLoaded()) return
  const polyLayers = ['ree-poly-fill', 'ree-poly-glow', 'ree-poly-line', 'ree-poly-label']
  const showPolys = vis['polygons'] !== false
  polyLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showPolys ? 'visible' : 'none') })
  const geoFillLayers = ['ree-geo-fill', 'ree-geo-aquifer', 'ree-geo-conflict']
  const geoLineLayers = ['ree-geo-line', 'ree-geo-label']
  const showWater = vis['water'] !== false
  geoFillLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showWater ? 'visible' : 'none') })
  geoLineLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showWater ? 'visible' : 'none') })
  const siteLayers = ['ree-site-glow', 'ree-site-label']
  const showSites = vis['sites'] !== false
  siteLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showSites ? 'visible' : 'none') })
  if (map.getLayer('ree-network-lines')) map.setLayoutProperty('ree-network-lines', 'visibility', vis['network'] !== false ? 'visible' : 'none')

  const tiLayers = ['ree-protected-ti-fill', 'ree-protected-ti-line', 'ree-protected-ti-label']
  tiLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis['protected_ti'] !== false ? 'visible' : 'none') })
  const quilomboLayers = ['ree-protected-quilombo-fill', 'ree-protected-quilombo-line', 'ree-protected-quilombo-label']
  quilomboLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis['protected_quilombo'] !== false ? 'visible' : 'none') })
  if (map.getLayer('ree-overlap-glow')) map.setLayoutProperty('ree-overlap-glow', 'visibility', vis['overlaps'] !== false ? 'visible' : 'none')
  if (map.getLayer('ree-cities-label')) map.setLayoutProperty('ree-cities-label', 'visibility', vis['cities'] !== false ? 'visible' : 'none')
}

export function buildNetworkLinesFromClaims(points: GeoJSON.FeatureCollection, maxPerGroup = 200): GeoJSON.FeatureCollection {
  const byNet: Record<string, { lng: number; lat: number; name: string }[]> = {}
  for (const f of points.features) {
    const props: Record<string, unknown> = (f.properties || {}) as Record<string, unknown>
    const net = props.net || props.network_id
    if (!net) continue
    const netKey = String(net)
    if (!byNet[netKey]) byNet[netKey] = []
    if (byNet[netKey].length >= maxPerGroup) continue
    const coords = (f.geometry as GeoJSON.Point)?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) continue
    byNet[netKey].push({ lng: coords[0] as number, lat: coords[1] as number, name: String(props.n || props.nome || '') })
  }
  const features: GeoJSON.Feature[] = []
  for (const [netId, nodes] of Object.entries(byNet)) {
    if (nodes.length < 2) continue
    const hub = nodes[0]
    for (let i = 1; i < nodes.length; i++) {
      features.push({
        type: 'Feature',
        properties: { network_id: netId, from: hub.name, to: nodes[i].name },
        geometry: { type: 'LineString', coordinates: [[hub.lng, hub.lat], [nodes[i].lng, nodes[i].lat]] },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}
