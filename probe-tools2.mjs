import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
const tileRequests = []
page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`))
page.on('requestfailed', r => {
  const url = r.url()
  if (/photon|nominatim/.test(url)) return
  errors.push(`[reqfail] ${url} :: ${r.failure()?.errorText}`)
})
page.on('response', r => {
  if (/arcgisonline|cartocdn|maptiler/.test(r.url())) tileRequests.push(`${r.status()} ${r.url().slice(0, 70)}`)
})

function log(...a) { console.log(...a) }

// 1. Hub
await page.goto('http://localhost:3000/tools', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
log('HUB URL:', page.url())
log('HUB H1:', await page.locator('h1').first().innerText())
log('READY CARDS:', await page.getByRole('button', { name: /^Open / }).count())
log('PLANNED CARDS (disabled):', await page.locator('.tools-hub__card--planned').evaluateAll(els => els.map(e => (e).disabled)))
await page.screenshot({ path: '/tmp/opencode/tools-hub-2.png' })

// 2. Navigate to garden
await page.getByRole('button', { name: /Open Agroecological Garden/ }).click()
await page.waitForURL(/\/tools\/agroecological-garden/, { timeout: 15000 })
await page.waitForTimeout(5000)
log('GARDEN URL:', page.url())
log('WIZARD VISIBLE:', await page.locator('.area-wizard').isVisible())
log('MAP CANVAS:', await page.locator('canvas.maplibregl-canvas').count())
log('TILE RESPONSES:', tileRequests.length, tileRequests.slice(0, 3))
await page.screenshot({ path: '/tmp/opencode/tools-garden-step1.png' })

// 3. Step 1 - set coordinates, expect reverse geocode attempt
const lat = page.locator('.area-wizard input[type=number]').first()
const lng = page.locator('.area-wizard input[type=number]').nth(1)
await lat.fill('-15.793889')
await lng.fill('-47.882778')
await page.waitForTimeout(600)
await page.getByRole('button', { name: /^Next/ }).click()
await page.waitForTimeout(800)
log('STEP2 HEADING:', await page.locator('.area-wizard h2').innerText())
log('GRID SUMMARY:', await page.locator('.area-wizard__summary').innerText())
await page.screenshot({ path: '/tmp/opencode/tools-garden-step2.png' })

// 4. Grid dimensions
const dims = page.locator('.area-wizard input[type=number]')
await dims.nth(0).fill('12')
await dims.nth(1).fill('8')
await dims.nth(2).fill('1')
await page.waitForTimeout(400)
log('GRID SUMMARY AFTER 12x8@1:', (await page.locator('.area-wizard__summary').innerText()).replace(/\n/g, ' | '))

// 5. Confirm setup
await page.getByRole('button', { name: /Start designing/ }).click()
await page.waitForTimeout(1800)
log('WIZARD AFTER CONFIRM:', await page.locator('.area-wizard').count())
log('GRID CHIP:', await page.locator('.garden-tool__pill').first().innerText().catch(() => 'n/a'))
log('LAYERS ROWS:', await page.locator('.garden-tool__layer').count())
log('PANEL OPEN:', await page.locator('.garden-tool__panel').evaluate(el => el.className))
const mapLayers = await page.evaluate(() => {
  const m = (window).__map
  return m ? m.getStyle().layers.map(l => l.id) : null
})
log('WINDOW MAP LAYERS:', mapLayers)
await page.screenshot({ path: '/tmp/opencode/tools-garden-ready.png' })

// 6. Draw a point via the rail
await page.locator('.garden-tool__mode', { hasText: 'Point' }).click().catch(async () => {
  await page.getByRole('button', { name: 'Add Point' }).click()
})
const canvas = page.locator('canvas.maplibregl-canvas')
const box = await canvas.boundingBox()
if (box) {
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(700)
}
log('TOASTS:', (await page.locator('[role=status]').allInnerTexts()).join(' / ').slice(0, 300))
await page.screenshot({ path: '/tmp/opencode/tools-garden-drawn.png' })

// 7. Reload persistence
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
log('AFTER RELOAD WIZARD:', await page.locator('.area-wizard').count())
log('AFTER RELOAD NAME:', await page.locator('.garden-tool__bar h1').innerText())

// 8. Satellite tool
await page.goto('http://localhost:3000/tools/satellite-downloader', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
log('SATELLITE H1:', await page.locator('h1').first().innerText())
log('SATELLITE BODY HIT:', (await page.locator('.offline-satellite').count()) > 0)

// 9. Legacy hash redirect
await page.goto('http://localhost:3000/#tools/garden', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
log('LEGACY HASH REDIRECT:', page.url())

// 10. Invalid tool
await page.goto('http://localhost:3000/tools/nope', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
log('INVALID TOOL URL:', page.url())

log('--- ERRORS ---')
log(errors.slice(0, 40).join('\n') || '(none)')
await browser.close()
