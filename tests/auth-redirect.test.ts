/**
 * tests/auth-redirect.test.ts
 * @why Unit tests for the OAuth callback helpers — return-path validation,
 *  base-path stripping for subpath deploys, and bounded async waits
 * @deps vitest (describe, it, expect); ../lib/auth-redirect (safeNext, stripBasePath, withTimeout)
 */
import { describe, it, expect } from 'vitest'
import { buildAuthCallbackUrl, callbackPathForBase, mergeOAuthParams, safeNext, snapshotOAuthLanding, stripBasePath, summarizeAuthStorage, withTimeout } from '../lib/auth-redirect'

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

describe('callbackPathForBase', () => {
  it('always ends with a trailing slash to avoid directory-301 query loss', () => {
    expect(callbackPathForBase('/')).toBe('/auth/callback/')
    expect(callbackPathForBase('/EG-Maps/')).toBe('/EG-Maps/auth/callback/')
    expect(callbackPathForBase('/EG-Maps')).toBe('/EG-Maps/auth/callback/')
    expect(callbackPathForBase('/EG-Maps/test/')).toBe('/EG-Maps/test/auth/callback/')
  })
})

describe('buildAuthCallbackUrl', () => {
  it('builds the canonical redirectTo with encoded next', () => {
    expect(buildAuthCallbackUrl('https://guardioesdaterra.github.io', '/EG-Maps/', '/eg-grants'))
      .toBe('https://guardioesdaterra.github.io/EG-Maps/auth/callback/?next=%2Feg-grants')
    expect(buildAuthCallbackUrl('https://example.com/', '/', null))
      .toBe('https://example.com/auth/callback/')
  })
})

describe('mergeOAuthParams', () => {
  it('merges query and hash, query wins on collision', () => {
    const p = mergeOAuthParams('?code=abc&next=%2Feg-grants', '#access_token=tok&code=other')
    expect(p.get('code')).toBe('abc')
    expect(p.get('next')).toBe('/eg-grants')
    expect(p.get('access_token')).toBe('tok')
  })

  it('handles empty inputs', () => {
    expect(mergeOAuthParams('', '').toString()).toBe('')
  })
})

describe('snapshotOAuthLanding', () => {  it('captures code/next/error plus key names for diagnostics', () => {
    const s = snapshotOAuthLanding('?code=abc&next=%2Feg-grants', '')
    expect(s.code).toBe('abc')
    expect(s.next).toBe('/eg-grants')
    expect(s.oauthError).toBeNull()
    expect(s.queryKeys).toEqual(['code', 'next'])
    expect(s.hashKeys).toEqual([])
  })

  it('captures hash params and provider errors', () => {
    const s = snapshotOAuthLanding('', '#error=access_denied&error_description=denied')
    expect(s.code).toBeNull()
    expect(s.oauthError).toBe('denied')
    expect(s.hashKeys).toEqual(['error', 'error_description'])
  })
})

describe('summarizeAuthStorage', () => {
  it('does not mistake the verifier key for a session token', () => {
    expect(summarizeAuthStorage(['sb-ref-auth-token-code-verifier']))
      .toEqual({ verifier: 'present', token: 'absent' })
  })

  it('reports a real session token key', () => {
    expect(summarizeAuthStorage(['sb-ref-auth-token']))
      .toEqual({ verifier: 'missing', token: 'present' })
    expect(summarizeAuthStorage(['sb-ref-auth-token', 'sb-ref-auth-token-code-verifier']))
      .toEqual({ verifier: 'present', token: 'present' })
  })

  it('handles empty and unreadable storage', () => {
    expect(summarizeAuthStorage([])).toEqual({ verifier: 'missing', token: 'absent' })
    expect(summarizeAuthStorage(null)).toEqual({ verifier: 'unreadable', token: 'unreadable' })
  })
})
