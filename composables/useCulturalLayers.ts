/**
 * composables/useCulturalLayers.ts
 * @why Cultural agent map layers — GeoJSON sources and paint properties for cultural point data
 * @functions getPopupContent, setupCulturalLayers, cleanupCulturalLayers, setCulturalLayersVisibility, setCulturalFilter, clearCulturalFilter, getActiveCulturalFilter, getMunicipalitiesFromData, getTypesFromData, getSubtypesFromData, getStatusesFromData, getFeatureCountByType, getFeatureCountByMunicipality, ensureCulturalPinImages, buildCulturalPinImage
 * @consts CULTURAL_SOURCE, CULTURAL_LAYER_IDS, CULTURAL_PIN_IMAGE_IDS, CULTURAL_PIN_SIZES, SUBTYPE_COLORS, TYPE_COLORS, LEGEND_ITEMS
 * @types CulturalTypeFilter
 * @deps @/lib/map-utils (escapeHtml)
 * @connections composables/useMapBase.ts, composables/useRareEarthController.ts, composables/useRareEarthLayers.ts
 */
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { escapeHtml } from '@/lib/map-utils'
import {
  CULTURAL_FAMILY_LEGEND,
  enrichCulturalCollection,
  getCulturalFamily,
  type CulturalFamily,
} from '@/lib/cultural-marker-taxonomy'

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
  'ree-cultural-pin',
  'ree-cultural-label-major',
  'ree-cultural-label-minor',
  'ree-cultural-cluster',
  'ree-cultural-cluster-count',
] as const

/**
 * Classical teardrop pin icons per cultural family, generated at runtime on
 * an offscreen canvas (no static asset, works on any baseURL deploy).
 * Agents get the biggest default scale — they are the featured overlay.
 */
export const CULTURAL_PIN_IMAGE_IDS = {
  agents: 'cultural-pin-agents',
  spaces: 'cultural-pin-spaces',
  indigenous: 'cultural-pin-indigenous',
} as const

/** Base icon-size per family (multiplied by a zoom factor in the layer). */
export const CULTURAL_PIN_SIZES: Record<CulturalFamily, number> = {
  agents: 0.9,
  spaces: 0.72,
  indigenous: 1.05,
}

/** Shared glow predicate (at-risk statuses + indigenous priority). Legacy form — plain string keys. */
const CULTURAL_GLOW_CONDITIONS = [
  'any',
  ['==', 'status', 'critical'],
  ['==', 'status', 'threatened'],
  ['==', 'status', 'at_risk'],
  // Indigenous & original peoples always glow (protection priority).
  ['==', '_family', 'indigenous'],
] as unknown as maplibregl.FilterSpecification

/** Legacy id kept so existing `ree-cultural-label` references keep working. */
export const CULTURAL_LABEL_LAYER_IDS = ['ree-cultural-label-major', 'ree-cultural-label-minor'] as const

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

/**
 * Family legend — the canonical legend for the Vulcan observatory cultural
 * layer: ONE entry for Cultural Agents (Mapa Cultura + Floresta Ativista),
 * one for Cultural Spaces, one for Indigenous & Original Peoples.
 */
export const CULTURAL_FAMILY_LEGEND_ITEMS = CULTURAL_FAMILY_LEGEND
export type { CulturalFamily }

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
  // Family-first: precomputed `_color` (taxonomy) wins so the map, popups and
  // legend always agree. Legacy subtype/type matching is the fallback.
  const pre = props._family ?? props.family
  if (pre === 'agents') return '#a855f7'
  if (pre === 'spaces') return '#f59e0b'
  if (pre === 'indigenous') return '#ef4444'
  const probe = { ...props } as Record<string, unknown>
  const family = getCulturalFamily(probe)
  if (family === 'agents') return '#a855f7'
  if (family === 'spaces') return '#f59e0b'
  if (family === 'indigenous') return '#ef4444'
  const subtype = String(props.subtype || '')
  if (subtype && SUBTYPE_COLORS[subtype]) return SUBTYPE_COLORS[subtype]
  const type = String(props.type || 'community')
  return TYPE_COLORS[type] || '#9b59b6'
}

function getSubtypeLabel(subtype: string): string {
  return SUBTYPE_LABELS[subtype] || subtype
}

function getStatusBadge(status: string): string {
  const style = STATUS_STYLES[status] || { color: 'var(--obs-text-muted)', label: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), pulse: false }
  const pulseStyle = style.pulse ? 'animation:pulse-badge 2s ease-in-out infinite;' : ''
  return `<span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:${style.color};color:#fff;${pulseStyle}">${escapeHtml(style.label)}</span>`
}

function getIndigenousBadge(): string {
  return '<span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;background:var(--danger);color:#fff;margin-left:4px">INDIGENOUS</span>'
}

export function getPopupContent(p: Record<string, unknown>): string {
  const family = getCulturalFamily(p)
  const familyLabel = family === 'agents' ? 'Cultural Agent' : family === 'indigenous' ? 'Indigenous & Original Peoples' : 'Cultural Space'
  const typeName = String(p.type || 'community')
  const typeLabel = TYPE_LABELS[typeName] || typeName.charAt(0).toUpperCase() + typeName.slice(1).replace('_', ' ')
  const subtype = String(p.subtype || '')
  const subtypeLabel = subtype ? getSubtypeLabel(subtype) : ''
  const statusBadge = p.status ? getStatusBadge(String(p.status)) : ''
  const indigenousBadge = p.indigenous ? getIndigenousBadge() : ''
  const municipality = p.municipality ? `<span style="font-size:9px;color:var(--obs-text-muted);margin-left:4px">${escapeHtml(String(p.municipality))}</span>` : ''

  let details = ''

  if (typeName === 'school' && p.indigenous) {
    details = `<p style="font-size:9px;color:var(--purple);margin:4px 0 0">Indigenous school serving local community</p>`
  } else if (typeName === 'health') {
    details = `<p style="font-size:9px;color:var(--info);margin:4px 0 0">Healthcare facility</p>`
  } else if (typeName === 'water_access') {
    details = `<p style="font-size:9px;color:var(--success);margin:4px 0 0">Water infrastructure</p>`
  } else if (subtype === 'artist_group') {
    details = `<p style="font-size:9px;color:var(--purple);margin:4px 0 0">Artist / cultural group</p>`
  } else if (subtype === 'marginalized') {
    details = `<p style="font-size:9px;color:var(--warning);margin:4px 0 0">Marginalized community — limited services</p>`
  } else if (subtype === 'rural') {
    details = `<p style="font-size:9px;color:var(--success);margin:4px 0 0">Rural community</p>`
  } else if (subtype === 'event') {
    details = `<p style="font-size:9px;color:var(--info);margin:4px 0 0">Cultural event / festival</p>`
  } else if (subtype === 'cultural_center') {
    details = `<p style="font-size:9px;color:var(--warning);margin:4px 0 0">Cultural institution / venue</p>`
  }

  return `<div class="ree-popup-wrapper" style="padding:14px;min-width:240px;max-width:320px;position:relative">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
      <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${getFeatureColor(p)};color:#fff">${escapeHtml(familyLabel)}</span>
      <span style="font-size:8px;font-weight:600;padding:2px 8px;border-radius:3px;background:rgba(255,255,255,0.08);color:var(--obs-text-muted);border:1px solid var(--obs-panel-border)">${escapeHtml(subtypeLabel || typeLabel)}</span>
      ${indigenousBadge}
      ${statusBadge}
      ${municipality}
    </div>
    <h3 style="margin:0;font-size:13px;font-weight:700;color:var(--obs-text-primary);line-height:1.3">${escapeHtml(String(p.name || 'Unknown'))}</h3>
    ${p.description ? `<p style="font-size:10px;color:var(--obs-text-muted);margin:8px 0 0;line-height:1.5">${escapeHtml(String(p.description))}</p>` : ''}
    ${details}
    ${p.community ? `<p style="font-size:9px;color:var(--purple);margin:6px 0 0">📍 ${escapeHtml(String(p.community))}</p>` : ''}
    ${p.area_ha ? `<p style="font-size:9px;color:var(--obs-text-muted);margin:2px 0 0">Area: ${p.area_ha} ha</p>` : ''}
    ${p.population ? `<p style="font-size:9px;color:var(--obs-text-muted);margin:2px 0 0">Population: ${p.population}</p>` : ''}
    ${p.osm_id ? `<a href="https://www.openstreetmap.org/node/${p.osm_id}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:10px;color:var(--purple);text-decoration:none;border-bottom:1px dotted var(--purple)">View on OpenStreetMap →</a>` : ''}
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

/**
 * Build the user-filter portion of a cultural layer filter. Exported for
 * testing: output must stay legacy-form (plain string keys, `$type` for
 * geometry) so it validates when wrapped under `['all', ['!has', ...], ...]`
 * — see the glow-layer note above.
 */
export function buildFilterExpression(filter: CulturalTypeFilter): FilterExpr {
  // Legacy form with plain string keys: callers wrap the result under
  // `['all', ['!has', ...], ...]`, and any `['get', ...]` comparison there
  // would fail style-spec validation (see note on the glow layer above).
  // `$type` is the legacy geometry-type key.
  const conditions: FilterExpr[] = []

  if (filter.types?.length) {
    conditions.push(['any', ...filter.types.map(t => ['==', 'type', t])])
  }
  if (filter.municipalities?.length) {
    conditions.push(['any', ...filter.municipalities.map(m => ['==', 'municipality', m])])
  }
  if (filter.subtypes?.length) {
    conditions.push(['any', ...filter.subtypes.map(s => ['==', 'subtype', s])])
  }
  if (filter.statuses?.length) {
    conditions.push(['any', ...filter.statuses.map(s => ['==', 'status', s])])
  }
  if (filter.indigenousOnly) {
    conditions.push(['==', 'indigenous', true])
  }

  if (conditions.length === 0) return ['==', '$type', 'Point']
  if (conditions.length === 1) return conditions[0]
  return ['all', ...conditions]
}

/**
 * Draw one classical teardrop map pin (circle head + tail + white core) for
 * a family color. Returns raw RGBA pixels for `map.addImage`, or undefined
 * when canvas is unavailable (SSR / old browsers) — callers then skip the
 * pin layer and the circle points below still render.
 */
export function buildCulturalPinImage(color: string): { width: number; height: number; data: Uint8Array } | undefined {
  try {
    if (typeof document === 'undefined') return undefined
    const S = 96
    const canvas = document.createElement('canvas')
    canvas.width = S
    canvas.height = S
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    const cx = S / 2
    const headY = 36
    const headR = 22
    const tipY = 88
    ctx.clearRect(0, 0, S, S)
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 3
    // Tail (drawn first so the head overlaps its base).
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(cx - 18, headY + 12)
    ctx.lineTo(cx, tipY)
    ctx.lineTo(cx + 18, headY + 12)
    ctx.closePath()
    ctx.fill()
    // Head.
    ctx.beginPath()
    ctx.arc(cx, headY, headR, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    // White classical rim: head ring + tail edges.
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.arc(cx, headY, headR, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cx - 17, headY + 14)
    ctx.lineTo(cx, tipY - 2)
    ctx.moveTo(cx + 17, headY + 14)
    ctx.lineTo(cx, tipY - 2)
    ctx.stroke()
    // White core so the pin reads at any zoom.
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, headY, 8, 0, Math.PI * 2)
    ctx.fill()
    const img = ctx.getImageData(0, 0, S, S)
    return { width: S, height: S, data: new Uint8Array(img.data) }
  } catch {
    return undefined
  }
}

/**
 * Register the three family pin images on the map (idempotent). Returns
 * true when the `ree-cultural-pin` symbol layer can reference them.
 */
export function ensureCulturalPinImages(map: MapLibreMap): boolean {
  try {
    const colors: Record<CulturalFamily, string> = {
      agents: '#a855f7',
      spaces: '#f59e0b',
      indigenous: '#ef4444',
    }
    for (const family of Object.keys(colors) as CulturalFamily[]) {
      const id = CULTURAL_PIN_IMAGE_IDS[family]
      let has = false
      try { has = map.hasImage(id) } catch { has = false }
      if (has) continue
      const px = buildCulturalPinImage(colors[family])
      if (!px) return false
      map.addImage(id, px, { pixelRatio: 2 })
    }
    return true
  } catch {
    return false
  }
}

/**
 * Add the classical pin symbol layer (idempotent, best-effort). Returns true
 * when the layer exists afterwards.
 */
function addCulturalPinLayer(map: MapLibreMap): boolean {
  try {
    if (map.getLayer('ree-cultural-pin')) return true
    if (!ensureCulturalPinImages(map)) return false
    map.addLayer({
      id: 'ree-cultural-pin',
      type: 'symbol',
      source: CULTURAL_SOURCE,
      filter: ['!has', 'point_count'],
      layout: {
        'icon-image': [
          'match', ['get', '_family'],
          'indigenous', CULTURAL_PIN_IMAGE_IDS.indigenous,
          'spaces', CULTURAL_PIN_IMAGE_IDS.spaces,
          CULTURAL_PIN_IMAGE_IDS.agents,
        ],
        'icon-size': [
          '*',
          ['match', ['get', '_family'],
            'indigenous', CULTURAL_PIN_SIZES.indigenous,
            'spaces', CULTURAL_PIN_SIZES.spaces,
            CULTURAL_PIN_SIZES.agents],
          ['interpolate', ['linear'], ['zoom'], 8, 0.6, 12, 1, 16, 1.2],
        ],
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-padding': 0,
        'symbol-sort-key': [
          'match', ['get', '_family'],
          'indigenous', 2,
          'spaces', 1,
          0,
        ],
      },
      paint: {
        'icon-opacity': 0.96,
      },
    })
    // A late-added pin (self-heal path) must respect the active user filter.
    if (activeFilter.types?.length || activeFilter.municipalities?.length || activeFilter.subtypes?.length || activeFilter.statuses?.length || activeFilter.indigenousOnly) {
      map.setFilter('ree-cultural-pin', ['all', ['!has', 'point_count'], buildFilterExpression(activeFilter)] as maplibregl.FilterSpecification)
    }
    return true
  } catch {
    return false
  }
}

export function setupCulturalLayers(
  map: MapLibreMap,
  culturalData: GeoJSON.FeatureCollection,
): () => void {
  if (!culturalData?.features?.length) return () => {}
  if (!map.isStyleLoaded()) return () => {}
  if (map.getSource(CULTURAL_SOURCE)) {
    // Source survived a re-entry (HMR / re-setup) — refresh data in place
    // instead of tearing everything down (no flicker, keeps cluster state).
    updateCulturalData(map, culturalData)
    return () => {}
  }

  // Precompute `_family` / `_color` / `_size` + stable ids once, so every
  // paint expression below is a cheap `get` lookup (no per-frame `match`
  // chains over subtype/type/source for 2000+ points).
  const enriched = enrichCulturalCollection(culturalData) ?? culturalData

  const cleanups: Array<() => void> = []

  map.addSource(CULTURAL_SOURCE, {
    type: 'geojson',
    data: enriched,
    // Stable ids via the enriched `id` property — survives setData (unlike
    // generateId, which renumbered every feature on each update and broke
    // feature-state hover).
    promoteId: 'id',
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 55,
  })

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

  // NOTE: filters stay in legacy form (plain string keys) wherever they
  // combine with the legacy `!has` op. Mixing `!has` with `['get', ...]`
  // comparisons fails style-spec validation
  // (`filter[2][1]: string expected, array found`), which fires a map error
  // per layer and makes `setFilter` silently skip. Paint expressions below
  // can keep using `['get', ...]` freely — only `filter` is affected.
  map.addLayer({
    id: 'ree-cultural-glow',
    type: 'circle',
    source: CULTURAL_SOURCE,
    filter: ['all', ['!has', 'point_count'], CULTURAL_GLOW_CONDITIONS] as unknown as maplibregl.FilterSpecification,
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', '_family'], 'indigenous'], '#ef4444',
        ['any', ['==', ['get', 'status'], 'critical'], ['==', ['get', 'status'], 'threatened']], '#e74c3c',
        '#e67e22',
      ],
      // Indigenous glow is wider so the biggest markers read at low zoom.
      'circle-radius': [
        'case',
        ['==', ['get', '_family'], 'indigenous'],
        ['interpolate', ['linear'], ['zoom'], 8, 14, 12, 20, 16, 28],
        ['interpolate', ['linear'], ['zoom'], 8, 8, 12, 14, 16, 20],
      ],
      'circle-opacity': 0.14,
      'circle-blur': 0.85,
    },
  })

  map.addLayer({
    id: 'ree-cultural-point',
    type: 'circle',
    source: CULTURAL_SOURCE,
    filter: ['!has', 'point_count'],
    paint: {
      // Single `get` on the precomputed taxonomy color — one family per
      // feature: agents violet, spaces amber, indigenous red.
      'circle-color': ['coalesce', ['get', '_color'], '#a855f7'],
      // Family base sizes (agents 7 / spaces 8.5 / indigenous 11) scaled by
      // zoom so agents stay readable without drowning indigenous markers.
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, ['*', ['coalesce', ['get', '_size'], 7], 0.55],
        12, ['coalesce', ['get', '_size'], 7],
        16, ['*', ['coalesce', ['get', '_size'], 7], 1.25],
      ],
      'circle-opacity': 0.9,
      'circle-stroke-color': [
        'case',
        ['==', ['get', '_family'], 'indigenous'], '#ffffff',
        'rgba(255,255,255,0.55)',
      ],
      'circle-stroke-width': [
        'case',
        ['==', ['get', '_family'], 'indigenous'], 2,
        ['==', ['get', '_family'], 'spaces'], 1.5,
        1.1,
      ],
    },
  })

  map.addLayer({
    id: 'ree-cultural-hover',
    type: 'circle',
    source: CULTURAL_SOURCE,
    filter: ['all', ['!has', 'point_count']],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 12, 8, 16, 11],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0],
      'circle-stroke-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.6, 0],
    },
  })

  // ── Classical pin markers (NEW marker type) ──────────────────────────
  // One big teardrop pin per unclustered feature, color-coded by family
  // (agents violet = biggest default scale, spaces amber, indigenous red).
  // Rendered ON TOP of the dot layers with overlap allowed so cultural
  // agents stay visible even in dense areas; the dots underneath act as a
  // halo/base. Skipped gracefully when canvas images are unavailable.
  addCulturalPinLayer(map)

  map.addLayer({
    id: 'ree-cultural-label-major',
    type: 'symbol',
    source: CULTURAL_SOURCE,
    // Indigenous & cultural spaces label early (protection / orientation
    // priority); agents wait for street-level zoom (see -minor below).
    minzoom: 11,
    filter: ['all', ['!has', 'point_count'], ['has', 'name'], ['==', '_major', true]] as unknown as maplibregl.FilterSpecification,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 9, 16, 12],
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-anchor': 'top',
      'text-offset': [0, 1.1],
    },
    paint: {
      'text-color': '#f3f4f6',
      'text-halo-color': 'rgba(0,0,0,0.85)',
      'text-halo-width': 1.5,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.85, 14, 1],
    },
  })

  map.addLayer({
    id: 'ree-cultural-label-minor',
    type: 'symbol',
    source: CULTURAL_SOURCE,
    // 2000+ agent names are the most expensive label cost on the map — only
    // collide-detect them at street zoom where they are actually readable.
    minzoom: 14,
    filter: ['all', ['!has', 'point_count'], ['has', 'name'], ['==', '_family', 'agents']] as unknown as maplibregl.FilterSpecification,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 9, 16, 11],
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-anchor': 'top',
      'text-offset': [0, 1],
    },
    paint: {
      'text-color': '#e8e8e8',
      'text-halo-color': 'rgba(0,0,0,0.85)',
      'text-halo-width': 1.5,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, 0.85],
    },
  })

  // Interaction handlers: click/hover on the point dots AND the classical
  // pins (both represent the same unclustered features). Clusters are NOT
  // in this loop — they expand on click via onClusterClick below instead of
  // opening a junk "Unknown" popup. Hover uses a single tracked id
  // with a rAF gate so fast mouse moves can't queue unbounded setFeatureState
  // calls across 2000+ points.
  let hoveredId: string | number | null = null
  let hoverRaf = 0
  const clearHover = () => {
    if (hoveredId == null) return
    try { map.setFeatureState({ source: CULTURAL_SOURCE, id: hoveredId }, { hover: false }) } catch { /* source mid-update */ }
    hoveredId = null
  }
  const applyHover = (id: string | number | undefined) => {
    if (id === hoveredId) return
    clearHover()
    if (id == null) return
    hoveredId = id
    try { map.setFeatureState({ source: CULTURAL_SOURCE, id }, { hover: true }) } catch { hoveredId = null }
  }

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
    const id = e.features?.[0]?.id as string | number | undefined
    if (hoverRaf) cancelAnimationFrame(hoverRaf)
    hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; applyHover(id) })
  }
  const onCulturalLeave = () => {
    map.getCanvas().style.cursor = ''
    if (hoverRaf) { cancelAnimationFrame(hoverRaf); hoverRaf = 0 }
    clearHover()
  }

  // Popups open from the point dots + the pin symbols (same features);
  // clusters expand instead (see onClusterClick). Guard with getLayer so a
  // skipped pin layer (no canvas images) never throws on registration.
  for (const layerId of ['ree-cultural-point', 'ree-cultural-pin']) {
    if (!map.getLayer(layerId)) continue
    map.on('click', layerId, onCulturalClick)
    map.on('mouseenter', layerId, onCulturalEnter)
    map.on('mouseleave', layerId, onCulturalLeave)
    cleanups.push(() => {
      map.off('click', layerId, onCulturalClick)
      map.off('mouseenter', layerId, onCulturalEnter)
      map.off('mouseleave', layerId, onCulturalLeave)
    })
  }

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
    if (hoverRaf) cancelAnimationFrame(hoverRaf)
    hoveredId = null
    cleanups.forEach(fn => fn())
    cleanupCulturalLayers(map)
  }
}

/**
 * In-place cultural data refresh (setData, no teardown). Enriches with the
 * taxonomy scalars so filter/style updates never lose the family styling.
 * Returns true when the source existed and was updated.
 */
export function updateCulturalData(map: MapLibreMap, culturalData: GeoJSON.FeatureCollection): boolean {
  try {
    const src = map.getSource(CULTURAL_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src || typeof src.setData !== 'function') return false
    src.setData(enrichCulturalCollection(culturalData) ?? culturalData)
    // Self-heal: sources that predate the pin layer (HMR / cached style)
    // get the classical pins without a full teardown.
    addCulturalPinLayer(map)
    return true
  } catch {
    return false
  }
}

export function cleanupCulturalLayers(map: MapLibreMap) {
  for (const id of CULTURAL_LAYER_IDS) {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* layer may not exist */ }
  }
  try { if (map.getSource(CULTURAL_SOURCE)) map.removeSource(CULTURAL_SOURCE) } catch { /* source may not exist */ }
  for (const id of Object.values(CULTURAL_PIN_IMAGE_IDS)) {
    try { if (map.hasImage(id)) map.removeImage(id) } catch { /* image may not exist */ }
  }
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

  // Dots, pins and hover ring share the same unclustered guard + user filter
  // so filtered-out agents lose their pin AND their hover affordance.
  for (const layerId of ['ree-cultural-point', 'ree-cultural-pin', 'ree-cultural-hover']) {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, ['all', ['!has', 'point_count'], expression] as maplibregl.FilterSpecification)
    }
  }
  if (map.getLayer('ree-cultural-glow')) {
    map.setFilter('ree-cultural-glow', ['all', ['!has', 'point_count'], CULTURAL_GLOW_CONDITIONS, expression] as unknown as maplibregl.FilterSpecification)
  }
  for (const layerId of CULTURAL_LABEL_LAYER_IDS) {
    if (!map.getLayer(layerId)) continue
    const familyGuard = layerId === 'ree-cultural-label-major'
      ? ['==', '_major', true]
      : ['==', '_family', 'agents']
    map.setFilter(layerId, ['all', ['!has', 'point_count'], ['has', 'name'], familyGuard, expression] as unknown as maplibregl.FilterSpecification)
  }
  // Legacy single-label id: no-op guard for callers holding the old name.
  if (map.getLayer('ree-cultural-label')) {
    map.setFilter('ree-cultural-label', ['all', ['!has', 'point_count'], ['has', 'name'], expression] as maplibregl.FilterSpecification)
  }
}

export function clearCulturalFilter(map: MapLibreMap) {
  activeFilter = {}
  for (const layerId of ['ree-cultural-point', 'ree-cultural-pin', 'ree-cultural-hover']) {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, ['!has', 'point_count'])
    }
  }
  if (map.getLayer('ree-cultural-glow')) {
    map.setFilter('ree-cultural-glow', ['all', ['!has', 'point_count'], CULTURAL_GLOW_CONDITIONS] as unknown as maplibregl.FilterSpecification)
  }
  if (map.getLayer('ree-cultural-label-major')) {
    map.setFilter('ree-cultural-label-major', ['all', ['!has', 'point_count'], ['has', 'name'], ['==', '_major', true]] as unknown as maplibregl.FilterSpecification)
  }
  if (map.getLayer('ree-cultural-label-minor')) {
    map.setFilter('ree-cultural-label-minor', ['all', ['!has', 'point_count'], ['has', 'name'], ['==', '_family', 'agents']] as unknown as maplibregl.FilterSpecification)
  }
  if (map.getLayer('ree-cultural-label')) {
    map.setFilter('ree-cultural-label', ['all', ['!has', 'point_count'], ['has', 'name']])
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
