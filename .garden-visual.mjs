/**
 * Visual + behavioural review of the Agroecological Garden Tool.
 * Run: node /tmp/opencode/garden-visual.mjs
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3111'
const OUT = '/tmp/opencode'
const CENTER = { lng: -47.9292, lat: -15.7801 }

function point (lngOff, latOff) {
  return [CENTER.lng + lngOff, CENTER.lat + latOff]
}

function makeLayer (id, type, features, style) {
  return {
    id,
    name: id,
    type,
    visible: true,
    locked: false,
    opacity: 1,
    features,
    style,
  }
}

function pointFeature (id, coords, label, extra = {}) {
  return {
    id,
    type: 'point',
    geometry: { type: 'Point', coordinates: coords },
    properties: { label, variety: '', ...extra },
  }
}

const seeds = []
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 2
  const r = 0.0004 + (i % 5) * 0.00025
  seeds.push(pointFeature(`seed_${i}`, point(Math.cos(a) * r, Math.sin(a) * r * 0.7), `Seed ${i}`))
}
const seedlings = []
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2
  seedlings.push(pointFeature(`sl_${i}`, point(Math.cos(a) * 0.0009, Math.sin(a) * 0.0009), `Seedling ${i}`))
}
const veggies = [
  pointFeature('veg_1', point(0.0001, 0.0001), 'Alface', { plantId: 'vegetable-lettuce' }),
  pointFeature('veg_2', point(-0.0002, 0.0002), 'Tomate', { plantId: 'vegetable-tomato' }),
  pointFeature('veg_3', point(0.0002, -0.0002), 'Cenoura', { plantId: 'vegetable-carrot' }),
]

const project = {
  id: 'proj_demo',
  name: 'Quintal Agroecológico',
  description: 'Demo plot',
  location: { ...CENTER, zoom: 17 },
  bounds: [point(-0.002, -0.002), point(0.002, 0.002)],
  grid: { widthM: 20, heightM: 20, cellM: 2, rotationDeg: 0, cols: 10, rows: 10 },
  address: 'Brasília, DF',
  layers: [
    makeLayer('layer_seeds', 'seeds', seeds, { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.35, lineWidth: 2, radius: 5, visible: true }),
    makeLayer('layer_seedlings', 'seedlings', seedlings, { color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.35, lineWidth: 2, radius: 6, visible: true }),
    makeLayer('layer_veg', 'vegetable', veggies, { color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.3, lineWidth: 2, radius: 6, visible: true }),
    makeLayer('layer_bed', 'bed', [], { color: '#78716c', fillColor: '#78716c', fillOpacity: 0.3, lineWidth: 2, radius: 4, visible: true }),
    makeLayer('layer_path', 'path', [], { color: '#a8a29e', fillColor: '#a8a29e', fillOpacity: 0.25, lineWidth: 2, radius: 3, visible: true }),
  ],
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    author: 'review',
    locale: 'en',
    hemisphere: 'south',
  },
}

const seed = {
  projects: { proj_demo: project },
  activeProjectId: 'proj_demo',
  activeLayerId: 'layer_bed',
  unitSystem: 'metric',
  lastSaved: Date.now(),
}

const results = []
function check (name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

async function openPage (dark) {
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: false,
  })
  await ctx.addInitScript(([storage, darkMode]) => {
    localStorage.setItem(storage.key, storage.value)
    localStorage.setItem('darkMode', String(darkMode))
    localStorage.setItem('locale', 'en')
  }, [{ key: 'eg-garden-projects', value: JSON.stringify(seed) }, dark])
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${BASE}/tools/agroecological-garden`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.garden-mobile', { timeout: 30000 })
  await page.waitForTimeout(4000)
  return { page, errors, ctx }
}

// ── Light theme ──────────────────────────────────────────────────────────────
const { page, errors, ctx } = await openPage(false)

check('setup wizard skipped (project has grid)', await page.locator('.top-bar').count() === 1)
check('top header present', await page.locator('.top-bar').count() === 1)
const clock = await page.locator('.clock-time').textContent()
check('clock renders', /\d/.test(clock || ''), JSON.stringify(clock))
const topTools = await page.locator('.top-tool-btn').count()
check('header tool row has 6 tools', topTools === 6, `found ${topTools}`)
const modeBtns = await page.locator('.bottom-toolbar .mode-btn').count()
check('dock has 6 tools + plant/layers/fit', modeBtns >= 9, `found ${modeBtns}`)

const dockStyle = await page.locator('.bottom-toolbar').evaluate((el) => {
  const s = getComputedStyle(el)
  return { bg: s.backgroundColor, radius: s.borderRadius, border: s.borderTopWidth, pos: s.position }
})
console.log('  dock style:', JSON.stringify(dockStyle))
check('dock is a rounded floating shell', dockStyle.radius !== '0px' && parseFloat(dockStyle.border) >= 1, JSON.stringify(dockStyle))
const headerStyle = await page.locator('.top-bar').evaluate((el) => {
  const s = getComputedStyle(el)
  return { bg: s.backgroundColor, radius: s.borderRadius, shadow: s.boxShadow, backdrop: s.backdropFilter }
})
console.log('  header style:', JSON.stringify(headerStyle))
check('header is rounded + blurred', headerStyle.radius !== '0px' && /blur/.test(headerStyle.backdrop || ''), JSON.stringify(headerStyle))

// Variable sanity: scoped :root bug would leave these unresolved
const vars = await page.evaluate(() => {
  const el = document.querySelector('.garden-mobile')
  const s = getComputedStyle(el)
  return {
    bgPrimary: s.getPropertyValue('--garden-color-bg-primary').trim(),
    shellBg: s.getPropertyValue('--garden-shell-bg').trim(),
    dockH: s.getPropertyValue('--garden-dock-h').trim(),
  }
})
console.log('  css vars:', JSON.stringify(vars))
check('theme variables resolve', !!vars.bgPrimary && !!vars.shellBg && !!vars.dockH, JSON.stringify(vars))

const isDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'))
check('light theme = no .dark on html', isDarkClass === false)

// Map markers
const markerStats = await page.evaluate(() => {
  const mapEl = document.querySelector('.garden-map-layer')
  return { hasCanvas: !!mapEl?.querySelector('canvas') }
})
check('map canvas rendered', markerStats.hasCanvas)

await page.screenshot({ path: `${OUT}/garden-light-header.png`, clip: { x: 0, y: 0, width: 430, height: 320 } })
await page.screenshot({ path: `${OUT}/garden-light-dock.png`, clip: { x: 0, y: 660, width: 430, height: 272 } })
await page.screenshot({ path: `${OUT}/garden-light-full.png` })

// ── Draw a line: popup, live distance, Enter finish ─────────────────────────
await page.locator('.bottom-toolbar .mode-btn', { hasText: 'Line' }).click()
await page.waitForTimeout(300)
const canvas = page.locator('.garden-map-layer canvas').first()
const box = await canvas.boundingBox()
const clicks = [
  { x: box.x + 120, y: box.y + 380 },
  { x: box.x + 240, y: box.y + 430 },
  { x: box.x + 320, y: box.y + 350 },
]
for (const c of clicks) {
  await page.mouse.click(c.x, c.y)
  await page.waitForTimeout(250)
}
const popupVisible = await page.locator('.draw-popup').isVisible()
check('in-map draw popup appears', popupVisible)
const popupText = popupVisible ? await page.locator('.draw-popup').innerText() : ''
console.log('  popup text:', JSON.stringify(popupText.replace(/\n/g, ' | ')))
check('popup shows live distance', /\d/.test(popupText) && /Distance/i.test(popupText), popupText.replace(/\n/g, ' | '))
check('popup has Finish button', /Finish/i.test(popupText))
check('popup hints Enter key', /Enter/i.test(popupText))
check('popup has Cancel', /Cancel/i.test(popupText))
await page.screenshot({ path: `${OUT}/garden-draw-line.png` })

// stoppability: Escape cancels
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('Escape stops the line tool', await page.locator('.draw-popup').count() === 0)

// draw again then finish with Enter
for (const c of clicks) {
  await page.mouse.click(c.x, c.y)
  await page.waitForTimeout(200)
}
await page.keyboard.press('Enter')
await page.waitForTimeout(400)
check('Enter finishes the line (popup closes)', await page.locator('.draw-popup').count() === 0)

// re-tap active tool stops it
await page.locator('.bottom-toolbar .mode-btn', { hasText: 'Polygon' }).click()
await page.mouse.click(box.x + 140, box.y + 400)
await page.waitForTimeout(250)
check('polygon draw starts', await page.locator('.draw-popup').count() === 1)
await page.locator('.bottom-toolbar .mode-btn', { hasText: 'Polygon' }).click()
await page.waitForTimeout(300)
check('re-tapping active tool stops drawing', await page.locator('.draw-popup').count() === 0)
const selectActive = await page.locator('.bottom-toolbar .mode-btn.active').first().innerText()
check('stopping falls back to Select', /Select/i.test(selectActive), selectActive.replace(/\n/g, ' '))

// ── Polygon: perimeter × area ────────────────────────────────────────────────
await page.locator('.bottom-toolbar .mode-btn', { hasText: 'Polygon' }).click()
for (const c of [
  { x: box.x + 100, y: box.y + 380 },
  { x: box.x + 230, y: box.y + 390 },
  { x: box.x + 250, y: box.y + 470 },
  { x: box.x + 120, y: box.y + 460 },
]) {
  await page.mouse.click(c.x, c.y)
  await page.waitForTimeout(220)
}
const polyText = await page.locator('.draw-popup').innerText()
console.log('  polygon popup:', JSON.stringify(polyText.replace(/\n/g, ' | ')))
check('polygon popup shows perimeter + area', /Perimeter/i.test(polyText) && /Area/i.test(polyText), polyText.replace(/\n/g, ' | '))
await page.screenshot({ path: `${OUT}/garden-draw-polygon.png` })
await page.keyboard.press('Enter')
await page.waitForTimeout(400)

// ── Measure tool (no layer dependency) ──────────────────────────────────────
await page.locator('.bottom-toolbar .mode-btn', { hasText: 'Measure' }).click()
for (const c of [{ x: box.x + 90, y: box.y + 300 }, { x: box.x + 300, y: box.y + 320 }]) {
  await page.mouse.click(c.x, c.y)
  await page.waitForTimeout(220)
}
const measText = await page.locator('.draw-popup').innerText().catch(() => '')
check('measure popup shows a distance', /Distance/i.test(measText) && /\d/.test(measText), measText.replace(/\n/g, ' | '))
await page.screenshot({ path: `${OUT}/garden-measure.png` })
await page.keyboard.press('Escape')

// ── Persist drawn features, verify via localStorage ─────────────────────────
await page.locator('button[aria-label="Save Project"]').click()
await page.waitForTimeout(400)
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('eg-garden-projects') || '{}'))
const layerFeatures = Object.values(stored.projects?.proj_demo?.layers || {}).flat().map(l => l.features.length)
console.log('  stored feature counts:', JSON.stringify(layerFeatures))
const total = layerFeatures.reduce((a, b) => a + b, 0)
check('drawn features persisted (line + polygon)', total >= 59, `expected ≥59 (56 points + line + polygon), got ${total}`)

// ── Zoom out: clustering into alpha bubbles ─────────────────────────────────
await page.keyboard.press('Escape')
const beforeZoom = await page.evaluate(() => document.querySelector('.garden-map-layer canvas') !== null)
check('map alive before zoom', beforeZoom)
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
for (let i = 0; i < 8; i++) {
  await page.mouse.wheel(0, 300)
  await page.waitForTimeout(150)
}
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/garden-zoomed-out.png` })

// ── Dark / AMOLED theme ─────────────────────────────────────────────────────
const darkOpen = await openPage(true)
const darkVars = await darkOpen.page.evaluate(() => {
  const el = document.querySelector('.garden-mobile')
  const s = getComputedStyle(el)
  const header = getComputedStyle(document.querySelector('.top-bar'))
  return {
    bgPrimary: s.getPropertyValue('--garden-color-bg-primary').trim(),
    shellBg: s.getPropertyValue('--garden-shell-bg').trim(),
    headerBg: header.backgroundColor,
    htmlDark: document.documentElement.classList.contains('dark'),
  }
})
console.log('  dark vars:', JSON.stringify(darkVars))
check('dark theme applies AMOLED shell', darkVars.htmlDark && /rgba?\(0,\s*0,\s*0/.test(darkVars.headerBg), JSON.stringify(darkVars))
await darkOpen.page.screenshot({ path: `${OUT}/garden-dark-full.png` })
await darkOpen.page.screenshot({ path: `${OUT}/garden-dark-header.png`, clip: { x: 0, y: 0, width: 430, height: 320 } })

const fatalErrors = [...errors, ...darkOpen.errors].filter(e => !/favicon|Failed to load resource|net::ERR/.test(e))
check('no console/page errors (light)', errors.length === 0, errors.slice(0, 5).join(' || '))
check('no console/page errors (dark)', darkOpen.errors.length === 0, darkOpen.errors.slice(0, 5).join(' || '))

await browser.close()

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.log('FAILED:', failed.map(f => f.name).join(', '))
  process.exit(1)
}
