export interface RareEarthFeature {
  type: 'Feature'
  geometry: GeoJSON.Geometry
  properties: Record<string, unknown>
}

export interface RareEarthFeatureCollection {
  type: 'FeatureCollection'
  features: RareEarthFeature[]
}

export interface SpeculatorIndexEntry {
  normalizedName: string
  displayName: string
  count: number
  totalAreaHa: number
  subs: string[]
  recentPct: number
  earliestYear: number
  latestYear: number
  primaryPhase: string
  ufs: string[]
  suspicionScore: number
  suspicionFlags: string[]
  centroid: { lng: number; lat: number } | null
}

const MILITARY_UFS = new Set(['AM', 'AP', 'PA', 'RR', 'RO', 'MT'])
const RESEARCH_PHASES = new Set([
  'REQUERIMENTO DE PESQUISA',
  'AUTORIZAÇÃO DE PESQUISA',
  'REQUERIMENTO DE LICENCIAMENTO',
  'LICENCIAMENTO',
])

export function isMilitaryInterest(uf: string | string[] | null | undefined): boolean {
  if (!uf) return false
  const list = Array.isArray(uf) ? uf : [uf]
  return list.some(u => MILITARY_UFS.has(String(u).toUpperCase()))
}

export function isHighEnvRisk(props: Record<string, unknown>): boolean {
  const subs = String(props.subs ?? props.SUBS ?? '').toUpperCase()
  const area = Number(props.area_ha ?? props.AREA_HA ?? 0)
  const uf = String(props.uf ?? props.UF ?? '')
  const fase = String(props.fase ?? props.FASE ?? '')
  const ano = Number(props.ano ?? props.ANO ?? 0)
  if (subs.includes('FOSFATO')) return true
  if (area > 50000) return true
  if (uf === 'MG' && RESEARCH_PHASES.has(fase) && ano > 2022) return true
  return false
}

export function isSuspiciousBasic(props: Record<string, unknown>, speculator: SpeculatorIndexEntry | null): boolean {
  const ano = Number(props.ano ?? props.ANO ?? 0)
  const fase = String(props.fase ?? props.FASE ?? '')
  if (ano < 2020) return false
  if (!RESEARCH_PHASES.has(fase) && !fase.includes('REQUERIMENTO')) return false
  if (!speculator) return false
  return speculator.count > 50 && speculator.subs.length <= 3 && speculator.recentPct >= 90
}

export function normalizeName(raw: string | null | undefined): string {
  if (!raw) return ''
  return String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(LTDA|S\.?A\.?|S\/A|MINERACAO|MINERAÇÃO|MINERALS|MINING|METALS|MINERAIS|RECURSOS|HOLDINGS|GROUP|GMBH|INC|LLC|CORP)\b/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

export function computeSpeculatorIndex(points: RareEarthFeatureCollection): SpeculatorIndexEntry[] {
  const map = new Map<string, SpeculatorIndexEntry>()
  for (const f of points.features) {
    const p = f.properties || {}
    const rawName = String(p.nome ?? p.NOME ?? '').trim()
    if (!rawName) continue
    const key = normalizeName(rawName)
    if (!key) continue
    const subs = String(p.subs ?? p.SUBS ?? '').split(/[;,]/).map(s => s.trim()).filter(Boolean)
    const ano = Number(p.ano ?? p.ANO ?? 0)
    const area = Number(p.area_ha ?? p.AREA_HA ?? 0)
    const uf = String(p.uf ?? p.UF ?? '')
    const fase = String(p.fase ?? p.FASE ?? '')
    let entry = map.get(key)
    if (!entry) {
      entry = {
        normalizedName: key,
        displayName: rawName,
        count: 0,
        totalAreaHa: 0,
        subs: [],
        recentPct: 0,
        earliestYear: ano,
        latestYear: ano,
        primaryPhase: fase,
        ufs: [],
        suspicionScore: 0,
        suspicionFlags: [],
        centroid: null,
      }
      map.set(key, entry)
    }
    entry.count++
    entry.totalAreaHa += area
    if (ano && (!entry.earliestYear || ano < entry.earliestYear)) entry.earliestYear = ano
    if (ano && (!entry.latestYear || ano > entry.latestYear)) entry.latestYear = ano
    for (const s of subs) if (!entry.subs.includes(s)) entry.subs.push(s)
    if (uf && !entry.ufs.includes(uf)) entry.ufs.push(uf)
  }
  for (const entry of map.values()) {
    if (entry.subs.length > 6) entry.subs = entry.subs.slice(0, 6)
  }
  for (const f of points.features) {
    const p = f.properties || {}
    const key = normalizeName(String(p.nome ?? p.NOME ?? ''))
    const entry = map.get(key)
    if (!entry) continue
    const ano = Number(p.ano ?? p.ANO ?? 0)
    if (entry.latestYear >= 2020 && ano >= 2020) {
      entry.recentPct = Math.min(100, entry.recentPct + 100 / entry.count)
    }
  }
  for (const entry of map.values()) {
    entry.suspicionFlags = []
    let score = 0
    if (entry.recentPct >= 95) { entry.suspicionFlags.push('RECENT_RUSH'); score += 2 }
    else if (entry.recentPct >= 80) { entry.suspicionFlags.push('RECENT_RUSH'); score += 1 }
    if (entry.count > 200) { entry.suspicionFlags.push('CARPET_BOMBING'); score += 2 }
    else if (entry.count > 100) { entry.suspicionFlags.push('CARPET_BOMBING'); score += 1 }
    if (entry.totalAreaHa > 300000) { entry.suspicionFlags.push('HIGH_VOLUME'); score += 2 }
    else if (entry.totalAreaHa > 100000) { entry.suspicionFlags.push('HIGH_VOLUME'); score += 1 }
    if (entry.subs.length <= 2) { entry.suspicionFlags.push('LARGE_AREA_FEW_SUBS'); score += 1 }
    if (entry.ufs.length >= 5) { entry.suspicionFlags.push('MULTI_UF'); score += 1 }
    entry.suspicionScore = score
  }
  const byNorm = new Map<string, { lng: number; lat: number; n: number }>()
  for (const f of points.features) {
    const key = normalizeName(String(f.properties?.nome ?? f.properties?.NOME ?? ''))
    const coords = (f.geometry as GeoJSON.Point)?.coordinates
    if (!coords || !Array.isArray(coords) || coords.length < 2) continue
    const [lng, lat] = coords
    if (typeof lng !== 'number' || typeof lat !== 'number') continue
    let agg = byNorm.get(key)
    if (!agg) { agg = { lng: 0, lat: 0, n: 0 }; byNorm.set(key, agg) }
    agg.lng += lng
    agg.lat += lat
    agg.n++
  }
  for (const [key, agg] of byNorm) {
    const entry = map.get(key)
    if (entry && agg.n) entry.centroid = { lng: agg.lng / agg.n, lat: agg.lat / agg.n }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.suspicionScore !== a.suspicionScore) return b.suspicionScore - a.suspicionScore
    return b.totalAreaHa - a.totalAreaHa
  })
}

export function computeDangerScore(
  props: Record<string, unknown>,
  speculator: SpeculatorIndexEntry | null,
): number {
  let score = 4.0
  if (isHighEnvRisk(props)) score += 1.0
  if (isSuspiciousBasic(props, speculator)) score += 1.5
  const uf = String(props.uf ?? props.UF ?? '')
  if (isMilitaryInterest(uf)) score += 1.0
  const area = Number(props.area_ha ?? props.AREA_HA ?? 0)
  if (area > 100000) score += 1.0
  if (speculator && speculator.count > 200) score += 0.5
  if (props.overlaps && Array.isArray(props.overlaps) && props.overlaps.length) score += 1.5
  return Math.min(10, Math.round(score * 10) / 10)
}

export function getTopDangerEnterprises(
  points: RareEarthFeatureCollection,
  options: { limit?: number; minScore?: number; minClaims?: number } = {},
): SpeculatorIndexEntry[] {
  const { limit = 20, minScore = 3, minClaims = 5 } = options
  const index = computeSpeculatorIndex(points)
  return index.filter(e => e.suspicionScore >= minScore && e.count >= minClaims).slice(0, limit)
}

export interface DeepAnalysisForeignClaims {
  total_claims: number
  total_area_ha: number
  pct: number
}

export interface DeepAnalysis {
  suspicious_speculators_count: number
  top_suspicious: Array<{
    name: string
    score: number
    flags: string[]
    claims: number
    area_ha: number
    subs: string[]
    recent_pct: number
  }>
  foreign_claims: Record<string, DeepAnalysisForeignClaims>
  year_counts: Record<string, number>
  key_events: Record<string, string>
  sigilo_stats: { total: number; pct: number; total_area_ha: number }
  military_critical: {
    total_claims: number
    total_area_ha: number
    us_connected_claims: number
    us_connected_area_ha: number
  }
}

export function buildAnmVerifyUrl(processo: string | null | undefined, ano: number | null | undefined): string | null {
  if (!processo) return null
  const cleaned = String(processo).replace(/[^0-9]/g, '')
  if (!cleaned) return null
  const year = ano ?? new Date().getFullYear()
  return `https://app.anm.gov.br/SIGMINE/pesquisa_processo_apresentado.aspx?numero=${cleaned}&ano=${year}`
}

export function buildClaimReportMailtoUrl(input: {
  processo?: string | null
  nome?: string | null
  lat?: number | null
  lng?: number | null
  uf?: string | null
  subs?: string | null
}): string {
  const processo = input.processo ?? 'unknown'
  const subject = `Claim report - ${processo}`
  const lines = [
    `Process: ${processo}`,
    `Company: ${input.nome ?? 'unknown'}`,
    `Lat/Lng: ${input.lat != null ? input.lat.toFixed(5) : '?'}, ${input.lng != null ? input.lng.toFixed(5) : '?'}`,
    `UF: ${input.uf ?? '?'}`,
    `Substance: ${input.subs ?? '?'}`,
    '',
    'Issue type: [new claim | dispute | correction | field report]',
    '',
    'Notes:',
    '',
  ]
  return `mailto:observatory@earthguardians.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}
