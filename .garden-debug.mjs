import { chromium } from 'playwright'

const project = {
  id: 'proj_demo',
  name: 'Quintal Agroecológico',
  description: 'Demo plot',
  location: { lat: -15.7801, lng: -47.9292, zoom: 17 },
  bounds: [[-47.93, -15.782], [-47.92, -15.778]],
  grid: { widthM: 20, heightM: 20, cellM: 2, rotationDeg: 0, cols: 10, rows: 10 },
  address: 'Brasília, DF',
  layers: [{
    id: 'layer_bed',
    name: 'bed',
    type: 'bed',
    visible: true,
    locked: false,
    opacity: 1,
    features: [{ id: 'f1', type: 'point', geometry: { type: 'Point', coordinates: [-47.9292, -15.7801] }, properties: { label: 'x', variety: '' } }],
    style: { color: '#78716c', fillColor: '#78716c', fillOpacity: 0.3, lineWidth: 2, radius: 4, visible: true },
  }],
  metadata: { createdAt: 1, updatedAt: 1, version: 1, author: 'a', locale: 'en', hemisphere: 'south' },
}
const seed = { projects: { proj_demo: project }, activeProjectId: 'proj_demo', activeLayerId: 'layer_bed', unitSystem: 'metric', lastSaved: 1 }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } })
await ctx.addInitScript(([k, v]) => {
  localStorage.setItem(k, v)
  localStorage.setItem('darkMode', 'false')
  localStorage.setItem('locale', 'en')
}, ['eg-garden-projects', JSON.stringify(seed)])
const page = await ctx.newPage()
page.on('console', m => console.log(`[console.${m.type()}]`, m.text().slice(0, 300)))
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 500)))
await page.goto('http://localhost:3111/tools/agroecological-garden', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.garden-mobile', { timeout: 30000 })
await page.waitForTimeout(8000)

const info = await page.evaluate(() => {
  const layer = document.querySelector('.garden-map-layer')
  return {
    html: !!layer,
    canvasCount: layer ? layer.querySelectorAll('canvas').length : -1,
    maplibreCanvas: document.querySelectorAll('canvas').length,
    loading: !!document.querySelector('.map-loading'),
    loadingText: document.querySelector('.map-loading')?.innerText || null,
    errorBanner: document.querySelector('.map-error-banner')?.innerText || null,
    topBar: !!document.querySelector('.top-bar'),
    dock: !!document.querySelector('.bottom-toolbar'),
    fitBtn: !!Array.from(document.querySelectorAll('.bottom-toolbar .mode-btn')).find(b => /Fit/i.test(b.textContent || '')),
    modes: Array.from(document.querySelectorAll('.bottom-toolbar .mode-btn')).map(b => (b.textContent || '').trim()),
    title: document.querySelector('.title')?.textContent,
    webgl: (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } })(),
    wizard: !!document.querySelector('.setup-wizard, [class*=wizard]'),
    wizardText: (document.querySelector('[class*=wizard]')?.innerText || '').slice(0, 200),
    storedLen: (localStorage.getItem('eg-garden-projects') || '').length,
    storedHead: (localStorage.getItem('eg-garden-projects') || '').slice(0, 300),
    payloadPinia: (() => {
      try {
        const app = document.querySelector('#__nuxt').__vue_app__
        const np = app.config.globalProperties.$nuxt
        const pp = np.payload.pinia
        return pp && pp['garden-project'] ? { active: pp['garden-project'].activeProjectId, projects: Object.keys(pp['garden-project'].projects || {}), len: JSON.stringify(pp).length } : String(pp)
      } catch (e) { return String(e) }
    })(),
    pinia: (() => {
      try {
        const app = document.querySelector('#__nuxt').__vue_app__
        const st = app.config.globalProperties.$pinia.state.value['garden-project']
        return { activeProjectId: st?.activeProjectId, projects: Object.keys(st?.projects || {}), hasGrid: !!st?.projects?.[st?.activeProjectId]?.grid, keys: Object.keys(st || {}) }
      } catch (e) { return String(e) }
    })(),
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: '/tmp/opencode/debug-full.png' })
await browser.close()
