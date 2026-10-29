/**
 * Helpers for map routes that share the global map layout.
 * Nuxt's route.path is already relative to app.baseURL, so these helpers must
 * never add or strip a deployment prefix such as `/EG-Maps/`.
 */
const MAP_ROUTE_ROOTS = [
  '/project-grants',
  '/endangered-species',
  '/vulcan-observatory',
  '/active-crews',
] as const

function normalizeRoutePath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

/** Treat the public `/crews/` alias as the canonical 2D crew-map path. */
export function canonicalizeMapLayoutPath(path: string): string {
  const normalized = normalizeRoutePath(path)
  return normalized === '/crews' ? '/active-crews' : normalized
}

/** True only for a map route or one of its nested view paths. */
export function isMapLayoutRoute(path: string): boolean {
  const normalized = canonicalizeMapLayoutPath(path)
  return MAP_ROUTE_ROOTS.some(root => normalized === root || normalized.startsWith(`${root}/`))
}
