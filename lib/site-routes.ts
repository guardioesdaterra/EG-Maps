/**
 * lib/site-routes.ts
 * @why Single source of truth for the site's canonical URL set — shared by
 *      the Nuxt prerender list (`nuxt.config.ts`) and the auto-generated
 *      `sitemap.xml` Nitro route (`server/routes/sitemap.xml.ts`), so the
 *      sitemap can never drift out of sync with what CI actually builds.
 * @functions buildSitemapXml
 * @consts SITE_ORIGIN, SITE_BASE_PATH, SITE_URL, PRERENDER_ROUTES, SITEMAP_ENTRIES
 * @types SitemapEntry
 * @connections nuxt.config.ts, server/routes/sitemap.xml.ts
 */

/** Production origin (GitHub Pages). */
export const SITE_ORIGIN = 'https://guardioesdaterra.github.io'

/** Production subpath (matches `NUXT_APP_BASE_URL: /EG-Maps/` in CI). */
export const SITE_BASE_PATH = '/EG-Maps/'

/** Canonical site root, trailing slash included. */
export const SITE_URL = `${SITE_ORIGIN}${SITE_BASE_PATH}`

export interface SitemapEntry {
  /** Root-relative page path, e.g. `/vulcan-observatory`. */
  path: string
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  /** 0.0 – 1.0 sitemap priority. */
  priority: number
}

/**
 * Every route `nuxt generate` prerenders (mirrors `nitro.prerender.routes`).
 * Non-content entries (redirects, embeds, auth callbacks) are excluded from
 * the sitemap via `SITEMAP_ENTRIES` below, not by editing this list.
 */
export const PRERENDER_ROUTES: string[] = [
  '/',
  '/globe',
  '/info',
  '/privacy',
  '/terms',
  '/project-grants',
  '/project-grants/3d',
  '/endangered-species',
  '/endangered-species/3d',
  '/active-crews',
  '/active-crews/3d',
  '/vulcan-observatory',
  '/vulcan-observatory/3d',
  '/eg-grants',
  '/eg-grants/fullscreen',
  '/auth/callback',
  '/iframe',
  '/iframe/squarespace',
  '/campaigns',
  '/crew-projects',
  '/masterclasses',
]

/** Crawlable content pages only — no redirects, embeds, or auth callbacks. */
export const SITEMAP_ENTRIES: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/info', changefreq: 'monthly', priority: 0.6 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { path: '/terms', changefreq: 'yearly', priority: 0.3 },
  { path: '/project-grants', changefreq: 'weekly', priority: 0.9 },
  { path: '/project-grants/3d', changefreq: 'weekly', priority: 0.7 },
  { path: '/endangered-species', changefreq: 'weekly', priority: 0.9 },
  { path: '/endangered-species/3d', changefreq: 'weekly', priority: 0.7 },
  { path: '/active-crews', changefreq: 'weekly', priority: 0.9 },
  { path: '/active-crews/3d', changefreq: 'weekly', priority: 0.7 },
  { path: '/vulcan-observatory', changefreq: 'daily', priority: 0.9 },
  { path: '/vulcan-observatory/3d', changefreq: 'daily', priority: 0.7 },
  { path: '/eg-grants', changefreq: 'daily', priority: 0.8 },
  { path: '/eg-grants/fullscreen', changefreq: 'weekly', priority: 0.5 },
  { path: '/campaigns', changefreq: 'weekly', priority: 0.6 },
  { path: '/crew-projects', changefreq: 'weekly', priority: 0.6 },
  { path: '/masterclasses', changefreq: 'weekly', priority: 0.6 },
]

function toAbsolute(path: string): string {
  return `${SITE_URL}${path.replace(/^\//, '')}`
}

/**
 * Build the `sitemap.xml` document. `lastmod` defaults to today (UTC) so
 * every CI build stamps a fresh date without code changes.
 */
export function buildSitemapXml(
  entries: SitemapEntry[] = SITEMAP_ENTRIES,
  lastmod: string = new Date().toISOString().slice(0, 10),
): string {
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${toAbsolute(e.path)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority.toFixed(1)}</priority>\n  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
