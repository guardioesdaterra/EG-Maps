import { test, expect, type Page } from '@playwright/test'

async function loadPage(page: Page) {
  const response = await page.goto('/eg-grants', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  expect(response?.status()).toBe(200)
}

test.describe('EG Grants access gate', () => {
  test('loads the grants portal route', async ({ page }) => {
    await loadPage(page)
    await expect(page).toHaveTitle(/EG Grants|Earth Guardians/)
    await expect(page.locator('#main-content.grants-portal')).toBeAttached()
  })

  test('keeps privileged dashboard and globe hidden until access is granted', async ({ page }) => {
    await loadPage(page)
    await expect(page.locator('#main-content .eg-gate')).toBeVisible()
    await expect(page.locator('#grants-portal')).toHaveCount(0)
    await expect(page.locator('#ui-overlay')).toHaveCount(0)
    await expect(page.locator('canvas.cursor-grab')).toHaveCount(0)
  })

  test('provides privacy and terms links when the sign-in prompt is available', async ({ page }) => {
    await loadPage(page)
    const gate = page.locator('#main-content .eg-gate')
    await expect(gate).toBeVisible()

    const privacyLink = gate.getByRole('link', { name: 'Privacy' })
    const termsLink = gate.getByRole('link', { name: 'Terms' })
    if (await privacyLink.count()) {
      await expect(privacyLink).toHaveAttribute('href', '/privacy')
      await expect(termsLink).toHaveAttribute('href', '/terms')
    }
  })

  test('scrolling the access gate produces no uncaught runtime errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await loadPage(page)

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.evaluate(height => window.scrollTo(0, height), scrollHeight)
    await page.waitForTimeout(250)
    expect(errors).toEqual([])
  })
})
