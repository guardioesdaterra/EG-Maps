import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import fs from 'node:fs'

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

function blueCount (file) {
  const png = PNG.sync.read(fs.readFileSync(file))
  let n = 0
  // scan whole image for saturated sky-blue (brand #0ea5e9-ish)
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3]
    if (a > 200 && b > 200 && r < 80 && g > 120 && g < 200) n++
  }
  return n
}

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
for (let i = 0; i < 40; i++) { if ((await readZoom()) <= 13.5) break; await page.mouse.wheel(0, 400); await page.waitForTimeout(100) }
await page.waitForTimeout(1200)
for (let i = 0; i < 40; i++) { if ((await readZoom()) >= 15) break; await page.mouse.wheel(0, -400); await page.waitForTimeout(100) }
await page.waitForTimeout(2000)
console.log('z:', await readZoom())

const layers = await page.evaluate(() => window.__gardenMap.getStyle().layers.map(l => l.id).filter(id => id.startsWith('garden')))
console.log('garden layers:', JSON.stringify(layers))

const shot = async (name) => {
  const f = `/tmp/opencode/lbl-${name}.png`
  await page.screenshot({ path: f })
  return blueCount(f)
}

const base = await shot('base')
console.log('base blue px:', base)

for (const id of layers) {
  await page.evaluate((lid) => {
    const m = window.__gardenMap
    m.setLayoutProperty(lid, 'visibility', 'none')
  }, id)
  await page.waitForTimeout(400)
  const n = await shot(id)
  console.log(`hide ${id}: blue px ${n} (${n < base ? 'REMOVED ARTIFACT' : 'unchanged'})`)
  await page.evaluate((lid) => {
    const m = window.__gardenMap
    m.setLayoutProperty(lid, 'visibility', 'visible')
  }, id)
  await page.waitForTimeout(300)
}
await browser.close()
