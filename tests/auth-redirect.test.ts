/**
 * tests/auth-redirect.test.ts
 * @why Unit tests for the OAuth callback helpers — return-path validation,
 *  base-path stripping for subpath deploys, bounded async waits, and the
 *  iframe auto-sign-in flag (pure parts of the embedded-auth breakout flow)
 * @deps vitest (describe, it, expect); ../lib/auth-redirect (safeNext, stripBasePath, withTimeout, withAutoSignInFlag, takeAutoSignInFlag)
 */
import { describe, it, expect } from 'vitest'
import { buildAuthCallbackUrl, callbackPathForBase, mergeOAuthParams, safeNext, snapshotNavigationEntry, snapshotOAuthLanding, stripBasePath, summarizeAuthStorage, takeAutoPostbackFlag, takeAutoSignInFlag, withAutoPostbackFlag, withAutoSignInFlag, withTimeout } from '../lib/auth-redirect'

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

describe('snapshotNavigationEntry', () => {
  it('reports name, type, and whether the loaded URL carried ?code=', () => {
    expect(snapshotNavigationEntry({ name: 'https://x.test/EG-Maps/auth/callback/?next=%2Feg-grants&code=abc', type: 'navigate' }))
      .toEqual({ name: 'https://x.test/EG-Maps/auth/callback/?next=%2Feg-grants&code=abc', type: 'navigate', hasCode: true })
    expect(snapshotNavigationEntry({ name: 'https://x.test/EG-Maps/auth/callback/', type: 'reload' }).hasCode).toBe(false)
  })

  it('handles missing and malformed entries without throwing', () => {
    expect(snapshotNavigationEntry(null)).toEqual({ name: null, type: null, hasCode: false })
    expect(snapshotNavigationEntry({})).toEqual({ name: null, type: null, hasCode: false })
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

describe('withAutoSignInFlag', () => {
  it('appends login flag preserving path and query', () => {
    expect(withAutoSignInFlag('https://guardioesdaterra.github.io/EG-Maps/eg-grants?x=1', 'login'))
      .toBe('https://guardioesdaterra.github.io/EG-Maps/eg-grants?x=1&eg-signin=login')
  })

  it('overwrites an existing flag', () => {
    expect(withAutoSignInFlag('https://a.test/eg-grants?eg-signin=login', 'switch'))
      .toBe('https://a.test/eg-grants?eg-signin=switch')
  })

  it('returns null for malformed URLs', () => {
    expect(withAutoSignInFlag('not a url at all %%%', 'login')).toBeNull()
  })
})

describe('takeAutoSignInFlag', () => {
  it('strips the flag and reports login mode', () => {
    const { cleanHref, mode } = takeAutoSignInFlag('https://a.test/eg-grants?eg-signin=login&x=1')
    expect(mode).toBe('login')
    expect(cleanHref).toBe('https://a.test/eg-grants?x=1')
  })

  it('accepts legacy truthy values as login', () => {
    expect(takeAutoSignInFlag('https://a.test/eg-grants?eg-signin=1').mode).toBe('login')
  })

  it('reports switch mode', () => {
    const { cleanHref, mode } = takeAutoSignInFlag('https://a.test/eg-grants?eg-signin=switch')
    expect(mode).toBe('switch')
    expect(cleanHref).toBe('https://a.test/eg-grants')
  })

  it('returns null mode when flag absent', () => {
    const { cleanHref, mode } = takeAutoSignInFlag('https://a.test/eg-grants?x=1')
    expect(mode).toBeNull()
    expect(cleanHref).toBe('https://a.test/eg-grants?x=1')
  })

  it('ignores unknown flag values but still strips them', () => {
    const { cleanHref, mode } = takeAutoSignInFlag('https://a.test/eg-grants?eg-signin=yes-please')
    expect(mode).toBeNull()
    expect(cleanHref).toBe('https://a.test/eg-grants')
  })

  it('never throws on malformed input', () => {
    const { cleanHref, mode } = takeAutoSignInFlag('%%%')
    expect(mode).toBeNull()
    expect(cleanHref).toBe('%%%')
  })
})

describe('postback flag', () => {
  it('sets and reads the flag alongside the sign-in flag', () => {
    const flagged = withAutoPostbackFlag(withAutoSignInFlag('https://a.test/EG-Maps/eg-grants', 'login')!)
    expect(flagged).toBe('https://a.test/EG-Maps/eg-grants?eg-signin=login&eg-postback=1')
    const { cleanHref, postback } = takeAutoPostbackFlag(flagged!)
    expect(postback).toBe(true)
    expect(cleanHref).toBe('https://a.test/EG-Maps/eg-grants?eg-signin=login')
  })

  it('reports false when absent and never throws', () => {
    expect(takeAutoPostbackFlag('https://a.test/eg-grants').postback).toBe(false)
    expect(takeAutoPostbackFlag('%%%')).toEqual({ cleanHref: '%%%', postback: false })
    expect(withAutoPostbackFlag('%%%')).toBeNull()
  })
})
