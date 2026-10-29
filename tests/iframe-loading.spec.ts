import { expect, test } from '@playwright/test'

test('iframe previews keep their placeholder visible until the document loads', async ({ page }) => {
  let releaseIframeResponse!: () => void
  const iframeResponseGate = new Promise<void>((resolve) => {
    releaseIframeResponse = resolve
  })

  await page.route('**/active-crews**', async (route) => {
    const url = new URL(route.request().url())
    if (
      url.pathname.replace(/\/$/, '') !== '/active-crews'
      || url.searchParams.get('hideAll') !== 'true'
      || url.searchParams.has('embed')
    ) {
      await route.continue()
      return
    }

    await iframeResponseGate
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><body>Preview ready</body></html>',
    })
  })

  try {
    await page.goto('/iframe', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '2D', exact: true }).click()

    const preview = page.locator('iframe[src$="/active-crews?hideAll=true"]')
    const previewContainer = preview.locator('xpath=..')

    await expect(preview).toBeVisible()
    await expect(previewContainer).toHaveAttribute('aria-busy', 'true')
    await expect(previewContainer.getByRole('status')).toContainText('Loading')

    releaseIframeResponse()

    await expect(previewContainer).toHaveAttribute('aria-busy', 'false')
    await expect(previewContainer.getByRole('status')).toHaveCount(0)
  } finally {
    releaseIframeResponse()
  }
})
