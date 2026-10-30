import { expect, test } from '@playwright/test'

test('Squarespace launcher mounts a late home embed in nested mobile frames', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    class QuietIntersectionObserver {
      root = null
      rootMargin = '0px'
      thresholds = [0]
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] { return [] }
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: QuietIntersectionObserver,
    })
  })

  await page.route('**/__eg-squarespace-webview', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0">
  <iframe id="squarespace-frame" src="/__eg-squarespace-host" title="Squarespace host" style="display:block;width:100%;height:100vh;border:0"></iframe>
</body></html>`,
    })
  })

  await page.route('**/__eg-squarespace-host', async (route) => {
    const origin = new URL(route.request().url()).origin
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0">
  <script defer src="${origin}/squarespace-embed.js" data-origin="${origin}" data-path="/" data-label="EG-Maps home"></script>
  <script>
    window.setTimeout(function () {
      var container = document.createElement('div');
      container.id = 'late-home';
      container.setAttribute('data-eg-embed', 'active-crews');
      document.body.appendChild(container);
    }, 100);
  </script>
</body></html>`,
    })
  })

  await page.goto('/__eg-squarespace-webview')

  const host = page.frameLocator('#squarespace-frame')
  const embed = host.locator('#late-home')
  const iframe = embed.locator('iframe')
  const app = host.frameLocator('#late-home iframe')

  await expect(iframe).toHaveCount(1)
  await expect(iframe).toHaveAttribute('loading', 'eager')
  await expect(iframe).toHaveAttribute('scrolling', 'auto')
  await expect(embed).toHaveAttribute('data-eg-loaded', 'true')
  await expect(app.getByRole('heading', { name: /EG–Maps/ })).toBeVisible()
  await expect(app.locator('#home-story')).toBeVisible()
  const homeClasses = await app.locator('#main-content').getAttribute('class')
  expect(homeClasses).not.toContain('reveal-ready')

  await host.locator('body').evaluate((body) => {
    const mapContainer = document.createElement('div')
    mapContainer.id = 'map-defaults'
    mapContainer.hidden = true
    mapContainer.setAttribute('data-eg-embed', 'active-crews')
    mapContainer.setAttribute('data-path', '/active-crews')
    body.appendChild(mapContainer)
  })
  const mapEmbed = host.locator('#map-defaults')
  const mapIframe = mapEmbed.locator('iframe')
  await expect(mapIframe).toHaveAttribute('loading', 'lazy')
  await expect(mapIframe).toHaveAttribute('scrolling', 'no')
  await expect(mapIframe).toHaveAttribute('src', /\/active-crews\?embed=true&hideAll=true/)
  await mapEmbed.evaluate((element) => element.remove())

  const portraitBounds = await app.locator('.home-hero').evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height }
  })
  expect(portraitBounds.width).toBeGreaterThan(380)
  expect(portraitBounds.height).toBeGreaterThan(0)

  await page.setViewportSize({ width: 844, height: 390 })
  const landscapeBounds = await app.locator('.home-hero').evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height }
  })
  expect(landscapeBounds.width).toBeGreaterThan(800)
  expect(landscapeBounds.height).toBeGreaterThan(0)

  await app.locator('.home-footer').scrollIntoViewIfNeeded()
  const innerScrollY = await app.locator('body').evaluate(() => window.scrollY)
  expect(innerScrollY).toBeGreaterThan(0)

  await embed.evaluate((element) => {
    const replacement = document.createElement('div')
    replacement.id = 'late-home'
    replacement.setAttribute('data-eg-embed', 'active-crews')
    element.replaceWith(replacement)
  })

  await expect(host.locator('#late-home iframe')).toHaveCount(1)
  await expect(host.locator('#late-home')).toHaveAttribute('data-eg-loaded', 'true')
  await expect(host.locator('#late-home iframe')).toHaveAttribute('scrolling', 'auto')
})
