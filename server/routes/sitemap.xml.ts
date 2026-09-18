/**
 * server/routes/sitemap.xml.ts
 * @why Auto-generated sitemap — prerendered to a static `sitemap.xml` by
 *      `nuxt generate` in CI (see `nitro.prerender.routes`). URLs come from
 *      the shared `lib/site-routes` list so they always match the build.
 * @deps ~/lib/site-routes (buildSitemapXml)
 */
import { buildSitemapXml } from '~/lib/site-routes'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return buildSitemapXml()
})
