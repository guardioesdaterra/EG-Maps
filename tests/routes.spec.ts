/**
 * tests/routes.spec.ts
 * @why E2E route rendering tests — verifies all prerendered routes load without errors
 * @deps @playwright/test (test, expect, type Page)
 */
import { test, expect, type Page } from '@playwright/test'

function url(path: string): string {
  return path.replace(/^\/+/, '') || './'
}

function route(path: string): string {
  return path.replace(/^\/+/, '') || './'
}

async function loadPage(page: Page, path: string, waitForIdle = true) {
  await page.goto(route(path), { waitUntil: 'domcontentloaded', timeout: 30000 })
  if (waitForIdle) {
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1500)
  }
}

async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`)
  })
  return errors
}

test.describe('Route availability', () => {
  const routes = [
    { path: '/', title: /Earth Guardians/ },
    { path: '/info', title: /Info|Feedback/ },
    { path: '/project-grants', title: /Project Grants/ },
    { path: '/project-grants/3d', title: /Project Grants|3D/ },
    { path: '/endangered-species', title: /Endangered Species/ },
    { path: '/endangered-species/3d', title: /Endangered Species|3D/ },
    { path: '/active-crews', title: /Crews Map/ },
    { path: '/crews/', title: /Crews Map/ },
    { path: '/active-crews/3d', title: /Crews Map|3D/ },
    { path: '/crew-projects', title: /Earth Guardians/ },
    { path: '/vulcan-observatory', title: /Earth Guardians/ },
    { path: '/vulcan-observatory/3d', title: /Earth Guardians/ },
    { path: '/globe', title: /Project Grants|3D/ },
  ]

  for (const { path, title } of routes) {
    test(`${path} returns 200 and has title`, async ({ page }) => {
      const resp = await page.goto(route(path), { waitUntil: 'domcontentloaded', timeout: 30000 })
      expect(resp?.status()).toBe(200)
      await expect(page).toHaveTitle(title)
    })
  }
})

test.describe('Static asset availability', () => {
  const assets = [
    '/eg-logo.png',
    '/icon-192x140.png',
    '/white-banner.png',
    '/grid-overlay.png',
    '/grid-overlay.webp',
    '/marker-icon.png',
    '/marker-icon-2x.png',
    '/marker-shadow.png',
    '/placeholder.svg',
    '/placeholder-logo.svg',
    '/manifest.json',
    '/scanline.gif',
  ]

  for (const asset of assets) {
    test(`${asset} returns 200`, async ({ request }) => {
      const resp = await request.get(url(asset))
      expect(resp.ok()).toBeTruthy()
    })
  }
})

test.describe('Locale file availability and validity', () => {
  const locales = ['en', 'es', 'fr', 'pt', 'ja', 'zh', 'hi', 'ar']

  for (const locale of locales) {
    test(`${locale}.json returns 200 and valid JSON`, async ({ request }) => {
      const resp = await request.get(url(`/locales/${locale}.json`))
      expect(resp.ok()).toBeTruthy()
      const body = await resp.json()
      expect(body).toBeTruthy()
      expect(typeof body).toBe('object')
    })
  }
})

test.describe('Species data files', () => {
  const datasets = [
    { path: '/data/species/index.json', checkKeys: false },
    { path: '/data/species/icmbio-brazil-index.json', checkKeys: true },
    { path: '/data/species/iucn-index.json', checkKeys: true },
    { path: '/data/species/species-icon-mapping.json', checkKeys: false },
    { path: '/data/species/regions/manifest.json', checkKeys: false },
  ]

  for (const { path, checkKeys } of datasets) {
    test(`${path} is valid JSON`, async ({ request }) => {
      const resp = await request.get(url(path))
      expect(resp.ok()).toBeTruthy()
      const body = await resp.json()
      expect(body).toBeTruthy()

      if (checkKeys) {
        expect(Array.isArray(body)).toBeTruthy()
        expect(body.length).toBeGreaterThan(0)
        expect(body[0]).toHaveProperty('id')
        expect(body[0]).toHaveProperty('commonName')
        expect(body[0]).toHaveProperty('scientificName')
        expect(body[0]).toHaveProperty('lat')
        expect(body[0]).toHaveProperty('lng')
      }
    })
  }
})

test.describe('Species image files', () => {
  const images = [
    '/images/species/Hawksbill_sea_turtle.jpg',
    '/images/species/Rafflesia_arnoldii.jpg',
    '/images/species/Vaquita6_Olson_NOAA.jpg',
    '/images/species/Whale_shark_Georgia_Aquarium.jpg',
  ]

  for (const img of images) {
    test(`species image ${img.split('/').pop()} returns 200`, async ({ request }) => {
      const resp = await request.get(url(img))
      expect(resp.ok()).toBeTruthy()
    })
  }
})

test.describe('Page content rendering', () => {
  test('home page renders navigation and icons', async ({ page }) => {
    await loadPage(page, '/')
    const nav = page.getByRole('navigation', { name: 'Primary navigation' })
    await expect(nav).toBeVisible()
    const icons = page.locator('iconify-icon')
    await expect(icons.first()).toBeVisible()
    const iconCount = await icons.count()
    expect(iconCount).toBeGreaterThan(0)
  })

  test('project grants page renders map container', async ({ page }) => {
    await loadPage(page, '/project-grants')
    const map = page.getByRole('region', { name: '2D Map', exact: true })
    await expect(map).toBeVisible()
    const mapCanvas = map.locator('canvas.maplibregl-canvas')
    await expect(mapCanvas).toBeVisible({ timeout: 15000 })
    const dimensions = await mapCanvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement
      const bounds = canvas.getBoundingClientRect()
      return { width: canvas.width, height: canvas.height, displayWidth: bounds.width, displayHeight: bounds.height }
    })
    expect(dimensions.width).toBeGreaterThan(0)
    expect(dimensions.height).toBeGreaterThan(0)
    expect(dimensions.displayWidth).toBeGreaterThan(100)
    expect(dimensions.displayHeight).toBeGreaterThan(100)
  })

  test('endangered species page loads without crash', async ({ page }) => {
    const resp = await page.goto(route('/endangered-species'), { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    const html = await page.evaluate(() => document.documentElement.innerHTML.substring(0, 10000))
    expect(html).toContain('Endangered')
  })

  test('info page renders tab buttons', async ({ page }) => {
    await loadPage(page, '/info')
    const tabBtns = page.locator('button[aria-pressed]')
    await expect(tabBtns.first()).toBeVisible()
    const count = await tabBtns.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })
})

test.describe('Navigation', () => {
  test('homepage exposes Crew Projects and 2D/3D routes for key maps', async ({ page }) => {
    await loadPage(page, '/')

    const speciesStat = page.locator('.bento-stat').filter({ hasText: 'Species Documented' })
    await expect(speciesStat).toContainText('4815', { timeout: 15_000 })

    const heroSpeciesLink = page.locator('.home-hero').getByRole('link', { name: 'Endangered Species', exact: true })
    await expect(heroSpeciesLink).toBeVisible()
    await expect(heroSpeciesLink).toHaveAttribute('href', '/endangered-species')
    await expect(page.locator('.home-hero')).toContainText('Explore the range of Crew-led work, from ecosystem restoration and regenerative agriculture to climate education, artivism and community resilience.')

    const links = [
      ['home-crew-projects-link', '/crew-projects'],
      ['home-project-grants-2d', '/project-grants'],
      ['home-project-grants-3d', '/project-grants/3d'],
      ['home-species-2d', '/endangered-species'],
      ['home-species-3d', '/endangered-species/3d'],
      ['home-active-crews-2d', '/active-crews'],
      ['home-active-crews-3d', '/active-crews/3d'],
      ['home-vulcan-2d', '/vulcan-observatory'],
      ['home-vulcan-3d', '/vulcan-observatory/3d'],
    ] as const

    for (const [testId, href] of links) {
      const link = page.getByTestId(testId)
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', href)
    }
  })

  test('navigates between main pages', async ({ page }) => {
    await loadPage(page, '/')
    const nav = page.getByRole('navigation', { name: 'Primary navigation' })
    const links = nav.locator('a')
    const hrefs = await links.evaluateAll(list => list.map(l => (l as HTMLAnchorElement).href))
    const origin = new URL(page.url()).origin

    for (const href of hrefs) {
      if (!href || href.includes('#') || href.startsWith('mailto:') || new URL(href).origin !== origin) continue
      const resp = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30000 })
      expect(resp?.status()).toBe(200)
      await page.waitForTimeout(500)
    }
  })

  test('globe page redirects to project-grants/3d', async ({ page }) => {
    await page.goto(route('/globe'), { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForURL(/\/project-grants\/3d/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/project-grants\/3d/)
  })
})

test.describe('Dark mode toggle', () => {
  test('toggles dark mode and persists across pages', async ({ page }) => {
    await page.goto(route('/info'), { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const toggleBtn = page.getByRole('button', { name: /mode/i })
    await expect(toggleBtn).toBeVisible({ timeout: 5000 })

    const isDarkInitially = await page.locator('html').evaluate(el => el.classList.contains('dark'))
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const isDarkAfter = await page.locator('html').evaluate(el => el.classList.contains('dark'))
    expect(isDarkAfter).toBe(!isDarkInitially)

    await page.goto(route('/info'), { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const isDarkPersisted = await page.locator('html').evaluate(el => el.classList.contains('dark'))
    expect(isDarkPersisted).toBe(!isDarkInitially)
  })
})

test.describe('Console errors', () => {
  for (const path of ['/', '/info', '/project-grants', '/endangered-species']) {
    test(`no app-level console errors on ${path}`, async ({ page }) => {
      const errors = await collectConsoleErrors(page)
      const failedResponses: string[] = []
      page.on('response', response => {
        if (response.status() >= 400) failedResponses.push(`${response.status()}: ${response.url()}`)
      })
      if (path === '/endangered-species') {
        await page.goto(route(path), { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(5000)
      } else {
        await loadPage(page, path)
        await page.waitForTimeout(3000)
      }

      const irrelevant = ['favicon.ico', 'message port closed']
      const filtered = errors.filter(e => !irrelevant.some(i => e.includes(i)))
      // The no-key fallback style references this optional demo font, which
      // returns 404 outside the app; keep every app-local and other HTTP error blocking.
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

test.describe('404 handling', () => {
  test('returns 404 for unknown routes', async ({ page }) => {
    const resp = await page.goto(route('/this-does-not-exist'), { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(404)
  })
})

test.describe('i18n locale key coverage', () => {
  test('all locales have at least the same top-level keys as en.json', async ({ request }) => {
    const enResp = await request.get(url('/locales/en.json'))
    const enKeys = Object.keys(await enResp.json())

    const locales = ['es', 'fr', 'pt', 'ja', 'zh', 'hi', 'ar']
    for (const locale of locales) {
      const resp = await request.get(url(`/locales/${locale}.json`))
      expect(resp.ok()).toBeTruthy()
      const data = await resp.json()
      for (const key of enKeys) {
        expect(data).toHaveProperty(key)
      }
    }
  })
})

test.describe('MapLibre CSS is loaded', () => {
  test('maplibre-gl CSS is present in page CSS', async ({ page }) => {
    await loadPage(page, '/project-grants')
    const hasMapLibreCSS = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          if (sheet.cssRules) {
            for (const rule of sheet.cssRules) {
              if ((rule as CSSStyleRule).selectorText?.includes('maplibregl')) return true
            }
          }
        } catch { /* cross-origin */ }
      }
      return false
    })
    expect(hasMapLibreCSS).toBeTruthy()
  })
})
