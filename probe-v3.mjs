import { chromium } from 'playwright'

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})
const page = await browser.newPage()
const logs = []
page.on('console', (m) => {
  const t = m.text().slice(0, 160)
  if (/tile-provider|EG Maps.*(switch|fail|error)|pageerror/i.test(`[${m.type()}] ${t}`)) logs.push(`[${m.type()}] ${t}`)
})
page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 160)}`))

await page.goto('http://127.0.0.1:3100/vulcan-observatory', { waitUntil: 'domcontentloaded', timeout: 60000 })
// wait for initial load: overlay gone + map present
await page.waitForFunction(() => (window).__egMap && !document.body.innerText.includes('Preparing vulcan observatory'), null, { timeout: 150000, polling: 2000 })
await page.waitForTimeout(8000) // let cultural fetch land

const snap = () => page.evaluate(() => {
  const m = (window).__egMap
  let cultural = null
  let layers = []
  try {
    cultural = m.getSource('ree-cultural') ? 'present' : 'MISSING-SOURCE'
    layers = ['ree-cultural-point', 'ree-cultural-cluster', 'ree-point-circle', 'ree-poly-fill']
      .map(id => `${id}:${m.getLayer(id) ? 'y' : 'n'}`).join(' ')
  } catch (e) { cultural = `ERR ${String(e).slice(0, 80)}` }
  return {
    cultural, layers,
    overlayStuck: document.body.innerText.includes('Preparing vulcan observatory'),
    canvasPx: [...document.querySelectorAll('canvas.maplibregl-canvas')].map(c => `${c.width}x${c.height}`).join(','),
  }
})

console.log('BEFORE SWITCH:', JSON.stringify(await snap()))

// Flip provider twice: fallback -> maptiler-label -> fallback (each = setStyle wipe + recovery)
const flip = () => page.evaluate(() => document.querySelector('.obs-menu-btn--tile')?.click())

await flip()
await page.waitForTimeout(12000)
console.log('AFTER SWITCH 1:', JSON.stringify(await snap()))

await flip()
await page.waitForTimeout(12000)
console.log('AFTER SWITCH 2:', JSON.stringify(await snap()))

console.log('--- logs ---')
for (const l of [...new Set(logs)]) console.log(l)
await browser.close()
