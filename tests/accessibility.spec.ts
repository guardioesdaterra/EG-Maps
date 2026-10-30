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

    const speciesMapLink = page.locator('.home-hero a[href="/endangered-species"]')
    await expect(speciesMapLink).toHaveAttribute('href', '/endangered-species')
    await expect(speciesMapLink).toHaveAccessibleName(/Endangered Species/)
    await expect(page.locator('.home-hero a[href="/project-grants"]')).toBeVisible()
    await expect(page.locator('.pathways-section')).toHaveCount(0)
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

  test('the bento hero stays outside scroll reveal while lower sections opt in', async ({ page }) => {
    await page.goto('/')

    const hero = page.locator('.home-hero')
    await expect(hero).toBeVisible()
    await expect(hero.locator('[data-reveal]')).toHaveCount(0)
    await expect(page.locator('#home-story')).toHaveAttribute('data-reveal', '')
    await expect(page.locator('.bento-card')).toHaveCount(5)
  })

  test('reduced motion leaves below-hero content visible without activating reveal', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const story = page.locator('#home-story')
    await expect(story).toBeVisible()
    await expect(story).toHaveCSS('opacity', '1')
    await expect(page.locator('#main-content')).not.toHaveClass(/reveal-ready/)
  })
})
