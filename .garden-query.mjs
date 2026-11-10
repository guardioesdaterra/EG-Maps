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
for (let i = 0; i < 40; i++) { if ((await readZoom()) <= 13.5) break; await page.mouse.wheel(0, 400); await page.waitForTimeout(100) }
await page.waitForTimeout(1500)
for (let i = 0; i < 40; i++) { if ((await readZoom()) >= 15) break; await page.mouse.wheel(0, -400); await page.waitForTimeout(100) }
await page.waitForTimeout(2000)
console.log('z:', await readZoom())
await page.screenshot({ path: '/tmp/opencode/garden-query.png' })

const info = await page.evaluate(() => {
  const map = window.__gardenMap
  if (!map) return { error: 'no map handle' }
  const out = { zoom: map.getZoom(), images: map.listImages().filter(i => i.startsWith('garden')), hits: [], imgInfo: {} }
  try {
    const mgr = map.style.imageManager
    out.mgrKeys = Object.keys(mgr).slice(0, 30)
    out.mgrProto = Object.getOwnPropertyNames(Object.getPrototypeOf(mgr)).slice(0, 40)
    out.styleImages = JSON.stringify(Object.keys(mgr.images || {})).slice(0, 500)
    for (const id of ['garden-count-40','garden-count-9','garden-icon-%F0%9F%8C%B1']) {
      const entry = mgr.getImage(id)
      if (!entry) { out.imgInfo[id] = 'missing'; continue }
      const img = entry.image || entry
      out.imgInfo[id] = { w: img.width, h: img.height, dataLen: img.data ? img.data.length : null }
      if (img.data) {
        const d = img.data
        let blue = 0
        const samples = []
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3]
          if (a > 200 && b > 170 && r < 130) {
            blue++
            if (samples.length < 8) samples.push([Math.floor((i/4) % img.width), Math.floor((i/4) / img.width), r, g, b, a])
          }
        }
        out.imgInfo[id + ':blue'] = { count: blue, samples }
      }
    }
  } catch (err) { out.imgErr = String(err) }
  const box = [[201, 453], [225, 477]]
  const feats = map.queryRenderedFeatures(box, { layers: ['garden-layer-point-icons', 'garden-layer-points', 'garden-point-cluster-count', 'garden-point-clusters'] })
  for (const f of feats) {
    out.hits.push({ layer: f.layer.id, props: f.properties, geom: f.geometry.type, coords: f.geometry.coordinates })
  }
  return out
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
