/**
 * tests/globe-panels.spec.ts
 * @why E2E globe panel tests — verifies 3D globe panel interactions and rendering
 * @deps @playwright/test (test, expect, type Page)
 */
import { test, expect, type Page } from '@playwright/test'

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
  'GlobeView',
  'Failed to load script',
  'net::ERR',
  'THREE',
  'gsap',
]

async function loadPage(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
}

test.describe('EG Grants page loads', () => {
  test('page returns 200 and has correct title', async ({ page }) => {
    const resp = await page.goto('/eg-grants', { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    await expect(page).toHaveTitle(/EG Grants|Earth Guardians/)
  })

  test('renders the grants portal container', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const portal = page.locator('.grants-portal')
    await expect(portal).toBeAttached({ timeout: 10000 })
  })

  test('renders the hero section', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const hero = page.locator('#hero')
    await expect(hero).toBeAttached({ timeout: 10000 })
  })

  test('renders the ui-overlay section', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const overlay = page.locator('#ui-overlay')
    await expect(overlay).toBeAttached({ timeout: 10000 })
  })
})

test.describe('GlobeView canvas', () => {
  test('canvas element is present in the DOM', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const canvas = page.locator('canvas')
    await expect(canvas.first()).toBeAttached({ timeout: 15000 })
  })

  test('canvas has fixed positioning style', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeAttached({ timeout: 15000 })
    const position = await canvas.evaluate(el => window.getComputedStyle(el).position)
    expect(position).toBe('fixed')
  })
})

test.describe('Scroll sections exist', () => {
  test('details section is present', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const details = page.locator('#details')
    await expect(details).toBeAttached({ timeout: 10000 })
  })

  test('join section is present', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const join = page.locator('#join')
    await expect(join).toBeAttached({ timeout: 10000 })
  })

  test('grants-portal section is present (triggers panel animation)', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const dashboard = page.locator('#grants-portal')
    await expect(dashboard).toBeAttached({ timeout: 10000 })
  })
})

test.describe('Scroll through page without crash', () => {
  test('scrolling through all sections does not produce critical errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await loadPage(page, '/eg-grants')

    const scrollHeight = await page.evaluate(() => document.body.scrollHeight)
    const steps = 8
    for (let i = 1; i <= steps; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), (scrollHeight * i) / steps)
      await page.waitForTimeout(500)
    }

    const filtered = errors.filter(e => !IRRELEVANT_ERRORS.some(i => e.includes(i)))
    expect(filtered).toHaveLength(0)
  })
})

test.describe('Interactive elements', () => {
  test('hero section has visible text content', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    const hero = page.locator('#hero')
    const text = await hero.textContent()
    expect(text).toBeTruthy()
    expect(text!.length).toBeGreaterThan(5)
  })

  test('dashboard section renders after scroll', async ({ page }) => {
    await loadPage(page, '/eg-grants')
    await page.evaluate(() => {
      const el = document.getElementById('grants-portal')
      if (el) el.scrollIntoView()
    })
    await page.waitForTimeout(1500)
    const dashboard = page.locator('#grants-portal')
    await expect(dashboard).toBeVisible({ timeout: 10000 })
  })
})
