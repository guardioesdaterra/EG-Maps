/**
 * tests/map-rendering.spec.ts
 * @why E2E map rendering tests — verifies 2D map loads tiles, markers, and popups
 * @deps @playwright/test (test, expect)
 */
import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectCanvasHasRenderedPixels } from './canvas-assertions'

const IRRELEVANT_ERRORS = [
  'favicon.ico',
  'message port closed',
]

test.describe('Page loads', () => {
  const routes = [
    { path: '/', name: 'home' },
    { path: '/project-grants', name: 'project-grants 2D' },
    { path: '/project-grants/3d', name: 'project-grants 3D' },
    { path: '/endangered-species', name: 'endangered-species 2D' },
    { path: '/endangered-species/3d', name: 'endangered-species 3D' },
    { path: '/vulcan-observatory', name: 'observatory 2D' },
    { path: '/vulcan-observatory/3d', name: 'observatory 3D' },
    { path: '/info', name: 'info' },
  ]

  for (const { path, name } of routes) {
    test(`${name} (${path}) loads without critical errors`, async ({ page }) => {
      const resp = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
      expect(resp?.status()).toBe(200)
      await page.waitForTimeout(2000)

      const body = page.locator('body')
      await expect(body).toBeAttached({ timeout: 10000 })
    })
  }
})

test.describe('Map canvas rendering', () => {
  test('project grants 2D renders non-empty map pixels', async ({ page }) => {
    const resp = await page.goto('/project-grants', { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    const map = page.getByRole('region', { name: '2D Map', exact: true })
    const canvas = map.locator('canvas.maplibregl-canvas')
    await expectCanvasHasRenderedPixels(canvas)
  })
})

test('standalone rare-earth map uses the shared provider and mobile detail popup', async ({ page }) => {
  const requestedUrls: string[] = []
  page.on('request', request => requestedUrls.push(request.url()))
  await page.setViewportSize({ width: 390, height: 844 })
  const publicRoot = resolve(process.cwd(), '.output/public')
  await page.route('**/EG-Maps/**', async route => {
    const url = new URL(route.request().url())
    const relativePath = decodeURIComponent(url.pathname.replace(/^\/EG-Maps\/?/, ''))
    const filePath = resolve(publicRoot, relativePath || 'index.html')
    if (!filePath.startsWith(`${publicRoot}/`)) {
      await route.fulfill({ status: 400, body: 'Invalid static asset path' })
      return
    }
    if (!existsSync(filePath)) {
      await route.fulfill({ status: 404, body: 'Static asset not found' })
      return
    }
    await route.fulfill({ path: filePath })
  })

  const response = await page.goto('/EG-Maps/data/rare-earth/rare_earth_map_v5.html', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  expect(response?.status()).toBe(200)
  await expect(page.locator('#map canvas.maplibregl-canvas')).toBeAttached({ timeout: 20000 })
  await page.waitForFunction(() => {
    try {
      return Boolean(eval('map')?.getLayer('u-direct_ree'))
    } catch {
      return false
    }
  }, null, { timeout: 30000 })

  expect(requestedUrls.some(url => url.includes('cartocdn.com'))).toBe(false)
  expect(requestedUrls.some(url => new URL(url).pathname === '/EG-Maps/')).toBe(true)
  const fallbackURL = requestedUrls.find(url => url.includes('land-110m.geojson'))
  const mapTilerURL = requestedUrls.find(url => url.includes('api.maptiler.com/maps/hybrid-v4/style.json'))
  expect(fallbackURL || mapTilerURL).toBeTruthy()
  if (fallbackURL) expect(new URL(fallbackURL).pathname).toBe('/EG-Maps/data/embed/land-110m.geojson')
  expect(requestedUrls.some(url => new URL(url).pathname === '/EG-Maps/data/rare-earth/points_full.geojson')).toBe(true)
  expect(requestedUrls.some(url => new URL(url).pathname === '/EG-Maps/data/rare-earth/polygons.geojson')).toBe(true)
  await expect(page.locator('#tWater')).toBeAttached()
  await expect(page.locator('#tMil')).toBeAttached()
  await expect(page.locator('.tab-btn[data-tab="env"]')).toBeAttached()
  await expect(page.locator('#loading')).toHaveClass(/hidden/)

  const analysisSheet = page.locator('#panelDanger')
  await expect(analysisSheet).toBeVisible()
  expect(await analysisSheet.evaluate(element => getComputedStyle(element).position)).toBe('fixed')
  const swipeSheet = async (distance: number) => {
    const header = page.locator('#panelDanger .panel-hdr')
    const bounds = await header.boundingBox()
    if (!bounds) throw new Error('Expected a visible mobile bottom-sheet handle')
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + distance, { steps: 6 })
    await page.mouse.up()
  }
  await swipeSheet(-120)
  await expect(analysisSheet).toHaveClass(/sheet-expanded/)
  await expect.poll(() => analysisSheet.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(800)
  await swipeSheet(120)
  await expect(analysisSheet).toBeHidden()

  const waterLayers = ['bf', 'af', 'wl', 'wlb']
  const militaryLayers = ['cf', 'ml', 'mlb']
  const readVisibility = (ids: string[]) => page.evaluate(layerIds => {
    const mapInstance = eval('map') as { getLayoutProperty: (layer: string, property: string) => unknown }
    return Object.fromEntries(layerIds.map(layer => [layer, mapInstance.getLayoutProperty(layer, 'visibility') ?? 'visible']))
  }, ids)
  expect(await page.evaluate(() => {
    const mapInstance = eval('map') as { getLayer: (layer: string) => unknown; getLayoutProperty: (layer: string, property: string) => unknown }
    return Object.fromEntries(['bf', 'af', 'cf', 'wl', 'ml', 'wlb', 'mlb'].map(layer => [layer, Boolean(mapInstance.getLayer(layer))]))
  })).toEqual({ bf: true, af: true, cf: true, wl: true, ml: true, wlb: true, mlb: true })
  await page.locator('#tWater').click()
  expect(await readVisibility([...waterLayers, ...militaryLayers])).toEqual({ bf: 'none', af: 'none', wl: 'none', wlb: 'none', cf: 'visible', ml: 'visible', mlb: 'visible' })
  await page.locator('#tMil').click()
  expect(await readVisibility([...waterLayers, ...militaryLayers])).toEqual({ bf: 'none', af: 'none', wl: 'none', wlb: 'none', cf: 'none', ml: 'none', mlb: 'none' })
  await page.locator('#tWater').click()
  expect(await readVisibility([...waterLayers, ...militaryLayers])).toEqual({ bf: 'visible', af: 'visible', wl: 'visible', wlb: 'visible', cf: 'none', ml: 'none', mlb: 'none' })
  await page.locator('#tMil').click()
  expect(await readVisibility([...waterLayers, ...militaryLayers])).toEqual({ bf: 'visible', af: 'visible', wl: 'visible', wlb: 'visible', cf: 'visible', ml: 'visible', mlb: 'visible' })

  await page.evaluate(() => {
    const mapInstance = eval('map') as { jumpTo: (options: { center: [number, number]; zoom: number }) => void }
    const firstClaim = (eval('allF') as Array<{ lo: number; la: number }>)[0]
    mapInstance.jumpTo({ center: [firstClaim.lo, firstClaim.la], zoom: 12 })
  })
  await page.waitForFunction(() => {
    const mapInstance = eval('map') as {
      queryRenderedFeatures: () => Array<{ layer: { id: string }; geometry: { type: string } }>
    }
    return mapInstance.queryRenderedFeatures().some(candidate =>
      candidate.layer.id.startsWith('u-') && candidate.geometry.type === 'Point',
    )
  }, null, { timeout: 20000 })

  const markerPoint = await page.evaluate(() => {
    const mapInstance = eval('map') as {
      queryRenderedFeatures: () => Array<{
        layer: { id: string }
        geometry: { type: string; coordinates: [number, number] }
      }>
      project: (coordinates: [number, number]) => { x: number; y: number }
    }
    const feature = mapInstance.queryRenderedFeatures().find(candidate =>
      candidate.layer.id.startsWith('u-') && candidate.geometry.type === 'Point',
    )
    if (!feature) return null
    const point = mapInstance.project(feature.geometry.coordinates)
    return { x: point.x, y: point.y }
  })
  expect(markerPoint).not.toBeNull()
  if (!markerPoint) throw new Error('Expected at least one visible rare-earth marker')
  await page.mouse.click(markerPoint.x, markerPoint.y)

  const popup = page.locator('.map-popup-mobile-fullscreen')
  await expect(popup).toBeVisible()
  expect(await popup.evaluate(element => element.parentElement === document.body)).toBe(true)
  expect(await popup.evaluate(element => getComputedStyle(element).position)).toBe('fixed')
  await expect(popup.getByText('Perigo: sem dado por processo')).toBeVisible()
  await expect(popup.getByText('Rede', { exact: true })).toHaveCount(0)
  await popup.locator('.maplibregl-popup-close-button').click()
  await expect(popup).toHaveCount(0)
})

test.describe('Map console errors', () => {
  const routes = [
    '/project-grants',
    '/project-grants/3d',
    '/endangered-species',
    '/endangered-species/3d',
  ]

    for (const path of routes) {
    test(`no critical errors on ${path}`, async ({ page }) => {
      const errors: string[] = []
      const failedResponses: string[] = []
      page.on('pageerror', err => errors.push(err.message))
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('response', response => {
        if (response.status() >= 400) failedResponses.push(`${response.status()}: ${response.url()}`)
      })
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      const filtered = errors.filter(e => !IRRELEVANT_ERRORS.some(i => e.includes(i)))
      const expectedExternalFont404 = failedResponses.filter(response =>
        response.startsWith('404: https://demotiles.maplibre.org/font/'),
      )
      const unexpectedResponses = failedResponses.filter(response => !expectedExternalFont404.includes(response))
      const generic404s = filtered.filter(error =>
        error.includes('Failed to load resource: the server responded with a status of 404 ()'),
      )
      const unexpectedConsoleErrors = filtered.filter(error => !generic404s.includes(error))

      expect(unexpectedResponses).toEqual([])
      expect(generic404s.length).toBeLessThanOrEqual(expectedExternalFont404.length)
      expect(unexpectedConsoleErrors).toEqual([])
    })
  }
})
