import { expect, test } from '@playwright/test'

const CREW_MAP_PATHS = ['/active-crews/', '/crews/'] as const

test('the crew route alias shares the canonical map layout and active navigation item', async ({ page }) => {
  for (const path of CREW_MAP_PATHS) {
    const relativePath = path.replace(/^\/+/, '')
    const response = await page.goto(relativePath, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    expect(response?.status()).toBe(200)

    const layout = page.locator('div.bg-transparent')
    await expect(layout).toHaveClass(/h-\[100svh\]/)
    const header = page.locator('header[data-map-popup-safe-area="top"]')
    await expect(header).toBeVisible()
    await expect(header.locator('.map-view-switcher')).toBeVisible()
    await expect(page.locator('[data-map-popup-safe-area="bottom"] .gooey-nav a[aria-current="page"]'))
      .toHaveAttribute('href', /\/active-crews\/?$/)
  }
})

for (const path of CREW_MAP_PATHS) {
  test(`embedded hideAll suppresses controls before mount on ${path}`, async ({ page }) => {
    const relativePath = path.replace(/^\/+/, '')
    await page.addInitScript(() => {
      const selectors = [
        '.map-tool-stack',
        '.data-bubble',
        'header[data-map-popup-safe-area="top"]',
        '[data-map-popup-safe-area="bottom"]',
      ]
      const mounted: string[] = []
      Object.defineProperty(window, '__egHideAllControlMounts', {
        configurable: false,
        value: mounted,
      })
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'crew-map-ready') {
          (window as unknown as { __egCrewMapReady: boolean }).__egCrewMapReady = true
        }
      })
      const inspect = (node: Node) => {
        if (!(node instanceof Element)) return
        for (const selector of selectors) {
          if (node.matches(selector) || node.querySelector(selector)) mounted.push(selector)
        }
      }
      new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) inspect(node)
        }
      }).observe(document, { childList: true, subtree: true })
    })

    const desktopToolbarResponse = page.waitForResponse(response =>
      response.url().endsWith('/data/crews-locations.json') && response.request().method() === 'GET',
    )
    const desktopToolbarUrl = `${relativePath}?hideAll=true&controls=true`
    const desktopResponse = await page.goto(desktopToolbarUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    expect(desktopResponse?.status()).toBe(200)
    expect((await desktopToolbarResponse).status()).toBe(200)
    await expect(page.locator('#main-content')).toBeAttached()
    await page.waitForFunction(() =>
      (window as unknown as { __egCrewMapReady?: boolean }).__egCrewMapReady === true,
      null,
      { timeout: 30_000 },
    )
    await expect(page.locator('.map-tool-stack')).toHaveCount(0)
    await expect(page.locator('.data-bubble')).toHaveCount(0)
    expect(await page.evaluate(() =>
      (window as unknown as { __egHideAllControlMounts: string[] }).__egHideAllControlMounts,
    )).toEqual([])
    const desktopCurrentUrl = new URL(page.url())
    expect(desktopCurrentUrl.searchParams.get('hideAll')).toBe('true')
    expect(desktopCurrentUrl.searchParams.get('controls')).toBe('true')

    const embedUrl = `${relativePath}?embed=true&hideAll=true&region=south-america&zoom=0.5`
    const embedDataResponse = page.waitForResponse(response =>
      response.url().endsWith('/data/crews-locations.json') && response.request().method() === 'GET',
    )
    const embedResponse = await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    expect(embedResponse?.status()).toBe(200)
    expect((await embedDataResponse).status()).toBe(200)

    await expect(page.locator('#main-content')).toBeAttached()
    await page.waitForFunction(() =>
      (window as unknown as { __egCrewMapReady?: boolean }).__egCrewMapReady === true,
      null,
      { timeout: 30_000 },
    )
    await expect(page.locator('.map-tool-stack')).toHaveCount(0)
    await expect(page.locator('.data-bubble')).toHaveCount(0)
    await expect(page.locator('header[data-map-popup-safe-area="top"]')).toHaveCount(0)
    await expect(page.locator('[data-map-popup-safe-area="bottom"]')).toHaveCount(0)
    expect(await page.evaluate(() =>
      (window as unknown as { __egHideAllControlMounts: string[] }).__egHideAllControlMounts,
    )).toEqual([])

    const currentUrl = new URL(page.url())
    expect(['active-crews/', 'crews/'].some(pathSuffix => currentUrl.pathname.endsWith(pathSuffix))).toBe(true)
    expect(currentUrl.searchParams.get('embed')).toBe('true')
    expect(currentUrl.searchParams.get('hideAll')).toBe('true')
    expect(currentUrl.searchParams.get('region')).toBe('south-america')
    expect(currentUrl.searchParams.get('zoom')).toBe('0.5')
  })
}
