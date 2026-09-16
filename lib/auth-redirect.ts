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
