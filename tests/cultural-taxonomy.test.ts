/**
 * tests/cultural-taxonomy.test.ts
 * @why Unit tests for the Vulcan cultural marker taxonomy — Mapa Cultura +
 *      Floresta Ativista collapse into ONE agents family; curated spaces and
 *      indigenous/original peoples get their own bigger styles
 * @deps vitest (describe, it, expect); ../lib/cultural-marker-taxonomy
 */
import { describe, it, expect } from 'vitest'
import {
  AGENT_SOURCES,
  CULTURAL_FAMILY_STYLES,
  countCulturalFamilies,
  enrichCulturalCollection,
  enrichCulturalFeature,
  getCulturalFamily,
  stableCulturalId,
} from '../lib/cultural-marker-taxonomy'

function feat(props: Record<string, unknown>, coords: [number, number] = [0, 0]): GeoJSON.Feature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: props }
}

describe('getCulturalFamily', () => {
  it('collapses mapa_cultura + floresta_ativista into one agents family', () => {
    expect(getCulturalFamily(feat({ source: 'mapa_cultura', subtype: 'cultural_center' }))).toBe('agents')
    expect(getCulturalFamily(feat({ source: 'mapa_cultura', subtype: 'artist_group' }))).toBe('agents')
    expect(getCulturalFamily(feat({ source: 'floresta_ativista', subtype: 'rural' }))).toBe('agents')
  })

  it('treats curated features without an agent source as spaces', () => {
    expect(getCulturalFamily(feat({ type: 'school' }))).toBe('spaces')
    expect(getCulturalFamily(feat({ type: 'cultural', subtype: 'cultural_center' }))).toBe('spaces')
    expect(getCulturalFamily(feat({ type: 'health' }))).toBe('spaces')
  })

  it('prioritizes indigenous over the agent source', () => {
    expect(getCulturalFamily(feat({ source: 'mapa_cultura', subtype: 'indigenous' }))).toBe('indigenous')
    expect(getCulturalFamily(feat({ source: 'floresta_ativista', indigenous: true }))).toBe('indigenous')
    expect(getCulturalFamily(feat({ type: 'school', subtype: 'indigenous' }))).toBe('indigenous')
  })

  it('accepts a raw props record as well as a feature', () => {
    expect(getCulturalFamily({ source: 'mapa_cultura' })).toBe('agents')
    expect(getCulturalFamily({ subtype: 'indigenous' })).toBe('indigenous')
  })
})

describe('family styles', () => {
  it('sizes indigenous > spaces > agents', () => {
    expect(CULTURAL_FAMILY_STYLES.indigenous.baseSize).toBeGreaterThan(CULTURAL_FAMILY_STYLES.spaces.baseSize)
    expect(CULTURAL_FAMILY_STYLES.spaces.baseSize).toBeGreaterThan(CULTURAL_FAMILY_STYLES.agents.baseSize)
  })

  it('gives each family a distinct color', () => {
    const colors = new Set(Object.values(CULTURAL_FAMILY_STYLES).map(s => s.color))
    expect(colors.size).toBe(3)
  })

  it('covers both agent sources', () => {
    expect(AGENT_SOURCES.has('mapa_cultura')).toBe(true)
    expect(AGENT_SOURCES.has('floresta_ativista')).toBe(true)
  })
})

describe('enrichment', () => {
  it('stamps precomputed render scalars', () => {
    const f = enrichCulturalFeature(feat({ source: 'mapa_cultura', name: 'A' }, [-46.5, -21.9]), 0)
    const p = f.properties as Record<string, unknown>
    expect(p._family).toBe('agents')
    expect(p._color).toBe(CULTURAL_FAMILY_STYLES.agents.color)
    expect(p._size).toBe(CULTURAL_FAMILY_STYLES.agents.baseSize)
    expect(p._major).toBe(false)
    expect(typeof p.id).toBe('string')
  })

  it('marks spaces + indigenous as major (early labels)', () => {
    const s = enrichCulturalFeature(feat({ type: 'school', name: 'S' }), 1)
    const i = enrichCulturalFeature(feat({ subtype: 'indigenous', name: 'I' }), 2)
    expect((s.properties as Record<string, unknown>)._major).toBe(true)
    expect((i.properties as Record<string, unknown>)._major).toBe(true)
  })

  it('produces stable ids (same input → same id)', () => {
    const a = stableCulturalId(feat({ source: 'mapa_cultura', source_id: '2' }, [-47.37, -22.57]), 0)
    const b = stableCulturalId(feat({ source: 'mapa_cultura', source_id: '2' }, [-47.37, -22.57]), 9)
    expect(a).toBe(b)
  })

  it('enriches whole collections and counts families', () => {
    const fc = enrichCulturalCollection({
      type: 'FeatureCollection',
      features: [
        feat({ source: 'mapa_cultura', name: 'A' }),
        feat({ source: 'floresta_ativista', name: 'B' }),
        feat({ type: 'school', name: 'C' }),
        feat({ subtype: 'indigenous', name: 'D' }),
      ],
    })
    expect(fc?.features).toHaveLength(4)
    expect(countCulturalFamilies(fc)).toEqual({ agents: 2, spaces: 1, indigenous: 1 })
  })
})
