/**
 * lib/cultural-marker-taxonomy.ts
 * @why Single source of truth for Vulcan observatory cultural marker families.
 *      Collapses Mapa Cultura + Floresta Ativista into ONE "Cultural Agents"
 *      family, and splits curated cultural spaces / indigenous & original
 *      peoples into their own bigger, distinct styles.
 * @functions getCulturalFamily, getCulturalFamilyStyle, enrichCulturalFeature, enrichCulturalCollection, stableCulturalId
 * @consts CULTURAL_FAMILIES, CULTURAL_FAMILY_STYLES, CULTURAL_FAMILY_LEGEND, AGENT_SOURCES
 * @connections composables/useCulturalLayers.ts, composables/useRareEarthLayers.ts, composables/useMapMarker.ts, components/observatory/ObservatorySidebar.vue
 */

export type CulturalFamily = 'agents' | 'spaces' | 'indigenous'

export interface CulturalFamilyStyle {
  /** Main dot color */
  color: string
  /** Glow/halo color */
  glow: string
  /** Base point radius at mid zoom (px, before zoom interpolation) */
  baseSize: number
  /** Stroke color for the point ring */
  stroke: string
  /** Stroke width at mid zoom */
  strokeWidth: number
  /** Short legend label (i18n key where available) */
  labelKey: string
  /** Fallback english label */
  label: string
}

/**
 * Sources that form the single "Cultural Agents" family. Mapa Cultura and
 * Floresta Ativista are different feeds of the same concept (people /
 * collectives doing culture) so they share one marker style by design.
 */
export const AGENT_SOURCES = new Set(['mapa_cultura', 'floresta_ativista'])

/** Property names that flag a feature as indigenous / original peoples. */
const INDIGENOUS_SUBTYPES = new Set(['indigenous', 'indigena', 'indígena', 'povos_originarios', 'original_peoples'])

function propsOf(f: GeoJSON.Feature): Record<string, unknown> {
  return (f.properties ?? {}) as Record<string, unknown>
}

/** True when the feature represents indigenous / original peoples. */
export function isIndigenousFeature(props: Record<string, unknown>): boolean {
  if (props.indigenous === true || props.indigenous === 'true' || props.indigenous === 1) return true
  const subtype = String(props.subtype ?? '').trim().toLowerCase()
  if (subtype && INDIGENOUS_SUBTYPES.has(subtype)) return true
  const type = String(props.type ?? '').trim().toLowerCase()
  if (type === 'indigenous' || type === 'ti' || type === 'terra_indigena') return true
  const status = String(props.status ?? '').trim().toLowerCase()
  if (status === 'indigenous') return true
  // Name-based fallback for feeds without structured flags (e.g. "Aldeia
  // Indígena ...", "Povo Guarani ...", "Terra Indígena ...").
  const name = `${String(props.name ?? '')} ${String(props.community ?? '')} ${String(props.description ?? '')}`.toLowerCase()
  if (/(ind[ií]gena|aldeia|povo\s+\w+|terra\s+ind[ií]gena|quilombola|origin[aá]rio)/.test(name)) {
    // Only treat as indigenous when the structured subtype is unknown —
    // curated spaces keep their own family unless explicitly flagged.
    if (!props.subtype || String(props.subtype) === 'indigenous') return true
  }
  return false
}

/**
 * Resolve the visual family for a cultural feature.
 * Order matters: indigenous wins over everything (sacred / protection
 * priority), then agents (Mapa Cultura + Floresta Ativista as one type),
 * everything else is a curated cultural space.
 */
export function getCulturalFamily(featureOrProps: GeoJSON.Feature | Record<string, unknown>): CulturalFamily {
  const props = (featureOrProps as GeoJSON.Feature).properties !== undefined
    ? propsOf(featureOrProps as GeoJSON.Feature)
    : (featureOrProps as Record<string, unknown>)
  if (isIndigenousFeature(props)) return 'indigenous'
  const source = String(props.source ?? '')
  if (AGENT_SOURCES.has(source)) return 'agents'
  return 'spaces'
}

export const CULTURAL_FAMILY_STYLES: Record<CulturalFamily, CulturalFamilyStyle> = {
  // Single unified style for Mapa Cultura + Floresta Ativista agents.
  // Violet — distinct from mining reds/oranges and water blues.
  agents: {
    color: '#a855f7',
    glow: '#a855f7',
    baseSize: 7,
    stroke: 'rgba(255,255,255,0.55)',
    strokeWidth: 1.25,
    labelKey: 'observatory.v2.panel.familyAgents',
    label: 'Cultural Agents',
  },
  // Curated cultural spaces (schools, health posts, cultural centers,
  // water access, venues from cultural-features.geojson). Amber — warm,
  // civic, clearly separate from the agents violet.
  spaces: {
    color: '#f59e0b',
    glow: '#f59e0b',
    baseSize: 8.5,
    stroke: 'rgba(255,255,255,0.65)',
    strokeWidth: 1.5,
    labelKey: 'observatory.v2.panel.familySpaces',
    label: 'Cultural Spaces',
  },
  // Indigenous / original peoples — biggest markers, red with a strong glow
  // + white halo so they stay visible (protection priority).
  indigenous: {
    color: '#ef4444',
    glow: '#ef4444',
    baseSize: 11,
    stroke: '#ffffff',
    strokeWidth: 2,
    labelKey: 'observatory.v2.panel.familyIndigenous',
    label: 'Indigenous & Original Peoples',
  },
}

export const CULTURAL_FAMILIES: CulturalFamily[] = ['agents', 'spaces', 'indigenous']

export const CULTURAL_FAMILY_LEGEND: Array<{ family: CulturalFamily; label: string; labelKey: string; color: string }> =
  CULTURAL_FAMILIES.map(f => ({
    family: f,
    label: CULTURAL_FAMILY_STYLES[f].label,
    labelKey: CULTURAL_FAMILY_STYLES[f].labelKey,
    color: CULTURAL_FAMILY_STYLES[f].color,
  }))

export function getCulturalFamilyStyle(family: CulturalFamily): CulturalFamilyStyle {
  return CULTURAL_FAMILY_STYLES[family]
}

/** Stable string id for a cultural feature (survives setData, unlike generateId). */
export function stableCulturalId(feature: GeoJSON.Feature, index: number): string {
  const p = propsOf(feature)
  const source = String(p.source ?? 'curated')
  const sid = String(p.source_id ?? p.osm_id ?? p.name ?? `idx-${index}`)
  const coords = (feature.geometry as GeoJSON.Point | undefined)?.coordinates
  const c = Array.isArray(coords) && coords.length >= 2
    ? `${Number(coords[0]).toFixed(5)},${Number(coords[1]).toFixed(5)}`
    : `nocoord-${index}`
  return `${source}|${sid}|${c}`
}

/**
 * Enrich one feature with precomputed render scalars. Precomputing `_family`,
 * `_color` and `_size` keeps MapLibre paint expressions to cheap `get`
 * lookups instead of per-frame `match` chains over subtype/type/source —
 * measurably cheaper with 2000+ points.
 */
export function enrichCulturalFeature(feature: GeoJSON.Feature, index: number): GeoJSON.Feature {
  const family = getCulturalFamily(feature)
  const style = CULTURAL_FAMILY_STYLES[family]
  const p = propsOf(feature)
  return {
    ...feature,
    id: (feature.id as string | number | undefined) ?? stableCulturalId(feature, index),
    properties: {
      ...p,
      id: (p.id as string | undefined) ?? stableCulturalId(feature, index),
      _family: family,
      _color: style.color,
      _size: style.baseSize,
      _major: family !== 'agents',
    },
  }
}

/** Enrich a whole collection (returns a new FeatureCollection). */
export function enrichCulturalCollection(
  data: GeoJSON.FeatureCollection | undefined | null,
): GeoJSON.FeatureCollection | undefined {
  if (!data || !Array.isArray(data.features)) return undefined
  return {
    type: 'FeatureCollection',
    features: data.features.map((f, i) => enrichCulturalFeature(f, i)),
  }
}

/** Count features per family (for legends / badges). */
export function countCulturalFamilies(
  data: GeoJSON.FeatureCollection | undefined | null,
): Record<CulturalFamily, number> {
  const out: Record<CulturalFamily, number> = { agents: 0, spaces: 0, indigenous: 0 }
  for (const f of data?.features ?? []) {
    const p = propsOf(f)
    const fam = (p._family as CulturalFamily | undefined) ?? getCulturalFamily(f)
    if (fam in out) out[fam]++
  }
  return out
}
