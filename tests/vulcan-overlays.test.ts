/**
 * tests/vulcan-overlays.test.ts
 * @why Regression tests for the INB dedup + APA Pedra Branca work:
 *      - no oversized legacy INB box may cover the Planalto again
 *      - the INB zona de amortecimento must be a valid ring around the claim
 *      - APA Pedra Branca (+ its ZA) must exist in the regional dataset
 *      - protected-kind canonicalization must stay stable
 * @deps vitest; ../lib/rare-earth-geo-data; ../lib/observatory-normalize; node:fs
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RARE_EARTH_GEO_BOUNDARIES } from '../lib/rare-earth-geo-data'
import { canonicalProtectedKind } from '../lib/observatory-normalize'

const ROOT = resolve(__dirname, '..')

function bbox(ring: number[][]): [number, number, number, number] {
  let a = Infinity
  let b = Infinity
  let c = -Infinity
  let d = -Infinity
  for (const p of ring) {
    if (p[0]! < a) a = p[0]!
    if (p[1]! < b) b = p[1]!
    if (p[0]! > c) c = p[0]!
    if (p[1]! > d) d = p[1]!
  }
  return [a, b, c, d]
}

describe('INB nuclear overlay (no duplication)', () => {
  it('has no legacy oversized INB box', () => {
    const names = RARE_EARTH_GEO_BOUNDARIES.features.map(f => String((f.properties as Record<string, unknown>)?.name ?? ''))
    expect(names).not.toContain('INB Caldas Nuclear')
    for (const f of RARE_EARTH_GEO_BOUNDARIES.features) {
      const type = String((f.properties as Record<string, unknown>)?.type ?? '')
      if (type === 'nuclear') {
        const geom = f.geometry as GeoJSON.Polygon
        const [x0, y0, x1, y1] = bbox(geom.coordinates[0] as number[][])
        // The legacy box spanned ~0.9° lon × 0.7° lat (most of the Planalto).
        expect(x1 - x0).toBeLessThan(0.5)
        expect(y1 - y0).toBeLessThan(0.5)
      }
    }
  })

  it('ships exactly one INB zona de amortecimento ring around the claim', () => {
    const buffers = RARE_EARTH_GEO_BOUNDARIES.features.filter(
      f => String((f.properties as Record<string, unknown>)?.type ?? '') === 'nuclear_buffer',
    )
    expect(buffers).toHaveLength(1)
    const geom = buffers[0]!.geometry as GeoJSON.Polygon
    // Donut: outer ring + claim hole.
    expect(geom.coordinates.length).toBe(2)
    const [ox0, oy0, ox1, oy1] = bbox(geom.coordinates[0] as number[][])
    const [hx0, hy0, hx1, hy1] = bbox(geom.coordinates[1] as number[][])
    // Hole matches the ANM INB claim footprint (180.266/1977).
    expect(hx0).toBeGreaterThan(-46.6)
    expect(hx1).toBeLessThan(-46.4)
    expect(hy0).toBeGreaterThan(-22.0)
    expect(hy1).toBeLessThan(-21.9)
    // Outer ring contains the hole with ~3 km of clearance each side.
    expect(ox0).toBeLessThan(hx0 - 0.02)
    expect(ox1).toBeGreaterThan(hx1 + 0.02)
    expect(oy0).toBeLessThan(hy0 - 0.02)
    expect(oy1).toBeGreaterThan(hy1 + 0.02)
    // …but stays regional (the bug it replaces covered the whole vulcan).
    expect(ox1 - ox0).toBeLessThan(0.5)
    expect(oy1 - oy0).toBeLessThan(0.5)
  })
})

describe('APA Pedra Branca dataset', () => {
  const protectedAreas = JSON.parse(
    readFileSync(resolve(ROOT, 'public/data/rare-earth/pococaldas/protected-areas.geojson'), 'utf-8'),
  ) as GeoJSON.FeatureCollection

  it('contains the APA Santuário Ecológico da Pedra Branca', () => {
    const apa = protectedAreas.features.find(
      f => String((f.properties as Record<string, unknown>)?.name ?? '').includes('Pedra Branca')
        && String((f.properties as Record<string, unknown>)?.kind ?? '') === 'conservation_unit',
    )
    expect(apa).toBeDefined()
    const props = apa!.properties as Record<string, unknown>
    expect(props.municipality).toBe('Caldas')
    expect(props.state).toBe('MG')
    expect(Number(props.area_ha)).toBe(11955)
    expect(String(props.legal ?? '')).toContain('1.973/2006')
    const geom = apa!.geometry as GeoJSON.Polygon
    expect(geom.type).toBe('Polygon')
    // Full official memorial: 41 vertices + closure (not a sketch).
    expect(geom.coordinates[0]).toHaveLength(42)
    const [x0, y0, x1, y1] = bbox(geom.coordinates[0] as number[][])
    // Memorial footprint: Caldas/MG from Pocinhos do Rio Verde (W) to the
    // Santa Rita de Caldas divisa (E), Ibitiura de Minas (S) to BR-459 (N).
    expect(x0).toBeGreaterThan(-46.55)
    expect(x1).toBeLessThan(-46.25)
    expect(y0).toBeGreaterThan(-22.1)
    expect(y1).toBeLessThan(-21.85)
    expect(x1 - x0).toBeGreaterThan(0.05)
    expect(y1 - y0).toBeGreaterThan(0.05)
  })

  it('contains the APA zona de amortecimento ring', () => {
    const za = protectedAreas.features.find(
      f => String((f.properties as Record<string, unknown>)?.kind ?? '') === 'buffer_zone'
        && String((f.properties as Record<string, unknown>)?.name ?? '').includes('Pedra Branca'),
    )
    expect(za).toBeDefined()
    const geom = za!.geometry as GeoJSON.Polygon
    expect(geom.type).toBe('Polygon')
    expect(geom.coordinates.length).toBe(2)
  })
})

describe('canonicalProtectedKind', () => {
  it.each([
    ['ti', undefined, 'ti'],
    ['indigenous_land', undefined, 'ti'],
    ['quilombo', undefined, 'quilombo'],
    ['quilombola_territory', undefined, 'quilombo'],
    ['conservation', 'conservation_unit', 'uc'],
    ['conservation_unit', 'conservation_unit', 'uc'],
    ['buffer_zone', 'buffer_zone', 'buffer'],
    ['zona de amortecimento', undefined, 'buffer'],
    ['something-else', 'whatever', 'other'],
  ])('maps kind=%s category=%s to %s', (kind, category, expected) => {
    expect(canonicalProtectedKind(kind, category)).toBe(expected)
  })
})
