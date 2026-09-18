/**
 * tests/sitemap.test.ts
 * @why Unit tests for the auto-generated sitemap — the sitemap route set
 *      must stay in sync with the prerender list and contain only crawlable
 *      absolute production URLs.
 * @deps vitest (describe, it, expect); ../lib/site-routes
 */
import { describe, it, expect } from 'vitest'
import {
  PRERENDER_ROUTES,
  SITEMAP_ENTRIES,
  SITE_URL,
  buildSitemapXml,
} from '../lib/site-routes'

const NON_CONTENT_PATHS = ['/globe', '/auth/callback', '/iframe', '/iframe/squarespace']

describe('sitemap entries', () => {
  it('covers every prerendered content route', () => {
    const sitemapPaths = new Set(SITEMAP_ENTRIES.map((e) => e.path))
    for (const route of PRERENDER_ROUTES) {
      if (NON_CONTENT_PATHS.includes(route)) continue
      expect(sitemapPaths.has(route), `sitemap missing prerender route ${route}`).toBe(true)
    }
  })

  it('excludes redirects, embeds and auth callbacks', () => {
    const sitemapPaths = SITEMAP_ENTRIES.map((e) => e.path)
    for (const excluded of NON_CONTENT_PATHS) {
      expect(sitemapPaths).not.toContain(excluded)
    }
  })

  it('keeps priorities within the 0.0–1.0 range', () => {
    for (const e of SITEMAP_ENTRIES) {
      expect(e.priority).toBeGreaterThanOrEqual(0)
      expect(e.priority).toBeLessThanOrEqual(1)
    }
  })
})

describe('buildSitemapXml', () => {
  it('emits a well-formed sitemap with absolute production URLs', () => {
    const xml = buildSitemapXml(SITEMAP_ENTRIES, '2026-09-18')
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/)
    expect(xml.trimEnd()).toMatch(/<\/urlset>$/)
    expect(xml).toContain(`<loc>${SITE_URL}</loc>`)
    expect(xml).toContain(`<loc>${SITE_URL}vulcan-observatory</loc>`)
    expect(xml).toContain('<lastmod>2026-09-18</lastmod>')
    expect(xml).not.toContain('/auth/callback')
    expect(xml).not.toContain('/iframe')
    // XML parses without errors.
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.querySelectorAll('url')).toHaveLength(SITEMAP_ENTRIES.length)
  })
})
