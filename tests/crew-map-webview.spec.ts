/**
 * Android WebView smoke profile for the crew map.
 * This exercises the existing embed URL and data request without changing the
 * Squarespace host protocol or requiring native app tooling.
 */
import { expect, test } from '@playwright/test'

test.use({
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A.240205.004) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 wv',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})

test('Android WebView loads the embedded crew map and retains its host query contract', async ({ page }) => {
  const crewDataResponse = page.waitForResponse(response =>
    response.url().endsWith('/data/crews-locations.json') && response.request().method() === 'GET',
  )

  const response = await page.goto('/active-crews/?embed=true&hideAll=true', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  expect(response?.status()).toBe(200)

  const dataResponse = await crewDataResponse
  expect(dataResponse.status()).toBe(200)
  const collection = await dataResponse.json() as { features: Array<{ properties?: { status?: string } }> }
  const statuses = collection.features.reduce((counts, feature) => {
    const status = feature.properties?.status ?? 'unknown'
    counts[status] = (counts[status] ?? 0) + 1
    return counts
  }, {} as Record<string, number>)

  expect(statuses.active).toBeGreaterThan(0)
  expect(statuses.inactive).toBeGreaterThan(0)
  expect(statuses.active + statuses.inactive).toBe(collection.features.length)
  expect(await page.evaluate(() => navigator.userAgent)).toContain(' wv')
  await expect(page.locator('#main-content')).toBeAttached()

  const currentUrl = new URL(page.url())
  expect(currentUrl.pathname).toMatch(/^\/active-crews\/?$/)
  expect(currentUrl.searchParams.get('embed')).toBe('true')
  expect(currentUrl.searchParams.get('hideAll')).toBe('true')
})
