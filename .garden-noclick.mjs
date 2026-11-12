import { chromium } from 'playwright'

const project = {
  id: 'proj_demo', name: 'Cluster Test', description: 'c',
  location: { lat: -15.7801, lng: -47.9292, zoom: 17 },
  bounds: [[-47.93, -15.782], [-47.92, -15.778]],
  grid: { widthM: 20, heightM: 20, cellM: 2, rotationDeg: 0, cols: 10, rows: 10 },
  address: 'Brasília, DF',
  layers: [{
    id: 'layer_seeds', name: 'Seeds', type: 'seeds', visible: true, locked: false, opacity: 1,
    features: Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2
      const r = 0.0004 + (i % 5) * 0.00025
      return { id: `s${i}`, type: 'point', geometry: { type: 'Point', coordinates: [-47.9292 + Math.cos(a) * r, -15.7801 + Math.sin(a) * r * 0.7] }, properties: { label: `Seed ${i}`, variety: '' } }
    }),
    style: { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.35, lineWidth: 2, radius: 5, visible: true },
  }, {
    id: 'layer_sl', name: 'Seedlings', type: 'seedlings', visible: true, locked: false, opacity: 1,
    features: Array.from({ length: 14 }, (_, i) => ({ id: `sl${i}`, type: 'point', geometry: { type: 'Point', coordinates: [-47.9292 + Math.cos(i) * 0.0009, -15.7801 + Math.sin(i) * 0.0009] }, properties: { label: `Seedling ${i}`, variety: '' } })),
    style: { color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.35, lineWidth: 2, radius: 6, visible: true },
  }],
  metadata: { createdAt: 1, updatedAt: 1, version: 1, author: 'a', locale: 'en', hemisphere: 'south' },
}
const seed = { projects: { proj_demo: project }, activeProjectId: 'proj_demo', activeLayerId: 'layer_seeds', unitSystem: 'metric', lastSaved: 1 }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })
await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('darkMode', 'false'); localStorage.setItem('locale', 'en') }, ['eg-garden-projects', JSON.stringify(seed)])
const page = await ctx.newPage()
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)))
await page.goto('http://localhost:3111/tools/agroecological-garden', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.garden-mobile', { timeout: 30000 })
await page.waitForTimeout(6000)

const readZoom = async () => {
  const txt = (await page.locator('.map-readout').innerText().catch(() => '')) || ''
  const m = /z(\d+(?:\.\d+)?)/.exec(txt)
  return m ? Number(m[1]) : null
}
const canvas = page.locator('.garden-map-layer canvas').first()
const box = await canvas.boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

// scroll out to ~13 then back in to ~15 WITHOUT clicking
for (let i = 0; i < 40; i++) { if ((await readZoom()) <= 13.5) break; await page.mouse.wheel(0, 400); await page.waitForTimeout(100) }
await page.waitForTimeout(1500)
console.log('zOut:', await readZoom())
for (let i = 0; i < 40; i++) { if ((await readZoom()) >= 15) break; await page.mouse.wheel(0, -400); await page.waitForTimeout(100) }
await page.waitForTimeout(2000)
console.log('zBack:', await readZoom())
await page.screenshot({ path: '/tmp/opencode/garden-noclick-z15.png' })

// what DOM elements sit at the artifact location (CSS px)
const at = await page.evaluate(() => {
  const els = document.elementsFromPoint(213, 465)
  return els.slice(0, 6).map(e => `${e.tagName}.${(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || ''}`)
})
console.log('elementsFromPoint(213,465):', JSON.stringify(at))
await browser.close()
