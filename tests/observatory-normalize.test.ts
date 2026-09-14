/**
 * tests/observatory-normalize.test.ts
 * @why Unit tests for observatory GeoJSON normalization — canonical props,
 *      scalar-only guarantees for MapLibre, overlap summaries
 * @deps vitest (describe, it, expect); ../lib/observatory-normalize
 */
import { describe, it, expect } from 'vitest'
import {
  getProp,
  normalizeClaimProps,
  normalizePointFeature,
  normalizePolygonFeature,
  summarizeOverlaps,
  summarizeProtected,
  buildLayerCounts,
} from '../lib/observatory-normalize'

describe('getProp', () => {
  it('reads lowercase keys', () => {
    expect(getProp({ processo: 'A' }, 'processo')).toBe('A')
  })

  it('falls back to UPPERCASE keys (polygon schema)', () => {
    expect(getProp({ PROCESSO: 'B' }, 'processo')).toBe('B')
    expect(getProp({ NOME: 'X' }, 'nome')).toBe('X')
    expect(getProp({ AREA_HA: 10 }, 'area_ha')).toBe(10)
  })

  it('returns undefined for missing keys', () => {
    expect(getProp({}, 'processo')).toBeUndefined()
    expect(getProp(undefined, 'processo')).toBeUndefined()
  })
})

describe('normalizeClaimProps', () => {
  it('normalizes the lowercase points schema', () => {
    const n = normalizeClaimProps({
      processo: '3260/1936', nome: 'ACME', subs: 'ZIRCÔNIO', fase: 'LAVRA',
      uf: 'MG', area_ha: 4.84, ano: 1936, category: 'heavy_mineral_associated',
      dsprocesso: '003.260/1936',
    })
    expect(n.p).toBe('3260/1936')
    expect(n.n).toBe('ACME')
    expect(n.c).toBe('heavy_mineral_associated')
    expect(n.a).toBe(4.84)
    expect(n.ds).toBe(n.danger_score)
    expect(n.overlaps_count).toBe(0)
    expect(n.overlap_names).toBe('')
  })

  it('normalizes the UPPERCASE polygon schema', () => {
    const n = normalizeClaimProps({
      PROCESSO: '7580/1941', NOME: 'ACME SA', SUBS: 'FOSFATO', FASE: 'REQUERIMENTO DE PESQUISA',
      UF: 'MG', AREA_HA: 60000, ANO: 2024, DSProcesso: '007.580/1941',
      ULT_EVENTO: '418 - something', category: 'phosphate_associated',
    })
    expect(n.processo).toBe('7580/1941')
    expect(n.nome).toBe('ACME SA')
    expect(n.ultimo_evento).toBe('418 - something')
    expect(n.ev).toBe('418 - something')
    // FOSFATO + large area + MG research phase → high danger
    expect(n.danger_score).toBeGreaterThanOrEqual(5)
  })

  it('materializes overlap counts and names as scalars', () => {
    const n = normalizeClaimProps({ processo: '1', nome: 'X' }, [
      { name: 'TI A', kind: 'ti', distance_km: 3 },
      { name: 'Quilombo B', kind: 'quilombo', distance_km: 12 },
    ])
    expect(n.overlaps_count).toBe(2)
    expect(n.overlap_names).toBe('TI A; Quilombo B')
    expect(n.overlap_kinds).toBe('ti,quilombo')
    // Overlap adds danger
    expect(n.danger_score).toBeGreaterThanOrEqual(5.5)
  })

  it('emits no object-valued properties (MapLibre-safe)', () => {
    const n = normalizeClaimProps({ processo: '1' }, [{ name: 'TI A', kind: 'ti', distance_km: 1 }])
    for (const v of Object.values(n)) {
      const t = typeof v
      expect(['string', 'number', 'boolean']).toContain(t)
    }
  })

  it('defaults unknown category without crashing', () => {
    const n = normalizeClaimProps({})
    expect(n.category).toBe('unknown')
    expect(n.danger_score).toBe(4)
  })

  it('links known foreign holders to enterprise + country', () => {
    const n = normalizeClaimProps({ processo: '1', nome: 'AXEL REE LTDA' })
    expect(n.holder_enterprise).toBe('Axel REE')
    expect(n.holder_country).toBe('Australia')
    expect(n.is_foreign).toBe(1)
    expect(n.hc).toBe('Australia')
    expect(n.fr).toBe(1)
  })

  it('leaves unknown holders unattributed instead of fabricating', () => {
    const n = normalizeClaimProps({ processo: '1', nome: 'JOAO DA SILVA' })
    expect(n.holder_enterprise).toBe('')
    expect(n.holder_country).toBe('Unknown')
    expect(n.is_foreign).toBe(0)
  })

  it('marks Brazilian enterprises domestic', () => {
    const n = normalizeClaimProps({ processo: '1', nome: 'VALE S.A.' })
    expect(n.holder_country).toBe('Brazil')
    expect(n.is_foreign).toBe(0)
  })
})

describe('normalizePointFeature / normalizePolygonFeature', () => {
  const pt = (props: Record<string, unknown>): GeoJSON.Feature<GeoJSON.Point> => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-46.5, -21.9] },
    properties: props,
  })

  it('strips object overlap arrays from point properties', () => {
    const f = normalizePointFeature(pt({
      processo: '1', nome: 'X', category: 'direct_ree',
      overlaps: [{ name: 'TI A', kind: 'ti', distance_km: 1 }],
    }))
    expect(f.properties?.overlaps).toBeUndefined()
    expect(f.properties?.ov).toBeUndefined()
    expect(f.properties?.overlaps_count).toBe(1)
    expect(f.properties?.c).toBe('direct_ree')
  })

  it('joins holder danger from the speculator index', () => {
    const dangerByHolder = new Map([
      ['ACME', { normalizedName: 'ACME', count: 300, subs: ['X'], recentPct: 100 } as never],
    ])
    const f = normalizePointFeature(
      pt({ processo: '1', nome: 'ACME SA', category: 'direct_ree', ano: 2024, fase: 'REQUERIMENTO DE PESQUISA' }),
      {},
      dangerByHolder as never,
    )
    // normalizeName('ACME SA') strips SA → 'ACME' → match → suspicion boosts danger
    expect(f.properties?.ds as number).toBeGreaterThan(4)
  })

  it('normalizes polygon features with lon/lat helpers', () => {
    const f = normalizePolygonFeature({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      properties: { PROCESSO: '9', NOME: 'Y', category: 'direct_ree', lon: -46, lat: -21 },
    })
    expect(f.properties?.processo).toBe('9')
    expect(f.properties?.category).toBe('direct_ree')
    expect(f.properties?.lon).toBe(-46)
  })
})

describe('summarizeOverlaps', () => {
  it('aggregates links by territory', () => {
    const s = summarizeOverlaps([
      { ov: [{ name: 'TI A', kind: 'ti', distance_km: 1 }] },
      { ov: [{ name: 'TI A', kind: 'ti', distance_km: 2 }, { name: 'Q B', kind: 'quilombo', distance_km: 5 }] },
      { ov: null },
      {},
    ])
    expect(s.claimsWithOverlaps).toBe(2)
    expect(s.totalLinks).toBe(3)
    expect(s.byTerritory[0]).toEqual({ name: 'TI A', kind: 'ti', claims: 2 })
  })

  it('handles empty input', () => {
    expect(summarizeOverlaps([])).toEqual({ claimsWithOverlaps: 0, totalLinks: 0, byTerritory: [] })
  })
})

describe('summarizeProtected', () => {
  const fc = (kinds: string[]): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: kinds.map((kind, i) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { name: `Area ${i}`, kind, municipality: 'Caldas', area_ha: 10, population: 5 },
    })),
  })

  it('splits ti / quilombo / other', () => {
    const s = summarizeProtected(fc(['ti', 'quilombo', 'uc']))
    expect(s.ti).toHaveLength(1)
    expect(s.quilombos).toHaveLength(1)
    expect(s.other).toHaveLength(1)
    expect(s.ti[0]!.municipality).toBe('Caldas')
  })

  it('handles undefined', () => {
    expect(summarizeProtected(undefined)).toEqual({ ti: [], quilombos: [], other: [] })
  })
})

describe('buildLayerCounts', () => {
  it('counts features per layer and sums polygon area', () => {
    const c = buildLayerCounts({
      points: { type: 'FeatureCollection', features: [{}, {}] } as never,
      polygons: {
        type: 'FeatureCollection',
        features: [{ properties: { area_ha: 100 } }, { properties: { area_ha: 50 } }],
      } as never,
      protected: {
        type: 'FeatureCollection',
        features: [{ properties: { kind: 'ti' } }, { properties: { kind: 'quilombo' } }],
      } as never,
      water: { type: 'FeatureCollection', features: [{}] } as never,
      cultural: undefined,
    })
    expect(c.points).toBe(2)
    expect(c.polygons).toBe(2)
    expect(c.protectedTi).toBe(1)
    expect(c.protectedQuilombo).toBe(1)
    expect(c.water).toBe(1)
    expect(c.cultural).toBe(0)
    expect(c.totalAreaHa).toBe(150)
  })
})
