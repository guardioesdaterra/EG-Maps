import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { escapeHtml } from '@/lib/map-utils'

const activePopups = new WeakMap<MapLibreMap, maplibregl.Popup>()

function closeActivePopup(map: MapLibreMap) {
  const popup = activePopups.get(map)
  if (popup) { popup.remove(); activePopups.delete(map) }
}

export const CULTURAL_SOURCE = 'ree-cultural'
export const CULTURAL_LAYER_IDS = [
  'ree-cultural-glow',
  'ree-cultural-point',
  'ree-cultural-hover',
  'ree-cultural-label',
  'ree-cultural-cluster',
  'ree-cultural-cluster-count',
] as const

export const SUBTYPE_COLORS: Record<string, string> = {
  cultural_center: '#f39c12',
  artist_group: '#9b59b6',
  indigenous: '#e74c3c',
  marginalized: '#e67e22',
  rural: '#27ae60',
  event: '#3498db',
}

export const TYPE_COLORS: Record<string, string> = {
  school: '#3498db',
  health: '#e74c3c',
  cultural: '#f39c12',
  water_access: '#2ecc71',
  community: '#9b59b6',
}

export const LEGEND_ITEMS: Array<{ label: string; color: string; category: 'subtype' | 'type' }> = [
  { label: 'Cultural Center', color: SUBTYPE_COLORS.cultural_center, category: 'subtype' },
  { label: 'Artist Group', color: SUBTYPE_COLORS.artist_group, category: 'subtype' },
  { label: 'Indigenous', color: SUBTYPE_COLORS.indigenous, category: 'subtype' },
  { label: 'Marginalized', color: SUBTYPE_COLORS.marginalized, category: 'subtype' },
  { label: 'Rural', color: SUBTYPE_COLORS.rural, category: 'subtype' },
  { label: 'Event', color: SUBTYPE_COLORS.event, category: 'subtype' },
  { label: 'School', color: TYPE_COLORS.school, category: 'type' },
  { label: 'Health', color: TYPE_COLORS.health, category: 'type' },
  { label: 'Water Access', color: TYPE_COLORS.water_access, category: 'type' },
]

const STATUS_STYLES: Record<string, { color: string; label: string; pulse: boolean }> = {
  active: { color: '#2ecc71', label: 'Active', pulse: false },
  heritage: { color: '#f39c12', label: 'Heritage', pulse: false },
  at_risk: { color: '#e67e22', label: 'At Risk', pulse: true },
  critical: { color: '#e74c3c', label: 'Critical', pulse: true },
  threatened: { color: '#e74c3c', label: 'Threatened', pulse: true },
  monitoring: { color: '#3498db', label: 'Monitoring', pulse: false },
}

const TYPE_LABELS: Record<string, string> = {
  school: 'School',
  health: 'Health Facility',
  cultural: 'Cultural',
  water_access: 'Water Access',
  community: 'Community',
}

const SUBTYPE_LABELS: Record<string, string> = {
  cultural_center: 'Cultural Center',
  artist_group: 'Artist Group',
  indigenous: 'Indigenous',
  marginalized: 'Marginalized Community',
  rural: 'Rural Community',
  event: 'Cultural Event',
}

function getFeatureColor(props: Record<string, unknown>): string {
  const subtype = String(props.subtype || '')
  if (subtype && SUBTYPE_COLORS[subtype]) return SUBTYPE_COLORS[subtype]
  const type = String(props.type || 'community')
  return TYPE_COLORS[type] || '#9b59b6'
}

function getSubtypeLabel(subtype: string): string {
  return SUBTYPE_LABELS[subtype] || subtype
}

function getStatusBadge(status: string): string {
  const style = STATUS_STYLES[status] || { color: '#888', label: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), pulse: false }
  const pulseStyle = style.pulse ? 'animation:pulse-badge 2s ease-in-out infinite;' : ''
  return `<span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${style.color};color:#fff;${pulseStyle}">${escapeHtml(style.label)}</span>`
}

function getIndigenousBadge(): string {
  return '<span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:#e74c3c;color:#fff;margin-left:4px">INDIGENOUS</span>'
}

export function getPopupContent(p: Record<string, unknown>): string {
  const typeName = String(p.type || 'community')
  const typeLabel = TYPE_LABELS[typeName] || typeName.charAt(0).toUpperCase() + typeName.slice(1).replace('_', ' ')
  const subtype = String(p.subtype || '')
  const subtypeLabel = subtype ? getSubtypeLabel(subtype) : ''
  const statusBadge = p.status ? getStatusBadge(String(p.status)) : ''
  const indigenousBadge = p.indigenous ? getIndigenousBadge() : ''
  const municipality = p.municipality ? `<span style="font-size:9px;color:#888;margin-left:4px">${escapeHtml(String(p.municipality))}</span>` : ''

  let details = ''

  if (typeName === 'school' && p.indigenous) {
    details = `<p style="font-size:9px;color:#bb86fc;margin:4px 0 0">Indigenous school serving local community</p>`
  } else if (typeName === 'health') {
    details = `<p style="font-size:9px;color:#3498db;margin:4px 0 0">Healthcare facility</p>`
  } else if (typeName === 'water_access') {
    details = `<p style="font-size:9px;color:#2ecc71;margin:4px 0 0">Water infrastructure</p>`
  } else if (subtype === 'artist_group') {
    details = `<p style="font-size:9px;color:#9b59b6;margin:4px 0 0">Artist / cultural group</p>`
  } else if (subtype === 'marginalized') {
    details = `<p style="font-size:9px;color:#e67e22;margin:4px 0 0">Marginalized community — limited services</p>`
  } else if (subtype === 'rural') {
    details = `<p style="font-size:9px;color:#27ae60;margin:4px 0 0">Rural community</p>`
  } else if (subtype === 'event') {
    details = `<p style="font-size:9px;color:#3498db;margin:4px 0 0">Cultural event / festival</p>`
  } else if (subtype === 'cultural_center') {
    details = `<p style="font-size:9px;color:#f39c12;margin:4px 0 0">Cultural institution / venue</p>`
  }

  return `<div class="ree-popup-wrapper" style="padding:14px;min-width:240px;max-width:320px;position:relative">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
      <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${getFeatureColor(p)};color:#fff">${escapeHtml(subtypeLabel || typeLabel)}</span>
      ${indigenousBadge}
      ${statusBadge}
      ${municipality}
    </div>
    <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8;line-height:1.3">${escapeHtml(String(p.name || 'Unknown'))}</h3>
    ${p.description ? `<p style="font-size:10px;color:#888;margin:8px 0 0;line-height:1.5">${escapeHtml(String(p.description))}</p>` : ''}
    ${details}
    ${p.community ? `<p style="font-size:9px;color:#bb86fc;margin:6px 0 0">📍 ${escapeHtml(String(p.community))}</p>` : ''}
    ${p.area_ha ? `<p style="font-size:9px;color:#888;margin:2px 0 0">Area: ${p.area_ha} ha</p>` : ''}
    ${p.population ? `<p style="font-size:9px;color:#888;margin:2px 0 0">Population: ${p.population}</p>` : ''}
    ${p.osm_id ? `<a href="https://www.openstreetmap.org/node/${p.osm_id}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:10px;color:#bb86fc;text-decoration:none;border-bottom:1px dotted #bb86fc">View on OpenStreetMap →</a>` : ''}
  </div>`
}

export type CulturalTypeFilter = {
  types?: string[]
  municipalities?: string[]
  subtypes?: string[]
  statuses?: string[]
  indigenousOnly?: boolean
}

let activeFilter: CulturalTypeFilter = {}

type FilterExpr = (string | number | boolean | FilterExpr)[]

function buildFilterExpression(filter: CulturalTypeFilter): FilterExpr {
  const conditions: FilterExpr[] = []

  if (filter.types?.length) {
    conditions.push(['any', ...filter.types.map(t => ['==', ['get', 'type'], t])])
  }
  if (filter.municipalities?.length) {
    conditions.push(['any', ...filter.municipalities.map(m => ['==', ['get', 'municipality'], m])])
  }
  if (filter.subtypes?.length) {
    conditions.push(['any', ...filter.subtypes.map(s => ['==', ['get', 'subtype'], s])])
  }
  if (filter.statuses?.length) {
    conditions.push(['any', ...filter.statuses.map(s => ['==', ['get', 'status'], s])])
  }
  if (filter.indigenousOnly) {
    conditions.push(['==', ['get', 'indigenous'], true])
  }

  if (conditions.length === 0) return ['==', ['geometry-type'], 'Point']
  if (conditions.length === 1) return conditions[0]
  return ['all', ...conditions]
}

export function setupCulturalLayers(
  map: MapLibreMap,
  culturalData: GeoJSON.FeatureCollection,
): () => void {
  if (!culturalData?.features?.length) return () => {}
  if (!map.isStyleLoaded()) return () => {}
  if (map.getSource(CULTURAL_SOURCE)) return () => {}

  const cleanups: Array<() => void> = []

  map.addSource(CULTURAL_SOURCE, {
    type: 'geojson',
    data: culturalData,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 40,
  })

  // Inject pulse animation CSS
  const styleId = 'ree-cultural-pulse-style'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes pulse-badge {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      @keyframes pulse-point {
        0%, 100% { circle-radius: 6; circle-opacity: 0.85; }
        50% { circle-radius: 9; circle-opacity: 0.5; }
      }
    `
    document.head.appendChild(style)
  }

  // Cluster circles
  map.addLayer({
    id: 'ree-cultural-cluster',
    type: 'circle',
    source: CULTURAL_SOURCE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'case',
        ['>=', ['get', 'point_count'], 10], 'rgba(155,89,182,0.8)',
        ['>=', ['get', 'point_count'], 5], 'rgba(142,68,173,0.75)',
        'rgba(155,89,182,0.65)',
      ],
      'circle-radius': [
        'interpolate', ['linear'], ['sqrt', ['to-number', ['get', 'point_count']]],
        1, 5,
        10, 14,
      ],
      'circle-opacity': 0.8,
      'circle-stroke-color': 'rgba(255,255,255,0.15)',
      'circle-stroke-width': 1,
    },
  })

  // Cluster count
  map.addLayer({
    id: 'ree-cultural-cluster-count',
    type: 'symbol',
    source: CULTURAL_SOURCE,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Open Sans Bold'],
      'text-size': 9,
    },
    paint: {
      'text-color': '#fff',
      'text-halo-color': 'rgba(0,0,0,0.6)',
      'text-halo-width': 1,
    },
  })

  // Status glow for critical/threatened/at-risk cultural points
  map.addLayer({
    id: 'ree-cultural-glow',
    type: 'circle',
    source: CULTURAL_SOURCE,
    filter: ['all', ['!', ['has', 'point_count']],
      ['any', ['==', ['get', 'status'], 'critical'], ['==', ['get', 'status'], 'threatened'], ['==', ['get', 'status'], 'at_risk']]
    ],
    paint: {
      'circle-color': [
        'case',
        ['any', ['==', ['get', 'status'], 'critical'], ['==', ['get', 'status'], 'threatened']], '#e74c3c',
        '#e67e22',
      ],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 8, 12, 14, 16, 20],
      'circle-opacity': 0.12,
      'circle-blur': 0.85,
    },
  })

  // Individual cultural points — data-driven color by subtype
  map.addLayer({
    id: 'ree-cultural-point',
    type: 'circle',
    source: CULTURAL_SOURCE,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'subtype'], 'cultural_center'], '#f39c12',
        ['==', ['get', 'subtype'], 'artist_group'], '#9b59b6',
        ['==', ['get', 'subtype'], 'indigenous'], '#e74c3c',
        ['==', ['get', 'subtype'], 'marginalized'], '#e67e22',
        ['==', ['get', 'subtype'], 'rural'], '#27ae60',
        ['==', ['get', 'subtype'], 'event'], '#3498db',
        ['==', ['get', 'type'], 'school'], '#3498db',
        ['==', ['get', 'type'], 'health'], '#e74c3c',
        ['==', ['get', 'type'], 'cultural'], '#f39c12',
        ['==', ['get', 'type'], 'water_access'], '#2ecc71',
        '#9b59b6',
      ],
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, 2.5,
        12, 4,
        16, 6,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-color': [
        'case',
        ['any', ['==', ['get', 'status'], 'critical'], ['==', ['get', 'status'], 'threatened']], '#e74c3c',
        ['==', ['get', 'status'], 'at_risk'], '#e67e22',
        'rgba(255,255,255,0.4)',
      ],
      'circle-stroke-width': [
        'case',
        ['any', ['==', ['get', 'status'], 'critical'], ['==', ['get', 'status'], 'threatened']], 2,
        ['==', ['get', 'status'], 'at_risk'], 1.5,
        0.5,
      ],
    },
  })

  // Hover highlight layer for cultural points
  map.addLayer({
    id: 'ree-cultural-hover',
    type: 'circle',
    source: CULTURAL_SOURCE,
    filter: ['all', ['!', ['has', 'point_count']]],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 12, 8, 16, 11],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0],
      'circle-stroke-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.6, 0],
    },
  })

  // Labels for cultural points
  map.addLayer({
    id: 'ree-cultural-label',
    type: 'symbol',
    source: CULTURAL_SOURCE,
    filter: ['all', ['!', ['has', 'point_count']], ['has', 'name']],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 10, 0, 13, 9, 16, 11],
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-anchor': 'top',
      'text-offset': [0, 1],
    },
    paint: {
      'text-color': '#e8e8e8',
      'text-halo-color': 'rgba(0,0,0,0.85)',
      'text-halo-width': 1.5,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 13, 0.8],
    },
  })

  // Click handler for cultural points
  const onCulturalClick = (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return
    const p = e.features[0].properties
    closeActivePopup(map)
    const html = getPopupContent(p)

    activePopups.set(map, new maplibregl.Popup({ offset: 10, closeButton: true, className: 'cyberpunk-popup' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .setMaxWidth('none')
      .addTo(map))
  }

  const onCulturalEnter = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer'
    if (e.features?.length) {
      map.setFeatureState({ source: CULTURAL_SOURCE, id: e.features[0].id! }, { hover: true })
    }
  }
  const onCulturalLeave = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = ''
    if (e.features?.length) {
      map.setFeatureState({ source: CULTURAL_SOURCE, id: e.features[0].id! }, { hover: false })
    }
  }

  for (const layerId of ['ree-cultural-point', 'ree-cultural-glow', 'ree-cultural-hover', 'ree-cultural-cluster']) {
    map.on('click', layerId, onCulturalClick)
    map.on('mouseenter', layerId, onCulturalEnter)
    map.on('mouseleave', layerId, onCulturalLeave)
    cleanups.push(() => {
      map.off('click', layerId, onCulturalClick)
      map.off('mouseenter', layerId, onCulturalEnter)
      map.off('mouseleave', layerId, onCulturalLeave)
    })
  }

  // Cluster zoom on click
  const onClusterClick = (e: MapLayerMouseEvent) => {
    if (!e.features?.length) return
    const clusterId = e.features[0].properties?.cluster_id
    if (clusterId == null) return
    const source = map.getSource(CULTURAL_SOURCE) as maplibregl.GeoJSONSource
    if (!source) return
    source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
      map.flyTo({ center: e.lngLat, zoom, duration: 600 })
    })
  }
  map.on('click', 'ree-cultural-cluster', onClusterClick)
  cleanups.push(() => { map.off('click', 'ree-cultural-cluster', onClusterClick) })

  return () => {
    cleanups.forEach(fn => fn())
    cleanupCulturalLayers(map)
  }
}

export function cleanupCulturalLayers(map: MapLibreMap) {
  for (const id of CULTURAL_LAYER_IDS) {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* layer may not exist */ }
  }
  try { if (map.getSource(CULTURAL_SOURCE)) map.removeSource(CULTURAL_SOURCE) } catch { /* source may not exist */ }
}

export function setCulturalLayersVisibility(map: MapLibreMap, visible: boolean) {
  const visibility = visible ? 'visible' : 'none'
  for (const id of CULTURAL_LAYER_IDS) {
    try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility) } catch { /* ignore */ }
  }
}

export function setCulturalFilter(map: MapLibreMap, filter: CulturalTypeFilter) {
  activeFilter = filter
  const expression = buildFilterExpression(filter) as maplibregl.FilterSpecification

  if (map.getLayer('ree-cultural-point')) {
    map.setFilter('ree-cultural-point', ['all', ['!', ['has', 'point_count']], expression] as maplibregl.FilterSpecification)
  }
  if (map.getLayer('ree-cultural-label')) {
    map.setFilter('ree-cultural-label', ['all', ['!', ['has', 'point_count']], ['has', 'name'], expression] as maplibregl.FilterSpecification)
  }
}

export function clearCulturalFilter(map: MapLibreMap) {
  activeFilter = {}
  if (map.getLayer('ree-cultural-point')) {
    map.setFilter('ree-cultural-point', ['!', ['has', 'point_count']])
  }
  if (map.getLayer('ree-cultural-label')) {
    map.setFilter('ree-cultural-label', ['all', ['!', ['has', 'point_count']], ['has', 'name']])
  }
}

export function getActiveCulturalFilter(): CulturalTypeFilter {
  return { ...activeFilter }
}

export function getMunicipalitiesFromData(data: GeoJSON.FeatureCollection): string[] {
  const municipalities = new Set<string>()
  for (const f of data.features) {
    const m = (f.properties as Record<string, unknown>)?.municipality
    if (m) municipalities.add(String(m))
  }
  return Array.from(municipalities).sort()
}

export function getTypesFromData(data: GeoJSON.FeatureCollection): string[] {
  const types = new Set<string>()
  for (const f of data.features) {
    const t = (f.properties as Record<string, unknown>)?.type
    if (t) types.add(String(t))
  }
  return Array.from(types).sort()
}

export function getSubtypesFromData(data: GeoJSON.FeatureCollection): string[] {
  const subtypes = new Set<string>()
  for (const f of data.features) {
    const s = (f.properties as Record<string, unknown>)?.subtype
    if (s) subtypes.add(String(s))
  }
  return Array.from(subtypes).sort()
}

export function getStatusesFromData(data: GeoJSON.FeatureCollection): string[] {
  const statuses = new Set<string>()
  for (const f of data.features) {
    const s = (f.properties as Record<string, unknown>)?.status
    if (s) statuses.add(String(s))
  }
  return Array.from(statuses).sort()
}

export function getFeatureCountByType(data: GeoJSON.FeatureCollection): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const f of data.features) {
    const t = String((f.properties as Record<string, unknown>)?.type || 'unknown')
    counts[t] = (counts[t] || 0) + 1
  }
  return counts
}

export function getFeatureCountByMunicipality(data: GeoJSON.FeatureCollection): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const f of data.features) {
    const m = String((f.properties as Record<string, unknown>)?.municipality || 'unknown')
    counts[m] = (counts[m] || 0) + 1
  }
  return counts
}
