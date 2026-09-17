/**
 * tests/grants-regions.test.ts
 * @why Unit tests for the dashboard region filter mapping — ISO codes and
 *  legacy scraper buckets must resolve to the right continent, unknown scopes
 *  must fall back to global (never drop a grant).
 * @deps vitest (describe, it, expect); ../lib/grants-regions (grantContinentOf, GRANT_CONTINENTS)
 */
import { describe, it, expect } from 'vitest'
import { grantContinentOf, GRANT_CONTINENTS } from '../lib/grants-regions'

describe('grantContinentOf', () => {
  it('maps ISO codes to continents', () => {
    expect(grantContinentOf('UG')).toBe('africa')
    expect(grantContinentOf('ZA')).toBe('africa')
    expect(grantContinentOf('IN')).toBe('asia')
    expect(grantContinentOf('PH')).toBe('asia')
    expect(grantContinentOf('GB')).toBe('europe')
    expect(grantContinentOf('UK')).toBe('europe')
    expect(grantContinentOf('BR')).toBe('latin-america')
    expect(grantContinentOf('MX')).toBe('latin-america')
    expect(grantContinentOf('US')).toBe('north-america')
    expect(grantContinentOf('CA')).toBe('north-america')
    expect(grantContinentOf('AU')).toBe('oceania')
    expect(grantContinentOf('NZ')).toBe('oceania')
    expect(grantContinentOf('GLOBAL')).toBe('global')
  })

  it('is case-insensitive and trims', () => {
    expect(grantContinentOf(' ug ')).toBe('africa')
    expect(grantContinentOf('ca')).toBe('north-america')
  })

  it('falls back to the legacy region bucket', () => {
    expect(grantContinentOf('XX', 'AFRICA')).toBe('africa')
    expect(grantContinentOf('XX', 'LATAM')).toBe('latin-america')
    expect(grantContinentOf('XX', 'EU')).toBe('europe')
    expect(grantContinentOf(null, 'OCEANIA')).toBe('oceania')
    expect(grantContinentOf('', 'MENA')).toBe('mena')
  })

  it('country wins over the bucket', () => {
    expect(grantContinentOf('UG', 'GLOBAL')).toBe('africa')
  })

  it('unknown scopes fall back to global', () => {
    expect(grantContinentOf('')).toBe('global')
    expect(grantContinentOf(null)).toBe('global')
    expect(grantContinentOf('XX')).toBe('global')
    expect(grantContinentOf(undefined, undefined)).toBe('global')
  })

  it('exposes all filter continents', () => {
    const keys = GRANT_CONTINENTS.map((c) => c.key)
    expect(keys).toEqual([
      'africa',
      'asia',
      'europe',
      'latin-america',
      'north-america',
      'oceania',
      'mena',
      'global',
    ])
  })
})
