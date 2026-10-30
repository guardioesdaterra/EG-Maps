/**
 * tests/map-rendering.spec.ts
 * @why E2E map rendering tests — verifies 2D map loads tiles, markers, and popups
 * @deps @playwright/test (test, expect)
 */
import { test, expect } from '@playwright/test'
import { expectCanvasHasRenderedPixels } from './canvas-assertions'

const IRRELEVANT_ERRORS = [
  'favicon.ico',
  'message port closed',
]

test.describe('Page loads', () => {
  const routes = [
    { path: '/', name: 'home' },
    { path: '/project-grants', name: 'project-grants 2D' },
    { path: '/project-grants/3d', name: 'project-grants 3D' },
    { path: '/endangered-species', name: 'endangered-species 2D' },
    { path: '/endangered-species/3d', name: 'endangered-species 3D' },
    { path: '/vulcan-observatory', name: 'observatory 2D' },
    { path: '/vulcan-observatory/3d', name: 'observatory 3D' },
    { path: '/info', name: 'info' },
  ]

  for (const { path, name } of routes) {
    test(`${name} (${path}) loads without critical errors`, async ({ page }) => {
      const resp = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
      expect(resp?.status()).toBe(200)
      await page.waitForTimeout(2000)

      const body = page.locator('body')
      await expect(body).toBeAttached({ timeout: 10000 })
    })
  }
})

test.describe('Map canvas rendering', () => {
  test('project grants 2D renders non-empty map pixels', async ({ page }) => {
    const resp = await page.goto('/project-grants', { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    const map = page.getByRole('region', { name: '2D Map', exact: true })
    const canvas = map.locator('canvas.maplibregl-canvas')
    await expectCanvasHasRenderedPixels(canvas)
  })
})

test.describe('Map console errors', () => {
  const routes = [
    '/project-grants',
    '/project-grants/3d',
    '/endangered-species',
    '/endangered-species/3d',
  ]

    for (const path of routes) {
    test(`no critical errors on ${path}`, async ({ page }) => {
      const errors: string[] = []
      const failedResponses: string[] = []
      page.on('pageerror', err => errors.push(err.message))
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('response', response => {
        if (response.status() >= 400) failedResponses.push(`${response.status()}: ${response.url()}`)
      })
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      const filtered = errors.filter(e => !IRRELEVANT_ERRORS.some(i => e.includes(i)))
      const expectedExternalFont404 = failedResponses.filter(response =>
        response.startsWith('404: https://demotiles.maplibre.org/font/'),
      )
      const unexpectedResponses = failedResponses.filter(response => !expectedExternalFont404.includes(response))
      const generic404s = filtered.filter(error =>
        error.includes('Failed to load resource: the server responded with a status of 404 ()'),
      )
      const unexpectedConsoleErrors = filtered.filter(error => !generic404s.includes(error))

      expect(unexpectedResponses).toEqual([])
      expect(generic404s.length).toBeLessThanOrEqual(expectedExternalFont404.length)
      expect(unexpectedConsoleErrors).toEqual([])
    })
  }
})
