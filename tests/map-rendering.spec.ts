import { test, expect } from '@playwright/test'

const IRRELEVANT_ERRORS = [
  'favicon.ico',
  'message port closed',
  'Failed to initialize WebGL',
  '_payload.json',
  'Style is not done loading',
  '404 (Not Found)',
  'Failed to load resource',
]

test.describe('Map canvas rendering', () => {
  test('project grants 2D renders canvas after hydration', async ({ page }) => {
    const resp = await page.goto('/project-grants', { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    // Wait for loading overlay to disappear (map init clears isMounted)
    await page.waitForTimeout(3000)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeAttached({ timeout: 20000 })
  })

  test('project grants 3D renders canvas after hydration', async ({ page }) => {
    const resp = await page.goto('/project-grants/3d', { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    await page.waitForTimeout(3000)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeAttached({ timeout: 20000 })
  })

  test('endangered species 2D renders canvas after hydration', async ({ page }) => {
    const resp = await page.goto('/endangered-species', { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    await page.waitForTimeout(3000)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeAttached({ timeout: 20000 })
  })

  test('endangered species 3D renders canvas after hydration', async ({ page }) => {
    const resp = await page.goto('/endangered-species/3d', { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    await page.waitForTimeout(3000)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeAttached({ timeout: 20000 })
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
