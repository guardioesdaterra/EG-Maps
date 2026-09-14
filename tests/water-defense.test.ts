/**
 * tests/water-defense.test.ts
 * @why Unit tests for water defense analysis + dossier builder
 * @deps vitest (describe, it, expect); ../lib/water-defense; ../lib/territory-dossier
 */
import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  polygonCentroid,
  computeWaterThreats,
  summarizeWaterThreats,
  enrichWaterFeatures,
  PRESSURE_KM,
  WATCH_KM,
} from '../lib/water-defense'
import { buildDossierMarkdown } from '../lib/territory-dossier'

const pt = (lng: number, lat: number, props: Record<string, unknown> = {}): GeoJSON.Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: props,
})

const lake = (name: string, ring: number[][], props: Record<string, unknown> = {}): GeoJSON.Feature => ({
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [ring] },
  properties: { name, water_type: 'reservoir', area_km2: 2, ...props },
})

describe('haversineKm', () => {
  it('is ~0 for identical points', () => {
    expect(haversineKm(-46.5, -21.9, -46.5, -21.9)).toBeCloseTo(0, 6)
  })

  it('matches known degree distance (~111km per degree latitude)', () => {
    expect(haversineKm(0, 0, 0, 1)).toBeCloseTo(111.2, 0)
  })
})

describe('polygonCentroid', () => {
  it('averages the exterior ring', () => {
    const c = polygonCentroid({ type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] })
    expect(c?.lng).toBeCloseTo(0.8, 6)
    expect(c?.lat).toBeCloseTo(0.8, 6)
  })

  it('passes points through', () => {
    expect(polygonCentroid({ type: 'Point', coordinates: [1, 2] })).toEqual({ lng: 1, lat: 2 })
  })

  it('returns null for empty geometry', () => {
    expect(polygonCentroid(undefined)).toBeNull()
    expect(polygonCentroid({ type: 'Polygon', coordinates: [] })).toBeNull()
  })
})

describe('computeWaterThreats', () => {
  const water: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      lake('Represa do Cipo', [[-46.55, -21.85], [-46.53, -21.85], [-46.53, -21.83], [-46.55, -21.83], [-46.55, -21.85]]),
      lake('', [[-46.0, -21.0], [-45.99, -21.0], [-45.99, -20.99], [-46.0, -20.99], [-46.0, -21.0]]),
      lake('Far Lake', [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]),
    ],
  }
  const claims: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      pt(-46.54, -21.84, { processo: '1/2024', nome: 'ACME' }),
      pt(-46.53, -21.84, { processo: '2/2024', nome: 'ACME' }),
    ],
  }

  it('skips unnamed waters', () => {
    const out = computeWaterThreats(water, claims)
    expect(out.map(t => t.name)).not.toContain('')
    expect(out).toHaveLength(2)
  })

  it('counts claims within pressure and watch radii', () => {
    const out = computeWaterThreats(water, claims)
    const cipo = out.find(t => t.name === 'Represa do Cipo')!
    expect(cipo.claimsPressure).toBe(2)
    expect(cipo.claimsWatch).toBe(2)
    expect(cipo.nearestProcesso).toBe('1/2024')
    expect(cipo.nearestLabel).toContain('1/2024')
  })

  it('marks distant waters safe', () => {
    const out = computeWaterThreats(water, claims)
    const far = out.find(t => t.name === 'Far Lake')!
    expect(far.claimsPressure).toBe(0)
    expect(far.claimsWatch).toBe(0)
  })

  it('sorts by pressure desc', () => {
    const out = computeWaterThreats(water, claims)
    expect(out[0]!.name).toBe('Represa do Cipo')
  })

  it('returns [] without claims', () => {
    expect(computeWaterThreats(water, { type: 'FeatureCollection', features: [] })).toEqual([])
  })

  it('merges OSM fragments sharing one reservoir name', () => {
    const frag: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        lake('Represa X', [[-46.55, -21.85], [-46.54, -21.85], [-46.54, -21.84], [-46.55, -21.84], [-46.55, -21.85]]),
        lake('Represa X', [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]),
      ],
    }
    const out = computeWaterThreats(frag, claims)
    expect(out).toHaveLength(1)
    expect(out[0]!.claimsPressure).toBeGreaterThan(0)
  })

  it('exposes radii constants', () => {
    expect(PRESSURE_KM).toBe(2)
    expect(WATCH_KM).toBe(5)
  })
})

describe('summarizeWaterThreats', () => {
  it('rolls up counts and top list', () => {
    const s = summarizeWaterThreats([
      { name: 'A', water_type: 'lake', area_km2: 1, lng: 0, lat: 0, claimsPressure: 3, claimsWatch: 5, nearestProcesso: '1', nearestHolder: 'X', nearestKm: 1, nearestLabel: '1' },
      { name: 'B', water_type: 'lake', area_km2: 1, lng: 0, lat: 0, claimsPressure: 0, claimsWatch: 2, nearestProcesso: '2', nearestHolder: 'Y', nearestKm: 4, nearestLabel: '2' },
      { name: 'C', water_type: 'lake', area_km2: 1, lng: 0, lat: 0, claimsPressure: 0, claimsWatch: 0, nearestProcesso: '', nearestHolder: '', nearestKm: -1, nearestLabel: '' },
    ])
    expect(s.watersAssessed).toBe(3)
    expect(s.watersUnderPressure).toBe(1)
    expect(s.watersOnWatch).toBe(1)
    expect(s.top[0]!.name).toBe('A')
  })
})

describe('enrichWaterFeatures', () => {
  it('stamps scalar threat props onto matching waters', () => {
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [lake('Represa X', [[0, 0], [1, 0], [1, 1], [0, 0]])],
    }
    const out = enrichWaterFeatures(fc, [
      { name: 'Represa X', water_type: 'reservoir', area_km2: 1, lng: 0, lat: 0, claimsPressure: 4, claimsWatch: 9, nearestProcesso: '9', nearestHolder: 'Z', nearestKm: 0.5, nearestLabel: '9 · Z · 0.5km' },
    ])
    const p = out!.features[0]!.properties as Record<string, unknown>
    expect(p.threat_claims_2km).toBe(4)
    expect(p.threat_claims_5km).toBe(9)
    expect(p.threat_nearest).toContain('9 · Z')
  })

  it('leaves unmatched waters untouched', () => {
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [lake('Other', [[0, 0], [1, 0], [1, 1], [0, 0]])],
    }
    const out = enrichWaterFeatures(fc, [])
    expect((out!.features[0]!.properties as Record<string, unknown>).threat_claims_2km).toBeUndefined()
  })
})

describe('buildDossierMarkdown', () => {
  const input = {
    regionLabel: 'Poços de Caldas (100km)',
    generatedAt: '2026-09-14',
    dataSource: 'ANM SIGMINE public dump',
    syncLabel: 'Jun 2026',
    claims: 284,
    boundaries: 284,
    totalAreaHa: 210402,
    categories: [{ label: 'Zircon', count: 100 }],
    overlapClaims: 50,
    overlapLinks: 60,
    topTerritories: [{ name: 'TI A', kind: 'ti', claims: 20 }],
    protectedTi: [{ name: 'TI A', municipality: 'Caldas', area_ha: 337, population: 143 }],
    protectedQuilombos: [],
    watersAssessed: 143,
    watersUnderPressure: 12,
    topWaters: [{ name: 'Represa X', water_type: 'reservoir', claimsPressure: 4, claimsWatch: 9, nearestLabel: '1 · ACME · 0.5km' }],
    holders: [{ name: 'ACME', score: 6, claims: 100, area_ha: 50000, flags: ['RECENT_RUSH'], subs: ['FOSFATO'] }],
    foreign: [{ key: 'AUSTRALIAN', claims: 100, pct: 5 }],
    military: { total_claims: 3000, total_area_ha: 5000000, us_connected_claims: 150 },
    sigilo: { total: 88, pct: 0.4, total_area_ha: 105139 },
  }

  it('covers all seven sections with live numbers', () => {
    const md = buildDossierMarkdown(input)
    expect(md).toContain('# Evidence dossier — Poços de Caldas (100km)')
    expect(md).toContain('**284**')
    expect(md).toContain('TI A')
    expect(md).toContain('Represa X')
    expect(md).toContain('ACME')
    expect(md).toContain('AUSTRALIAN')
    expect(md).toContain('US-connected')
    expect(md).toContain('sigilo')
    expect(md).toContain('MPF')
    expect(md).toContain('ANM SIGMINE')
  })

  it('handles empty optionals without crashing', () => {
    const md = buildDossierMarkdown({ ...input, military: null, sigilo: null, holders: [], foreign: [] })
    expect(md).toContain('No holder ranking available')
    expect(md).toContain('No foreign-capital breakdown')
  })
})
