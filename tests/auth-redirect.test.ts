/**
 * tests/auth-redirect.test.ts
 * @why Unit tests for the OAuth callback helpers — return-path validation,
 *  base-path stripping for subpath deploys, and bounded async waits
 * @deps vitest (describe, it, expect); ../lib/auth-redirect (safeNext, stripBasePath, withTimeout)
 */
import { describe, it, expect } from 'vitest'
import { safeNext, stripBasePath, withTimeout } from '../lib/auth-redirect'

describe('safeNext', () => {
  it('accepts internal paths with queries', () => {
    expect(safeNext('/eg-grants')).toBe('/eg-grants')
    expect(safeNext('/eg-grants?signup=1')).toBe('/eg-grants?signup=1')
  })

  it('accepts URL-encoded internal paths', () => {
    expect(safeNext('%2Feg-grants')).toBe('/eg-grants')
  })

  it('rejects null, empty, and external URLs (open-redirect protection)', () => {
    expect(safeNext(null)).toBeNull()
    expect(safeNext('')).toBeNull()
    expect(safeNext('https://evil.com/eg-grants')).toBeNull()
    expect(safeNext('//evil.com/eg-grants')).toBeNull()
    expect(safeNext('/\\evil.com')).toBeNull()
  })

  it('rejects malformed encodings', () => {
    expect(safeNext('%E0%A4%A')).toBeNull()
  })
})

describe('stripBasePath', () => {
  it('strips the GitHub Pages base prefix', () => {
    expect(stripBasePath('/EG-Maps/eg-grants', '/EG-Maps/')).toBe('/eg-grants')
    expect(stripBasePath('/EG-Maps/eg-grants', '/EG-Maps')).toBe('/eg-grants')
    expect(stripBasePath('/EG-Maps', '/EG-Maps/')).toBe('/')
  })

  it('leaves root-base and non-matching paths untouched', () => {
    expect(stripBasePath('/eg-grants', '/')).toBe('/eg-grants')
    expect(stripBasePath('/eg-grants', '')).toBe('/eg-grants')
    expect(stripBasePath('/other/page', '/EG-Maps/')).toBe('/other/page')
  })

  it('does not strip partial segment matches', () => {
    expect(stripBasePath('/EG-MapsExtra/page', '/EG-Maps/')).toBe('/EG-MapsExtra/page')
  })
})

describe('withTimeout', () => {
  it('resolves fast promises', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok')
  })

  it('rejects slow promises after the timeout', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('late'), 200))
    await expect(withTimeout(slow, 20, 'membership check')).rejects.toThrow('membership check timed out')
  })
})
