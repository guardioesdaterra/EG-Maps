import type { Map as MapLibreMap, MapLayerMouseEvent, DataDrivenPropertyValueSpecification } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { buildRareEarthPopupHTML, escapeHtml } from '@/lib/map-utils'
import { openRareEarthPopup } from '@/composables/useObservatoryPopup'
import { citiesToGeoJSON } from '@/lib/brazilian-cities'

const activePopups = new WeakMap<MapLibreMap, maplibregl.Popup>()

function closeActivePopup(map: MapLibreMap) {
  const popup = activePopups.get(map)
  if (popup) { popup.remove(); activePopups.delete(map) }
}

export const REE_SOURCE_POINTS = 'ree-points'
export const REE_SOURCE_POLYS = 'ree-polys'
export const REE_SOURCE_GEO = 'ree-geo'
export const REE_SOURCE_SITES = 'ree-sites'
export const REE_SOURCE_NETWORK = 'ree-network'
export const REE_SOURCE_PROTECTED = 'ree-protected'
export const REE_SOURCE_CITIES = 'ree-cities'

export const REE_LAYER_IDS = [
  'ree-point-glow', 'ree-point-circle', 'ree-cluster-circle', 'ree-cluster-count', 'ree-point-hover',
  'ree-heat-layer',
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
  popup?: {
    t: (_key: string, _params?: Record<string, unknown>) => string
    locale: { value: string }
    onSidebarOpen?: (_payload: { processo: string; nome: string; tab: string; coords: [number, number] }) => void
  }
}

export type CleanupFn = () => void

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
): CleanupFn {
  const { points, polys, protected: protectedAreas } = options
  const cleanups: Array<() => void> = []
  if (!points) return () => {}
  if (!map.isStyleLoaded()) return () => {}

  cleanupRareEarthLayers(map)

  map.addSource(REE_SOURCE_POINTS, {
    type: 'geojson',
    data: points,
    cluster: true,
    clusterMaxZoom: 11,
    clusterRadius: 80,
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

  const catColorMatch: DataDrivenPropertyValueSpecification<string> = ['match', ['get', 'c'],
    'direct_ree', '#ef4444',
    'carbonatite_associated', '#f97316',
    'pegmatite_associated', '#22c55e',
    'heavy_mineral_associated', '#3b82f6',
    'phosphate_associated', '#a855f7',
    'strategic_associated', '#ec4899',
    '#6b7280']

  // Glow layer behind points
  map.addLayer({
    id: 'ree-point-glow',
    type: 'circle',
    source: REE_SOURCE_POINTS,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': catColorMatch,
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        6, 5,
        10, 9,
        14, 13,
        18, 17,
      ],
      'circle-opacity': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.08,
        10, 0.12,
        14, 0.15,
      ],
      'circle-blur': 0.9,
    },
  })

  // Unclustered point layer — individual claims with category color
  map.addLayer({
    id: 'ree-point-circle',
    type: 'circle',
    source: REE_SOURCE_POINTS,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': catColorMatch,
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        6, 3,
        10, 5,
        14, 7,
        18, 9,
      ],
      'circle-opacity': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.6,
        10, 0.8,
        14, 0.95,
      ],
      'circle-stroke-color': 'rgba(255,255,255,0.35)',
      'circle-stroke-width': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.4,
        10, 0.7,
        14, 1.2,
      ],
    },
  })

  // Cluster circle layer with dynamic radius based on count
  map.addLayer({
    id: 'ree-cluster-circle',
    type: 'circle',
    source: REE_SOURCE_POINTS,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'case',
        ['>=', ['get', 'point_count'], 100], '#b91c1c',
        ['>=', ['get', 'point_count'], 50], '#ef4444',
        ['>=', ['get', 'point_count'], 20], '#f97316',
        ['>=', ['get', 'point_count'], 5], '#eab308',
        '#22c55e',
      ],
      'circle-radius': [
        'interpolate', ['linear'], ['sqrt', ['to-number', ['get', 'point_count']]],
        1, 8,
        10, 18,
        50, 30,
        100, 42,
      ],
      'circle-opacity': [
        'case',
        ['>=', ['get', 'point_count'], 20], 0.9,
        0.75,
      ],
      'circle-stroke-color': 'rgba(255,255,255,0.25)',
      'circle-stroke-width': 1.5,
    },
  })

  // Cluster count label
  map.addLayer({
    id: 'ree-cluster-count',
    type: 'symbol',
    source: REE_SOURCE_POINTS,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Open Sans Bold'],
      'text-size': [
        'interpolate', ['linear'], ['sqrt', ['to-number', ['get', 'point_count']]],
        1, 9,
        10, 12,
        50, 14,
        100, 16,
      ],
    },
    paint: {
      'text-color': '#fff',
      'text-halo-color': 'rgba(0,0,0,0.6)',
      'text-halo-width': 1.5,
    },
  })

  // Heatmap layer for density visualization (togglable)
  map.addLayer({
    id: 'ree-heat-layer',
    type: 'heatmap',
    source: REE_SOURCE_POINTS,
    maxzoom: 15,
    paint: {
      'heatmap-weight': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.3,
        6, 0.5,
        12, 1,
      ],
      'heatmap-intensity': [
        'interpolate', ['linear'], ['zoom'],
        0, 1,
        6, 3,
        12, 8,
      ],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.05, 'rgba(126,34,206,0.05)',
        0.15, 'rgba(99,102,241,0.25)',
        0.3, 'rgba(139,92,246,0.45)',
        0.5, 'rgba(236,72,153,0.55)',
        0.7, 'rgba(239,68,68,0.7)',
        0.85, 'rgba(220,38,38,0.8)',
        1, 'rgba(153,27,27,0.9)',
      ],
      'heatmap-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 2,
        6, 12,
        12, 20,
      ],
      'heatmap-opacity': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.7,
        12, 0.3,
        15, 0,
      ],
    },
  }, 'ree-point-circle')

  // Hover effect for unclustered points
  map.addLayer({
    id: 'ree-point-hover',
    type: 'circle',
    source: REE_SOURCE_POINTS,
    filter: ['all', ['!', ['has', 'point_count']]],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        6, 5,
        10, 8,
        14, 10,
        18, 14,
      ],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0],
      'circle-stroke-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.7, 0],
    },
  })

  if (polys) {
    map.addSource(REE_SOURCE_POLYS, { type: 'geojson', data: polys })
  }

  if (polys) {
    const polyColorMatch: DataDrivenPropertyValueSpecification<string> = ['match', ['get', 'category'],
      'direct_ree', '#ef4444', 'carbonatite_associated', '#f97316',
      'pegmatite_associated', '#22c55e', 'heavy_mineral_associated', '#3b82f6',
      'phosphate_associated', '#a855f7', 'strategic_associated', '#ec4899', '#6b7280']

    map.addLayer({
      id: 'ree-poly-fill', type: 'fill', source: REE_SOURCE_POLYS,
      paint: { 'fill-color': polyColorMatch, 'fill-opacity': 0.1 },
    })
    map.addLayer({
      id: 'ree-poly-glow', type: 'line', source: REE_SOURCE_POLYS,
      paint: {
        'line-color': polyColorMatch,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 6, 14, 10],
        'line-opacity': 0.1, 'line-blur': 3,
      },
    })
    map.addLayer({
      id: 'ree-poly-line', type: 'line', source: REE_SOURCE_POLYS,
      paint: {
        'line-color': polyColorMatch,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 10, 1.5, 14, 2.5],
        'line-opacity': 0.5,
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
    const onPolyClick = (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const p = e.features[0].properties
      const adapted = adaptPolygonProps(p)
      closeActivePopup(map)
      if (options.popup) {
        activePopups.set(map, openRareEarthPopup(
          map,
          adapted,
          [e.lngLat.lng, e.lngLat.lat],
          { onSidebarOpen: options.popup.onSidebarOpen },
          options.popup.t,
          options.popup.locale,
        ))
        return
      }
      if (options.onClaimClick) {
        options.onClaimClick(adapted, [e.lngLat.lng, e.lngLat.lat])
        return
      }
      const html = buildRareEarthPopupHTML(adapted)
      activePopups.set(map, new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .setMaxWidth('none')
        .addTo(map))
    }
    map.on('click', 'ree-poly-fill', onPolyClick)
    cleanups.push(() => { map.off('click', 'ree-poly-fill', onPolyClick) })
  }

  // Click handler for unclustered point circles
  const onPointClick = (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return
    const p = e.features[0].properties as Record<string, unknown>
    closeActivePopup(map)
    if (options.onClaimClick) {
      options.onClaimClick(p, [e.lngLat.lng, e.lngLat.lat])
      return
    }
    if (options.popup) {
      activePopups.set(map, openRareEarthPopup(
        map,
        p,
        [e.lngLat.lng, e.lngLat.lat],
        { onSidebarOpen: options.popup.onSidebarOpen },
        options.popup.t,
        options.popup.locale,
      ))
      return
    }
    const html = buildRareEarthPopupHTML(p)
    activePopups.set(map, new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .setMaxWidth('none')
      .addTo(map))
  }

  // Click handler for clusters — zoom in
  const onClusterClick = (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return
    const clusterId = e.features[0].properties?.cluster_id
    if (clusterId == null) return
    const source = map.getSource(REE_SOURCE_POINTS) as maplibregl.GeoJSONSource
    if (!source) return
    source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
      map.flyTo({ center: e.lngLat, zoom, duration: 600 })
    })
  }

  // Hover effects
  const onPointEnter = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer'
    if (e.features?.length) {
      map.setFeatureState(
        { source: REE_SOURCE_POINTS, id: e.features[0].id! },
        { hover: true },
      )
    }
  }
  const onPointLeave = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = ''
    if (e.features?.length) {
      map.setFeatureState(
        { source: REE_SOURCE_POINTS, id: e.features[0].id! },
        { hover: false },
      )
    }
  }
  const onClusterEnter = () => { map.getCanvas().style.cursor = 'pointer' }
  const onClusterLeave = () => { map.getCanvas().style.cursor = '' }

  map.on('click', 'ree-point-circle', onPointClick)
  map.on('click', 'ree-cluster-circle', onClusterClick)
  map.on('mouseenter', 'ree-point-circle', onPointEnter)
  map.on('mouseleave', 'ree-point-circle', onPointLeave)
  map.on('mouseenter', 'ree-cluster-circle', onClusterEnter)
  map.on('mouseleave', 'ree-cluster-circle', onClusterLeave)

  cleanups.push(() => {
    map.off('click', 'ree-point-circle', onPointClick)
    map.off('click', 'ree-cluster-circle', onClusterClick)
    map.off('mouseenter', 'ree-point-circle', onPointEnter)
    map.off('mouseleave', 'ree-point-circle', onPointLeave)
    map.off('mouseenter', 'ree-cluster-circle', onClusterEnter)
    map.off('mouseleave', 'ree-cluster-circle', onClusterLeave)
  })

  addBrazilianCitiesLayer(map)
  addRareEarthConflictSites(map)
  addRareEarthGeoBoundaries(map)
  if (options.networkFeatures) {
    addRareEarthNetworkLines(map, options.networkFeatures)
  }
  if (protectedAreas) {
    addProtectedAreasLayer(map, protectedAreas)
  }

  // Track site click/hover handlers for cleanup
  const onSiteClick = (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return
    const p = e.features[0].properties
    const dangerScore = p.danger ?? 5
    const dColor = dangerScore >= 9 ? '#ef4444' : dangerScore >= 7 ? '#f97316' : '#22c55e'
    closeActivePopup(map)
    const siteHtml = `<div class="ree-popup-wrapper" style="padding:14px;min-width:200px;position:relative">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${dColor};color:#fff">${dangerScore.toFixed(1)} Danger</span>
        <span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(239,68,68,0.2);color:#ef4444">CONFLICT ZONE</span>
      </div>
      <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8">${escapeHtml(p.name || 'Unknown')}</h3>
      <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:4px">${escapeHtml(p.tag || '')}</div>
    </div>`
    activePopups.set(map, new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat(e.lngLat)
      .setHTML(siteHtml)
      .setMaxWidth('none')
      .addTo(map))
  }
  const onSiteEnter = () => { map.getCanvas().style.cursor = 'pointer' }
  const onSiteLeave = () => { map.getCanvas().style.cursor = '' }
  map.on('click', 'ree-site-label', onSiteClick)
  map.on('mouseenter', 'ree-site-label', onSiteEnter)
  map.on('mouseleave', 'ree-site-label', onSiteLeave)
  cleanups.push(() => {
    map.off('click', 'ree-site-label', onSiteClick)
    map.off('mouseenter', 'ree-site-label', onSiteEnter)
    map.off('mouseleave', 'ree-site-label', onSiteLeave)
  })

  // Track protected area click/hover handlers
  for (const layerId of ['ree-protected-ti-fill', 'ree-protected-quilombo-fill']) {
    const onProtClick = (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const p = e.features[0].properties
      const kind = p.kind === 'ti' ? 'Indigenous Land (Terra Indígena)' : 'Quilombola Territory'
      closeActivePopup(map)
      const protColor = p.kind === 'ti' ? '#dc2626' : '#d97706'
      const html = `<div class="ree-popup-wrapper" style="padding:14px;min-width:220px;position:relative">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${protColor};color:#fff">PROTECTED AREA</span>
          <span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(255,255,255,0.06);color:#888">${escapeHtml(kind)}</span>
        </div>
        <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8">${escapeHtml(p.name || 'Unknown')}</h3>
        <p style="font-size:10px;color:#888;margin:6px 0 0;line-height:1.45">Mining claims overlapping this territory may violate Free, Prior and Informed Consent (FPIC) under ILO Convention 169.</p>
        ${p.source_url ? `<a href="${escapeHtml(p.source_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:10px;color:#5dade2">Source &rarr;</a>` : ''}
      </div>`
      activePopups.set(map, new maplibregl.Popup({ offset: 8, closeButton: true, className: 'cyberpunk-popup' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .setMaxWidth('none')
        .addTo(map))
    }
    const onProtEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onProtLeave = () => { map.getCanvas().style.cursor = '' }
    map.on('click', layerId, onProtClick)
    map.on('mouseenter', layerId, onProtEnter)
    map.on('mouseleave', layerId, onProtLeave)
    cleanups.push(() => {
      map.off('click', layerId, onProtClick)
      map.off('mouseenter', layerId, onProtEnter)
      map.off('mouseleave', layerId, onProtLeave)
    })
  }

  return () => {
    cleanups.forEach(fn => fn())
    cleanupRareEarthLayers(map)
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
      'line-color': ['match', ['get', 'type'], 'basin', '#3b82f6', 'aquifer', '#a855f7', 'conflict', '#ef4444', 'nuclear', '#dc2626', '#3b82f6'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 10, 1.2, 14, 2],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 14, 0.5],
      'line-dasharray': ['match', ['get', 'type'], 'conflict', ['literal', [2, 2]], 'nuclear', ['literal', [1, 1]], ['literal', [3, 2]]],
    },
  })
  map.addLayer({
    id: 'ree-geo-label', type: 'symbol', source: REE_SOURCE_GEO,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 0, 9, 8, 12, 10],
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': ['match', ['get', 'type'], 'basin', '#3b82f6', 'aquifer', '#a855f7', 'conflict', '#ef4444', 'nuclear', '#dc2626', '#3b82f6'],
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
      'circle-color': '#ef4444',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 14, 14, 18],
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.15, 14, 0.25],
      'circle-blur': 0.9,
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
        ['==', ['get', 'connectionType'], 'corporate'], ['coalesce', ['get', 'lineWidth'], 1.5],
        ['==', ['get', 'connectionType'], 'enterprise_to_claim'], 0.6,
        0.5,
      ],
      'line-opacity': [
        'case',
        ['==', ['get', 'connectionType'], 'corporate'], ['coalesce', ['get', 'lineOpacity'], 0.6],
        ['==', ['get', 'connectionType'], 'enterprise_to_claim'], 0.25,
        0.4,
      ],
      'line-dasharray': [
        'case',
        ['==', ['get', 'corporateType'], 'subsidiary'], ['literal', []],
        ['==', ['get', 'corporateType'], 'shareholding'], ['literal', [6, 3]],
        ['==', ['get', 'corporateType'], 'joint_venture'], ['literal', [4, 4]],
        ['==', ['get', 'corporateType'], 'board_overlap'], ['literal', [2, 4]],
        ['==', ['get', 'corporateType'], 'partnership'], ['literal', [8, 4]],
        ['==', ['get', 'connectionType'], 'enterprise_to_claim'], ['literal', [1, 3]],
        ['literal', [2, 2]],
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
    paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.15 },
  })
  map.addLayer({
    id: 'ree-protected-ti-line', type: 'line', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'ti'],
    paint: { 'line-color': '#dc2626', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 10, 2, 14, 3], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 14, 0.8], 'line-dasharray': [4, 3] },
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
    paint: { 'text-color': '#dc2626', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
  })

  map.addLayer({
    id: 'ree-protected-quilombo-fill', type: 'fill', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'quilombo'],
    paint: { 'fill-color': '#d97706', 'fill-opacity': 0.12 },
  })
  map.addLayer({
    id: 'ree-protected-quilombo-line', type: 'line', source: REE_SOURCE_PROTECTED,
    filter: ['==', ['get', 'kind'], 'quilombo'],
    paint: { 'line-color': '#d97706', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 10, 2, 14, 3], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 14, 0.8], 'line-dasharray': [3, 3] },
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
    paint: { 'text-color': '#d97706', 'text-halo-color': 'rgba(0,0,0,0.9)', 'text-halo-width': 1.5 },
  })

  map.addLayer({
    id: 'ree-overlap-glow', type: 'circle', source: REE_SOURCE_POINTS,
    filter: ['all', ['!', ['has', 'point_count']], ['>', ['to-number', ['coalesce', ['get', 'overlaps_count'], ['length', ['get', 'ov']]]], 0]],
    paint: {
      'circle-color': '#f59e0b',
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        6, 10,
        10, 14,
        14, 18,
      ],
      'circle-opacity': 0.25, 'circle-blur': 0.9,
      'circle-stroke-color': '#f59e0b',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 14, 2],
      'circle-stroke-opacity': 0.5,
    },
  })
}

/**
 * Add polygon layers to an existing map that was already set up without polygons
 * (e.g. when polygon data loads after initial render).
 */
export function addPolygonLayersToMap(
  map: MapLibreMap,
  polys: GeoJSON.FeatureCollection,
  popup?: RareEarthLayerOptions['popup'],
): (() => void) | null {
  if (!polys?.features?.length) return null
  if (map.getSource(REE_SOURCE_POLYS)) return null

  const polyColorMatch: DataDrivenPropertyValueSpecification<string> = ['match', ['get', 'category'],
    'direct_ree', '#ef4444', 'carbonatite_associated', '#f97316',
    'pegmatite_associated', '#22c55e', 'heavy_mineral_associated', '#3b82f6',
    'phosphate_associated', '#a855f7', 'strategic_associated', '#ec4899', '#6b7280']

  map.addSource(REE_SOURCE_POLYS, { type: 'geojson', data: polys })

  map.addLayer({
    id: 'ree-poly-fill', type: 'fill', source: REE_SOURCE_POLYS,
    paint: { 'fill-color': polyColorMatch, 'fill-opacity': 0.1 },
  })
  map.addLayer({
    id: 'ree-poly-glow', type: 'line', source: REE_SOURCE_POLYS,
    paint: {
      'line-color': polyColorMatch,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 6, 14, 10],
      'line-opacity': 0.1, 'line-blur': 3,
    },
  })
  map.addLayer({
    id: 'ree-poly-line', type: 'line', source: REE_SOURCE_POLYS,
    paint: {
      'line-color': polyColorMatch,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 10, 1.5, 14, 2.5],
      'line-opacity': 0.5,
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

  const onPolyClick = (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return
    const p = e.features[0].properties
    closeActivePopup(map)
    if (popup) {
      activePopups.set(map, openRareEarthPopup(
        map,
        adaptPolygonProps(p),
        [e.lngLat.lng, e.lngLat.lat],
        { onSidebarOpen: popup.onSidebarOpen },
        popup.t,
        popup.locale,
      ))
      return
    }
    const html = buildRareEarthPopupHTML(adaptPolygonProps(p))
    activePopups.set(map, new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .setMaxWidth('none')
      .addTo(map))
  }
  map.on('click', 'ree-poly-fill', onPolyClick)

  return () => {
    map.off('click', 'ree-poly-fill', onPolyClick)
    safeRemoveLayer(map, 'ree-poly-fill')
    safeRemoveLayer(map, 'ree-poly-glow')
    safeRemoveLayer(map, 'ree-poly-line')
    safeRemoveLayer(map, 'ree-poly-label')
    safeRemoveSource(map, REE_SOURCE_POLYS)
  }
}

export function syncRareEarthLayerVisibility(map: MapLibreMap, vis: Record<string, boolean>) {
  if (!map || !map.isStyleLoaded()) return

  // Point layers - hide when points source has no visible categories
  const pointLayers = ['ree-point-glow', 'ree-point-circle', 'ree-cluster-circle', 'ree-cluster-count', 'ree-point-hover', 'ree-overlap-glow']
  const showPoints = vis['points'] !== false
  pointLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showPoints ? 'visible' : 'none') })

  // Heatmap layer - togglable via 'heatmap' key
  if (map.getLayer('ree-heat-layer')) map.setLayoutProperty('ree-heat-layer', 'visibility', vis['heatmap'] !== false ? 'visible' : 'none')

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

  // Water body layers (ree-water source)
  const waterLayers = ['ree-water-poly-fill', 'ree-water-poly-line', 'ree-water-poly-label', 'ree-water-river-line', 'ree-water-river-label']
  waterLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showWater ? 'visible' : 'none') })

  // Cultural layers
  const culturalLayers = ['ree-cultural-point', 'ree-cultural-label', 'ree-cultural-cluster', 'ree-cultural-cluster-count']
  const showCultural = vis['cultural'] !== false
  culturalLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showCultural ? 'visible' : 'none') })
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
