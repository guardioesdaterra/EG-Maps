import { expect, test } from '@playwright/test'

test.describe('keyboard accessibility', () => {
  test('the skip link is first in the tab order and focuses the main content', async ({ page }) => {
    await page.goto('/')

    const skipLink = page.locator('a.skip-link')
    await page.keyboard.press('Tab')
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()

    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })

  test('mobile icon navigation has names and the language selector supports Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    const speciesCardLink = page.locator('a.bento-link[href="/endangered-species"]')
    await expect(speciesCardLink).toContainText('Endangered Species')
    await expect(page.getByRole('link', { name: 'Project Grants' })).toBeVisible()
    const languageButton = page.getByRole('button', { name: 'Language' })
    await expect(languageButton).toHaveAttribute('aria-expanded', 'false')

    await languageButton.click()
    await expect(languageButton).toHaveAttribute('aria-expanded', 'true')
    await languageButton.focus()
    await page.keyboard.press('Enter')
    await expect(languageButton).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Enter')
    await expect(languageButton).toHaveAttribute('aria-expanded', 'true')
    const firstLanguageOption = page.locator('#language-options').getByRole('button').first()
    await page.keyboard.press('Tab')
    await expect(firstLanguageOption).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(languageButton).toBeFocused()
    await expect(languageButton).toHaveAttribute('aria-expanded', 'false')
  })
})
