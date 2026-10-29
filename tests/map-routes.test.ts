import { describe, expect, it } from 'vitest'
import { canonicalizeMapLayoutPath, isMapLayoutRoute } from '@/lib/map-routes'

describe('crew map route aliases', () => {
  it.each(['/active-crews', '/active-crews/'])('keeps the canonical crew map route %s', (path) => {
    expect(canonicalizeMapLayoutPath(path)).toBe('/active-crews')
    expect(isMapLayoutRoute(path)).toBe(true)
  })

  it.each(['/crews', '/crews/'])('uses map layout semantics for the alias %s', (path) => {
    expect(canonicalizeMapLayoutPath(path)).toBe('/active-crews')
    expect(isMapLayoutRoute(path)).toBe(true)
  })

  it('does not treat similarly named non-map paths as map routes', () => {
    expect(isMapLayoutRoute('/crew-projects')).toBe(false)
    expect(isMapLayoutRoute('/crews-projects')).toBe(false)
  })
})
