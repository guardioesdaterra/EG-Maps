/**
 * tests/map-filters.test.ts
 * @why Regression tests for MapLibre layer-filter validity — style-spec
 *      validates any filter tree containing legacy-only ops (!has / !in /
 *      none) as legacy, where ==/!=/>/in/... require a STRING key. A
 *      ['get', ...] in comparison position then fails with
 *      "filter[2][1]: string expected, array found", fires a map error event
 *      per layer, and makes setFilter silently skip.
 * @deps vitest (describe, it, expect); ../composables/useCulturalLayers
 */
import { describe, it, expect } from 'vitest'
import { buildFilterExpression } from '../composables/useCulturalLayers'

type Json = string | number | boolean | null | Json[]

function collectGetComparisons(node: Json, out: Json[] = []): Json[] {
  if (!Array.isArray(node) || node.length === 0) return out
  const [op, a] = node as [unknown, unknown]
  if ((op === '==' || op === '!=' || op === '>' || op === '>=' || op === '<' || op === '<=') && Array.isArray(a) && a[0] === 'get') {
    out.push(node)
  }
  for (const child of node as Json[]) {
    if (Array.isArray(child)) collectGetComparisons(child, out)
  }
  return out
}

describe('buildFilterExpression stays legacy-form', () => {
  it('uses string keys for type / municipality / subtype / status', () => {
    const expr = buildFilterExpression({
      types: ['cultural'],
      municipalities: ['Poços de Caldas'],
      subtypes: ['rural'],
      statuses: ['active'],
    })
    expect(collectGetComparisons(expr as Json)).toEqual([])
    expect(JSON.stringify(expr)).toContain('"type"')
    expect(JSON.stringify(expr)).toContain('"municipality"')
  })

  it('uses a string key for the indigenous flag', () => {
    const expr = buildFilterExpression({ indigenousOnly: true })
    expect(collectGetComparisons(expr as Json)).toEqual([])
    expect(expr).toEqual(['==', 'indigenous', true])
  })

  it('defaults to the legacy $type key (not the geometry-type expression)', () => {
    expect(buildFilterExpression({})).toEqual(['==', '$type', 'Point'])
  })

  it('wraps cleanly under the layer !has guard', () => {
    // The exact composition setCulturalFilter applies: must contain no
    // ['get', ...] comparisons once combined with the legacy !has op.
    const wrapped = ['all', ['!has', 'point_count'], buildFilterExpression({ types: ['school'] })]
    expect(collectGetComparisons(wrapped as unknown as Json)).toEqual([])
  })
})
