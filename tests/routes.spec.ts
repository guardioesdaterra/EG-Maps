import { test, expect, type Page } from '@playwright/test'

const BASE_URL = 'https://guardioesdaterra.github.io'
const BASE_PATH = '/EG-Maps'

function url(path: string): string {
  return `${BASE_URL}${BASE_PATH}${path}`
}

function route(path: string): string {
  return `${BASE_PATH}${path}`
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
    '/noise.png',
    '/white-banner.png',
    '/grid-overlay.png',
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
    { path: '/data/species/icmbio-brazil.json', checkKeys: true },
    { path: '/data/species/iucn.json', checkKeys: true },
    { path: '/data/species/species-icon-mapping.json', checkKeys: false },
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
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    const icons = page.locator('iconify-icon')
    await expect(icons.first()).toBeVisible()
    const iconCount = await icons.count()
    expect(iconCount).toBeGreaterThan(0)
  })

  test('project grants page renders map container', async ({ page }) => {
    await loadPage(page, '/project-grants')
    await page.waitForTimeout(3000)
    const mapCanvas = page.locator('canvas').first()
    await expect(mapCanvas).toBeVisible({ timeout: 15000 })
  })

  test('endangered species page loads without crash', async ({ page }) => {
    test.setTimeout(45000)
    const resp = await page.goto(route('/endangered-species'), { waitUntil: 'domcontentloaded', timeout: 30000 })
    expect(resp?.status()).toBe(200)
    await page.waitForTimeout(2000)
    const content = await page.content()
    expect(content).toContain('Endangered')
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
  test('navigates between main pages', async ({ page }) => {
    await loadPage(page, '/')
    const nav = page.locator('nav')
    const links = nav.locator('a')
    const hrefs = await links.evaluateAll(list => list.map(l => (l as HTMLAnchorElement).href))

    for (const href of hrefs) {
      if (!href || href.includes('#') || href.startsWith('mailto:')) continue
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
    const toggleBtn = page.locator('header button').first()
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
      if (path === '/endangered-species') {
        await page.goto(route(path), { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(5000)
      } else {
        await loadPage(page, path)
        await page.waitForTimeout(3000)
      }

      const irrelevant = [
        'favicon.ico',
        'message port closed',
        'Failed to initialize WebGL',
        'Failed to initialize map',
        'Failed to load species data',
        'Style is not done loading',
        '_payload.json',
      ]
      const filtered = errors.filter(e => !irrelevant.some(i => e.includes(i)))
      expect(filtered).toHaveLength(0)
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
