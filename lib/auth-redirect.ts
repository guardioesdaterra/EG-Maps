/**
 * lib/auth-redirect.ts
 * @why Pure helpers for the OAuth callback flow — return-path validation,
 *  base-path stripping for subpath deploys, and bounded async waits so a slow
 *  edge function can never strand users on the callback page.
 */

/** Only allow internal return paths — prevents open-redirect abuse. */
export function safeNext(raw: string | null): string | null {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    // Backslashes are normalized to slashes by browsers (`/\evil.com` →
    // `//evil.com`), so reject them to close the protocol-relative bypass.
    if (decoded.includes('\\')) return null
    if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) return decoded
  } catch { /* malformed encoding — ignore */ }
  return null
}

/**
 * Strip the Nuxt baseURL prefix (e.g. `/EG-Maps`) from an absolute pathname so
 * the `next` return path stays app-relative on subpath deploys (GitHub Pages).
 */
export function stripBasePath(pathname: string, baseURL: string): string {
  const base = baseURL.endsWith('/') && baseURL.length > 1 ? baseURL.slice(0, -1) : baseURL
  if (!base || base === '/') return pathname
  if (pathname === base) return '/'
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || '/'
  return pathname
}

/**
 * Canonical OAuth callback path for subpath deploys. ALWAYS ends with `/`
 * because the prerendered page is served as `auth/callback/index.html` — a
 * bare `/auth/callback` triggers a directory 301 (`→ /auth/callback/`) on
 * GitHub Pages/CDN that can drop `?code&next` and break the PKCE exchange.
 */
export function callbackPathForBase(baseURL: string): string {
  if (!baseURL || baseURL === '/') return '/auth/callback/'
  const base = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
  return `${base}auth/callback/`
}

/** Build the Supabase `redirectTo` URL in canonical (trailing-slash) form. */
export function buildAuthCallbackUrl(origin: string, baseURL: string, next: string | null): string {
  const path = callbackPathForBase(baseURL)
  const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
  return cleanOrigin + path + (next ? `?next=${encodeURIComponent(next)}` : '')
}

export interface StorageSummary {
  verifier: 'present' | 'missing' | 'unreadable'
  token: 'present' | 'absent' | 'unreadable'
}

/**
 * Summarize Supabase auth storage from key NAMES only (never values).
 * The PKCE verifier key (`sb-<ref>-auth-token-code-verifier`) CONTAINS
 * `auth-token`, so it must be excluded from the session-token check —
 * otherwise a verifier alone falsely reports `token=present`.
 */
export function summarizeAuthStorage(keys: string[] | null): StorageSummary {
  if (!keys) return { verifier: 'unreadable', token: 'unreadable' }
  let verifier = false
  let token = false
  for (const k of keys) {
    if (k.endsWith('-code-verifier')) verifier = true
    else if (k.includes('auth-token')) token = true
  }
  return {
    verifier: verifier ? 'present' : 'missing',
    token: token ? 'present' : 'absent',
  }
}
function paramsFromString(raw: string): URLSearchParams {
  const stripped = raw.startsWith('?') || raw.startsWith('#') ? raw.slice(1) : raw
  try {
    return new URLSearchParams(stripped)
  } catch {
    return new URLSearchParams()
  }
}

/**
 * Merge query + hash-fragment params (implicit flow puts tokens in `#`).
 * Query wins on key collision; never throws.
 */
export function mergeOAuthParams(search: string, hash: string): URLSearchParams {
  const merged = paramsFromString(search)
  if (hash) {
    const h = paramsFromString(hash)
    h.forEach((v, k) => { if (!merged.has(k)) merged.set(k, v) })
  }
  return merged
}

export interface OAuthLanding {
  code: string | null
  next: string | null
  oauthError: string | null
  queryKeys: string[]
  hashKeys: string[]
}

/**
 * Snapshot the OAuth landing URL ONCE, synchronously, before the Supabase
 * client (detectSessionInUrl) can consume `?code` and clean the address bar.
 * Pure + testable: pass `window.location.search`/`.hash` (or route fallbacks).
 */
export function snapshotOAuthLanding(search: string, hash: string): OAuthLanding {
  const merged = mergeOAuthParams(search, hash)
  const queryKeys: string[] = []
  const hashKeys: string[] = []
  try { paramsFromString(search).forEach((_, k) => queryKeys.push(k)) } catch { /* ignore */ }
  try { if (hash) paramsFromString(hash).forEach((_, k) => hashKeys.push(k)) } catch { /* ignore */ }
  return {
    code: merged.get('code'),
    next: merged.get('next'),
    oauthError: merged.get('error_description') || merged.get('error'),
    queryKeys,
    hashKeys,
  }
}

export interface OAuthNavigation {
  /** Full URL the document actually loaded with (unaffected by replaceState). */
  name: string | null
  /** navigate | reload | back_forward | prerender */
  type: string | null
  /** Whether the loaded URL itself carried a Supabase ?code= (PKCE) param. */
  hasCode: boolean
}

/**
 * Read the PerformanceNavigationTiming entry synchronously. Its `name` is the
 * URL the document loaded with — immune to later history.replaceState calls
 * (gotrue cleanup, settleRedirect, SPA-redirect shims) — so it bypasses the
 * snapshot race entirely. Pure/testable via the injected entry.
 */
export function snapshotNavigationEntry(
  entry?: { name?: unknown; type?: unknown } | null,
): OAuthNavigation {
  try {
    const e = entry ?? (typeof performance !== 'undefined'
      ? performance.getEntriesByType('navigation')[0] as { name?: unknown; type?: unknown } | undefined
      : undefined) ?? null
    const name = typeof e?.name === 'string' ? e.name : null
    const type = typeof e?.type === 'string' ? e.type : null
    let hasCode = false
    if (name) {
      try {
        hasCode = new URL(name, 'http://localhost').searchParams.has('code')
      } catch { /* malformed — leave false */ }
    }
    return { name, type, hasCode }
  } catch {
    return { name: null, type: null, hasCode: false }
  }
}

/** Race a promise against a timeout so slow auth checks fail open (redirect anyway). */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

/**
 * Query param carrying the "start OAuth top-level" request when the grants
 * portal runs inside a third-party iframe (Google refuses to render its
 * login page in a frame — X-Frame-Options: DENY — so the iframe breaks out
 * to the top document and the top-level page restarts the flow there, where
 * the PKCE verifier shares a storage partition with the callback exchange).
 */
export const AUTO_SIGNIN_PARAM = 'eg-signin'

/** `login` = sign in if no session; `switch` = sign out first, then chooser. */
export type AutoSignInMode = 'login' | 'switch'

function parseAutoSignInMode(raw: string | null): AutoSignInMode | null {
  if (raw === 'login' || raw === '1' || raw === 'true') return 'login'
  if (raw === 'switch') return 'switch'
  return null
}

/**
 * Append (or overwrite) the auto-sign-in flag on an absolute URL. Pure.
 * Returns null when `href` is malformed so callers can fall back safely.
 */
export function withAutoSignInFlag(href: string, mode: AutoSignInMode): string | null {
  try {
    const u = new URL(href)
    u.searchParams.set(AUTO_SIGNIN_PARAM, mode)
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Strip the auto-sign-in flag from an absolute URL and report the requested
 * mode (null when absent/unknown). Pure + never throws: malformed input
 * returns the input unchanged with mode null.
 */
export function takeAutoSignInFlag(href: string): { cleanHref: string; mode: AutoSignInMode | null } {
  try {
    const u = new URL(href)
    const mode = u.searchParams.has(AUTO_SIGNIN_PARAM)
      ? parseAutoSignInMode(u.searchParams.get(AUTO_SIGNIN_PARAM))
      : null
    u.searchParams.delete(AUTO_SIGNIN_PARAM)
    return { cleanHref: u.toString(), mode }
  } catch {
    return { cleanHref: href, mode: null }
  }
}
