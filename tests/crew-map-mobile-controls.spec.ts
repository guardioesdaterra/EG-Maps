import { expect, test } from '@playwright/test'

test.use({
  viewport: { width: 430, height: 500 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'en-US',
  colorScheme: 'dark',
  acceptDownloads: true,
})

test('short mobile viewport keeps the stats panel clear of tappable export controls', async ({ page }) => {
  const response = await page.goto('/active-crews/', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)

  const mapRegion = page.locator('[role="region"][aria-busy]').filter({
    has: page.locator('canvas.maplibregl-canvas'),
  })
  await expect(mapRegion).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })

  const openStats = page.getByRole('button', { name: 'Crews Map', exact: true })
  await expect(openStats).toBeVisible()
  await openStats.click()

  const panel = page.getByRole('region', { name: 'Crews Map', exact: true })
  await expect(panel).toBeVisible()
  const panelBox = await panel.boundingBox()
  const exportMapButton = page.getByRole('button', { name: 'Export map image', exact: true })
  const exportDataButton = page.getByRole('button', { name: 'Export visible data as GeoJSON', exact: true })
  await expect(exportMapButton).toBeVisible()
  await expect(exportDataButton).toBeVisible()
  const exportMapBox = await exportMapButton.boundingBox()
  const exportDataBox = await exportDataButton.boundingBox()
  expect(panelBox).not.toBeNull()
  expect(exportMapBox).not.toBeNull()
  expect(exportDataBox).not.toBeNull()

  const panelBounds = panelBox!
  expect(panelBounds.x).toBeGreaterThanOrEqual(0)
  expect(panelBounds.y).toBeGreaterThanOrEqual(0)
  expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(430)
  expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(500)
  for (const exportBounds of [exportMapBox!, exportDataBox!]) {
    const overlapsExport = panelBounds.x < exportBounds.x + exportBounds.width
      && panelBounds.x + panelBounds.width > exportBounds.x
      && panelBounds.y < exportBounds.y + exportBounds.height
      && panelBounds.y + panelBounds.height > exportBounds.y
    expect(overlapsExport, 'the open stats panel must not cover either export control').toBe(false)
  }

  const panelScroll = await panel.evaluate(element => ({
    overflowY: getComputedStyle(element).overflowY,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  expect(panelScroll.overflowY).toBe('auto')
  if (panelScroll.scrollHeight > panelScroll.clientHeight) {
    const finalStatusFilter = panel.getByRole('button', { name: 'Inactive', exact: true })
    await finalStatusFilter.scrollIntoViewIfNeeded()
    const filterBox = await finalStatusFilter.boundingBox()
    expect(filterBox).not.toBeNull()
    expect(filterBox!.y).toBeGreaterThanOrEqual(panelBounds.y)
    expect(filterBox!.y + filterBox!.height).toBeLessThanOrEqual(panelBounds.y + panelBounds.height)
  }

  const exportCenterReceivesTap = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y)
    const button = document.querySelector<HTMLButtonElement>('[aria-label="Export visible data as GeoJSON"]')
    return Boolean(target && button && (target === button || button.contains(target)))
  }, {
    x: exportDataBox!.x + exportDataBox!.width / 2,
    y: exportDataBox!.y + exportDataBox!.height / 2,
  })
  expect(exportCenterReceivesTap).toBe(true)

  const downloadPromise = page.waitForEvent('download')
  await exportDataButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.geojson$/i)
})
