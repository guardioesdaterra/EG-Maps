import { describe, it, expect } from 'vitest'
import {
  buildRareEarthPopupHTML,
  isValidCoordinate,
  escapeHtml,
  RARE_EARTH_PHASES,
  getPhaseShortLabel,
  getPhaseColor,
} from '../lib/map-utils'
import {
  computeSpeculatorIndex,
  computeDangerScore,
  normalizeName,
  isMilitaryInterest,
  isHighEnvRisk,
  buildClaimReportMailtoUrl,
  buildAnmVerifyUrl,
  type RareEarthFeatureCollection,
  type RareEarthFeature,
} from '../lib/observatory-analysis'
import {
  buildEnterpriseNetworkLines,
  buildEnterpriseHQGeoJSON,
  ENTERPRISES,
} from '../lib/enterprise-data'
import { computeForceLayout } from '../composables/useForceLayout'

// ============================================================================
// buildRareEarthPopupHTML
// ============================================================================

describe('buildRareEarthPopupHTML', () => {
  it('renders category label from a known category code', () => {
    const html = buildRareEarthPopupHTML({
      c: 'direct_ree', n: 'Vale S.A.', s: 'Nióbio', p: '820001/2023',
      a: 5000, u: 'MG', f: 'REQUERIMENTO', ds: 7.5, lo: -43.5, la: -19.5, y: 2024,
    })
    expect(html).toContain('Vale S.A.')
    expect(html).toContain('820001/2023')
    // category color used
    expect(html).toContain('#e74c3c')
  })

  it('uses fallback color and label for unknown category', () => {
    const html = buildRareEarthPopupHTML({ c: 'unknown_cat', n: 'X' })
    expect(html).toContain('#666')
    // Falls back to using the raw category code as the label
    expect(html).toContain('unknown_cat')
  })

  it('uses literal "Unknown" label when c is missing entirely', () => {
    const html = buildRareEarthPopupHTML({ n: 'X' })
    expect(html).toContain('Unknown')
  })

  it('danger color is red when score >= 8', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X', ds: 9.0 })
    expect(html).toContain('#e74c3c') // danger red
  })

  it('danger color is orange when score 6–7.9', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X', ds: 6.5 })
    expect(html).toContain('#f39c12') // danger orange
  })

  it('danger color is green when score < 6', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X', ds: 3.0 })
    expect(html).toContain('#27ae60') // danger green
  })

  it('formats area in ha for small values', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X', a: 5000 })
    expect(html).toContain('5,000 ha')
  })

  it('formats area in K ha for large values', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X', a: 25000 })
    expect(html).toMatch(/25K ha/)
  })

  it('shows MIL flag for military UF', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X', u: 'AM' })
    expect(html).toContain('MIL')
  })

  it('hides MIL flag when mil=false override is set', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X', u: 'AM', mil: false })
    expect(html).not.toContain('MIL')
  })

  it('shows ENV flag for FOSFATO subs', () => {
    // isHighEnvRisk reads props.subs (uppercase)
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X', subs: 'FOSFATO' })
    expect(html).toContain('ENV')
  })

  it('shows last event with recency badge', () => {
    const currentYear = new Date().getFullYear()
    const html = buildRareEarthPopupHTML({
      c: 'direct_ree', n: 'X', ev: 'Public hearing held', y: currentYear,
    })
    expect(html).toContain('Public hearing held')
    expect(html).toContain('Recent')
  })

  it('marks old events as Stale', () => {
    const html = buildRareEarthPopupHTML({
      c: 'direct_ree', n: 'X', ev: 'Old event', y: 2010,
    })
    expect(html).toContain('Stale')
  })

  it('shows overlap chips when ov array is provided', () => {
    const html = buildRareEarthPopupHTML({
      c: 'direct_ree', n: 'X',
      ov: [
        { name: 'TI Yanomami', kind: 'ti', distance_km: 12 },
        { name: 'TI Munduruku', kind: 'ti', distance_km: 35 },
      ],
    })
    expect(html).toContain('TI Yanomami')
    expect(html).toContain('12km')
    expect(html).toContain('Overlaps')
  })

  it('truncates overlaps list and shows more counter', () => {
    const html = buildRareEarthPopupHTML({
      c: 'direct_ree', n: 'X',
      ov: [
        { name: 'A', kind: 'ti', distance_km: 1 },
        { name: 'B', kind: 'ti', distance_km: 2 },
        { name: 'C', kind: 'ti', distance_km: 3 },
        { name: 'D', kind: 'ti', distance_km: 4 },
        { name: 'E', kind: 'ti', distance_km: 5 },
      ],
    })
    expect(html).toContain('+2 more')
  })

  it('escapes HTML in user-provided values', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('embeds ANM verify link when processo is valid', () => {
    const html = buildRareEarthPopupHTML({
      c: 'direct_ree', n: 'X', p: '820001/2023', y: 2023,
    })
    expect(html).toContain('Verify on ANM')
    expect(html).toContain('anm.gov.br')
  })

  it('always embeds report mailto link', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X' })
    expect(html).toContain('Report issue')
    expect(html).toContain('mailto:')
  })

  it('omits verify link when processo is missing', () => {
    const html = buildRareEarthPopupHTML({ c: 'direct_ree', n: 'X' })
    // Verify link is only present when anmUrl is truthy
    const verifyMatch = html.match(/Verify on ANM/)
    expect(verifyMatch).toBeNull()
  })
})

// ============================================================================
// computeSpeculatorIndex
// ============================================================================

describe('computeSpeculatorIndex', () => {
  const makeFC = (features: Array<{
    name: string
    subs?: string
    area?: number
    uf?: string
    ano?: number
    fase?: string
    lng?: number
    lat?: number
  }>): RareEarthFeatureCollection => ({
    type: 'FeatureCollection',
    features: features.map((f, i) => ({
      type: 'Feature' as const,
      properties: {
        nome: f.name,
        subs: f.subs,
        area_ha: f.area,
        uf: f.uf,
        ano: f.ano,
        fase: f.fase,
      },
      geometry: { type: 'Point' as const, coordinates: [f.lng ?? 0, f.lat ?? 0] },
      id: i,
    } as RareEarthFeature)),
  })

  it('returns empty array for empty input', () => {
    const result = computeSpeculatorIndex({ type: 'FeatureCollection', features: [] })
    expect(result).toEqual([])
  })

  it('skips features with empty names', () => {
    const result = computeSpeculatorIndex(makeFC([
      { name: '' },
      { name: 'Real Company' },
    ]))
    expect(result).toHaveLength(1)
    expect(result[0].displayName).toBe('Real Company')
  })

  it('aggregates features with the same normalized name', () => {
    const result = computeSpeculatorIndex(makeFC([
      { name: 'Vale S.A.', area: 1000, uf: 'MG' },
      { name: 'VALE S/A', area: 2000, uf: 'AM' },
      { name: 'vale sa', area: 500, uf: 'PA' },
    ]))
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(3)
    expect(result[0].totalAreaHa).toBe(3500)
    expect(result[0].ufs).toEqual(expect.arrayContaining(['MG', 'AM', 'PA']))
  })

  it('normalizes accents and corporate suffixes', () => {
    const result = computeSpeculatorIndex(makeFC([
      { name: 'Mineração Vale Ltda.' },
      { name: 'Mineracao Vale SA' },
    ]))
    expect(result).toHaveLength(1)
  })

  it('deduplicates subs list', () => {
    const result = computeSpeculatorIndex(makeFC([
      { name: 'X', subs: 'Nióbio; Tântalo' },
      { name: 'X', subs: 'NIOBIO;Litio' },
    ]))
    expect(result[0].subs).toEqual(expect.arrayContaining(['Nióbio', 'Tântalo', 'NIOBIO', 'Litio']))
    // Only unique values
    expect(new Set(result[0].subs).size).toBe(result[0].subs.length)
  })

  it('caps subs list at 6 items', () => {
    const subsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].join(';')
    const result = computeSpeculatorIndex(makeFC([{ name: 'X', subs: subsList }]))
    expect(result[0].subs.length).toBeLessThanOrEqual(6)
  })

  it('computes suspicion flags for carpet bombing', () => {
    const features = Array.from({ length: 210 }, () => ({
      name: 'Big Speculator', area: 1000, uf: 'MG', ano: 2024, fase: 'REQUERIMENTO DE PESQUISA',
    }))
    const result = computeSpeculatorIndex(makeFC(features))
    expect(result[0].suspicionFlags).toContain('CARPET_BOMBING')
    expect(result[0].suspicionScore).toBeGreaterThanOrEqual(2)
  })

  it('marks recent rush speculators', () => {
    const features = Array.from({ length: 50 }, () => ({
      name: 'New Rush Inc', area: 100, uf: 'MG', ano: 2024, fase: 'REQUERIMENTO',
    }))
    const result = computeSpeculatorIndex(makeFC(features))
    expect(result[0].suspicionFlags).toContain('RECENT_RUSH')
  })

  it('sorts by suspicionScore desc, then totalAreaHa desc', () => {
    const result = computeSpeculatorIndex(makeFC([
      // 5 small recent claims = RECENT_RUSH only (score 2)
      ...Array.from({ length: 5 }, () => ({ name: 'Small', ano: 2024, area: 100, uf: 'MG', fase: 'REQUERIMENTO' })),
      // 200 big claims = CARPET_BOMBING + HIGH_VOLUME (score 4+)
      ...Array.from({ length: 200 }, () => ({ name: 'Big', ano: 2024, area: 2000, uf: 'AM', fase: 'REQUERIMENTO' })),
    ]))
    expect(result[0].displayName).toBe('Big')
    expect(result[0].suspicionScore).toBeGreaterThan(result[1].suspicionScore)
  })

  it('computes centroid as average of coordinates', () => {
    const result = computeSpeculatorIndex(makeFC([
      { name: 'X', lng: 0, lat: 0 },
      { name: 'X', lng: 2, lat: 4 },
      { name: 'X', lng: 4, lat: 8 },
    ]))
    expect(result[0].centroid).toEqual({ lng: 2, lat: 4 })
  })

  it('handles uppercase property keys (polygons)', () => {
    const fc: RareEarthFeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { NOME: 'UPPERCASE CO', SUBS: 'NIOBIO', AREA_HA: 1000, UF: 'MG', ANO: 2024, FASE: 'REQUERIMENTO' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      } as RareEarthFeature],
    }
    const result = computeSpeculatorIndex(fc)
    expect(result).toHaveLength(1)
    expect(result[0].displayName).toBe('UPPERCASE CO')
  })
})

// ============================================================================
// computeDangerScore
// ============================================================================

describe('computeDangerScore', () => {
  it('returns base score of 4.0 for neutral props', () => {
    const score = computeDangerScore({}, null)
    expect(score).toBe(4.0)
  })

  it('adds 1.0 for high env risk (large area)', () => {
    const score = computeDangerScore({ area_ha: 60000 }, null)
    expect(score).toBe(5.0)
  })

  it('adds 1.0 for military UF', () => {
    const score = computeDangerScore({ uf: 'AM' }, null)
    expect(score).toBe(5.0)
  })

  it('caps at 10', () => {
    const score = computeDangerScore({
      area_ha: 999999, uf: 'AM', subs: 'FOSFATO',
      overlaps: [{ name: 'X', kind: 'ti', distance_km: 1 }],
    }, null)
    expect(score).toBeLessThanOrEqual(10)
  })

  it('rounds to 1 decimal', () => {
    const score = computeDangerScore({ uf: 'AM' }, null)
    expect(score.toString()).toMatch(/^\d+(\.\d)?$/)
  })

  it('adds 1.5 for overlap', () => {
    const score = computeDangerScore({ overlaps: [{ name: 'X' }] }, null)
    expect(score).toBe(5.5)
  })
})

// ============================================================================
// isMilitaryInterest / isHighEnvRisk
// ============================================================================

describe('isMilitaryInterest', () => {
  it.each(['AM', 'AP', 'PA', 'RR', 'RO', 'MT'])('returns true for military UF %s', (uf) => {
    expect(isMilitaryInterest(uf)).toBe(true)
  })

  it('returns false for non-military UF', () => {
    expect(isMilitaryInterest('SP')).toBe(false)
  })

  it('handles arrays of UFs', () => {
    expect(isMilitaryInterest(['SP', 'AM'])).toBe(true)
    expect(isMilitaryInterest(['SP', 'RJ'])).toBe(false)
  })

  it('handles null/undefined', () => {
    expect(isMilitaryInterest(null)).toBe(false)
    expect(isMilitaryInterest(undefined)).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isMilitaryInterest('am')).toBe(true)
  })
})

describe('isHighEnvRisk', () => {
  it('flags FOSFATO subs', () => {
    expect(isHighEnvRisk({ subs: 'FOSFATO' })).toBe(true)
  })

  it('flags area > 50000 ha', () => {
    expect(isHighEnvRisk({ area_ha: 60000 })).toBe(true)
  })

  it('flags MG + research phase + recent year', () => {
    expect(isHighEnvRisk({ uf: 'MG', fase: 'REQUERIMENTO DE PESQUISA', ano: 2024 })).toBe(true)
  })

  it('returns false for normal claim', () => {
    expect(isHighEnvRisk({ subs: 'NIOBIO', area_ha: 1000, uf: 'MG', fase: 'CONCESSÃO', ano: 2018 })).toBe(false)
  })
})

// ============================================================================
// normalizeName
// ============================================================================

describe('normalizeName', () => {
  it('removes accents on names without generic suffix', () => {
    // Note: normalizeName includes MINERACAO in its generic-suffix list,
    // which strips the word from real company names that contain it
    // (this is an existing quirk; the test documents the behavior).
    expect(normalizeName('Açúcar')).toBe('ACUCAR')
  })

  it('strips common corporate suffixes', () => {
    expect(normalizeName('Vale S.A.')).toBe('VALE')
    expect(normalizeName('Vale SA')).toBe('VALE')
    expect(normalizeName('Vale Ltda')).toBe('VALE')
  })

  it('handles empty/null', () => {
    expect(normalizeName('')).toBe('')
    expect(normalizeName(null)).toBe('')
    expect(normalizeName(undefined)).toBe('')
  })

  it('collapses non-alphanumeric to spaces and strips MINERALS/CORP', () => {
    // MINERALS and CORP are both in the suffix list, so the result is "VALE"
    expect(normalizeName('Vale-Minerals!Corp')).toBe('VALE')
  })
})

// ============================================================================
// buildAnmVerifyUrl / buildClaimReportMailtoUrl
// ============================================================================

describe('buildAnmVerifyUrl', () => {
  it('builds a SIGMINE URL for a valid processo', () => {
    const url = buildAnmVerifyUrl('820001/2023', 2023)
    expect(url).toContain('anm.gov.br')
    // URL strips the slash from the processo number (e.g. 820001/2023 -> 8200012023)
    expect(url).toContain('8200012023')
    expect(url).toContain('ano=2023')
  })

  it('returns null for empty processo', () => {
    expect(buildAnmVerifyUrl('', 2023)).toBe(null)
    expect(buildAnmVerifyUrl(null, 2023)).toBe(null)
  })
})

describe('buildClaimReportMailtoUrl', () => {
  it('contains processo number and substance', () => {
    const url = buildClaimReportMailtoUrl({
      processo: '820001/2023', nome: 'Vale S.A.', lat: -19.5, lng: -43.5, uf: 'MG', subs: 'Nióbio',
    })
    expect(url).toContain('mailto:')
    expect(url).toContain('820001%2F2023') // URL-encoded slash
  })

  it('escapes newlines to prevent header injection', () => {
    const url = buildClaimReportMailtoUrl({
      processo: 'X\nBcc: attacker@evil.com', nome: 'Y',
    })
    expect(url).not.toContain('\n')
  })
})

// ============================================================================
// computeForceLayout
// ============================================================================

describe('computeForceLayout', () => {
  it('returns one node per input node', () => {
    const result = computeForceLayout(
      [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }, { id: 'c', x: 0, y: 0 }],
      [],
      { width: 400, height: 400 },
    )
    expect(result).toHaveLength(3)
    expect(result.map(n => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for empty input', () => {
    expect(computeForceLayout([], [], { width: 400, height: 400 })).toEqual([])
  })

  it('places connected nodes closer than unconnected ones (chain)', () => {
    // Chain: a-b-c-d. Endpoints (a, d) are far apart, neighbours are close.
    const nodes = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 0, y: 0 },
      { id: 'c', x: 0, y: 0 },
      { id: 'd', x: 0, y: 0 },
    ]
    const result = computeForceLayout(
      nodes,
      [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
        { source: 'c', target: 'd' },
      ],
      { width: 500, height: 500, iterations: 400, padding: 30 },
    )
    const a = result.find(n => n.id === 'a')!
    const b = result.find(n => n.id === 'b')!
    const c = result.find(n => n.id === 'c')!
    const d = result.find(n => n.id === 'd')!
    const dAB = Math.hypot(a.x - b.x, a.y - b.y)
    const dBC = Math.hypot(b.x - c.x, b.y - c.y)
    const dAD = Math.hypot(a.x - d.x, a.y - d.y) // graph diameter
    // Neighbouring edge lengths are smaller than the diameter
    expect(dAB).toBeLessThan(dAD)
    expect(dBC).toBeLessThan(dAD)
  })

  it('isolated node is pushed away from connected cluster', () => {
    // a-b form a connected pair, c is fully isolated. With sufficient
    // iterations, c should be pushed out of the a-b cluster.
    const nodes = [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 110, y: 100 },
      { id: 'c', x: 200, y: 200 },
    ]
    const result = computeForceLayout(
      nodes,
      [{ source: 'a', target: 'b' }],
      { width: 400, height: 400, iterations: 400, padding: 20 },
    )
    const a = result.find(n => n.id === 'a')!
    const b = result.find(n => n.id === 'b')!
    const c = result.find(n => n.id === 'c')!
    const dAB = Math.hypot(a.x - b.x, a.y - b.y)
    const dAC = Math.hypot(a.x - c.x, a.y - c.y)
    // Connected pair is closer than c is to a
    expect(dAB).toBeLessThan(dAC)
  })

  it('keeps all nodes within padding bounds', () => {
    const result = computeForceLayout(
      Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, x: 0, y: 0 })),
      Array.from({ length: 9 }, (_, i) => ({ source: `n${i}`, target: `n${i + 1}` })),
      { width: 400, height: 400, padding: 50, iterations: 200 },
    )
    for (const n of result) {
      expect(n.x).toBeGreaterThanOrEqual(50)
      expect(n.x).toBeLessThanOrEqual(350)
      expect(n.y).toBeGreaterThanOrEqual(50)
      expect(n.y).toBeLessThanOrEqual(350)
    }
  })

  it('reproducible with same seed', () => {
    const nodes = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, x: 0, y: 0 }))
    const edges = [{ source: 'n0', target: 'n1' }, { source: 'n1', target: 'n2' }]
    const a = computeForceLayout(nodes, edges, { width: 300, height: 300, seed: 42, iterations: 100 })
    const b = computeForceLayout(nodes, edges, { width: 300, height: 300, seed: 42, iterations: 100 })
    expect(a).toEqual(b)
  })

  it('respects edge weights (heavier = closer)', () => {
    // Star: a is the center with a heavy edge to b (w=5) and a light edge
    // to c (w=0.1). b should be pulled in closer to a than c is.
    const result = computeForceLayout(
      [
        { id: 'a', x: 200, y: 200 },
        { id: 'b', x: 200, y: 200 },
        { id: 'c', x: 200, y: 200 },
        { id: 'd', x: 200, y: 200 }, // 4 nodes to break symmetry
      ],
      [
        { source: 'a', target: 'b', weight: 5 },
        { source: 'a', target: 'c', weight: 0.1 },
        { source: 'a', target: 'd', weight: 0.1 },
        { source: 'b', target: 'd', weight: 0.1 },
      ],
      { width: 600, height: 600, iterations: 500, padding: 30 },
    )
    const a = result.find(n => n.id === 'a')!
    const b = result.find(n => n.id === 'b')!
    const c = result.find(n => n.id === 'c')!
    const dAB = Math.hypot(a.x - b.x, a.y - b.y)
    const dAC = Math.hypot(a.x - c.x, a.y - c.y)
    // b is connected to a with weight 5, so dAB < dAC
    expect(dAB).toBeLessThan(dAC)
  })
})

// ============================================================================
// escapeHtml + isValidCoordinate (sanity for popup helpers)
// ============================================================================

describe('escapeHtml', () => {
  it('escapes < and > to prevent script injection', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('escapes & to prevent entity injection', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('handles plain text unchanged', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world')
  })
})

describe('isValidCoordinate', () => {
  it('accepts valid lat/lng', () => {
    expect(isValidCoordinate(0, 0)).toBe(true)
    expect(isValidCoordinate(-23.5, -46.6)).toBe(true)
  })

  it('rejects out-of-range latitude', () => {
    expect(isValidCoordinate(91, 0)).toBe(false)
    expect(isValidCoordinate(-91, 0)).toBe(false)
  })

  it('rejects out-of-range longitude', () => {
    expect(isValidCoordinate(0, 181)).toBe(false)
  })

  it('rejects null/undefined', () => {
    expect(isValidCoordinate(null, 0)).toBe(false)
    expect(isValidCoordinate(0, undefined)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidCoordinate(NaN, 0)).toBe(false)
  })
})

// ============================================================================
// RARE_EARTH_PHASES
// ============================================================================

describe('RARE_EARTH_PHASES', () => {
  it('has all expected phases', () => {
    expect(RARE_EARTH_PHASES.REQUERIMENTO).toBeDefined()
    expect(RARE_EARTH_PHASES.CONCESSÃO).toBeDefined()
    expect(RARE_EARTH_PHASES.LAVRA).toBeDefined()
    expect(RARE_EARTH_PHASES.LICENCIAMENTO).toBeDefined()
  })

  it('each phase has label, shortLabel, and color', () => {
    for (const [, phase] of Object.entries(RARE_EARTH_PHASES)) {
      expect(phase.label).toBeTruthy()
      expect(phase.shortLabel).toBeTruthy()
      expect(phase.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('getPhaseShortLabel returns shortLabel for known phases', () => {
    expect(getPhaseShortLabel('REQUERIMENTO')).toBe('REQ')
    expect(getPhaseShortLabel('CONCESSÃO')).toBe('CONC')
  })

  it('getPhaseShortLabel returns truncated raw for unknown phases', () => {
    expect(getPhaseShortLabel('UNKNOWN_PHASE')).toBe('UNKNO')
  })

  it('getPhaseColor returns color for known phases', () => {
    expect(getPhaseColor('REQUERIMENTO')).toBe('#9ca3af')
    expect(getPhaseColor('LAVRA')).toBe('#7f1d1d')
  })

  it('getPhaseColor returns fallback for unknown phases', () => {
    expect(getPhaseColor('NONEXISTENT')).toBe('#666')
  })
})

// ============================================================================
// buildEnterpriseNetworkLines
// ============================================================================

describe('buildEnterpriseNetworkLines', () => {
  it('returns a FeatureCollection', () => {
    const fc: RareEarthFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    }
    const result = buildEnterpriseNetworkLines(fc as RareEarthFeatureCollection)
    expect(result.type).toBe('FeatureCollection')
    expect(result.features).toBeInstanceOf(Array)
  })

  it('draws lines from enterprise HQ to claim centroids for matching claims', () => {
    const fc: RareEarthFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { nome: 'VALE S.A.', area_ha: 1000, ano: 2023 },
          geometry: { type: 'Point', coordinates: [-43.2, -22.9] },
        },
        {
          type: 'Feature',
          properties: { nome: 'VALE S.A.', area_ha: 2000, ano: 2022 },
          geometry: { type: 'Point', coordinates: [-43.1, -22.8] },
        },
      ],
    }
    const result = buildEnterpriseNetworkLines(fc as RareEarthFeatureCollection)
    const valeLine = result.features.find(f =>
      f.properties?.from === 'VALE S.A.' && f.properties?.type === 'domestic_claims'
    )
    expect(valeLine).toBeDefined()
    expect(valeLine!.properties!.claimCount).toBe(2)
    expect(valeLine!.geometry!.type).toBe('LineString')
  })

  it('includes corporate connection lines between enterprises', () => {
    const fc: RareEarthFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { nome: 'Foxfire Metals', area_ha: 500, ano: 2023 },
          geometry: { type: 'Point', coordinates: [144.9, -37.8] },
        },
        {
          type: 'Feature',
          properties: { nome: 'Axel REE', area_ha: 200, ano: 2023 },
          geometry: { type: 'Point', coordinates: [145.0, -37.8] },
        },
      ],
    }
    const result = buildEnterpriseNetworkLines(fc as RareEarthFeatureCollection)
    const corpLine = result.features.find(f =>
      f.properties?.connectionType === 'corporate' && f.properties?.from === 'Foxfire Metals'
    )
    expect(corpLine).toBeDefined()
    expect(corpLine!.properties!.to).toBe('Axel REE')
  })

  it('marks foreign enterprise lines with foreign_to_claims type', () => {
    const fc: RareEarthFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { nome: 'Rio Tinto', area_ha: 5000, ano: 2023 },
          geometry: { type: 'Point', coordinates: [-43.0, -22.5] },
        },
      ],
    }
    const result = buildEnterpriseNetworkLines(fc as RareEarthFeatureCollection)
    const rioLine = result.features.find(f =>
      f.properties?.from === 'Rio Tinto' && f.properties?.type === 'foreign_to_claims'
    )
    expect(rioLine).toBeDefined()
    expect(rioLine!.properties!.color).toBe('#e74c3c')
  })
})

// ============================================================================
// buildEnterpriseHQGeoJSON
// ============================================================================

describe('buildEnterpriseHQGeoJSON', () => {
  it('returns all enterprises as FeatureCollection', () => {
    const result = buildEnterpriseHQGeoJSON()
    expect(result.type).toBe('FeatureCollection')
    expect(result.features.length).toBe(ENTERPRISES.length)
  })

  it('uses centroid from speculatorIndex when available', () => {
    const centroid = { lng: -50.0, lat: -15.0 }
    const specIndex = [
      { normalizedName: 'VALE', centroid },
    ]
    const result = buildEnterpriseHQGeoJSON(specIndex)
    const valeFeature = result.features.find(f => f.properties?.name === 'VALE S.A.')
    expect(valeFeature).toBeDefined()
    expect((valeFeature!.geometry as GeoJSON.Point).coordinates).toEqual([-50.0, -15.0])
    expect(valeFeature!.properties!.hasCentroid).toBe(true)
  })

  it('falls back to HQ coordinates when no speculatorIndex provided', () => {
    const result = buildEnterpriseHQGeoJSON()
    const valeFeature = result.features.find(f => f.properties?.name === 'VALE S.A.')
    expect(valeFeature).toBeDefined()
    expect((valeFeature!.geometry as GeoJSON.Point).coordinates).toEqual([-43.1761, -22.9542])
  })
})
