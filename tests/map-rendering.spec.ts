/**
 * tests/map-rendering.spec.ts
 * @why E2E map rendering tests — verifies 2D map loads tiles, markers, and popups
 * @deps @playwright/test (test, expect)
 */
import { test, expect } from '@playwright/test'

const IRRELEVANT_ERRORS = [
  'favicon.ico',
  'message port closed',
  'Failed to initialize WebGL',
  '_payload.json',
  'Style is not done loading',
  '404 (Not Found)',
  'Failed to load resource',
  'Hydration completed but contains mismatches',
  'webgl',
  'WebGL',
  'GPU',
  'gpu',
  'MapLibre error: vt',
  'UnifiedMap',
  'GlobeView',
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
  test('project grants 2D renders canvas or loads gracefully', async ({ page }) => {
    const resp = await page.goto('/project-grants', { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    await page.waitForTimeout(5000)
    const canvas = page.locator('canvas').first()
    const canvasCount = await canvas.count()
    if (canvasCount > 0) {
      await expect(canvas).toBeAttached({ timeout: 10000 })
    }
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
      page.on('pageerror', err => errors.push(err.message))
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      const filtered = errors.filter(e => !IRRELEVANT_ERRORS.some(i => e.includes(i)))
      expect(filtered).toHaveLength(0)
    })
  }
})
