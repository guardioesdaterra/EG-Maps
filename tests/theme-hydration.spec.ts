import { expect, test } from '@playwright/test'

test('saved light theme is applied without Vue hydration mismatch warnings', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => localStorage.setItem('darkMode', 'false'))

  const hydrationMessages: string[] = []
  page.on('console', (message) => {
    if (
      (message.type() === 'warning' || message.type() === 'error') &&
      /hydration|hydrated|mismatch/i.test(message.text())
    ) {
      hydrationMessages.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    if (/hydration|hydrated|mismatch/i.test(error.message)) hydrationMessages.push(error.message)
  })

  const response = await page.goto('/project-grants', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('button', { name: 'Switch to Dark Mode' })).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('darkMode'))).toBe('false')
  expect(hydrationMessages).toEqual([])
})

test('theme toggle is available on routes without a shared page topbar', async ({ page }) => {
  await page.addInitScript(() => {
    if (window.top === window) localStorage.setItem('darkMode', 'false')
  })

  for (const route of ['/', '/info', '/privacy', '/terms', '/iframe', '/iframe/squarespace']) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response?.status(), `${route} should load`).toBe(200)

    const toggle = page.getByRole('button', { name: 'Switch to Dark Mode' }).first()
    await expect(toggle, `${route} should expose a theme switch`).toBeVisible()
    await toggle.click()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('darkMode'))).toBe('true')
  }
})
