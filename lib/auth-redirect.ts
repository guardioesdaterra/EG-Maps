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
