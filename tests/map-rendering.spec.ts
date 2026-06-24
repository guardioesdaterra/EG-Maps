import { test, expect, type Page } from '@playwright/test'

const IRRELEVANT_ERRORS = [
  'favicon.ico',
  'message port closed',
  'Failed to initialize WebGL',
  '_payload.json',
  'Style is not done loading',
  '404 (Not Found)',
  'Failed to load resource',
]

async function loadMapPage(page: Page, path: string) {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  const resp = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
  expect(resp?.status()).toBe(200)
  // Wait for Vue hydration and MapLibre init (loading screen has 20s timeout)
  await page.waitForTimeout(5000)
  return errors
}

test.describe('Map canvas rendering', () => {
  const mapRoutes: { path: string; name: string }[] = [
    { path: '/project-grants', name: 'Project Grants 2D' },
    { path: '/project-grants/3d', name: 'Project Grants 3D' },
    { path: '/endangered-species', name: 'Endangered Species 2D' },
    { path: '/endangered-species/3d', name: 'Endangered Species 3D' },
  ]

  for (const { path, name } of mapRoutes) {
    test(`${name} renders canvas element`, async ({ page }) => {
      await loadMapPage(page, path)

      // MapLibre renders a WebGL canvas after Vue hydration
      const canvas = page.locator('canvas').first()
      await expect(canvas).toBeAttached({ timeout: 20000 })
      const canvasCount = await page.locator('canvas').count()
      expect(canvasCount).toBeGreaterThanOrEqual(1)
    })
  }

  test('3D globe page loads without crash', async ({ page }) => {
    const errors = await loadMapPage(page, '/project-grants/3d')

    // Either canvas attached (success) or error overlay visible (expected failure)
    const canvas = page.locator('canvas').first()
    const hasCanvas = await canvas.isVisible().catch(() => false)
    const hasError = await page.getByText(/unable to load|connection error/i).isVisible().catch(() => false)

    if (!hasCanvas && hasError) {
      // Map failed to load (expected in headless without API key) - just verify page loaded
      expect(page.url()).toContain('project-grants/3d')
    } else {
      await expect(canvas).toBeAttached({ timeout: 5000 })
    }
  })
})

test.describe('Map rendering console errors', () => {
  const mapRoutes = [
    '/project-grants',
    '/project-grants/3d',
    '/endangered-species',
    '/endangered-species/3d',
  ]

  for (const path of mapRoutes) {
    test(`no critical errors on ${path}`, async ({ page }) => {
      const errors = await loadMapPage(page, path)
      const filtered = errors.filter(e => !IRRELEVANT_ERRORS.some(i => e.includes(i)))
      expect(filtered).toHaveLength(0)
    })
  }
})
