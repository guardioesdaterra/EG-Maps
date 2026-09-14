/**
 * lib/observatory-normalize.ts
 * @why Canonical normalization for Vulcan Observatory GeoJSON — mining-claim
 *      sources mix UPPERCASE (polygons: PROCESSO/NOME/…) and lowercase
 *      (points: processo/nome/…) schemas, carry object-valued properties
 *      (`ov` overlap arrays) that MapLibre expressions cannot evaluate, and
 *      ship without danger scores. Every map layer, popup, filter and panel
 *      consumes the canonical scalar-only shape produced here, so a schema
 *      change in one source file cannot silently blank a layer again.
 * @functions getProp, normalizeClaimProps, normalizePointFeature, normalizePolygonFeature, summarizeOverlaps, summarizeProtected, buildLayerCounts
 * @interfaces NormalizedClaimProps, OverlapLink, OverlapSummary, ProtectedSummary, ProtectedBreakdown, ObservatoryLayerCounts
 * @deps @/lib/observatory-analysis (computeDangerScore, normalizeName, type SpeculatorIndexEntry)
 * @connections composables/useRareEarthData.ts, composables/useObservatoryControls.ts
 */
import { computeDangerScore, normalizeName, type SpeculatorIndexEntry } from '@/lib/observatory-analysis'
import { matchEnterpriseHolder } from '@/lib/enterprise-data'

export interface OverlapLink {
  name: string
  kind: string
  distance_km: number
}

export type OverlapsByProcesso = Record<string, OverlapLink[]>

/**
 * Canonical scalar-only claim properties. Safe to embed in GeoJSON
 * (MapLibre `get`/`match` work on every field) AND to spread into popup
 * props (`buildRareEarthPopupHTML` reads the short aliases p/n/s/c/f/u/a/
 * ds/net/y/ev/ano + long aliases).
 */
export interface NormalizedClaimProps {
  processo: string
  nome: string
  subs: string
  fase: string
  uf: string
  area_ha: number
  ano: number
  category: string
  dsprocesso: string
  ultimo_evento: string
  network_id: string
  danger_score: number
  overlaps_count: number
  overlap_names: string
  overlap_kinds: string
  holder_enterprise: string
  holder_country: string
  is_foreign: number
  // Short aliases (popup / filter / legacy layer compat)
  p: string
  n: string
  s: string
  c: string
  f: string
  u: string
  a: number
  ds: number
  net: string
  y: number
  ev: string
  hc: string
  he: string
  fr: number
}

export interface OverlapTerritory {
  name: string
  kind: string
  claims: number
}

export interface OverlapSummary {
  claimsWithOverlaps: number
  totalLinks: number
  byTerritory: OverlapTerritory[]
}

export interface ProtectedSummary {
  name: string
  kind: string
  municipality: string
  state: string
  area_ha: number
  population: number
  people: string
  status: string
  source_url: string
}

export interface ProtectedBreakdown {
  ti: ProtectedSummary[]
  quilombos: ProtectedSummary[]
  /** Conservation units (APAs, RESEX, PARNA, …) — rendered in green. */
  ucs: ProtectedSummary[]
  /** Buffer zones / zonas de amortecimento — rendered in teal dashes. */
  buffers: ProtectedSummary[]
  other: ProtectedSummary[]
}

export interface ObservatoryLayerCounts {
  points: number
  polygons: number
  protectedTi: number
  protectedQuilombo: number
  protectedUc: number
  protectedBuffer: number
  water: number
  cultural: number
  totalAreaHa: number
}

/**
 * Canonical protected-area kind. Source files mix `kind` spellings
 * (`ti`, `indigenous_land`, `quilombo`, `quilombola_territory`,
 * `conservation`, `conservation_unit`, `buffer_zone`, …) — every consumer
 * (map layers, counts, sidebar groups, search) matches on these four
 * canonical values plus `other`.
 */
export function canonicalProtectedKind(kind: unknown, category?: unknown): string {
  const k = String(kind ?? '').toLowerCase()
  const c = String(category ?? '').toLowerCase()
  const hay = `${k} ${c}`
  if (k === 'ti' || k.includes('indigen')) return 'ti'
  if (k === 'quilombo' || k.includes('quilomb')) return 'quilombo'
  if (k === 'buffer' || k.includes('buffer') || k.includes('amortecimento') || k.includes('zona')) return 'buffer'
  if (
    k === 'uc' || k.includes('conserv') || k.includes('apa') || k === 'park'
    || c.includes('conserv') || c.includes('apa') || c.includes('extractive')
    || c.includes('national_park') || c.includes('park') || c.includes('reserve')
    || c.includes('reserva') || c.includes('uc')
  ) return 'uc'
  if (hay.includes('indigen')) return 'ti'
  if (hay.includes('quilomb')) return 'quilombo'
  return 'other'
}

/** Case-insensitive property lookup across UPPER/lowercase source schemas. */
export function getProp(props: Record<string, unknown> | undefined, ...names: string[]): unknown {
  if (!props) return undefined
  for (const name of names) {
    if (props[name] !== undefined && props[name] !== null) return props[name]
    const upper = name.toUpperCase()
    if (props[upper] !== undefined && props[upper] !== null) return props[upper]
    const lower = name.toLowerCase()
    if (props[lower] !== undefined && props[lower] !== null) return props[lower]
  }
  return undefined
}

function toText(v: unknown): string {
  if (v === undefined || v === null) return ''
  return String(v)
}

function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function asOverlapLinks(v: unknown): OverlapLink[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((o): o is Record<string, unknown> => typeof o === 'object' && o !== null)
    .map(o => ({
      name: toText(o.name) || 'Unnamed territory',
      kind: toText(o.kind) || 'unknown',
      distance_km: toNumber(o.distance_km, 0),
    }))
}

/**
 * Read territory-overlap links carried inline on a raw claim property bag
 * (`overlaps` / `ov`). The overlaps GeoJSON files are supersets of the base
 * points files, so loaders single-fetch them and normalize from inline data
 * instead of downloading + parsing a second copy of all claims.
 */
export function inlineOverlaps(raw: Record<string, unknown> | undefined): OverlapLink[] {
  return asOverlapLinks(getProp(raw, 'overlaps', 'ov'))
}

/**
 * Canonicalize one raw claim property bag (either schema) into scalar-only
 * props. `overlaps` may be passed explicitly or read from `overlaps`/
 * `ov` fields on the raw bag.
 */
export function normalizeClaimProps(
  raw: Record<string, unknown> | undefined,
  overlaps?: OverlapLink[] | null,
  speculator?: SpeculatorIndexEntry | null,
): NormalizedClaimProps {
  const processo = toText(getProp(raw, 'processo'))
  const nome = toText(getProp(raw, 'nome'))
  const subs = toText(getProp(raw, 'subs', 'substances'))
  const fase = toText(getProp(raw, 'fase'))
  const uf = toText(getProp(raw, 'uf'))
  const area_ha = toNumber(getProp(raw, 'area_ha'), 0)
  const ano = toNumber(getProp(raw, 'ano'), 0)
  const category = toText(getProp(raw, 'category')) || 'unknown'
  const dsprocesso = toText(getProp(raw, 'dsprocesso')) || processo
  const ultimo_evento = toText(getProp(raw, 'ult_evento', 'ultimo_evento', 'ev'))
  const network_id = toText(getProp(raw, 'network_id', 'net'))

  const links = overlaps ?? asOverlapLinks(getProp(raw, 'overlaps', 'ov'))
  const overlaps_count = links.length
  const overlap_names = links.map(l => l.name).join('; ')
  const overlap_kinds = [...new Set(links.map(l => l.kind))].join(',')

  const danger_score = computeDangerScore(
    { area_ha, uf, subs, fase, ano, overlaps: links },
    speculator ?? null,
  )

  // Foreign linkage against the curated enterprise list (same matcher the
  // corporate network lines use). Unknown holders stay 'Unknown'/domestic
  // rather than fabricating attribution.
  const linkage = matchEnterpriseHolder(nome)
  const holder_enterprise = linkage?.enterprise ?? ''
  const holder_country = linkage?.country ?? 'Unknown'
  const is_foreign = linkage?.foreign ? 1 : 0

  return {
    processo, nome, subs, fase, uf, area_ha, ano, category, dsprocesso,
    ultimo_evento, network_id, danger_score,
    overlaps_count, overlap_names, overlap_kinds,
    holder_enterprise, holder_country, is_foreign,
    p: processo, n: nome, s: subs, c: category, f: fase, u: uf,
    a: area_ha, ds: danger_score, net: network_id, y: ano, ev: ultimo_evento,
    hc: holder_country, he: holder_enterprise, fr: is_foreign,
  }
}

/** Normalize a Point claim feature; drops object-valued props (scalar-only). */
export function normalizePointFeature(
  feature: GeoJSON.Feature<GeoJSON.Point>,
  overlapsByProcesso: OverlapsByProcesso = {},
  dangerByHolder: Map<string, SpeculatorIndexEntry> = new Map(),
): GeoJSON.Feature<GeoJSON.Point> {
  const raw = (feature.properties ?? {}) as Record<string, unknown>
  const processo = toText(getProp(raw, 'processo'))
  const overlaps = overlapsByProcesso[processo] ?? inlineOverlaps(raw)
  const nome = toText(getProp(raw, 'nome'))
  const normalized = normalizeClaimProps(raw, overlaps, dangerByHolder.get(normalizeName(nome)) ?? null)
  // Stable id = ANM processo (unique per claim). Survives filter changes so
  // MapLibre `promoteId: 'processo'` + feature-state hover stay consistent
  // across setData updates instead of reshuffling every keystroke.
  const out: GeoJSON.Feature<GeoJSON.Point> = { type: 'Feature', geometry: feature.geometry, properties: { ...normalized } }
  if (processo) out.id = processo
  return out
}

/** Normalize a Polygon/MultiPolygon claim boundary (UPPERCASE schema). */
export function normalizePolygonFeature(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
  overlapsByProcesso: OverlapsByProcesso = {},
  dangerByHolder: Map<string, SpeculatorIndexEntry> = new Map(),
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  const raw = (feature.properties ?? {}) as Record<string, unknown>
  const processo = toText(getProp(raw, 'processo'))
  const overlaps = overlapsByProcesso[processo] ?? []
  const nome = toText(getProp(raw, 'nome'))
  const normalized = normalizeClaimProps(raw, overlaps, dangerByHolder.get(normalizeName(nome)) ?? null)
  // Keep centroid helpers for popups/labels when present in source.
  const lon = toNumber(getProp(raw, 'lon'), 0)
  const lat = toNumber(getProp(raw, 'lat'), 0)
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: { ...normalized, lon, lat },
  }
}

/** Aggregate territory-overlap links across claim summaries. */
export function summarizeOverlaps(
  summaries: Array<{ ov?: OverlapLink[] | null }>,
): OverlapSummary {
  let claimsWithOverlaps = 0
  let totalLinks = 0
  const byTerritory = new Map<string, OverlapTerritory>()
  for (const s of summaries) {
    if (!s.ov?.length) continue
    claimsWithOverlaps++
    totalLinks += s.ov.length
    for (const o of s.ov) {
      const key = `${o.kind}::${o.name}`
      const existing = byTerritory.get(key)
      if (existing) existing.claims++
      else byTerritory.set(key, { name: o.name, kind: o.kind, claims: 1 })
    }
  }
  return {
    claimsWithOverlaps,
    totalLinks,
    byTerritory: [...byTerritory.values()].sort((a, b) => b.claims - a.claims),
  }
}

/** Split protected areas into TI / quilombo / UC / buffer / other with display fields. */
export function summarizeProtected(fc: GeoJSON.FeatureCollection | undefined | null): ProtectedBreakdown {
  const out: ProtectedBreakdown = { ti: [], quilombos: [], ucs: [], buffers: [], other: [] }
  for (const f of fc?.features ?? []) {
    const p = (f.properties ?? {}) as Record<string, unknown>
    const kind = canonicalProtectedKind(getProp(p, 'kind', 'category'), getProp(p, 'category'))
    const entry: ProtectedSummary = {
      name: toText(getProp(p, 'name')) || 'Unnamed territory',
      kind,
      municipality: toText(getProp(p, 'municipality')),
      state: toText(getProp(p, 'state')),
      area_ha: toNumber(getProp(p, 'area_ha'), 0),
      population: toNumber(getProp(p, 'population'), 0),
      people: toText(getProp(p, 'people')),
      status: toText(getProp(p, 'status')),
      source_url: toText(getProp(p, 'source_url')),
    }
    if (kind === 'ti') out.ti.push(entry)
    else if (kind === 'quilombo') out.quilombos.push(entry)
    else if (kind === 'uc') out.ucs.push(entry)
    else if (kind === 'buffer') out.buffers.push(entry)
    else out.other.push(entry)
  }
  return out
}

/** Cheap layer-status readout for UI badges and diagnostics. */
export function buildLayerCounts(input: {
  points?: GeoJSON.FeatureCollection | null
  polygons?: GeoJSON.FeatureCollection | null
  protected?: GeoJSON.FeatureCollection | null
  water?: GeoJSON.FeatureCollection | null
  cultural?: GeoJSON.FeatureCollection | null
}): ObservatoryLayerCounts {
  const protectedFeatures = input.protected?.features ?? []
  let protectedTi = 0
  let protectedQuilombo = 0
  let protectedUc = 0
  let protectedBuffer = 0
  for (const f of protectedFeatures) {
    const p = (f.properties as Record<string, unknown> | undefined) ?? {}
    const kind = canonicalProtectedKind(p.kind, p.category)
    if (kind === 'ti') protectedTi++
    else if (kind === 'quilombo') protectedQuilombo++
    else if (kind === 'uc') protectedUc++
    else if (kind === 'buffer') protectedBuffer++
  }
  let totalAreaHa = 0
  for (const f of input.polygons?.features ?? []) {
    totalAreaHa += toNumber((f.properties as Record<string, unknown> | undefined)?.area_ha, 0)
  }
  return {
    points: input.points?.features?.length ?? 0,
    polygons: input.polygons?.features?.length ?? 0,
    protectedTi,
    protectedQuilombo,
    protectedUc,
    protectedBuffer,
    water: input.water?.features?.length ?? 0,
    cultural: input.cultural?.features?.length ?? 0,
    totalAreaHa: Math.round(totalAreaHa),
  }
}
