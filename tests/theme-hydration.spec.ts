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
